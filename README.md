# SR Studio — BoQ & Construction Estimator Suite

Aplikasi web untuk menyusun **Rencana Anggaran Biaya (RAB/BoQ)**, Kurva S, rekap material, dan 11 kalkulator
bantu konstruksi — dengan **kolaborasi realtime**: setiap input langsung tersimpan di cloud dan terbaca semua
pengguna tanpa tombol sinkron.

- Produksi: https://sr-studio-alpha.vercel.app
- Stack: React 18 · Vite 6 · Tailwind CSS 3 · Firebase Realtime Database · PWA (offline)

## Fitur utama

| Area | Ringkasan |
| --- | --- |
| BoQ / RAB | Database harga satuan (Perwali Kota Semarang TA 2026), item & kategori kustom, PPN, multi-unit kavling |
| Kalkulator | Pondasi, beton, pembesian (cutting stock 12 m), atap & rangka baja ringan, dinding, lantai, plafond, kusen, MEP, sanitasi, infrastruktur |
| Kurva S | Jadwal per kategori, bobot mingguan, progres aktual vs rencana — tersimpan **per proyek** |
| Library | Arsip proyek di cloud, riwayat versi + rollback, komparasi dua proyek, duplikasi, Sampah (pulihkan 30 hari) |
| Dokumen | Cetak SPH/RAB resmi, jadwal, BOM material, ekspor Excel multi-sheet berumus |
| Realtime | Edit bersama per-field, indikator siapa yang online & membuka proyek apa, log aktivitas |
| Offline | PWA: aplikasi & Library tetap terbuka tanpa internet; perubahan terkirim saat tersambung lagi |

## Cara kerja sinkronisasi realtime

```
UI React ──setState──▶ SyncEngine ──▶ SyncChannel (BoQ │ jadwal │ kalkulator)
   ▲                        │                 │ diff per-field → outbox → Firebase RTDB
   └──── merge 3 arah ◀─────┴──── listener ◀──┘ (WebSocket, fallback long-polling)
```

- **Per-field, bukan per-dokumen.** Di cloud, kategori/item disimpan sebagai map berkunci id. Mengubah satu volume
  hanya menulis satu path kecil, jadi dua orang yang mengedit item berbeda tidak pernah saling menimpa.
- **Merge 3 arah.** Data masuk dari server digabung dengan ketikan lokal yang belum terkirim; yang sedang diketik
  tidak pernah hilang.
- **Outbox (write-ahead log).** Setiap perubahan dicatat sebelum dikirim. Jika tab ditutup saat offline, perubahan
  dikirim ulang pada pembukaan berikutnya.
- **Draf otomatis.** Pekerjaan baru yang belum disimpan langsung menjadi *draf* di cloud (terlihat di Library dengan
  lencana "Draf"). Tombol **Simpan** menjadikannya proyek resmi atau membuat titik versi.
- **Cadangan otomatis.** Sebelum sesi edit pada proyek tersimpan, keadaan sebelumnya dicatat ke Riwayat Versi
  (5 slot manual + 5 slot otomatis).

### Struktur data (`sr_studio_v3/<workspaceId>/…`)

| Path | Isi |
| --- | --- |
| `projects/<id>` | Metadata ringan untuk daftar Library (nama, total, status draf/tersimpan, diperbarui oleh) |
| `docs/<id>/boq` | Dokumen RAB hidup (proyek, kategori, item, antrian kalkulator) |
| `docs/<id>/schedule` · `docs/<id>/calc` | Jadwal Kurva S · isian kalkulator |
| `revisions/<id>` + `revisionData/<id>` | Indeks riwayat versi + isi snapshot |
| `trash/<id>` + `trashData/<id>` | Proyek terhapus (dapat dipulihkan Master) |
| `tombstones/<id>` | Penanda agar proyek terhapus tidak muncul lagi dari data lama |
| `presence/<sesi>` · `activity/<id>` | Pengguna online · log aktivitas |
| `security/otp` | Hash Kode OTP sekali pakai |

