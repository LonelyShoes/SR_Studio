/**
 * Cloud Service Constants & Shared Keys
 * Master credentials, API endpoints, and LocalStorage keys for SR Studio BoQ Tools
 */

export const FIXED_MASTER_EMAIL = 'muhrafi118b@gmail.com';
export const FIXED_MASTER_CODE = '20022019';

export const PRIMARY_CLOUD_CHANNEL_ID = 'ff8081819ff5b11001a02d12221f7dcd';
export const PRIMARY_CLOUD_URL = `https://api.restful-api.dev/objects/${PRIMARY_CLOUD_CHANNEL_ID}`;
export const DEFAULT_FIREBASE_DB_URL = 'https://sr-tool-94937-default-rtdb.asia-southeast1.firebasedatabase.app';

// LocalStorage Keys
export const CLOUD_CONFIG_KEY = 'sr_studio_cloud_config_v2';
export const MASTER_DEVICE_KEY = 'sr_studio_is_master_device_v2';
export const ACTIVE_OTP_KEY = 'sr_studio_active_otp_v2';
export const USED_OTPS_KEY = 'sr_studio_used_otps_v2';
export const DELETED_IDS_KEY = 'sr_studio_deleted_project_ids_v2';
export const FIREBASE_CONFIG_KEY = 'sr_studio_firebase_config_v2';

/**
 * Helper hash sederhana untuk namespace email yang aman
 */
export function hashMasterEmail(email = FIXED_MASTER_EMAIL) {
  const clean = (email || FIXED_MASTER_EMAIL).trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sr_boq_${Math.abs(hash).toString(36)}`;
}
