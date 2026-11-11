/**
 * Outbox persisten (write-ahead log).
 *
 * Setiap patch dicatat SEBELUM dikirim dan dihapus setelah server mengonfirmasi.
 * Bila tab ditutup saat offline, patch yang belum terkonfirmasi dikirim ulang pada
 * pembukaan berikutnya, sehingga input pengguna tidak pernah hilang diam-diam.
 *
 * Tiap entri disimpan dengan kunci sendiri (`<prefix><id>`) supaya beberapa tab di
 * perangkat yang sama tidak saling menimpa daftar entri.
 */

/** Storage di memori dengan antarmuka localStorage (untuk test & lingkungan tanpa storage). */
export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export class Outbox {
  /** @param {{ storage?: Storage, prefix: string }} options */
  constructor({ storage, prefix }) {
    this.storage = storage || createMemoryStorage();
    this.prefix = `${prefix}:`;
    this.listeners = new Set();
    this.inflight = new Set();
    this.counter = 0;
  }

  /** Jumlah patch milik sesi ini yang belum dikonfirmasi server. */
  get size() {
    return this.inflight.size;
  }

  #notify() {
    for (const listener of this.listeners) listener(this.inflight.size);
  }

  /** Semua entri tersimpan (termasuk peninggalan sesi sebelumnya), terlama di depan. */
  list() {
    const entries = [];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key || !key.startsWith(this.prefix)) continue;
        try {
          const entry = JSON.parse(this.storage.getItem(key));
          if (entry && entry.id && entry.patch) entries.push(entry);
          else this.storage.removeItem(key);
        } catch {
          this.storage.removeItem(key);
        }
      }
    } catch {
      // storage tidak dapat dibaca → anggap kosong
    }
    return entries.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  }

  /** @returns {string} id entri */
  add(patch, meta) {
    this.counter += 1;
    const id = `${Date.now().toString(36)}-${this.counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.inflight.add(id);
    try {
      this.storage.setItem(this.prefix + id, JSON.stringify({ id, at: Date.now(), patch, ...meta }));
    } catch (error) {
      // Kuota penuh: patch tetap dikirim; hanya jaminan "selamat dari tab tertutup" yang hilang.
      console.warn('[SR Studio] Outbox tidak dapat disimpan ke storage:', error);
    }
    this.#notify();
    return id;
  }

  remove(id) {
    try {
      this.storage.removeItem(this.prefix + id);
    } catch {
      // diabaikan
    }
    if (this.inflight.delete(id)) this.#notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Mengirim ulang patch yang tertinggal dari sesi sebelumnya (berurutan).
 * Entri milik sesi yang sedang berjalan dilewati — itu masih ditangani pengirimnya.
 * @returns {Promise<{ sent: number, failed: number, docIds: string[] }>}
 */
export async function replayOutbox(driver, outbox) {
  const leftovers = outbox.list().filter((entry) => !outbox.inflight.has(entry.id));
  const docIds = new Set();
  let sent = 0;
  let failed = 0;
  await Promise.all(
    leftovers.map(async (entry) => {
      try {
        await driver.write(entry.patch);
        sent += 1;
        if (entry.docId) docIds.add(entry.docId);
      } catch (error) {
        failed += 1;
        console.warn('[SR Studio] Patch tertunda ditolak server dan dibuang:', error);
      } finally {
        outbox.remove(entry.id);
      }
    })
  );
  return { sent, failed, docIds: [...docIds] };
}
