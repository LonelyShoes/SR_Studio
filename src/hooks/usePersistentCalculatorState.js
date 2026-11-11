import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * State kalkulator persisten, DIPISAH PER DOKUMEN RAB dan tersinkron realtime.
 *
 * Nilai tiap input disimpan sebagai string JSON di `calculatorStore` (store eksternal):
 *  - localStorage dengan kunci `<key>@@<scope>` → bertahan saat refresh / offline (PWA)
 *  - kanal cloud (lihat SyncEngine) → terlihat & terbarui di semua perangkat secara realtime
 *
 * scope = id dokumen RAB yang sedang dibuka, atau '__draft__' bila belum ada dokumen.
 */

export const CALC_KEY_PREFIX = 'sr_calc_';
export const DRAFT_SCOPE = '__draft__';
const SCOPE_SEPARATOR = '@@';
const MIGRATION_FLAG_KEY = 'sr_studio_calc_scope_migrated_v1';
const ACTIVE_LIBRARY_ID_KEY = 'sr_studio_active_library_id_v2';

/**
 * Kunci yang hanya menyimpan STATUS TAMPILAN per pengguna (tab/mode/pilihan yang sedang aktif).
 * Tetap persisten di perangkat, tetapi tidak disinkronkan: jika ikut tersinkron, berpindah
 * tab di satu perangkat akan ikut memindahkan tampilan pengguna lain.
 */
const LOCAL_ONLY_KEYS = new Set([
  'sr_calc_mep_active_mode',
  'sr_calc_fd_active_sub',
  'sr_calc_rf_active_mode',
  'sr_calc_rts_view_tab',
  'sr_calc_rts_view_mode',
  'sr_calc_dw_selected_id',
]);
export const isLocalOnlyCalculatorKey = (key) => LOCAL_ONLY_KEYS.has(key);

const normalizeScope = (scope) => scope || DRAFT_SCOPE;
const scopedKey = (key, scope) => `${key}${SCOPE_SEPARATOR}${normalizeScope(scope)}`;
const hasStorage = () => typeof localStorage !== 'undefined';

function listCalculatorKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CALC_KEY_PREFIX)) keys.push(key);
  }
  return keys;
}

/**
 * Migrasi satu kali: kunci lama (tanpa scope) dipindahkan ke scope dokumen yang
 * sedang aktif saat aplikasi pertama kali dibuka setelah update, agar isian lama tidak hilang.
 */
