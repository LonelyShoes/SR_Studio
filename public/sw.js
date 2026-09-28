/* SR Studio — Service Worker (PWA offline cache)
 *
 * - Navigasi (index.html): network-first → versi terbaru selalu dipakai saat online,
 *   fallback ke cache saat offline.
 * - Aset statis same-origin (JS/CSS hash dari Vite, gambar) & Google Fonts: stale-while-revalidate.
 * - Request lain (Firebase / API cloud) tidak di-cache.
 *
 * Data input user (kalkulator, BoQ, Library) TIDAK disimpan di sini, melainkan di localStorage.
 * Naikkan CACHE_VERSION bila ingin membuang seluruh cache lama.
 */
const CACHE_VERSION = 'sr-studio-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.png', './pwa-192.png', './pwa-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch (err) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
