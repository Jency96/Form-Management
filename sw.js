// Enhanced Service Worker for Task Management Form
const CACHE_NAME = 'task-form-v1.2';
const urlsToCache = [
  // Core application files
  './',
  './index.html',
  './form.css',
  './form.js',
  './manifest.json',
  
  // Local Bootstrap files
  './bootstrap-5.3.8-dist/css/bootstrap.min.css',
  './bootstrap-5.3.8-dist/js/bootstrap.bundle.min.js',
  
  // Your icon files
  './android-icon-192x192.png',
  './apple-icon-180x180.png',
  './favicon-32x32.png',
  
  // External CDN resources (cache these for offline)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell and resources');
        // Cache all resources, but don't fail if some miss
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Some resources failed to cache:', error);
          // Continue even if some files fail
        });
      })
  );
  
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches from previous versions
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve cached resources when possible
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache external API calls, only our app resources
            if (!event.request.url.startsWith('http') || 
                !networkResponse || 
                networkResponse.status !== 200 || 
                networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache the new resource
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // If network fails and it's a page navigation, return the app shell
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // For other failed requests, you could return a custom offline page
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});