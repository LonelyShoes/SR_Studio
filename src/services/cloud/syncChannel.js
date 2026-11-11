/**
 * SyncChannel — pengikat realtime dua arah antara satu pohon lokal dan satu path cloud.
 *
 * Model:
 *   base   = keadaan terakhir yang SUDAH diserahkan ke/diterima dari server
 *   local  = keadaan lokal saat ini (base + perubahan yang belum dikirim)
 *
 *   Perubahan lokal → `setLocal(tree)` → (debounce) → `flush()`:
 *     patch = diff(base, local) → dicatat di outbox → dikirim → base := local
 *   Data server → 3-way merge: local := remote + (local − base), base := remote
 *
 * Hasilnya: edit pengguna lain pada field berbeda langsung masuk tanpa menimpa ketikan
 * yang sedang berlangsung, dan pekerjaan offline dikirim saat koneksi kembali.
 */

import { diffTree, isEmptyPatch, mergeRemote, prefixPatch, sanitizeTree, treeEqual } from './tree.js';

export const UNKNOWN_BASE = Symbol('unknown-base');

export class SyncChannel {
  /**
   * @param {object} options
   * @param {object} options.driver
   * @param {string} options.path path absolut pohon di database
   * @param {import('./outbox.js').Outbox} options.outbox
   * @param {(event: object) => void} options.onRemote dipanggil saat data server mengubah keadaan lokal
   * @param {(patch: object, local: any, base: any) => object} [options.decorate] tulisan tambahan
   *        (path absolut) yang ikut dalam update atomik yang sama, mis. metadata proyek
   * @param {(info: { first: boolean, base: any, patch: object }) => void} [options.onBeforeWrite]
   * @param {(remote: any, local: any) => { base: any, local: any }} [options.resolveInitial]
   *        keputusan saat snapshot pertama tiba dan base belum diketahui (bawaan: ikuti server)
   * @param {boolean} [options.missingMeansDeleted] anggap hilangnya data server sebagai penghapusan
   */
  constructor({
    driver,
    path,
    outbox,
    onRemote,
    onStateChange,
    onError,
    decorate,
    onBeforeWrite,
    resolveInitial,
    missingMeansDeleted = false,
    outboxMeta,
    debounceMs = 350,
    maxWaitMs = 1500,
  }) {
    this.driver = driver;
    this.path = path;
    this.outbox = outbox;
    this.onRemote = onRemote || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.decorate = decorate;
    this.onBeforeWrite = onBeforeWrite;
    this.resolveInitial = resolveInitial;
    this.missingMeansDeleted = missingMeansDeleted;
    this.outboxMeta = outboxMeta;
    this.debounceMs = debounceMs;
    this.maxWaitMs = maxWaitMs;

    this.base = UNKNOWN_BASE;
    this.local = undefined;
    this.canWrite = false;
    this.started = false;
    this.deleted = false;
    this.hasRemote = false;
    this.inflight = 0;
    this.wroteOnce = false;
    this.debounceTimer = null;
    this.maxWaitTimer = null;
    this.unsubscribe = null;
  }

  /**
   * Menetapkan keadaan awal. Boleh dipanggil sebelum driver siap: perubahan lokal tetap
   * dilacak terhadap `base` dan dikirim begitu `connect()` dipanggil.
   * @param {{ base?: any, local?: any, canWrite?: boolean }} initial
   */
  init({ base = UNKNOWN_BASE, local, canWrite = false } = {}) {
    this.base = base === UNKNOWN_BASE ? UNKNOWN_BASE : sanitizeTree(base);
    this.local = sanitizeTree(local);
    this.canWrite = canWrite;
    return this;
  }

  /** Mulai berlangganan data server dan mengirim perubahan tertunda. */
  connect(driver) {
    if (this.started) return this;
    if (driver) this.driver = driver;
    this.started = true;
    this.unsubscribe = this.driver.listen(
      this.path,
      (value) => this.#handleRemote(sanitizeTree(value)),
      (error) => this.onError(error)
    );
    this.#schedule();
    return this;
  }

  start(initial) {
    if (this.started) return this;
    return this.init(initial).connect();
  }

  stop({ flush = true } = {}) {
    if (!this.started) return;
    if (flush) this.flush();
    this.#clearTimers();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.started = false;
  }

