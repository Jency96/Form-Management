// sw.js — Form Management (GitHub Pages)
// Cache-busting version (bump this whenever you ship): 
const CACHE_NAME = 'task-form-v2025-11-16-01';;


// Precache the exact URLs your pages actually load (include ?v= versions)
const ASSETS = [
  './',
  './index.html',
  './manifest.json',

  // Root app files (versioned)
  './form.css?v=2025-11-16-01',
  './form.js?v=2025-11-16-01',

  // GPS screen lives in /gps with its own versioned assets
  './gps/gps.html',
  './gps/gps.css?v=2025-11-16-01',
  './gps/gps.js?v=2025-11-16-01',
];

// Allow the page to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Install: precache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - HTML navigations: network-first (so updates show up), fall back to cache
// - Other GET requests (CSS/JS/etc.): cache-first, update in background
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GETs
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // 1) Navigations (SPA/MPA pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try the network first to get the latest HTML
          const fresh = await fetch(req, { cache: 'no-store' });
          // Update cache for offline support
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          // Offline fallback: serve cached page if available
          const cached = await caches.match(req);
          if (cached) return cached;

          // Last resort: fall back to the app shell (index.html)
          return caches.match('./index.html');
        }
      })()
    );
    return;
  }

  // 2) Same-origin static assets: cache-first
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const res = await fetch(req);
          // Stash a copy for next time (ignore non-OK to avoid caching errors)
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          // If offline and not in cache, give up gracefully
          return caches.match('./index.html');
        }
      })()
    );
    return;
  }

  // 3) Cross-origin: pass-through (you can add smarter strategies later)
  // e.g., Maps tiles or CDNs — we won't cache these by default
});