function migrateLegacyKeys() {
  try {
    if (!hasStorage() || localStorage.getItem(MIGRATION_FLAG_KEY)) return;
    const scope = localStorage.getItem(ACTIVE_LIBRARY_ID_KEY) || DRAFT_SCOPE;
    listCalculatorKeys()
      .filter((key) => !key.includes(SCOPE_SEPARATOR))
      .forEach((key) => {
        const target = scopedKey(key, scope);
        if (localStorage.getItem(target) === null) localStorage.setItem(target, localStorage.getItem(key));
        localStorage.removeItem(key);
      });
    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch (err) {
    console.warn('[SR Studio] Gagal migrasi state kalkulator lama:', err);
  }
}

migrateLegacyKeys();

function readScope(scope) {
  const values = new Map();
  try {
    if (!hasStorage()) return values;
    const suffix = `${SCOPE_SEPARATOR}${normalizeScope(scope)}`;
    for (const fullKey of listCalculatorKeys()) {
      if (!fullKey.endsWith(suffix)) continue;
      const raw = localStorage.getItem(fullKey);
      if (raw !== null) values.set(fullKey.slice(0, -suffix.length), raw);
    }
  } catch (err) {
    console.warn('[SR Studio] Gagal memuat state kalkulator:', err);
  }
  return values;
}

/** Store eksternal isian kalkulator untuk satu scope aktif. */
export class CalculatorStore {
  #scope = DRAFT_SCOPE;
  #values = new Map();
  #dirty = new Set();
  #keyListeners = new Map();
  #changeListeners = new Set();

  constructor(scope) {
    this.#scope = normalizeScope(scope);
    this.#values = readScope(this.#scope);
  }

  get scope() {
    return this.#scope;
  }

  /** @returns {string | undefined} string JSON mentah */
  get(key) {
    return this.#values.get(key);
  }

  /** @returns {Record<string, string>} salinan seluruh isian scope aktif */
  snapshot() {
    return Object.fromEntries(this.#values);
  }

  /** Isian yang ikut disinkronkan ke cloud (tanpa status tampilan per pengguna). */
  syncSnapshot() {
    const out = {};
    for (const [key, raw] of this.#values) if (!LOCAL_ONLY_KEYS.has(key)) out[key] = raw;
    return out;
  }

  /** Menerapkan isian dari cloud; status tampilan lokal dipertahankan. */
  replaceSynced(values) {
    const next = { ...(values || {}) };
    for (const [key, raw] of this.#values) if (LOCAL_ONLY_KEYS.has(key)) next[key] = raw;
    this.replaceAll(next);
  }

  /** Perubahan oleh pengguna. `raw === undefined` menghapus kunci. */
  set(key, raw) {
    if (this.#values.get(key) === raw) return;
    if (raw === undefined) this.#values.delete(key);
    else this.#values.set(key, raw);
    this.#dirty.add(key);
    this.#notifyKey(key);
    for (const listener of this.#changeListeners) listener();
  }

  /**
   * Mengganti seluruh isian (data dari cloud). Hanya kunci yang benar-benar berubah
   * yang memicu render ulang. Tidak memanggil listener perubahan lokal.
   */
  replaceAll(values) {
    const next = new Map(Object.entries(values || {}));
    const changed = new Set();
    for (const key of this.#values.keys()) if (!next.has(key)) changed.add(key);
    for (const [key, raw] of next) if (this.#values.get(key) !== raw) changed.add(key);
    if (changed.size === 0) return;
    this.#values = next;
    for (const key of changed) {
      this.#dirty.add(key);
      this.#notifyKey(key);
    }
  }

  /** Berpindah dokumen: simpan scope lama lalu muat isian scope baru. */
  setScope(scope) {
    const next = normalizeScope(scope);
    if (next === this.#scope) return;
    this.persist();
    const previousKeys = [...this.#values.keys()];
    this.#scope = next;
    this.#values = readScope(next);
    this.#dirty.clear();
    for (const key of new Set([...previousKeys, ...this.#values.keys()])) this.#notifyKey(key);
  }

  /**
   * Mengganti nama scope tanpa mengubah isian (draf lokal → dokumen cloud baru, atau sebaliknya).
   * Isian ikut pindah di localStorage.
   */
  renameScope(scope) {
    const next = normalizeScope(scope);
    if (next === this.#scope) return;
    this.persist();
    copyCalculatorScope(this.#scope, next, { move: this.#scope === DRAFT_SCOPE });
    this.#scope = next;
  }

  /** Menulis kunci yang berubah ke localStorage. */
  persist() {
    if (this.#dirty.size === 0 || !hasStorage()) return;
    try {
      for (const key of this.#dirty) {
        const raw = this.#values.get(key);
        if (raw === undefined) localStorage.removeItem(scopedKey(key, this.#scope));
        else localStorage.setItem(scopedKey(key, this.#scope), raw);
      }
      this.#dirty.clear();
    } catch (err) {
      console.warn('[SR Studio] Gagal menyimpan state kalkulator ke localStorage:', err);
    }
  }

  /** Memuat ulang scope aktif dari localStorage (setelah isiannya diubah dari luar store). */
  reload() {
    const previousKeys = [...this.#values.keys()];
    this.#values = readScope(this.#scope);
    this.#dirty.clear();
    for (const key of new Set([...previousKeys, ...this.#values.keys()])) this.#notifyKey(key);
  }

  subscribe(key, listener) {
    let listeners = this.#keyListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.#keyListeners.set(key, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.#keyListeners.delete(key);
    };
  }

  /** Dipanggil setiap ada perubahan oleh pengguna (bukan dari cloud). */
  onChange(listener) {
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  #notifyKey(key) {
    const listeners = this.#keyListeners.get(key);
    if (listeners) for (const listener of [...listeners]) listener();
  }
}

function initialScope() {
  try {
    return hasStorage() ? localStorage.getItem(ACTIVE_LIBRARY_ID_KEY) : null;
  } catch {
    return null;
  }
}

export const calculatorStore = new CalculatorStore(initialScope());

function parseStored(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Pengganti `useState` untuk input kalkulator.
 * @param {string} key Kunci unik (mis. 'sr_calc_wall_luas')
 * @param {any} initialValue Nilai awal bila belum pernah diisi
 */
export function usePersistentState(key, initialValue) {
  // Nilai awal dibekukan per instance agar referensinya stabil di antara render.
  const [fallback] = useState(() => (typeof initialValue === 'function' ? initialValue() : initialValue));

  const subscribe = useCallback((listener) => calculatorStore.subscribe(key, listener), [key]);
  const getSnapshot = useCallback(() => calculatorStore.get(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const value = useMemo(() => (raw === undefined ? fallback : parseStored(raw, fallback)), [raw, fallback]);

  const setValue = useCallback(
    (next) => {
      const currentRaw = calculatorStore.get(key);
      const current = currentRaw === undefined ? fallback : parseStored(currentRaw, fallback);
      const resolved = typeof next === 'function' ? next(current) : next;
      calculatorStore.set(key, resolved === undefined ? undefined : JSON.stringify(resolved));
    },
    [key, fallback]
  );

  return [value, setValue];
}

/** Mengosongkan isian satu kalkulator (berdasarkan prefiks kunci) pada dokumen yang sedang dibuka. */
export function clearCalculatorStorage(prefix) {
  for (const key of Object.keys(calculatorStore.snapshot())) {
    if (key.startsWith(prefix)) calculatorStore.set(key, undefined);
  }
}

/**
 * Menyalin (atau memindahkan) seluruh isian kalkulator dari satu scope ke scope lain di localStorage.
 */
export function copyCalculatorScope(fromScope, toScope, { move = false } = {}) {
  const from = normalizeScope(fromScope);
  const to = normalizeScope(toScope);
  if (from === to) return;
  try {
    if (!hasStorage()) return;
    const suffix = `${SCOPE_SEPARATOR}${from}`;
    listCalculatorKeys()
      .filter((key) => key.endsWith(suffix))
      .forEach((key) => {
        const baseKey = key.slice(0, -suffix.length);
        localStorage.setItem(scopedKey(baseKey, to), localStorage.getItem(key));
        if (move) localStorage.removeItem(key);
      });
  } catch (err) {
    console.error(`[SR Studio] Gagal menyalin state kalkulator ${from} → ${to}:`, err);
  }
}

/** Menghapus seluruh isian kalkulator milik satu dokumen dari perangkat ini. */
export function clearCalculatorScope(scope) {
  try {
    if (!hasStorage()) return;
    const suffix = `${SCOPE_SEPARATOR}${normalizeScope(scope)}`;
    listCalculatorKeys()
      .filter((key) => key.endsWith(suffix))
      .forEach((key) => localStorage.removeItem(key));
    if (normalizeScope(scope) === calculatorStore.scope) calculatorStore.reload();
  } catch (err) {
    console.error(`[SR Studio] Gagal menghapus state kalkulator ${scope}:`, err);
  }
}
