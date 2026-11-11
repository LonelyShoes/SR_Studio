/**
 * WorkspaceClient — repositori operasi cloud tingkat aplikasi di atas driver RTDB.
 *
 * Struktur data (relatif terhadap `sr_studio_v3/<workspaceId>`):
 *   projects/<id>            metadata ringan (daftar Library realtime)
 *   docs/<id>/{boq,schedule,calc}   dokumen hidup yang disunting bersama
 *   revisions/<id>/<rev>     indeks riwayat versi   | revisionData/<id>/<rev>  isi snapshot
 *   trash/<id>               indeks proyek terhapus | trashData/<id>           isi untuk pemulihan
 *   tombstones/<id>          penanda agar proyek terhapus tidak diimpor ulang dari data lama
 *   presence/<session>       siapa yang sedang online & membuka apa
 *   activity/<pushId>        log aktivitas yang terbaca semua pengguna
 *   security/otp             kode izin sekali pakai (hash) untuk perangkat Klien
 */

import { LIMITS, WORKSPACE_ROOT } from './config.js';
import { createId, decodeKey, paths } from './keys.js';
import {
  buildProjectSummary,
  calcToDoc,
  canonicalDoc,
  decodeDocBundle,
  decodeRevision,
  docToCalc,
  docToSchedule,
  docToState,
  encodeDocBundle,
  encodeRevision,
  metaToEntry,
  scheduleToDoc,
} from './codec.js';
import { diffTree, isEmptyPatch, isPlainObject, prefixPatch, sanitizeTree } from './tree.js';
import { randomDigits, randomHex, sha256Hex } from './crypto.js';

export class OfflineError extends Error {
  constructor(message = 'Tindakan ini membutuhkan koneksi internet.') {
    super(message);
    this.name = 'OfflineError';
  }
}

const OTP_MAX_ATTEMPTS = 5;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new OfflineError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const hashOtp = (salt, code) => sha256Hex(`${salt}:${code}`);

export class WorkspaceClient {
  /**
   * @param {object} options
   * @param {object} options.driver
   * @param {import('./outbox.js').Outbox} options.outbox
   * @param {() => { id: string, sessionId: string, name: string, role: string }} options.getIdentity
   */
  constructor({ driver, outbox, getIdentity, root = WORKSPACE_ROOT, limits = LIMITS, readTimeoutMs = 8000 }) {
    this.driver = driver;
    this.outbox = outbox;
    this.getIdentity = getIdentity;
    this.root = root;
    this.limits = limits;
    this.readTimeoutMs = readTimeoutMs;
    this.online = false;
    this.presenceFields = {};
    this.presenceTimer = null;
    this.editActivity = new Map();
    this.sweptZombies = new Set();
  }

  abs(relative) {
    return `${this.root}/${relative}`;
  }

  who() {
    const { id, name, role } = this.getIdentity();
    return { id, name, role: role || 'client' };
  }

  /** Tulis atomik lewat outbox (aman terhadap tab ditutup saat offline). */
  write(patch, meta) {
    const entryId = this.outbox.add(patch, meta);
    return this.driver.write(patch).finally(() => this.outbox.remove(entryId));
  }

  async read(relative) {
    try {
      return await withTimeout(this.driver.read(this.abs(relative)), this.readTimeoutMs);
    } catch (error) {
      if (error instanceof OfflineError || /offline/i.test(String(error?.message))) throw new OfflineError();
      throw error;
    }
  }

  /* ---------------------------------------------------------------- Proyek */

  watchProjects(callback, onError) {
    return this.driver.listen(
      this.abs(paths.projects),
      (value) => {
        const entries = [];
        const zombies = [];
        if (isPlainObject(value)) {
          for (const key of Object.keys(value)) {
            const entry = metaToEntry(decodeKey(key), value[key]);
            if (entry) entries.push(entry);
            else zombies.push(decodeKey(key));
          }
        }
        entries.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        callback(entries);
        if (zombies.length) this.#sweepZombies(zombies);
      },
      onError
    );
  }