  /** True bila ada perubahan lokal yang belum diserahkan ke server. */
  get dirty() {
    return this.base !== UNKNOWN_BASE && !this.deleted && !treeEqual(this.base, this.local);
  }

  /** True bila masih ada pekerjaan sinkronisasi (belum dikirim atau menunggu konfirmasi). */
  get pending() {
    return this.inflight > 0 || (this.canWrite && this.dirty);
  }

  get baseKnown() {
    return this.base !== UNKNOWN_BASE;
  }

  setCanWrite(canWrite) {
    if (this.canWrite === canWrite) return;
    this.canWrite = canWrite;
    this.#schedule();
    this.onStateChange();
  }

  setLocal(tree) {
    this.local = sanitizeTree(tree);
    this.#schedule();
  }

  #handleRemote(remote) {
    if (!this.started || this.deleted) return;
    const firstSnapshot = !this.hasRemote;
    this.hasRemote = true;

    if (this.missingMeansDeleted && remote === undefined) {
      // Dokumen tidak ada di server. Dokumen yang baru kita buat selalu terlihat lewat
      // tampilan optimistis SDK, jadi sampai di sini berarti memang dihapus/ditolak server.
      this.deleted = true;
      this.#clearTimers();
      this.onRemote({ kind: 'deleted' });
      this.onStateChange();
      return;
    }

    if (this.base === UNKNOWN_BASE) {
      const decision = this.resolveInitial
        ? this.resolveInitial(remote, this.local)
        : { base: remote, local: remote };
      if (!decision) {
        // Salinan lokal tidak bisa digabung dengan aman → kanal berhenti, pemanggil memutuskan.
        this.deleted = true;
        this.#clearTimers();
        this.onRemote({ kind: 'diverged', remote });
        this.onStateChange();
        return;
      }
      this.base = sanitizeTree(decision.base);
      this.local = sanitizeTree(decision.local);
      this.onRemote({ kind: 'initial', remote, local: this.local });
      this.#schedule(false);
      this.onStateChange();
      return;
    }

    if (treeEqual(remote, this.base)) {
      if (firstSnapshot) this.onStateChange();
      return;
    }

    const oldBase = this.base;
    this.base = remote;
    this.local = mergeRemote(oldBase, this.local, remote);
    this.onRemote({ kind: 'update', remote, oldBase, local: this.local });
    this.#schedule(false);
    this.onStateChange();
  }

  #clearTimers() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.maxWaitTimer);
    this.debounceTimer = null;
    this.maxWaitTimer = null;
  }

  /**
   * @param {boolean} restart true untuk edit lokal (debounce dimulai ulang selama pengguna
   *   mengetik); false untuk event server agar arus data masuk tidak menunda pengiriman.
   */
  #schedule(restart = true) {
    if (!this.started || !this.canWrite || !this.dirty) {
      this.#clearTimers();
      return;
    }
    if (restart || !this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
    }
    if (!this.maxWaitTimer) this.maxWaitTimer = setTimeout(() => this.flush(), this.maxWaitMs);
    this.onStateChange();
  }

  /**
   * Menyerahkan perubahan lokal ke server sekarang juga.
   * @returns {boolean} true bila ada patch yang dikirim
   */
  flush() {
    this.#clearTimers();
    if (!this.started || !this.canWrite || !this.dirty) return false;

    const patch = diffTree(this.base, this.local);
    if (isEmptyPatch(patch)) {
      this.base = this.local;
      return false;
    }

    const first = !this.wroteOnce;
    this.wroteOnce = true;
    this.onBeforeWrite?.({ first, base: this.base, patch });

    const fullPatch = {
      ...prefixPatch(patch, this.path),
      ...(this.decorate ? this.decorate(patch, this.local, this.base) : null),
    };
    this.base = this.local;

    const entryId = this.outbox.add(fullPatch, this.outboxMeta);
    this.inflight += 1;
    this.onStateChange();
    this.driver
      .write(fullPatch)
      .catch((error) => this.onError(error, fullPatch))
      .finally(() => {
        this.outbox.remove(entryId);
        this.inflight -= 1;
        this.onStateChange();
      });
    return true;
  }
}
