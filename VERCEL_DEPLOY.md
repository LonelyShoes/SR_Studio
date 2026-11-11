# Panduan Deploy ke Vercel — SR Studio BoQ Tools

Proyek Vercel: **sr-studio** · Produksi: https://sr-studio-alpha.vercel.app

## Cara deploy

### Opsi 1 — CLI (paling cepat, proyek sudah tertaut)

```bash
npm run check     # lint + test + build
vercel --prod
```

### Opsi 2 — Git (otomatis setiap push)

1. `git push origin main`
2. Bila repositori sudah dihubungkan di dashboard Vercel, deploy berjalan otomatis.
   Belum terhubung? *Add New → Project → Import* repositori `SR_Studio`; pengaturan build dibaca dari
   [`vercel.json`](./vercel.json) (framework Vite, `npm run build`, output `dist`).

### Opsi 3 — Drag & drop (tanpa Git / Node.js di server)

```bash
npm run build && npm run package
```

Unggah folder **`dist/`** atau **`sr-studio-vercel-dist.zip`** di dashboard Vercel. `dist/vercel.json` sudah memuat
header keamanan & fallback SPA yang sama.

## Yang diatur `vercel.json`

- Build: `npm ci` → `npm run build` → `dist/`
- Header keamanan: Content-Security-Policy (hanya origin sendiri, Google Fonts, dan Firebase Realtime Database),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- Cache: `assets/*` immutable 1 tahun (nama berkas ber-hash); `sw.js` tidak pernah di-cache
- Fallback SPA untuk path non-berkas (aset yang hilang tetap 404, tidak dialihkan ke `index.html`)

---

## Changelog

### 3.0.0 — 2026-11-11 · Kolaborasi realtime & audit menyeluruh

**Realtime cloud**
- Semua input (BoQ, antrian kalkulator, isian kalkulator, jadwal & progres Kurva S, operasi Library) tersimpan
  otomatis dan tampil langsung di semua perangkat. Tombol "Sinkronkan" dihapus — tidak lagi diperlukan.
- Sinkronisasi per-field dengan merge 3 arah: dua orang yang mengedit item berbeda tidak saling menimpa;
  ketikan yang sedang berlangsung tidak tergeser data masuk.
- Offline-first: perubahan saat offline disimpan di perangkat (outbox) dan dikirim saat tersambung;
  Library tetap terbuka offline dari cache IndexedDB.
- Indikator status di bar atas + **Pusat Sinkronisasi**: siapa yang online, proyek apa yang dibuka, log aktivitas.
- Draf otomatis: pekerjaan yang belum disimpan langsung terlihat di Library dengan lencana "Draf".
- Jadwal/Kurva S kini **per proyek** (sebelumnya satu jadwal dipakai semua proyek dan tidak tersinkron).
- Riwayat versi: 5 slot manual + 5 cadangan otomatis sebelum sesi edit. Sampah: proyek terhapus dapat dipulihkan 30 hari.

**Data lama dipertahankan**
- Migrasi otomatis & idempoten dari data versi 2 (cloud + Library lokal tiap perangkat). Data versi 2 tidak diubah
  dan tetap menjadi cadangan. Diverifikasi: 6 proyek + seluruh revisi identik (total, item, volume).
- Salinan kerja lokal yang berbeda dari cloud tidak pernah menimpa proyek bersama — dijadikan draf terpisah.
- Area kerja lama yang isinya identik dengan proyek tersimpan disambungkan kembali ke proyeknya (isian kalkulator
  di perangkat ikut terunggah) — tidak membuat draf kembar. Perangkat menunggu bila migrasi sedang dikerjakan perangkat lain.

**Keamanan**
- Master Code tidak lagi tampil di halaman depan dan tidak ada di bundle (verifikasi hash PBKDF2).
- Kode OTP: hanya hash yang disimpan di cloud, sekali pakai lewat transaksi atomik, kedaluwarsa 30 menit,
  terkunci setelah 5 kali salah. OTP "algoritmik" yang bisa dihitung siapa pun dihapus.
- Unggah cadangan ke layanan publik pihak ketiga (`restful-api.dev`) dan QR yang menyematkan seluruh Library
  ke URL dihapus. Impor data lewat tautan `#sync=` (bisa menimpa Library) dihapus.
- Header keamanan (CSP, anti-clickjacking, dsb.) + `database.rules.json`.

**Perbaikan bug**
- Luas bangunan per unit hilang setiap halaman dimuat ulang & tidak ikut tersimpan ke Library.
- Komparasi proyek: biaya/m² selalu 0 dan tipologi dinding bersama tidak pernah terdeteksi (nama field salah).
- Ekspor Excel dari Library memakai jadwal proyek lain.
- Kotak OTP tidak bisa ditempel (paste); verifikasi ganda saat auto-submit.
- Toast error tampil sebagai "Informasi"; toast baru bisa terhapus oleh timer toast lama.
- Kelas Tailwind yang tidak pernah terdefinisi (`xs:`, `shadow-xs`, `ml-8.5`, animasi modal, dll.) kini aktif.
- Aset lama yang hilang setelah deploy dialihkan ke `index.html` (layar error) → kini muat ulang otomatis.

**Kualitas kode & performa**
- BoQContext 1.555 baris dipecah: transisi state murni (`boqActions`), engine sinkronisasi tanpa React, driver.
- ESLint 364 masalah → 0 (`--max-warnings 0`). Unit test 18 → 109 (termasuk simulasi multi-perangkat & offline).
- Bundle awal 595 kB → 230 kB + React 143 kB (gzip 187 kB → 111 kB); xlsx & Firebase dimuat saat dibutuhkan.
- Dependensi tak terpakai dibuang; peringatan keamanan dependensi produksi 5 → 1 (xlsx, hanya dipakai menulis file).

**Tindakan dari Anda (sekali saja)**
1. Terapkan `database.rules.json` di Firebase Console → Realtime Database → Rules.
2. Ganti Master Code: `npm run hash:master -- <kode-baru>` → set `VITE_MASTER_CODE_HASH` di Vercel → Redeploy.

### 2.0.0 — 2026-09-28 · Kalkulator per Library + PWA
- Isian kalkulator tersimpan per proyek Library; migrasi otomatis isian lama.
- PWA: manifest, ikon, dan service worker (cache offline app shell + aset).

### 2026-09-26 · Audit bug
- Pemulihan `getInitialSchedule`/`getInitialRole`, perbaikan rules-of-hooks pada modal jadwal, kunci jadwal ekspor
  Excel, sambungan lewatan 40D pada tulangan > 12 m, `parseNum` menerima koma desimal.
