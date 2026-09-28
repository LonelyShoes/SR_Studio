/**
 * Cloud Services Modular Barrel Export
 * Menggabungkan seluruh modul Cloud Sync, Auth, Firebase, OTP, dan Deletion Tombstones
 */

// 1. Constants & Credentials
export {
  FIXED_MASTER_EMAIL,
  FIXED_MASTER_CODE,
  PRIMARY_CLOUD_CHANNEL_ID,
  PRIMARY_CLOUD_URL,
  DEFAULT_FIREBASE_DB_URL,
  CLOUD_CONFIG_KEY,
  MASTER_DEVICE_KEY,
  ACTIVE_OTP_KEY,
  USED_OTPS_KEY,
  DELETED_IDS_KEY,
  FIREBASE_CONFIG_KEY,
  hashMasterEmail
} from './constants.js';

// 2. Deleted Projects (Tombstones)
export {
  getDeletedProjectIds,
  saveDeletedProjectIds,
  addDeletedProjectId
} from './deletedProjectsService.js';

// 3. Master Authentication & Device Authorization
export {
  getCloudConfig,
  saveCloudConfig,
  verifyMasterPin,
  logoutMasterDevice
} from './masterAuthService.js';

// 4. Firebase Realtime Database
export {
  getFirebaseConfig,
  saveFirebaseConfig,
  testFirebaseConnection
} from './firebaseService.js';

// 5. OTP (One-Time Password) & Security
export {
  getUsedOtps,
  markOtpAsUsed,
  getAlgorithmicOtps,
  syncOtpToFirebase,
  generateCurrentOtp,
  verifyAndConsumeOtp
} from './otpService.js';

// 6. Library Synchronization & QR
export {
  mergeLibraries,
  uploadLibraryToCloud,
  fetchLibraryFromCloud,
  getCloudSyncQrUrl
} from './librarySyncService.js';
