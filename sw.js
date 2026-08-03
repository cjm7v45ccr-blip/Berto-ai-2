const CACHE = 'berto-shell-v3';

// Core files needed for offline app launch
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './js/live.js',
  './js/main.js',
  './manifest.webmanifest'
];

// 1. INSTALL: Pre-cache assets and force immediate activation
self.addEventListener('install', event => {
  self.skipWaiting(); // Force new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Use Promise.allSettled so if 1 file fails/404s, the rest still cache
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err)))
      );
    })
  );
});

// 2. ACTIVATE: Take control of all open tabs & clean up old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Instantly take control of active tabs
      // Delete old caches (e.g. berto-shell-v1, berto-shell-v2)
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE).map(key => caches.delete(key))
        )
      )
    ])
  );
});

// 3. FETCH: Network-First strategy for Vercel updates + Offline Cache Fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests from our own domain (ignore Gemini API & external CDNs)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // A. Try fetching fresh code from Vercel network first
    fetch(event.request)
      .then(networkResponse => {
        // If successful, save copy to cache and return fresh response
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        // B. If offline or network fails, fall back to cached files
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./index.html') || caches.match('./');
        });
      })
  );
});
