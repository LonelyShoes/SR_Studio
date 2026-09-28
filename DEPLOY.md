# 🚀 Panduan Deployment — SR Studio BoQ & RAB Tools

Aplikasi **SR Studio BoQ & RAB Tools** telah dikompilasi menjadi berkas web statis (*Static Production Bundle*) murni di dalam folder `dist/`. Aplikasi ini dapat langsung di-hosting di platform cloud manapun secara gratis, cepat, dan tanpa perlu server backend khusus.

---

## 📦 1. Berkas Produksi Siap Deploy (`dist/`)
Folder `dist/` berisi seluruh kode HTML, CSS, JavaScript yang telah di-minifikasi dan dioptimasi:
- `dist/index.html` — Entry point aplikasi
- `dist/assets/*.css` — Gaya visual Tailwind CSS terkompilasi
- `dist/assets/*.js` — Logika kalkulator, BoQ, dan ekspor dokumen
- `dist/logo_model.png` / `dist/icon.png` — Aset gambar & identitas

---

## 🌐 2. Pilihan Cara Deploy

### A. Deploy ke Vercel (Rekomendasi - Tercepat & Otomatis)
File konfigurasi [`vercel.json`](./vercel.json) sudah tersedia di root proyek.
1. Buka [vercel.com](https://vercel.com) dan login.
2. Klik **Add New Project** → Import repository Git Anda (GitHub/GitLab).
3. Vercel akan otomatis mendeteksi konfigurasi:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Klik **Deploy** ➔ Website langsung aktif dalam hitungan detik dengan domain HTTPS gratis!

---

### B. Deploy ke Netlify
File konfigurasi [`netlify.toml`](./netlify.toml) dan [`public/_redirects`](./public/_redirects) sudah tersedia.
1. Buka [app.netlify.com](https://app.netlify.com).
2. **Cara 1 (Git)**: Import repositori GitHub Anda ➔ Netlify otomatis membaca `netlify.toml` ➔ Klik **Deploy**.
3. **Cara 2 (Drag & Drop Manual)**: Tarik folder `dist/` langsung ke area *Netlify Drop* di dashboard Netlify.

---

### C. Deploy ke Cloudflare Pages
1. Masuk ke [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages**.
2. Hubungkan repositori Git.
3. Atur build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Klik **Save and Deploy**.

---

### D. Deploy ke Hosting CPanel / Apache / Nginx
1. Jalankan `npm run build`.
2. Upload seluruh isi folder `dist/` ke folder `public_html` atau `www` di server Anda.
3. Untuk Nginx, pastikan konfigurasi `try_files $uri $uri/ /index.html;` aktif.

---

## 🛠️ 3. Perintah Build Lokal
Untuk memperbarui folder `dist/` kapan saja:
```bash
npm run build
```
Untuk menguji hasil build secara lokal:
```bash
npm run preview
```
