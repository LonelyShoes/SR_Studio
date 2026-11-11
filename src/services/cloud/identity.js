/**
 * Identitas perangkat & otorisasi peran.
 *
 * Aplikasi tidak memakai akun: setiap perangkat punya id acak + nama tampilan yang dipakai di
 * daftar "online" dan log aktivitas. Peran Master dibuka dengan Master Code yang diverifikasi
 * terhadap hash PBKDF2 (kode asli tidak ada di bundle JavaScript).
 *
 * Catatan keamanan: ini adalah pembatas di sisi aplikasi. Perlindungan data yang sesungguhnya
 * berada di Firebase Security Rules (lihat `database.rules.json` & README).
 */

import { MASTER_CODE_HASH, MASTER_CODE_ITERATIONS, MASTER_CODE_SALT, STORAGE_KEYS } from './config.js';
import { pbkdf2Hex, randomHex, safeEqual } from './crypto.js';
import { localStore } from '../storage/localStore.js';

export const ROLES = Object.freeze({ master: 'master', client: 'client' });

let cachedClientId = null;
const sessionSuffix = randomHex(3);

/** Id perangkat yang menetap (per browser). */
export function getClientId(store = localStore) {
  if (cachedClientId) return cachedClientId;
  let id = store.getRaw(STORAGE_KEYS.clientId);
  if (!id || !/^[a-z0-9]{8,32}$/.test(id)) {
    id = randomHex(8);
    store.setRaw(STORAGE_KEYS.clientId, id);
  }
  cachedClientId = id;
  return id;
}

/** Id sesi (per tab/pemuatan halaman) — dipakai untuk presence. */
export const getSessionId = (store = localStore) => `${getClientId(store)}-${sessionSuffix}`;

export function defaultDisplayName(role, clientId = getClientId()) {
  const tag = clientId.slice(-4).toUpperCase();
  return role === ROLES.master ? `Master ${tag}` : `Klien ${tag}`;
}

export function getStoredDisplayName(store = localStore) {
  const name = store.getRaw(STORAGE_KEYS.displayName);
  return typeof name === 'string' ? name.trim().slice(0, 40) : '';
}

export function setStoredDisplayName(name, store = localStore) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (clean) store.setRaw(STORAGE_KEYS.displayName, clean);
  else store.remove(STORAGE_KEYS.displayName);
  return clean;
}

export function getStoredRole(store = localStore) {
  const role = store.getRaw(STORAGE_KEYS.role);
  return role === ROLES.master || role === ROLES.client ? role : null;
}

export function setStoredRole(role, store = localStore) {
  if (role === ROLES.master || role === ROLES.client) store.setRaw(STORAGE_KEYS.role, role);
  else store.remove(STORAGE_KEYS.role);
  // Kunci lama dibersihkan agar tidak ada dua sumber kebenaran peran.
  store.remove(STORAGE_KEYS.legacyMasterDevice);
  store.remove(STORAGE_KEYS.legacyCloudConfig);
}

/** @returns {Promise<boolean>} */
export async function verifyMasterCode(input) {
  const code = String(input || '').trim();
  if (!code) return false;
  const hash = await pbkdf2Hex(code, MASTER_CODE_SALT, MASTER_CODE_ITERATIONS);
  return safeEqual(hash, MASTER_CODE_HASH);
}