  /** Sisa record tak utuh (edit yang berpapasan dengan penghapusan) dibersihkan oleh Master. */
  #sweepZombies(ids) {
    if (this.who().role !== 'master') return;
    const patch = {};
    for (const id of ids) {
      if (this.sweptZombies.has(id)) continue;
      this.sweptZombies.add(id);
      patch[this.abs(paths.project(id))] = null;
      patch[this.abs(paths.doc(id))] = null;
    }
    if (!isEmptyPatch(patch)) this.driver.write(patch).catch(() => {});
  }

  /** Tulisan metadata yang menyertai setiap perubahan dokumen (dipakai `decorate` kanal). */
  touchPatch(id, state) {
    const base = this.abs(paths.project(id));
    const patch = {
      [`${base}/updatedAt`]: this.driver.timestamp,
      [`${base}/updatedBy`]: this.who(),
    };
    if (state) Object.assign(patch, prefixPatch(buildProjectSummary(state), base));
    return patch;
  }

  /**
   * Membuat proyek (atau draf) baru beserta dokumennya dalam satu tulisan atomik.
   * Tulisan langsung diterbitkan; `done` selesai saat server mengonfirmasi.
   */
  createProject({ id = createId('proj'), state, schedule, calc, status = 'saved', createdAt, updatedAt, owner, updatedBy, revisions = [] }) {
    const who = this.who();
    const boq = canonicalDoc(state);
    const meta = sanitizeTree({
      ...buildProjectSummary(docToState(boq)),
      status,
      createdAt: createdAt ?? this.driver.timestamp,
      updatedAt: updatedAt ?? this.driver.timestamp,
      owner: owner ?? { id: who.id, name: who.name },
      updatedBy: updatedBy === undefined ? who : updatedBy,
      revisionCount: revisions.length,
    });
    const patch = {
      [this.abs(paths.project(id))]: meta,
      [this.abs(paths.doc(id))]: sanitizeTree({ boq, schedule: scheduleToDoc(schedule), calc: calcToDoc(calc) }),
      [this.abs(paths.tombstone(id))]: null,
    };
    for (const revision of revisions) {
      const encoded = encodeRevision(revision);
      patch[this.abs(paths.revision(id, revision.id))] = encoded.index;
      patch[this.abs(paths.revisionDatum(id, revision.id))] = encoded.data;
    }
    return { id, boq, done: this.write(patch, { docId: id }) };
  }

  updateProjectFields(id, fields) {
    const patch = prefixPatch(fields, this.abs(paths.project(id)));
    return this.write(patch);
  }

  /** Menyamakan ringkasan (total, jumlah item) di daftar Library dengan isi dokumen lokal. */
  reconcileSummary(id, state, currentEntry) {
    const summary = buildProjectSummary(state);
    const fields = {};
    for (const key of Object.keys(summary)) {
      if (summary[key] !== currentEntry?.[key]) fields[key] = summary[key];
    }
    if (Object.keys(fields).length === 0) return null;
    return this.updateProjectFields(id, fields);
  }

  async readDocBundle(id) {
    const value = sanitizeTree(await this.read(paths.doc(id)));
    if (!value || !value.boq) return null;
    return { boq: value.boq, schedule: value.schedule, calc: value.calc };
  }

  /** @returns {Promise<null | { stateSnapshot, scheduleSnapshot, calcSnapshot }>} */
  async readProjectSnapshot(id) {
    const bundle = await this.readDocBundle(id);
    return bundle ? bundleToSnapshot(bundle) : null;
  }

  /** Mengganti isi dokumen proyek dengan state baru (rollback / gabung draf). Butuh koneksi. */
  async replaceDoc(id, { state, schedule }) {
    const current = (await this.readDocBundle(id)) || {};
    const boq = canonicalDoc(state);
    const patch = prefixPatch(diffTree(current.boq, boq), this.abs(paths.boq(id)));
    if (schedule !== undefined) {
      Object.assign(patch, prefixPatch(diffTree(current.schedule, scheduleToDoc(schedule)), this.abs(paths.schedule(id))));
    }
    Object.assign(patch, this.touchPatch(id, docToState(boq)));
    await this.write(patch, { docId: id });
  }

  async recomputeSummary(id) {
    const bundle = await this.readDocBundle(id);
    if (!bundle) return;
    await this.updateProjectFields(id, buildProjectSummary(docToState(bundle.boq)));
  }

  /** Menyalin proyek menjadi proyek baru. `bundle` boleh dipasok bila dokumen sudah ada di tangan. */
  async duplicateProject(sourceId, { name, bundle, status = 'saved' } = {}) {
    const source = bundle || (await this.readDocBundle(sourceId));
    if (!source) throw new Error('Dokumen proyek sumber tidak ditemukan di cloud.');
    const state = docToState(source.boq);
    if (name) state.project.name = name;
    const created = this.createProject({
      state,
      schedule: docToSchedule(source.schedule),
      calc: docToCalc(source.calc),
      status,
    });
    return { id: created.id, done: created.done, state, schedule: docToSchedule(source.schedule), calc: docToCalc(source.calc) };
  }

  /* ---------------------------------------------------------------- Sampah */

  /** Memindahkan proyek ke sampah (dapat dipulihkan Master). Butuh koneksi. */
  async deleteProject(id) {
    const [meta, bundle] = await Promise.all([this.read(paths.project(id)), this.readDocBundle(id)]);
    const who = this.who();
    const patch = {
      [this.abs(paths.project(id))]: null,
      [this.abs(paths.doc(id))]: null,
      [this.abs(paths.tombstone(id))]: this.driver.timestamp,
    };
    if (bundle && isPlainObject(meta)) {
      patch[this.abs(paths.trashed(id))] = sanitizeTree({
        name: meta.name,
        client: meta.client,
        grandTotal: meta.grandTotal,
        filledItemsCount: meta.filledItemsCount,
        status: meta.status,
        deletedAt: this.driver.timestamp,
        deletedBy: who.name,
      });
      patch[this.abs(paths.trashData(id))] = JSON.stringify({ meta, bundle: encodeDocBundle(bundle) });
    } else {
      patch[this.abs(paths.revisions(id))] = null;
      patch[this.abs(paths.revisionData(id))] = null;
    }
    await this.write(patch);
    return isPlainObject(meta) ? meta.name : null;
  }

  watchTrash(callback, onError) {
    return this.driver.listen(
      this.abs(paths.trash),
      (value) => {
        const list = [];
        if (isPlainObject(value)) {
          for (const key of Object.keys(value)) {
            const item = value[key];
            if (!isPlainObject(item)) continue;
            list.push({
              id: decodeKey(key),
              name: String(item.name || 'Proyek Tanpa Nama'),
              client: String(item.client || '-'),
              grandTotal: Number(item.grandTotal) || 0,
              filledItemsCount: Number(item.filledItemsCount) || 0,
              status: item.status === 'draft' ? 'draft' : 'saved',
              deletedAt: Number(item.deletedAt) || 0,
              deletedBy: String(item.deletedBy || ''),
            });
          }
        }
        list.sort((a, b) => b.deletedAt - a.deletedAt);
        callback(list);
      },
      onError
    );
  }

  async restoreFromTrash(id) {
    const raw = await this.read(paths.trashData(id));
    let parsed = null;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    if (!parsed || !isPlainObject(parsed.meta)) throw new Error('Data pemulihan proyek tidak ditemukan.');
    const bundle = decodeDocBundle(parsed.bundle);
    if (!bundle.boq) throw new Error('Isi dokumen proyek di sampah rusak.');
    const meta = sanitizeTree({ ...parsed.meta, updatedAt: this.driver.timestamp, updatedBy: this.who() });
    await this.write({
      [this.abs(paths.project(id))]: meta,
      [this.abs(paths.doc(id))]: sanitizeTree(bundle),
      [this.abs(paths.trashed(id))]: null,
      [this.abs(paths.trashData(id))]: null,
      [this.abs(paths.tombstone(id))]: null,
    });
    return String(meta.name || '');
  }

  purgeTrash(id) {
    return this.write({
      [this.abs(paths.trashed(id))]: null,
      [this.abs(paths.trashData(id))]: null,
      [this.abs(paths.revisions(id))]: null,
      [this.abs(paths.revisionData(id))]: null,
    });
  }

  /** Membersihkan sampah yang melewati masa simpan. Dipanggil oleh perangkat Master. */
  async sweepTrash(trashList) {
    const cutoff = this.driver.now() - this.limits.trashRetentionMs;
    const expired = trashList.filter((item) => item.deletedAt > 0 && item.deletedAt < cutoff);
    await Promise.all(expired.map((item) => this.purgeTrash(item.id)));
    return expired.length;
  }

  /* ---------------------------------------------------------------- Riwayat versi */

  /** Daftar revisi (tanpa isi snapshot), terbaru di depan. */
  watchRevisions(id, callback, onError) {
    return this.driver.listen(
      this.abs(paths.revisions(id)),
      (value) => callback(decodeRevisionList(value, null)),
      onError
    );
  }

  /** Daftar revisi lengkap dengan snapshot. Butuh koneksi. */
  async loadRevisions(id) {
    const [index, data] = await Promise.all([this.read(paths.revisions(id)), this.read(paths.revisionData(id))]);
    return decodeRevisionList(index, data);
  }

  /**
   * Menambah revisi dan merotasi yang terlama (kuota manual & otomatis terpisah).
   * Saat offline revisi tetap ditulis; rotasi menyusul pada penambahan berikutnya.
   */
  async addRevision(id, revision, { auto = false } = {}) {
    const revisionId = revision.id || createId('rev');
    const encoded = encodeRevision({ ...revision, auto, by: revision.by || this.who().name });
    const patch = {
      [this.abs(paths.revision(id, revisionId))]: encoded.index,
      [this.abs(paths.revisionDatum(id, revisionId))]: encoded.data,
    };

    let existing = null;
    try {
      existing = (await this.read(paths.revisions(id))) || {};
    } catch {
      existing = null; // offline → lewati rotasi
    }
    if (existing) {
      const all = Object.keys(existing)
        .filter((key) => isPlainObject(existing[key]))
        .map((key) => ({ id: decodeKey(key), at: Number(existing[key].at) || 0, auto: !!existing[key].auto }))
        .filter((entry) => entry.id !== revisionId);
      all.push({ id: revisionId, at: encoded.index.at, auto });
      const overflow = [];
      for (const [isAuto, cap] of [[false, this.limits.manualRevisions], [true, this.limits.autoRevisions]]) {
        const group = all.filter((entry) => entry.auto === isAuto).sort((a, b) => b.at - a.at);
        overflow.push(...group.slice(cap));
      }
      for (const entry of overflow) {
        patch[this.abs(paths.revision(id, entry.id))] = null;
        patch[this.abs(paths.revisionDatum(id, entry.id))] = null;
      }
      patch[`${this.abs(paths.project(id))}/revisionCount`] = all.length - overflow.length;
    }
    await this.write(patch);
    return revisionId;
  }

  async deleteRevision(id, revisionId) {
    const patch = {
      [this.abs(paths.revision(id, revisionId))]: null,
      [this.abs(paths.revisionDatum(id, revisionId))]: null,
    };
    try {
      const existing = (await this.read(paths.revisions(id))) || {};
      const remaining = Object.keys(existing).filter((key) => decodeKey(key) !== revisionId).length;
      patch[`${this.abs(paths.project(id))}/revisionCount`] = remaining;
    } catch {
      // offline → hitungan diperbaiki saat daftar revisi dimuat lagi
    }
    await this.write(patch);
  }

  /* ---------------------------------------------------------------- Presence */

  /**
   * Mendaftarkan sesi ini sebagai "online". Entri dihapus otomatis oleh server saat koneksi putus.
   * @param {(online: boolean) => void} onConnection
   */
  startPresence(onConnection) {
    const { sessionId } = this.getIdentity();
    const path = this.abs(paths.presenceOf(sessionId));
    let since = null;
    const publish = () => {
      if (!this.online) return;
      since = since || this.driver.now();
      const who = this.who();
      this.driver
        .write({ [path]: sanitizeTree({ ...who, ...this.presenceFields, since, at: this.driver.timestamp }) })
        .catch(() => {});
    };
    this.publishPresence = publish;

    const stopConnection = this.driver.watchConnection((online) => {
      this.online = online;
      onConnection?.(online);
      if (!online) return;
      this.driver
        .onDisconnect(path, null)
        .then(publish)
        .catch(() => {});
    });
    const heartbeat = setInterval(publish, this.limits.presenceHeartbeatMs);

    return () => {
      stopConnection();
      clearInterval(heartbeat);
      clearTimeout(this.presenceTimer);
      this.publishPresence = null;
      if (this.online) this.driver.write({ [path]: null }).catch(() => {});
    };
  }

  /** Memperbarui info sesi (proyek yang dibuka, tab aktif, nama, peran). */
  updatePresence(fields) {
    this.presenceFields = { ...this.presenceFields, ...fields };
    clearTimeout(this.presenceTimer);
    this.presenceTimer = setTimeout(() => this.publishPresence?.(), 400);
  }

  watchPresence(callback, onError) {
    return this.driver.listen(
      this.abs(paths.presence),
      (value) => {
        const sessions = [];
        if (isPlainObject(value)) {
          for (const key of Object.keys(value)) {
            const item = value[key];
            if (!isPlainObject(item) || !item.id) continue;
            sessions.push({
              sessionId: decodeKey(key),
              id: String(item.id),
              name: String(item.name || 'Pengguna'),
              role: item.role === 'master' || item.role === 'guest' ? item.role : 'client',
              docId: item.docId ? String(item.docId) : null,
              tab: item.tab ? String(item.tab) : null,
              since: Number(item.since) || 0,
              at: Number(item.at) || 0,
            });
          }
        }
        sessions.sort((a, b) => a.since - b.since);
        callback(sessions);
      },
      onError
    );
  }

  /* ---------------------------------------------------------------- Aktivitas */

  logActivity({ type, projectId, projectName, detail, count }) {
    const id = this.driver.newId();
    this.driver
      .write({
        [this.abs(paths.activityEntry(id))]: sanitizeTree({
          at: this.driver.timestamp,
          by: this.who(),
          type,
          projectId,
          projectName,
          detail,
          count,
        }),
      })
      .catch(() => {});
    return id;
  }

  /**
   * Mencatat aktivitas edit secara ringkas: rentetan edit sejenis pada proyek yang sama
   * dalam beberapa menit digabung menjadi satu entri (jumlahnya bertambah).
   */
  noteEdit(projectId, projectName, kind, changes = 1) {
    const key = `${projectId}:${kind}`;
    const now = Date.now();
    const current = this.editActivity.get(key);
    if (current && now - current.startedAt < this.limits.activityCoalesceMs) {
      current.count += changes;
      current.projectName = projectName;
      // Pembaruan jumlah dikirim paling sering sekali per beberapa detik agar pengetikan
      // cepat tidak membanjiri semua perangkat dengan pembaruan log.
      if (!current.timer) {
        current.timer = setTimeout(() => {
          current.timer = null;
          const base = this.abs(paths.activityEntry(current.id));
          this.driver
            .write({
              [`${base}/count`]: current.count,
              [`${base}/at`]: this.driver.timestamp,
              [`${base}/projectName`]: current.projectName,
            })
            .catch(() => {});
        }, this.limits.activityWriteThrottleMs);
      }
      return;
    }
    if (current?.timer) clearTimeout(current.timer);
    const id = this.logActivity({ type: `edit.${kind}`, projectId, projectName, count: changes });
    this.editActivity.set(key, { id, count: changes, projectName, startedAt: now, timer: null });
  }

  watchActivity(callback, onError) {
    return this.driver.listen(
      this.abs(paths.activity),
      (value) => {
        const feed = [];
        if (isPlainObject(value)) {
          for (const key of Object.keys(value)) {
            const item = value[key];
            if (!isPlainObject(item) || !item.type) continue;
            feed.push({
              id: key,
              at: Number(item.at) || 0,
              type: String(item.type),
              by: isPlainObject(item.by)
                ? { id: String(item.by.id || ''), name: String(item.by.name || 'Pengguna'), role: String(item.by.role || 'client') }
                : { id: '', name: 'Pengguna', role: 'client' },
              projectId: item.projectId ? String(item.projectId) : null,
              projectName: item.projectName ? String(item.projectName) : null,
              detail: item.detail ? String(item.detail) : null,
              count: Number(item.count) || 0,
            });
          }
        }
        feed.sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1));
        callback(feed);
      },
      onError,
      { limitToLast: this.limits.activityFeed }
    );
  }

  /** Memangkas log aktivitas lama agar database tidak tumbuh tanpa batas (Master). */
  async pruneActivity(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const oldest = await this.driver.readOldest(this.abs(paths.activity), 200);
    const cutoff = this.driver.now() - maxAgeMs;
    const patch = {};
    for (const key of Object.keys(oldest)) {
      if ((Number(oldest[key]?.at) || 0) < cutoff) patch[this.abs(paths.activityEntry(key))] = null;
    }
    if (!isEmptyPatch(patch)) await this.driver.write(patch);
    return Object.keys(patch).length;
  }

  /* ---------------------------------------------------------------- OTP */

  /**
   * Master menerbitkan kode izin 6 digit. Hanya hash-nya yang disimpan di cloud.
   * @returns {Promise<{ code: string, hash: string, createdAt: number, expiresAt: number }>}
   */
  async issueOtp() {
    const code = randomDigits(6);
    const salt = randomHex(8);
    const hash = await hashOtp(salt, code);
    const createdAt = this.driver.now();
    const expiresAt = createdAt + this.limits.otpTtlMs;
    await this.driver.write({
      [this.abs(paths.otp)]: { hash, salt, createdAt, expiresAt, issuedBy: this.who().name, attempts: 0 },
    });
    return { code, hash, createdAt, expiresAt };
  }

  watchOtp(callback, onError) {
    return this.driver.listen(
      this.abs(paths.otp),
      (value) => callback(isPlainObject(value) ? { ...value, now: this.driver.now() } : null),
      onError
    );
  }

  /**
   * Klien menukarkan kode. Penandaan "terpakai" memakai transaksi sehingga satu kode
   * benar-benar hanya bisa dipakai satu kali walau dimasukkan di dua perangkat bersamaan.
   */
  async redeemOtp(code, purpose) {
    const clean = String(code || '').trim();
    if (!/^\d{6}$/.test(clean)) return { success: false, message: 'Kode OTP harus 6 digit angka.' };

    let record;
    try {
      record = await this.read(paths.otp);
    } catch {
      return { success: false, message: 'Verifikasi OTP membutuhkan koneksi internet.' };
    }
    if (!isPlainObject(record) || !record.hash) {
      return { success: false, message: 'Belum ada Kode OTP aktif. Minta Master membuka menu Cloud & membuat kode.' };
    }

    const candidate = await hashOtp(record.salt, clean);
    const now = this.driver.now();
    const who = this.who();
    const isUsable = (current) =>
      isPlainObject(current) && !current.usedAt && now < Number(current.expiresAt) && (Number(current.attempts) || 0) < OTP_MAX_ATTEMPTS;

    try {
      const result = await this.driver.transact(this.abs(paths.otp), (current) => {
        if (!isUsable(current) || current.hash !== candidate) return undefined;
        return { ...current, usedAt: now, usedBy: who.name, usedFor: String(purpose || '') };
      });
      if (result.committed) {
        return { success: true, message: 'Verifikasi berhasil. Izin diberikan (kode OTP telah hangus).' };
      }

      const current = result.value;
      if (isPlainObject(current) && current.usedAt) {
        return { success: false, message: 'Kode OTP ini sudah hangus (pernah digunakan). Minta kode baru dari Master.' };
      }
      if (isPlainObject(current) && now >= Number(current.expiresAt)) {
        return { success: false, message: 'Kode OTP sudah kedaluwarsa. Minta kode baru dari Master.' };
      }
      if (isPlainObject(current) && (Number(current.attempts) || 0) >= OTP_MAX_ATTEMPTS) {
        return { success: false, message: 'Terlalu banyak percobaan salah. Kode diblokir — minta kode baru dari Master.' };
      }
      // Kode salah: catat percobaan agar tebak-tebakan beruntun mengunci kode.
      await this.driver
        .transact(this.abs(paths.otp), (latest) =>
          isUsable(latest) && latest.hash === record.hash ? { ...latest, attempts: (Number(latest.attempts) || 0) + 1 } : undefined
        )
        .catch(() => {});
      return { success: false, message: 'Kode OTP salah. Periksa kembali kode dari Master.' };
    } catch {
      return { success: false, message: 'Verifikasi OTP membutuhkan koneksi internet.' };
    }
  }
}

export function bundleToSnapshot(bundle) {
  return {
    stateSnapshot: docToState(bundle.boq),
    scheduleSnapshot: docToSchedule(bundle.schedule),
    calcSnapshot: docToCalc(bundle.calc),
  };
}

function decodeRevisionList(index, data) {
  const list = [];
  if (isPlainObject(index)) {
    for (const key of Object.keys(index)) {
      const revision = decodeRevision(decodeKey(key), index[key], isPlainObject(data) ? data[key] : undefined);
      if (revision) list.push(revision);
    }
  }
  list.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return list;
}

export const OTP_ATTEMPT_LIMIT = OTP_MAX_ATTEMPTS;
