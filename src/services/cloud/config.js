/**
 * Konfigurasi terpusat layanan cloud SR Studio.
 *
 * Semua nilai bisa di-override lewat environment variable Vite (`VITE_*`) saat build,
 * sehingga tidak ada rahasia/alamat yang perlu diubah langsung di kode sumber.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const readEnv = (key, fallback) => {
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

/** Akun pemilik workspace (hanya ditampilkan sebagai kontak di UI). */
export const MASTER_EMAIL = readEnv('VITE_MASTER_EMAIL', 'muhrafi118b@gmail.com');

/**
 * Hash PBKDF2-SHA256 dari Master Code. Kode aslinya TIDAK disimpan di kode sumber.
 * Buat hash baru dengan: `npm run hash:master -- <kode-baru>` lalu set VITE_MASTER_CODE_HASH.
 */
export const MASTER_CODE_HASH = readEnv(
  'VITE_MASTER_CODE_HASH',
  'cfdd21ed28c90a1a16889c293ea4952edc485be4435f56ef206fafcf10914d9f'
);
export const MASTER_CODE_SALT = 'sr-studio:master:v1';
export const MASTER_CODE_ITERATIONS = 100000;

/** Firebase Realtime Database bawaan proyek. */
export const DEFAULT_DATABASE_URL = readEnv(
  'VITE_FIREBASE_DATABASE_URL',
  'https://sr-tool-94937-default-rtdb.asia-southeast1.firebasedatabase.app'
);

/**
 * ID workspace. Nilai bawaan sama dengan namespace sinkronisasi versi lama
 * (hash email master) agar data lama bisa dimigrasikan tanpa konfigurasi tambahan.
 */
export const WORKSPACE_ID = readEnv('VITE_WORKSPACE_ID', 'sr_boq_78odeb');

/** Akar data realtime (skema v3) dan lokasi blob versi lama (dibiarkan utuh sebagai cadangan). */
export const WORKSPACE_ROOT = `sr_studio_v3/${WORKSPACE_ID}`;
export const LEGACY_LIBRARY_PATH = `sr_studio_library/${WORKSPACE_ID}`;
export const SCHEMA_VERSION = 3;

/** Kunci localStorage. Kunci `*_v2` dipertahankan agar data perangkat lama tetap terbaca. */
export const STORAGE_KEYS = Object.freeze({
  boqState: 'sr_studio_boq_state_v2',
  schedule: 'sr_boq_schedule_config_v2',
  activeDocId: 'sr_studio_active_library_id_v2',
  role: 'sr_studio_active_role_v2',
  legacyLibrary: 'sr_studio_rab_library_v2',
  legacyCloudCache: `cloud_lib_${WORKSPACE_ID}`,
  legacyDeletedIds: 'sr_studio_deleted_project_ids_v2',
  legacyFirebaseConfig: 'sr_studio_firebase_config_v2',
  legacyCloudConfig: 'sr_studio_cloud_config_v2',
  legacyMasterDevice: 'sr_studio_is_master_device_v2',
  legacyActiveOtp: 'sr_studio_active_otp_v2',
  legacyUsedOtps: 'sr_studio_used_otps_v2',
  clientId: 'sr_studio_client_id_v3',
  displayName: 'sr_studio_display_name_v3',
  syncBase: 'sr_studio_sync_base_v3',
  outbox: 'sr_studio_outbox_v3',
  localMigration: 'sr_studio_local_migration_v3',
  legacyCheckAt: 'sr_studio_legacy_check_at_v3',
  masterOtp: 'sr_studio_master_otp_v3',
  databaseUrl: 'sr_studio_database_url_v3',
});

/** Batas & interval. */
export const LIMITS = Object.freeze({
  manualRevisions: 5,
  autoRevisions: 5,
  autoRevisionMinGapMs: 6 * 60 * 60 * 1000,
  activityFeed: 60,
  activityRetention: 400,
  activityCoalesceMs: 2 * 60 * 1000,
  activityWriteThrottleMs: 4000,
  otpTtlMs: 30 * 60 * 1000,
  trashRetentionMs: 30 * 24 * 60 * 60 * 1000,
  legacyRecheckMs: 6 * 60 * 60 * 1000,
  flushDebounceMs: 350,
  flushMaxWaitMs: 1500,
  presenceHeartbeatMs: 60 * 1000,
});

/**
 * URL database aktif. Perangkat yang dulu menyimpan URL kustom (fitur "Atur Firebase")
 * tetap dihormati; selain itu dipakai URL bawaan.
 */
export function resolveDatabaseUrl(storage = globalThis.localStorage) {
  const clean = (url) => (typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '');
  try {
    const custom = clean(storage?.getItem(STORAGE_KEYS.databaseUrl));
    if (custom.startsWith('https://')) return custom;
    const legacy = storage?.getItem(STORAGE_KEYS.legacyFirebaseConfig);
    if (legacy) {
      const url = clean(JSON.parse(legacy)?.dbUrl);
      if (url.startsWith('https://')) return url;
    }
  } catch {
    // Storage tidak tersedia / JSON rusak → pakai bawaan.
  }
  return DEFAULT_DATABASE_URL;
}

export const isValidDatabaseUrl = (url) =>
  typeof url === 'string' && /^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/i.test(url.trim());
