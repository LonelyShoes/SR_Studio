/**
 * OTP (One-Time Password) & TOTP Security Service
 * Mengelola pembuatan, sinkronisasi real-time ke Firebase, dan
 * pembakaran (burning) kode OTP 1x pakai untuk penyimpanan library klien.
 */

import {
  FIXED_MASTER_EMAIL,
  FIXED_MASTER_CODE,
  ACTIVE_OTP_KEY,
  USED_OTPS_KEY
} from './constants.js';
import { getFirebaseConfig } from './firebaseService.js';

/**
 * Mengambil daftar OTP yang sudah digunakan/hangus
 */
export function getUsedOtps() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(USED_OTPS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error('Failed to get used OTPs:', e);
  }
  return [];
}

/**
 * Menandai OTP sebagai hangus (sudah dipakai)
 */
export function markOtpAsUsed(otpCode) {
  try {
    if (typeof localStorage !== 'undefined') {
      const list = getUsedOtps();
      if (!list.includes(otpCode)) {
        list.push(otpCode);
        // Keep max last 50 used otps
        if (list.length > 50) list.shift();
        localStorage.setItem(USED_OTPS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.error('Failed to mark OTP as used:', e);
  }
}

/**
 * Algorithmic TOTP Generator (Sync across devices without shared storage)
 */
export function getAlgorithmicOtps() {
  const otps = [];
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 menit window
  const currentWindow = Math.floor(now / windowMs);
  // Cek window saat ini dan 2 window sebelumnya (toleransi 15 menit)
  for (let offset = 0; offset >= -2; offset--) {
    const w = currentWindow + offset;
    const seed = `${FIXED_MASTER_EMAIL}_${FIXED_MASTER_CODE}_${w}`;
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    const otp = (Math.abs(hash) % 900000 + 100000).toString();
    otps.push(otp);
  }
  return otps;
}

/**
 * Sinkronisasi Kode OTP Aktif ke Firebase Realtime Database
 */
export async function syncOtpToFirebase(otp, generatedAt) {
  try {
    const fb = getFirebaseConfig();
    if (!fb || !fb.dbUrl) return;
    const cleanUrl = fb.dbUrl.replace(/\/+$/, '');
    const authParam = fb.authToken ? `?auth=${encodeURIComponent(fb.authToken)}` : '';
    await fetch(`${cleanUrl}/sr_studio_security/active_otp.json${authParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otp,
        createdAt: Date.now(),
        generatedAt: generatedAt || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        isUsed: false
      })
    });
  } catch (e) {
    console.warn('Failed to sync OTP to Firebase:', e);
  }
}

/**
 * Generate Kode OTP 6-Digit Baru untuk Master Device
 * (Tersinkron langsung ke Firebase Realtime Database agar bisa dibaca HP)
 */
export function generateCurrentOtp(forceNew = false) {
  try {
    if (typeof localStorage !== 'undefined' && !forceNew) {
      const saved = localStorage.getItem(ACTIVE_OTP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Jika belum hangus dan belum lebih dari 30 menit
        if (!parsed.isUsed && Date.now() - parsed.createdAt < 30 * 60 * 1000) {
          syncOtpToFirebase(parsed.otp, parsed.generatedAt);
          return {
            otp: parsed.otp,
            isUsed: false,
            generatedAt: parsed.generatedAt
          };
        }
      }
    }

    // Buat kode 6 digit acak baru
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const otpData = {
      otp: randomOtp,
      createdAt: Date.now(),
      generatedAt: timeStr,
      isUsed: false
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_OTP_KEY, JSON.stringify(otpData));
    }

    // Push ke Firebase Realtime Database
    syncOtpToFirebase(randomOtp, timeStr);

    return otpData;
  } catch (e) {
    console.error('Failed to generate OTP:', e);
    const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return { otp: fallbackOtp, isUsed: false, generatedAt: 'Baru' };
  }
}

/**
 * Verifikasi & Hanguskan Kode OTP (Single-Use: hanya 1x pakai untuk simpan library)
 * Mendukung verifikasi real-time via Firebase, TOTP Algoritmik, & Master Code override.
 */
export async function verifyAndConsumeOtp(inputCode) {
  if (!inputCode) return { success: false, message: 'Kode OTP tidak boleh kosong.' };
  
  const cleanInput = inputCode.trim();

  // 1. Bypass Master Code Override (20022019)
  if (cleanInput === FIXED_MASTER_CODE) {
    return { 
      success: true, 
      message: 'Otorisasi Master Code Berhasil! Izin diberikan.' 
    };
  }

  // 2. Cek apakah kode sudah pernah dipakai (hangus)
  const usedList = getUsedOtps();
  if (usedList.includes(cleanInput)) {
    return { 
      success: false, 
      message: 'Kode OTP ini sudah hangus (sudah pernah digunakan). Silakan minta kode OTP baru dari Master.' 
    };
  }

  let isValid = false;

  // 3. Cek Firebase Realtime Database (Multi-device Cloud Sync)
  try {
    const fb = getFirebaseConfig();
    if (fb && fb.dbUrl) {
      const cleanUrl = fb.dbUrl.replace(/\/+$/, '');
      const authParam = fb.authToken ? `?auth=${encodeURIComponent(fb.authToken)}` : '';
      const fbRes = await fetch(`${cleanUrl}/sr_studio_security/active_otp.json${authParam}`);
      if (fbRes.ok) {
        const activeOtp = await fbRes.json();
        if (activeOtp && activeOtp.otp === cleanInput && !activeOtp.isUsed) {
          // Valid jika di bawah 60 menit
          if (Date.now() - (activeOtp.createdAt || 0) < 60 * 60 * 1000) {
            isValid = true;
            // Hanguskan OTP di Firebase
            fetch(`${cleanUrl}/sr_studio_security/active_otp.json${authParam}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...activeOtp,
                isUsed: true,
                burnedAt: Date.now()
              })
            }).catch(console.error);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Firebase OTP verification fetch error:', e);
  }

  // 4. Cek Algorithmic TOTP (Fallback offline/synchronous)
  if (!isValid) {
    const validAlgOtps = getAlgorithmicOtps();
    if (validAlgOtps.includes(cleanInput)) {
      isValid = true;
    }
  }

  // 5. Cek Local Storage (Jika pada perangkat yang sama)
  if (!isValid && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(ACTIVE_OTP_KEY);
      if (saved) {
        const activeOtpData = JSON.parse(saved);
        if (activeOtpData && activeOtpData.otp === cleanInput && !activeOtpData.isUsed) {
          isValid = true;
        }
      }
    } catch (e) {}
  }

  if (isValid) {
    // Hanguskan OTP langsung
    markOtpAsUsed(cleanInput);

    // Di master lokal tandai used & generate baru
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(ACTIVE_OTP_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.isUsed = true;
          localStorage.setItem(ACTIVE_OTP_KEY, JSON.stringify(parsed));
        }
        generateCurrentOtp(true);
      } catch (e) {}
    }

    return { 
      success: true, 
      message: 'Verifikasi Berhasil! Izin 1x simpan diberikan (OTP telah hangus).' 
    };
  }

  return { 
    success: false, 
    message: 'Kode OTP salah atau sudah tidak berlaku. Silakan minta kode OTP baru dari PC Utama.' 
  };
}
