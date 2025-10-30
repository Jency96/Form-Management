// ============================
// Task Form - Service Worker v2.2
// Safe + Offline-ready + Debug Logs
// ============================

const CACHE_NAME = 'task-form-v2.2';
const ASSETS = [
  './',
  './index.html',
  './form.js',
  './form.css',
  './manifest.json',
  './gps.html',
  './gps.css',
  './gps.js',


  // Local Bootstrap files
  './bootstrap-5.3.8-dist/css/bootstrap.min.css',
  './bootstrap-5.3.8-dist/js/bootstrap.bundle.min.js',

  // Icons
  './android-icon-192x192.png',
  './apple-icon-180x180.png',
  './favicon-32x32.png',

  // CDN dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// -----------------------------
// INSTALL EVENT
// -----------------------------
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing... caching assets');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🗂️ [SW] Adding core assets to cache...');
        return cache.addAll(ASSETS);
      })
      .then(() => console.log('✅ [SW] Assets cached successfully'))
      .catch(err => console.warn('⚠️ [SW] Cache install failed:', err))
  );
  self.skipWaiting();
});

// -----------------------------
// ACTIVATE EVENT
// -----------------------------
self.addEventListener('activate', event => {
  console.log('🚀 [SW] Activating new version...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
  console.log('✅ [SW] Now controlling all clients.');
});

// -----------------------------
// FETCH EVENT
// -----------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log('📦 [SW] Serving from cache:', event.request.url);
        return cached;
      }

      return fetch(event.request)
        .then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            event.request.url.startsWith('http') &&
            !event.request.url.startsWith('chrome-extension')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, clone);
                console.log('🆕 [SW] Cached new resource:', event.request.url);
              });
          }
          return response;
        })
        .catch(() => {
          console.warn('⚠️ [SW] Fetch failed, offline fallback used for:', event.request.url);
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('⚠️ You are offline. Please reconnect.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
