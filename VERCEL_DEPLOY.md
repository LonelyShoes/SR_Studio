# Panduan Deploy ke Vercel — SR Studio BoQ Tools

## Changelog build 2026-09-28 (kalkulator per Library + PWA)
- FITUR: isian kalkulator kini tersimpan **per Library RAB** yang sedang dibuka (kunci `sr_calc_*@@<id proyek>`, draft = `@@__draft__`). Pindah proyek → isian kalkulator ikut berganti; kembali ke proyek → isian lama muncul lagi.
- Draft yang disimpan ke Library → isian kalkulator ikut pindah ke proyek baru. "Simpan sebagai revisi baru" & "Duplikat" → isian disalin. Hapus proyek → isian kalkulatornya ikut dibersihkan.
- Migrasi otomatis satu kali: isian kalkulator lama dipindahkan ke proyek yang sedang aktif, jadi tidak ada data yang hilang.
- PWA: `manifest.webmanifest`, ikon `pwa-192.png`/`pwa-512.png`, dan `sw.js` (cache offline app shell + aset). Aplikasi bisa di-*install* dan dibuka saat offline.
- `vercel.json`: `sw.js` dikirim dengan `Cache-Control: no-cache` agar update service worker langsung diterima.
- Catatan: service worker hanya aktif di build produksi (HTTPS / localhost), tidak di `npm run dev`.

## Changelog build 2026-09-26 (audit bug)
- FIX kritis: aplikasi gagal dimuat ("getInitialSchedule is not defined") karena fungsi `getInitialSchedule` & `getInitialRole` terhapus saat refactor BoQContext. Dipulihkan.
- FIX: modal Cetak Time Schedule & Kurva S melanggar rules-of-hooks (risiko crash saat dibuka/ditutup). Dipisah menjadi wrapper + konten.
- FIX: ekspor Excel dari Library membaca kunci jadwal yang salah (`sr_studio_schedule_config_v2` → `sr_boq_schedule_config_v2`).
- FIX hitungan: tulangan > 12 m kini memperhitungkan sambungan lewatan 40D; sisa potongan terakhir ikut dipacking FFD.
- FIX input: `parseNum` menerima koma desimal ("2,5").
- `package-lock.json` disinkronkan (sebelumnya tidak memuat eslint/vitest, `npm ci` di Vercel bisa gagal).
- Test: 14 unit test lulus; smoke test browser semua 15 tab + modal tanpa error.

File build produksi terbaru telah berhasil dikompilasi ke folder `dist/` dan diarsipkan ke file zip `sr-studio-vercel-dist.zip`.

---

## Opsi 1: Drag & Drop (Instan Tanpa Git / Node.js)

1. Buka dashboard Vercel di [vercel.com](https://vercel.com) dan login ke akun Anda.
2. Buka menu **Add New...** -> pilih **Project**.
3. Jika Anda menggunakan fitur Drag & Drop Vercel Preview / Upload:
   - **Tarik & Lepas (Drag & Drop)** folder **`dist/`** atau file **`sr-studio-vercel-dist.zip`** ke area upload Vercel.
4. Vercel akan langsung mengunggah file statis dan memberikan link website aktif (misal: `https://sr-studio-boq-tools.vercel.app`).

---

## Opsi 2: Hubungkan ke GitHub / Git Repository (Otomatis Update)

Jika Anda ingin Vercel otomatis mengompilasi ulang setiap ada perubahan di masa depan:

1. Push seluruh folder project ini ke repositori **GitHub** Anda.
2. Di Vercel Dashboard, klik **Add New...** -> **Project**.
3. Pilih repositori GitHub Anda dan klik **Import**.
4. Konfigurasi proyek (otomatis terdeteksi):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Klik **Deploy** -> Website akan aktif dalam hitungan detik.

---

## Konfigurasi SPA Routing (`vercel.json`)
File `vercel.json` sudah disediakan di root dan di dalam folder `dist/` untuk memastikan URL dan reload halaman selalu mengarah ke `index.html` tanpa error 404:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
