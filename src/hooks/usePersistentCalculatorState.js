import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Penyimpanan persisten state kalkulator ke localStorage, DIPISAH PER LIBRARY RAB.
 *
 * Kunci disimpan sebagai `<key>@@<scope>`:
 * - scope = id proyek Library yang sedang dibuka (activeLibraryId)
 * - scope = '__draft__' bila belum ada proyek Library yang dibuka
 *
 * Menjamin progress input, dimensi, dan daftar elemen tetap tersimpan saat:
 * 1. Berpindah antar kalkulator (unmount/remount)
 * 2. Web di-refresh / browser ditutup dan dibuka kembali (juga saat offline via PWA)
 * 3. Berpindah Library RAB — tiap proyek punya isian kalkulatornya sendiri
 */

export const CALC_KEY_PREFIX = 'sr_calc_';
export const DRAFT_SCOPE = '__draft__';
const SCOPE_SEPARATOR = '@@';
const MIGRATION_FLAG_KEY = 'sr_studio_calc_scope_migrated_v1';
const ACTIVE_LIBRARY_ID_KEY = 'sr_studio_active_library_id_v2';

const CalculatorScopeContext = createContext(null);

/** Provider scope kalkulator — dipasang oleh BoQProvider dengan activeLibraryId. */
export function CalculatorScopeProvider({ scope, children }) {
  return createElement(CalculatorScopeContext.Provider, { value: scope || DRAFT_SCOPE }, children);
}

const normalizeScope = (scope) => scope || DRAFT_SCOPE;
const scopedKey = (key, scope) => `${key}${SCOPE_SEPARATOR}${normalizeScope(scope)}`;

function listCalculatorKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CALC_KEY_PREFIX)) keys.push(k);
  }
  return keys;
}

/**
 * Migrasi satu kali: kunci lama (tanpa scope) dipindahkan ke scope proyek yang
 * sedang aktif saat aplikasi pertama kali dibuka setelah update, agar isian lama tidak hilang.
 */
function migrateLegacyKeys() {
  try {
    if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_FLAG_KEY)) return;
    const scope = localStorage.getItem(ACTIVE_LIBRARY_ID_KEY) || DRAFT_SCOPE;
    listCalculatorKeys()
      .filter(k => !k.includes(SCOPE_SEPARATOR))
      .forEach(k => {
        const target = scopedKey(k, scope);
        if (localStorage.getItem(target) === null) {
          localStorage.setItem(target, localStorage.getItem(k));
        }
        localStorage.removeItem(k);
      });
    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch (err) {
    console.warn('[SR Studio] Gagal migrasi state kalkulator lama:', err);
  }
}

migrateLegacyKeys();

function readStored(fullKey, initialValue) {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(fullKey);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    }
  } catch (err) {
    console.warn(`[SR Studio] Gagal memuat state ${fullKey} dari localStorage:`, err);
  }
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

/**
 * @param {string} key - Unique storage key (e.g. 'sr_calc_wall_luas')
 * @param {any} initialValue - Nilai default awal
 */
export function usePersistentState(key, initialValue) {
  const scope = useContext(CalculatorScopeContext);
  const fullKey = scopedKey(key, scope);

  // `loaded: true` = nilai baru dibaca dari storage, tidak perlu ditulis ulang
  const [entry, setEntry] = useState(() => ({
    key: fullKey,
    value: readStored(fullKey, initialValue),
    loaded: true,
  }));

  // Library yang dibuka berganti saat kalkulator masih ter-mount → muat isian milik library baru
  let current = entry;
  if (entry.key !== fullKey) {
    current = { key: fullKey, value: readStored(fullKey, initialValue), loaded: true };
    setEntry(current);
  }

  useEffect(() => {
    if (entry.loaded) return;
    try {
      if (typeof window !== 'undefined') {
        if (entry.value === undefined) {
          localStorage.removeItem(entry.key);
        } else {
          localStorage.setItem(entry.key, JSON.stringify(entry.value));
        }
      }
    } catch (err) {
      console.warn(`[SR Studio] Gagal menyimpan state ${entry.key} ke localStorage:`, err);
    }
  }, [entry]);

  const setState = useCallback((next) => {
    setEntry(prev => ({
      key: prev.key,
      value: typeof next === 'function' ? next(prev.value) : next,
      loaded: false,
    }));
  }, []);

  return [current.value, setState];
}

/**
 * Membersihkan seluruh state tersimpan untuk satu kalkulator tertentu (semua library)
 * @param {string} prefix - Prefiks kunci (misal: 'sr_calc_foundation')
 */
export function clearCalculatorStorage(prefix) {
  try {
    if (typeof window !== 'undefined') {
      listCalculatorKeys()
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    }
  } catch (err) {
    console.error(`[SR Studio] Gagal mereset storage ${prefix}:`, err);
  }
}

/**
 * Menyalin (atau memindahkan) seluruh isian kalkulator dari satu scope library ke scope lain.
 * Dipakai saat draft disimpan menjadi proyek Library baru / revisi baru / duplikat.
 */
export function copyCalculatorScope(fromScope, toScope, { move = false } = {}) {
  const from = normalizeScope(fromScope);
  const to = normalizeScope(toScope);
  if (from === to) return;
  try {
    if (typeof window === 'undefined') return;
    const suffix = `${SCOPE_SEPARATOR}${from}`;
    listCalculatorKeys()
      .filter(k => k.endsWith(suffix))
      .forEach(k => {
        const baseKey = k.slice(0, -suffix.length);
        localStorage.setItem(scopedKey(baseKey, to), localStorage.getItem(k));
        if (move) localStorage.removeItem(k);
      });
  } catch (err) {
    console.error(`[SR Studio] Gagal menyalin state kalkulator ${from} → ${to}:`, err);
  }
}

/** Menghapus seluruh isian kalkulator milik satu library (mis. saat proyek dihapus). */
export function clearCalculatorScope(scope) {
  try {
    if (typeof window === 'undefined') return;
    const suffix = `${SCOPE_SEPARATOR}${normalizeScope(scope)}`;
    listCalculatorKeys()
      .filter(k => k.endsWith(suffix))
      .forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.error(`[SR Studio] Gagal menghapus state kalkulator ${scope}:`, err);
  }
}
