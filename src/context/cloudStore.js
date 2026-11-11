/**
 * Instans tunggal SyncEngine untuk aplikasi + hook pembacanya.
 *
 * Status cloud (koneksi, pengguna online, log aktivitas, OTP) sengaja TIDAK dimasukkan ke
 * BoQContext: nilainya berubah sangat sering, dan memasukkannya ke context akan me-render
 * ulang seluruh kalkulator pada setiap perubahan. Komponen yang membutuhkannya berlangganan
 * langsung ke engine lewat `useCloud(selector)`.
 */

import { useSyncExternalStore } from 'react';
import { SyncEngine } from '../services/cloud/engine.js';
import { resolveDatabaseUrl } from '../services/cloud/config.js';
import { createFirebaseDriver } from '../services/cloud/drivers/firebaseDriver.js';
import { defaultDisplayName, getClientId, getSessionId } from '../services/cloud/identity.js';
import { createLibraryCache } from '../services/storage/libraryCache.js';
import { localStore } from '../services/storage/localStore.js';
import { calculatorStore } from '../hooks/usePersistentCalculatorState.js';

const noop = () => {};

/** Jembatan ke provider React: diisi oleh BoQProvider saat mount. */
export const engineBridge = {
  identity: { id: getClientId(), sessionId: getSessionId(), name: defaultDisplayName('client'), role: 'guest' },
  applyBoq: noop,
  applySchedule: noop,
  onDocChange: noop,
  notify: noop,
};

export const engine = new SyncEngine({
  createDriver: () => createFirebaseDriver(resolveDatabaseUrl(localStore.raw)),
  store: localStore,
  cache: createLibraryCache(),
  calcStore: calculatorStore,
  getIdentity: () => engineBridge.identity,
  hooks: {
    applyBoq: (updater) => engineBridge.applyBoq(updater),
    applySchedule: (updater) => engineBridge.applySchedule(updater),
    onDocChange: (docId, info) => engineBridge.onDocChange(docId, info),
    notify: (text, type) => engineBridge.notify(text, type),
  },
});

const identity = (snapshot) => snapshot;

/**
 * Berlangganan ke status cloud. `selector` harus mengembalikan referensi yang stabil
 * (ambil satu field, jangan membuat objek baru) agar komponen hanya render saat field itu berubah.
 */
export function useCloud(selector = identity) {
  return useSyncExternalStore(
    engine.subscribe,
    () => selector(engine.getSnapshot()),
    () => selector(engine.getSnapshot())
  );
}

/** Label & warna status sinkronisasi untuk ditampilkan di UI. */
export function describeSyncPhase(phase, pending = 0) {
  switch (phase) {
    case 'synced':
      return { label: 'Realtime', detail: 'Semua perubahan tersimpan di cloud', tone: 'ok' };
    case 'syncing':
      return { label: 'Menyimpan…', detail: `${pending} perubahan sedang dikirim`, tone: 'busy' };
    case 'migrating':
      return { label: 'Menyiapkan…', detail: 'Menghubungkan & memeriksa data', tone: 'busy' };
    case 'connecting':
    case 'starting':
      return { label: 'Menghubungkan…', detail: 'Membuka koneksi ke cloud', tone: 'busy' };
    case 'offline':
      return {
        label: 'Offline',
        detail: pending > 0 ? `${pending} perubahan menunggu koneksi` : 'Perubahan disimpan di perangkat & dikirim saat online',
        tone: 'warn',
      };
    case 'error':
      return { label: 'Gangguan', detail: 'Sinkronisasi bermasalah, mencoba lagi…', tone: 'error' };
    default:
      return { label: 'Cloud', detail: '', tone: 'busy' };
  }
}
