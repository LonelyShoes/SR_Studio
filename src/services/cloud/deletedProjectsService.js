/**
 * Deleted Projects Management (Tombstones)
 * Mengelola daftar ID proyek yang telah dihapus permanen oleh Master
 * agar tidak kembali muncul saat sinkronisasi dua arah.
 */

import { DELETED_IDS_KEY } from './constants.js';

/**
 * Mengambil daftar ID proyek yang telah dihapus permanen oleh Master
 */
export function getDeletedProjectIds() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(DELETED_IDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get deleted project ids:', e);
  }
  return [];
}

/**
 * Menyimpan daftar ID proyek terhapus ke local storage
 */
export function saveDeletedProjectIds(ids) {
  try {
    if (typeof localStorage !== 'undefined') {
      const list = Array.isArray(ids) ? ids : [];
      // Simpan maksimal 500 ID terhapus terakhir
      const trimmed = list.slice(-500);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(trimmed));
      return trimmed;
    }
  } catch (e) {
    console.error('Failed to save deleted project ids:', e);
  }
  return ids;
}

/**
 * Menambahkan ID proyek ke daftar terhapus
 */
export function addDeletedProjectId(projectId) {
  if (!projectId) return;
  const current = getDeletedProjectIds();
  if (!current.includes(projectId)) {
    const updated = [...current, projectId];
    saveDeletedProjectIds(updated);
    return updated;
  }
  return current;
}
