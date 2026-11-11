/**
 * Cache Library di IndexedDB.
 *
 * Snapshot proyek & riwayat versi berukuran besar (ratusan KB per proyek), terlalu besar untuk
 * localStorage (kuota ±5 MB). IndexedDB dipakai agar Library tetap bisa dibuka instan dan saat
 * offline, berapa pun jumlah proyeknya. Bila IndexedDB tidak tersedia (mode privat tertentu),
 * cache turun menjadi memori saja — aplikasi tetap berjalan, hanya tanpa arsip offline.
 */

const DB_NAME = 'sr-studio';
const DB_VERSION = 1;
const STORE = 'library';

function openDatabase(factory) {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB diblokir tab lain'));
  });
}

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * @returns {{ loadAll(): Promise<object[]>, put(record: object): Promise<boolean>, remove(id: string): Promise<void>, clear(): Promise<void> }}
 */
export function createLibraryCache(factory = globalThis.indexedDB) {
  const memory = new Map();
  let databasePromise = null;
  let disabled = false;

  const database = () => {
    if (disabled) return Promise.resolve(null);
    if (!databasePromise) {
      databasePromise = openDatabase(factory).catch((error) => {
        disabled = true;
        // Tanpa IndexedDB sama sekali (lingkungan uji / browser lama) adalah kondisi yang wajar.
        if (factory) console.warn('[SR Studio] Cache Library memakai memori:', error?.message || error);
        return null;
      });
    }
    return databasePromise;
  };

  const run = async (mode, action) => {
    const db = await database();
    if (!db) return undefined;
    try {
      return await action(db.transaction(STORE, mode).objectStore(STORE));
    } catch (error) {
      console.warn('[SR Studio] Operasi cache Library gagal:', error);
      return undefined;
    }
  };

  return {
    async loadAll() {
      const records = await run('readonly', (store) => promisify(store.getAll()));
      if (Array.isArray(records)) {
        for (const record of records) memory.set(record.id, record);
      }
      return [...memory.values()];
    },

    async put(record) {
      if (!record || !record.id) return false;
      memory.set(record.id, record);
      const result = await run('readwrite', (store) => promisify(store.put(record)));
      return result !== undefined;
    },

    async remove(id) {
      memory.delete(id);
      await run('readwrite', (store) => promisify(store.delete(id)));
    },

    async clear() {
      memory.clear();
      await run('readwrite', (store) => promisify(store.clear()));
    },
  };
}
