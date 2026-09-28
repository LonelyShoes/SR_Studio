/**
 * Library Synchronization & QR Sync Service
 * Menangani smart merge dua arah, sinkronisasi multi-perangkat via
 * Firebase Realtime Database / Cloud Relay, dan QR Code sync.
 */

import {
  FIXED_MASTER_EMAIL,
  FIXED_MASTER_CODE,
  PRIMARY_CLOUD_URL,
  MASTER_DEVICE_KEY,
  hashMasterEmail
} from './constants.js';
import { getFirebaseConfig } from './firebaseService.js';
import { getDeletedProjectIds, saveDeletedProjectIds } from './deletedProjectsService.js';
import { saveCloudConfig } from './masterAuthService.js';

/**
 * Smart Merge dua set library berdasarkan id dan timestamp updatedAt/createdAt,
 * serta memfilter proyek yang telah dihapus oleh Master.
 */
export function mergeLibraries(localList = [], remoteList = [], deletedIds = []) {
  const map = new Map();
  const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : getDeletedProjectIds());
  
  const safeLocal = Array.isArray(localList) 
    ? localList 
    : (localList && typeof localList === 'object' ? Object.values(localList) : []);
  const safeRemote = Array.isArray(remoteList) 
    ? remoteList 
    : (remoteList && typeof remoteList === 'object' ? Object.values(remoteList) : []);

  safeLocal.forEach(item => {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  });

  safeRemote.forEach(remoteItem => {
    if (remoteItem && remoteItem.id && !deletedSet.has(remoteItem.id)) {
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
        const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
        if (remoteTime >= localTime) {
          map.set(remoteItem.id, remoteItem);
        }
      }
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return merged;
}

/**
 * Sinkronisasi Library: Mengunggah library dari perangkat ke Firebase / Cloud Storage 24/7
 * Mendukung smart merge 2 arah untuk Master dan Klien (OTP) sehingga data proyek baru
 * dari Klien tidak akan hilang dan langsung tersimpan ke Database Cloud.
 */
export async function uploadLibraryToCloud(libraryData, customConfig = null) {
  const namespace = hashMasterEmail(FIXED_MASTER_EMAIL);
  const now = new Date().toISOString();
  const safeLibrary = Array.isArray(libraryData) 
    ? libraryData 
    : (libraryData && typeof libraryData === 'object' ? Object.values(libraryData) : []);
  const localDeleted = getDeletedProjectIds();
  
  let finalLibrary = safeLibrary;
  let finalDeletedIds = localDeleted;
  const fbConfig = customConfig?.firebase || getFirebaseConfig();
  const isMaster = customConfig?.isMasterDevice ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(MASTER_DEVICE_KEY) === 'true' : false);
  const forceOverwrite = customConfig?.overwrite && isMaster;

  // Lakukan pre-fetch merge jika bukan forceOverwrite agar perubahan lokal dan remote saling melengkapi
  if (!forceOverwrite && fbConfig && fbConfig.dbUrl) {
    const cleanUrl = fbConfig.dbUrl.trim().replace(/\/+$/, '');
    const authParam = fbConfig.authToken ? `?auth=${fbConfig.authToken.trim()}` : '';
    const endpoint = `${cleanUrl}/sr_studio_library/${namespace}.json${authParam}`;

    try {
      const getRes = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (getRes.ok) {
        const remotePayload = await getRes.json();
        if (remotePayload) {
          const remoteDeleted = Array.isArray(remotePayload.deletedIds) ? remotePayload.deletedIds : [];
          finalDeletedIds = Array.from(new Set([...localDeleted, ...remoteDeleted]));
          saveDeletedProjectIds(finalDeletedIds);

          if (Array.isArray(remotePayload.library)) {
            finalLibrary = mergeLibraries(safeLibrary, remotePayload.library, finalDeletedIds);
          }
        }
      }
    } catch (e) {
      console.warn('Pre-upload fetch merge warning:', e);
    }
  }

  const payload = {
    masterEmail: FIXED_MASTER_EMAIL,
    updatedAt: now,
    itemCount: finalLibrary.length,
    library: finalLibrary,
    deletedIds: finalDeletedIds,
    security: {
      masterCodeHash: btoa(FIXED_MASTER_CODE)
    }
  };

  const storageKey = `cloud_lib_${namespace}`;

  // 1. Simpan di local cache
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  } catch (e) {
    console.warn('Local storage cache error:', e);
  }

  let isUploaded = false;
  let uploadSource = 'local';

  // 2. Unggah ke Firebase Realtime Database
  if (fbConfig && fbConfig.dbUrl) {
    const cleanUrl = fbConfig.dbUrl.trim().replace(/\/+$/, '');
    const authParam = fbConfig.authToken ? `?auth=${fbConfig.authToken.trim()}` : '';
    const endpoint = `${cleanUrl}/sr_studio_library/${namespace}.json${authParam}`;

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        isUploaded = true;
        uploadSource = 'firebase';
      } else {
        console.warn('Firebase upload error with status:', res.status);
      }
    } catch (err) {
      console.warn('Firebase upload network error:', err);
    }
  }

  // 3. Cadangan: Unggah ke Global Cloud Storage Relay
  if (!isUploaded) {
    try {
      const putRes = await fetch(PRIMARY_CLOUD_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `sr_studio_library_${namespace}`,
          data: payload
        })
      });

      if (putRes.ok) {
        isUploaded = true;
        uploadSource = 'relay';
      }
    } catch (error) {
      console.error('Relay cloud upload fallback error:', error);
    }
  }

  saveCloudConfig({ lastSyncedAt: now });
  return { 
    success: true, 
    uploaded: isUploaded, 
    source: uploadSource, 
    syncedAt: now,
    library: finalLibrary,
    deletedIds: finalDeletedIds
  };
}

