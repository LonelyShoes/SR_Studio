/**
 * Cloud Library Service for SR Studio BoQ Tools
 * Architecture: Modularized into domain-specific submodules under `./cloud/`:
 *  - `./cloud/constants.js`: Credentials, endpoints, LocalStorage keys, email hashing
 *  - `./cloud/deletedProjectsService.js`: Deleted project ID management (tombstones)
 *  - `./cloud/masterAuthService.js`: Master Device authorization, PIN check, local config
 *  - `./cloud/firebaseService.js`: Firebase Realtime Database config & connection testing
 *  - `./cloud/otpService.js`: Dynamic 6-digit OTP, TOTP fallback, Firebase OTP sync & burning
 *  - `./cloud/librarySyncService.js`: 2-way smart merge, cloud upload, fetch, QR code sync
 *
 * This file serves as the unified entry point and backward-compatible barrel exporter.
 */

export * from './cloud/index.js';