Data versi 2 (`sr_studio_library/<workspaceId>`) **tidak pernah diubah** — tetap utuh sebagai cadangan dan dimigrasikan
otomatis (idempoten) saat aplikasi pertama kali tersambung.

## Peran & izin

| Peran | Hak |
| --- | --- |
| **Master** | Akses penuh; satu-satunya yang boleh menghapus/memulihkan proyek dan mengubah harga standar; menerbitkan Kode OTP |
| **Klien** | Melihat Dashboard, Kurva S, dan Library secara realtime. Membuka BoQ/kalkulator, mengubah jadwal, dan menyimpan memerlukan **Kode OTP 6 digit** dari Master (sekali pakai, berlaku 30 menit, terkunci setelah 5 kali salah) |

Master Code diverifikasi terhadap hash PBKDF2 (kode asli tidak ada di bundle). Untuk menggantinya:

```bash
npm run hash:master -- <kode-baru>     # lalu set VITE_MASTER_CODE_HASH dan deploy ulang
```

## Keamanan — baca ini

Pembatasan peran di atas berjalan **di sisi aplikasi**. Perlindungan data sesungguhnya ditentukan oleh
*Firebase Security Rules*:

1. **Wajib (5 menit):** terapkan [`database.rules.json`](./database.rules.json) di Firebase Console →
   Realtime Database → Rules. Aturan ini menutup seluruh database kecuali akar milik aplikasi dan membekukan data
   versi 2 sebagai cadangan read-only.
2. **Disarankan:** ganti Master Code (kode lama pernah tertulis di riwayat Git publik).
3. **Tahap berikutnya:** aktifkan Firebase Authentication dan ubah rules agar hanya pengguna terautentikasi yang
   boleh menulis. Tanpa autentikasi, siapa pun yang mengetahui URL database tetap dapat membaca/menulis data di
   akar aplikasi.

Header keamanan (CSP, `X-Frame-Options`, `nosniff`, dsb.) dikirim lewat `vercel.json` / `public/_headers`.

## Pengembangan

```bash
npm ci
npm run dev        # http://localhost:3000
npm run check      # lint (0 peringatan) + test + build
```

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `preview` | Server dev · build produksi ke `dist/` · pratinjau build |
| `npm run lint` · `npm test` | ESLint (`--max-warnings 0`) · Vitest |
| `npm run package` | Membuat `sr-studio-vercel-dist.zip` dari `dist/` (deploy drag & drop) |
| `npm run hash:master -- <kode>` | Membuat hash Master Code baru |

Konfigurasi opsional lewat environment variable — lihat [`.env.example`](./.env.example). Untuk bereksperimen
tanpa menyentuh data asli, jalankan dengan workspace terpisah: `VITE_WORKSPACE_ID=uji_coba npm run dev`.

### Struktur kode

```
src/
  context/        BoQContext (state & aksi UI) · boqActions (transisi murni) · cloudStore (engine + hook)
  services/cloud/ engine · syncChannel · workspace · migration · codec · tree · outbox · drivers/
  services/storage/ localStore (localStorage aman) · libraryCache (IndexedDB)
  hooks/          usePersistentCalculatorState (store isian kalkulator tersinkron)
  components/     auth · layout · boq · calculators · schedule · library · document · common
  utils/          normalize · exportExcel · materialTakeoff · formatters · activity
```

Logika sinkronisasi tidak bergantung pada React maupun Firebase secara langsung (lewat antarmuka *driver*),
sehingga diuji dengan driver memori yang mensimulasikan banyak perangkat, offline, dan penolakan server.

## Deploy

Lihat [`DEPLOY.md`](./DEPLOY.md) (semua platform) dan [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) (Vercel + changelog).
Ringkasnya: `git push` ke `main` → Vercel membangun otomatis, atau `vercel --prod` dari folder proyek.
