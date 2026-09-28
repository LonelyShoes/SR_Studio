/**
 * Master Authentication & Device Authorization Service
 * Mengelola status Master Device, verifikasi kode PIN Master (20022019),
 * dan konfigurasi Cloud Sync lokal pada perangkat.
 */

import {
  FIXED_MASTER_EMAIL,
  FIXED_MASTER_CODE,
  CLOUD_CONFIG_KEY,
  MASTER_DEVICE_KEY
} from './constants.js';

/**
 * Mengambil konfigurasi Cloud Sync lokal dari perangkat
 */
export function getCloudConfig() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CLOUD_CONFIG_KEY);
      const isMaster = localStorage.getItem(MASTER_DEVICE_KEY) === 'true';

      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isCloudEnabled: true,
          masterEmail: FIXED_MASTER_EMAIL,
          isMasterDevice: isMaster,
          lastSyncedAt: parsed.lastSyncedAt || null,
          allowClientView: true
        };
      }
    }
  } catch (e) {
    console.error('Failed to get cloud config:', e);
  }

  return {
    isCloudEnabled: true,
    masterEmail: FIXED_MASTER_EMAIL,
    isMasterDevice: false,
    lastSyncedAt: null,
    allowClientView: true
  };
}

/**
 * Menyimpan konfigurasi Cloud Sync ke penyimpanan lokal
 */
export function saveCloudConfig(config) {
  try {
    const current = getCloudConfig();
    const updated = { 
      ...current, 
      ...config,
      masterEmail: FIXED_MASTER_EMAIL
    };
    
    if (typeof localStorage !== 'undefined') {
      if (typeof config.isMasterDevice === 'boolean') {
        localStorage.setItem(MASTER_DEVICE_KEY, config.isMasterDevice ? 'true' : 'false');
      }
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Failed to save cloud config:', e);
    return config;
  }
}

/**
 * Verifikasi Master Code (Hanya FIXED_MASTER_CODE yang valid)
 */
export function verifyMasterPin(inputCode) {
  if (!inputCode) return { success: false, message: 'Master Code tidak boleh kosong.' };
  
  const cleanInput = inputCode.trim();

  if (cleanInput === FIXED_MASTER_CODE) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MASTER_DEVICE_KEY, 'true');
    }
    return { success: true, message: 'Otorisasi Master Berhasil! Perangkat ini sekarang aktif sebagai Master.' };
  }

  return { 
    success: false, 
    message: 'Master Code salah. Akses ditolak.' 
  };
}

/**
 * Keluar dari Mode Master (Menjadikan perangkat kembali sebagai Klien Read-Only)
 */
export function logoutMasterDevice() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MASTER_DEVICE_KEY, 'false');
  }
  const current = getCloudConfig();
  const updated = { ...current, isMasterDevice: false };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(updated));
  }
  return updated;
}
