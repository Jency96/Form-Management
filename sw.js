// ============================================================
// Enhanced Service Worker (v1.3) for Task Management Form
// - Offline caching for core assets, Leaflet, jsPDF, etc.
// - Cache-first with network fallback strategy
// - Safe handling for partial caching + updates
// ============================================================

const CACHE_NAME = 'task-form-v1.3';
const urlsToCache = [
  './',
  './index.html',
  './form.css',
  './form.js',
  './manifest.json',

  // Local Bootstrap files
  './bootstrap-5.3.8-dist/css/bootstrap.min.css',
  './bootstrap-5.3.8-dist/js/bootstrap.bundle.min.js',

  // Icons
  './android-icon-192x192.png',
  './apple-icon-180x180.png',
  './favicon-32x32.png',

  // External libraries
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// -----------------------------
// Install event
// -----------------------------
self.addEventListener('install', event => {
  console.log('📦 Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🗂️ Caching essential files...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.warn('⚠️ Some resources failed to cache:', err))
  );
  self.skipWaiting(); // Activate immediately
});

// -----------------------------
// Activate event
// -----------------------------
self.addEventListener('activate', event => {
  console.log('🚀 Activating new service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim(); // Start controlling pages immediately
});

// -----------------------------
// Fetch event (cache-first, fallback to network)
// -----------------------------
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // Try to return from cache first
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Otherwise, fetch from the network
        const response = await fetch(event.request);

        // If valid response, clone & cache it
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          event.request.url.startsWith('http')
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        console.warn('⚠️ Fetch failed:', error);

        // Fallback for navigation requests (SPA/offline shell)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        // Return basic fallback for others
        return new Response('⚠️ You are offline. Please reconnect.', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
