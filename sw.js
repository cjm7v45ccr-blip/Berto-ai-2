const CACHE = 'berto-shell-v2';
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        './',
        './index.html',
        './Berto.html',
        './style.css',
        './js/live.js',
        './js/main.js',
        './js/config.js',
        './js/api.js',
        './js/store.js',
        './js/utils.js',
        './js/markdown.js',
        './manifest.webmanifest'
      ])
    )
  );
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('generativelanguage.googleapis.com')) return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match('./index.html') || caches.match('./Berto.html'))
    )
  );
});
