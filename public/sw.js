/* SR Studio — Service Worker (PWA offline)
 *
 * Strategi:
 *  - Navigasi (index.html): network-first dengan batas waktu → versi terbaru selalu dipakai saat
 *    online; pada jaringan lambat/offline langsung memakai salinan cache.
 *  - Aset statis same-origin (JS/CSS ber-hash dari Vite, gambar) & Google Fonts:
 *    stale-while-revalidate.
 *  - Permintaan lain (Firebase Realtime Database, dsb.) TIDAK disentuh sama sekali, sehingga
 *    sinkronisasi realtime selalu langsung ke jaringan.
 *
 * Data pengguna tidak disimpan di sini: dokumen aktif ada di localStorage, arsip Library di
 * IndexedDB, dan sumber kebenarannya di cloud.
 *
 * Naikkan CACHE_VERSION untuk membuang seluruh cache lama.
 */
const CACHE_VERSION = 'sr-studio-v3';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.png', './pwa-192.png', './pwa-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = (await cache.match('./index.html')) || (await cache.match('./'));

  const network = fetch(request).then((response) => {
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  });

  if (!cached) return network.catch(() => Response.error());

  // Ada salinan cache: beri jaringan kesempatan sebentar, lalu pakai cache agar aplikasi tetap terbuka.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