/**
 * Mengambil Library terbaru dari Firebase / Cloud Storage (untuk HP / Perangkat Lain)
 */
export async function fetchLibraryFromCloud(customConfig = null) {
  const namespace = hashMasterEmail(FIXED_MASTER_EMAIL);
  const storageKey = `cloud_lib_${namespace}`;
  const fbConfig = customConfig?.firebase || getFirebaseConfig();

  // 1. Coba ambil dari Firebase Realtime Database
  if (fbConfig && fbConfig.dbUrl) {
    const cleanUrl = fbConfig.dbUrl.trim().replace(/\/+$/, '');
    const authParam = fbConfig.authToken ? `?auth=${fbConfig.authToken.trim()}` : '';
    const endpoint = `${cleanUrl}/sr_studio_library/${namespace}.json${authParam}`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload) {
          const rawLib = payload.library;
          const library = Array.isArray(rawLib) 
            ? rawLib 
            : (rawLib && typeof rawLib === 'object' ? Object.values(rawLib) : []);
          const rawDel = payload.deletedIds;
          const deletedIds = Array.isArray(rawDel) 
            ? rawDel 
            : (rawDel && typeof rawDel === 'object' ? Object.values(rawDel) : []);
          
          if (deletedIds.length > 0) {
            const currentDeleted = getDeletedProjectIds();
            saveDeletedProjectIds(Array.from(new Set([...currentDeleted, ...deletedIds])));
          }

          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(payload));
            saveCloudConfig({ lastSyncedAt: new Date().toISOString() });
          }

          return {
            success: true,
            library,
            deletedIds,
            updatedAt: payload.updatedAt || new Date().toISOString(),
            source: 'firebase'
          };
        }
      }
    } catch (err) {
      console.warn('Firebase fetch failed, trying relay fallback:', err);
    }
  }

  // 2. Coba ambil dari Cloud Storage Relay
  try {
    const response = await fetch(PRIMARY_CLOUD_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response && response.ok) {
      const result = await response.json();
      const payload = result?.data || result;
      if (payload) {
        const rawLib = payload.library;
        const library = Array.isArray(rawLib) 
          ? rawLib 
          : (rawLib && typeof rawLib === 'object' ? Object.values(rawLib) : []);
        const rawDel = payload.deletedIds;
        const deletedIds = Array.isArray(rawDel) 
          ? rawDel 
          : (rawDel && typeof rawDel === 'object' ? Object.values(rawDel) : []);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(payload));
          saveCloudConfig({ lastSyncedAt: new Date().toISOString() });
        }
        return {
          success: true,
          library,
          deletedIds,
          updatedAt: payload.updatedAt || new Date().toISOString(),
          source: 'relay'
        };
      }
    }
  } catch (error) {
    console.warn('Direct cloud fetch failed, checking local cache:', error);
  }

  // 3. Cek cache lokal jika jaringan offline
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.library)) {
          return {
            success: true,
            library: parsed.library,
            deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
            updatedAt: parsed.updatedAt,
            source: 'cache'
          };
        }
      }
    }
  } catch (e) {}

  return {
    success: true,
    library: [],
    deletedIds: getDeletedProjectIds(),
    updatedAt: null,
    source: 'empty'
  };
}

/**
 * Generate QR Code URL untuk direct scan sync antar perangkat
 */
export function getCloudSyncQrUrl(libraryData, fbConfig = null) {
  try {
    const activeFb = fbConfig || getFirebaseConfig();
    const compactData = {
      library: (libraryData || []).map(p => ({
        id: p.id,
        name: p.name,
        client: p.client,
        location: p.location,
        grandTotal: p.grandTotal,
        filledItemsCount: p.filledItemsCount,
        date: p.date,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        stateSnapshot: p.stateSnapshot
      })),
      firebase: activeFb.isConfigured ? { dbUrl: activeFb.dbUrl, authToken: activeFb.authToken } : null
    };
    const dataStr = JSON.stringify(compactData);
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://sr-studio.vercel.app';
    const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/';
    const syncUrl = `${origin}${pathname}#sync=${encodeURIComponent(dataStr)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(syncUrl)}`;
  } catch (e) {
    return null;
  }
}
