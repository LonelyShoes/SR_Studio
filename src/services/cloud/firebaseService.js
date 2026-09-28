/**
 * Firebase Realtime Database Service
 * Mengelola konfigurasi URL database, authentication token, dan pengujian koneksi.
 */

import { DEFAULT_FIREBASE_DB_URL, FIREBASE_CONFIG_KEY } from './constants.js';

/**
 * Mengambil konfigurasi Firebase tersimpan (Default: Official Firebase Realtime DB)
 */
export function getFirebaseConfig() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const url = (parsed.dbUrl || DEFAULT_FIREBASE_DB_URL).trim().replace(/\/+$/, '');
        return {
          dbUrl: url || DEFAULT_FIREBASE_DB_URL,
          authToken: parsed.authToken || '',
          isConfigured: true
        };
      }
    }
  } catch (e) {
    console.error('Failed to get firebase config:', e);
  }
  return {
    dbUrl: DEFAULT_FIREBASE_DB_URL,
    authToken: '',
    isConfigured: true
  };
}

/**
 * Menyimpan konfigurasi Firebase ke local storage
 */
export function saveFirebaseConfig(config) {
  try {
    const current = getFirebaseConfig();
    const cleanUrl = (config.dbUrl || '').trim().replace(/\/+$/, '');
    const updated = {
      ...current,
      ...config,
      dbUrl: cleanUrl,
      isConfigured: cleanUrl.length > 0
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Failed to save firebase config:', e);
    return config;
  }
}

/**
 * Menguji koneksi ke Firebase Realtime Database
 */
export async function testFirebaseConnection(rawUrl, authToken = '') {
  if (!rawUrl || !rawUrl.trim()) {
    return { success: false, message: 'URL Firebase Database tidak boleh kosong.' };
  }

  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.startsWith('https://')) {
    return { success: false, message: 'URL Firebase harus dimulai dengan https://' };
  }

  const authParam = authToken && authToken.trim() ? `?auth=${authToken.trim()}` : '';
  const testEndpoint = `${cleanUrl}/sr_studio_test_connection.json${authParam}`;

  try {
    const putRes = await fetch(testEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'connected',
        testedAt: new Date().toISOString(),
        appName: 'SR Studio BoQ Tools'
      })
    });

    if (putRes.ok) {
      return {
        success: true,
        message: 'Koneksi Firebase Berhasil! Realtime Database siap digunakan untuk sinkronisasi 24/7.'
      };
    }

    if (putRes.status === 401 || putRes.status === 403) {
      return {
        success: false,
        message: 'Akses Ditolak (Permission Denied). Pastikan Rules Firebase Realtime Database Anda diatur ke: { "rules": { ".read": true, ".write": true } }'
      };
    }

    return {
      success: false,
      message: `Gagal menghubungkan ke Firebase (Status HTTP ${putRes.status}). Periksa kembali URL database.`
    };
  } catch (err) {
    return {
      success: false,
      message: `Gagal menghubungi server Firebase: ${err.message}. Pastikan URL benar dan perangkat terhubung ke internet.`
    };
  }
}
