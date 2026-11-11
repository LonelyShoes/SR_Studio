# Panduan Deployment — SR Studio BoQ & RAB Tools

Aplikasi ini adalah **situs statis** (hasil `npm run build` di folder `dist/`). Tidak ada server backend yang perlu
dijalankan: data realtime disimpan di Firebase Realtime Database yang diakses langsung dari browser.

## Berkas deploy

| Berkas | Fungsi |
| --- | --- |
| `vercel.json` | Konfigurasi Vercel dari source: build Vite → `dist`, header keamanan, cache aset, fallback SPA |
| `public/vercel.json` | Versi tanpa perintah build; ikut tersalin ke `dist/` untuk deploy drag & drop |
| `netlify.toml`, `public/_headers`, `public/_redirects` | Konfigurasi Netlify (build, header, fallback SPA) |
| `database.rules.json` | Aturan keamanan Firebase Realtime Database (diterapkan manual di Firebase Console) |
| `.env.example` | Daftar environment variable opsional |
| `dist/` | Bundle produksi siap unggah (dibuat `npm run build`, tidak masuk Git) |
| `sr-studio-vercel-dist.zip` | Arsip `dist/` untuk drag & drop (dibuat `npm run package`, tidak masuk Git) |

## Sebelum deploy

```bash
npm ci
npm run check      # lint + 100+ unit test + build → dist/
npm run package    # opsional: sr-studio-vercel-dist.zip
```

## Opsi A — Vercel (direkomendasikan)

**Lewat CLI** (proyek sudah tertaut ke `sr-studio`):

```bash
vercel --prod
```

**Lewat Git:** hubungkan repositori di dashboard Vercel (*Add New → Project → Import*). Semua pengaturan build
dibaca dari `vercel.json`; setelah itu setiap `git push` ke `main` otomatis ter-deploy.

**Drag & drop:** unggah folder `dist/` atau `sr-studio-vercel-dist.zip` di dashboard Vercel.

Detail & changelog: [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md).

## Opsi B — Netlify

- **Git:** import repositori → Netlify membaca `netlify.toml` → Deploy.
- **Drag & drop:** tarik folder `dist/` ke Netlify Drop (`_headers` dan `_redirects` sudah ada di dalamnya).

## Opsi C — Cloudflare Pages

Build command `npm run build`, output directory `dist`. Berkas `_headers` dan `_redirects` di `dist/` otomatis dipakai.

## Opsi D — Hosting biasa (cPanel / Apache / Nginx)

1. `npm run build`, lalu unggah **isi** folder `dist/` ke `public_html`.
2. Nginx: aktifkan `try_files $uri $uri/ /index.html;`.
3. Situs **wajib HTTPS** — service worker (mode offline) dan verifikasi Master Code membutuhkannya.
4. Jangan beri cache panjang pada `sw.js` dan `index.html`; folder `assets/` aman di-cache selamanya.

## Setelah deploy

1. Buka situs → masuk sebagai Master → indikator di bar atas menunjukkan **Realtime**.
2. Buka situs di perangkat kedua → ubah satu volume → perubahan muncul di perangkat pertama tanpa refresh.
3. Jalankan `npm run verify:cloud` (baca-saja) untuk memastikan semua proyek versi lama sudah ada di cloud realtime dengan isi yang sama.
4. **Sekali saja:** terapkan `database.rules.json` di Firebase Console → Realtime Database → Rules → Publish.

## Konfigurasi opsional (environment variable)

| Variabel | Kegunaan |
| --- | --- |
| `VITE_FIREBASE_DATABASE_URL` | Memakai database Firebase lain |
| `VITE_WORKSPACE_ID` | Memisahkan ruang data (mis. staging) |
| `VITE_MASTER_CODE_HASH` | Mengganti Master Code — buat dengan `npm run hash:master -- <kode-baru>` |
| `VITE_MASTER_EMAIL` | Email kontak Master yang ditampilkan di aplikasi |

Di Vercel: *Project → Settings → Environment Variables*, lalu **Redeploy** (variabel `VITE_*` dibaca saat build).
