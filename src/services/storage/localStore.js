/**
 * Pembungkus localStorage yang tidak pernah melempar error
 * (mode privat, kuota penuh, atau JSON rusak ditangani dengan nilai fallback).
 */

function resolveStorage() {
  try {
    return typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

export function createLocalStore(storage = resolveStorage()) {
  return {
    raw: storage,

    getRaw(key) {
      try {
        return storage ? storage.getItem(key) : null;
      } catch {
        return null;
      }
    },

    get(key, fallback = null) {
      const raw = this.getRaw(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    /** @returns {boolean} false bila gagal tersimpan (mis. kuota penuh) */
    setRaw(key, value) {
      try {
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(`[SR Studio] Gagal menyimpan "${key}" ke localStorage:`, error);
        return false;
      }
    },

    set(key, value) {
      return this.setRaw(key, JSON.stringify(value));
    },

    remove(key) {
      try {
        storage?.removeItem(key);
      } catch {
        // diabaikan
      }
    },

    /** Semua kunci yang cocok dengan predikat. */
    keys(predicate = () => true) {
      const out = [];
      try {
        for (let i = 0; storage && i < storage.length; i++) {
          const key = storage.key(i);
          if (key && predicate(key)) out.push(key);
        }
      } catch {
        // diabaikan
      }
      return out;
    },
  };
}

export const localStore = createLocalStore();
