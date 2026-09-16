// SmartWaste Service Worker (PWA Offline & Asset Cache)
const CACHE_NAME = 'smartwaste-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/favicon.ico',
];

// 1. Service Worker Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache asset warning:', err);
      });
    })
  );
});

// 2. Service Worker Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Service Worker Fetch Strategy (Safe Network-First / Pass-through for APIs & Supabase)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ALWAYS BYPASS Service Worker for Supabase, WebSockets, API calls, and external map tiles
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return; // Let browser handle network directly
  }

  // Network-first strategy for page navigations & static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
