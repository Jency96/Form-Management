// ============================
// Task Form - Service Worker v2.2
// Safe + Offline-ready + Debug Logs
// ============================

const CACHE_NAME = 'task-form-v2025-10-30-01';

const ASSETS = [
  './',
  './index.html',
  './form.js',
  './form.css',
  './manifest.json',
  './gps.html',
  './gps.js?v=2025-10-30-01',
  './gps.css?v=2025-10-30-01',


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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// -----------------------------
// FETCH EVENT (network-first for HTML)
// -----------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const isHTML = req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.url.endsWith('.html');

  if (isHTML) {
    // Network-first for pages so users see new deployments immediately
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets (CSS/JS/fonts/images)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // cache successful GETs
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => new Response('⚠️ You are offline. Please reconnect.', {
        status: 503, headers: { 'Content-Type': 'text/plain' }
      }));
    })
  );
});

