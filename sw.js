// Visiting Card Scanner PWA - offline cache
// Bump CACHE when any cached file changes to force refresh.
const CACHE = 'visiting-cards-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './vendor/xlsx.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js',
  './vendor/tesseract/tesseract.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const url = new URL(req.url);

  // Never touch the Anthropic API or other cross-origin API calls.
  if (url.origin !== self.location.origin) return;

  // Network-first for the page so a fresh deploy shows up when online.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for other same-origin assets (libs, icon, manifest).
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
