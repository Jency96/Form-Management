// ============================
// Task Form - Minimal Service Worker (v2.0)
// Offline caching for all core assets
// ============================

const CACHE_NAME = 'task-form-v2.0';
const ASSETS = [
  './',
  './index.html',
  './form.js',
  './form.css',
  './manifest.json',

  // Local Bootstrap files
  './bootstrap-5.3.8-dist/css/bootstrap.min.css',
  './bootstrap-5.3.8-dist/js/bootstrap.bundle.min.js',

  // Icons
  './android-icon-192x192.png',
  './apple-icon-180x180.png',
  './favicon-32x32.png',

  // CDN dependencies (needed for offline)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// -----------------------------
// Install - cache essential assets
// -----------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// -----------------------------
// Activate - clear old caches
// -----------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// -----------------------------
// Fetch - cache-first strategy
// -----------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback for main navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('You are offline. Please reconnect.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
