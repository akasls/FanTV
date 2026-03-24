// Native Progressive Web App Interceptor Service Worker
const CACHE_NAME = 'fantv-pwa-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache vital offline capabilities safely, without crashing the SW install on redirects
      const urls = [
        '/',
        '/settings',
        '/favorites',
        '/history',
        '/login'
      ];
      return Promise.allSettled(urls.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => 
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Network-first interceptor mechanism ensuring API streams and updates never stale
self.addEventListener('fetch', (event) => {
  // Only target standard payload channels
  if (event.request.method !== 'GET') return;
  // Bypass hot-reloading streams 
  if (event.request.url.includes('/_next/webpack-hmr')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
         const responseClone = response.clone();
         caches.open(CACHE_NAME).then((cache) => {
           // Skip caching pure HTTP video slices recursively to prevent aggressive quota explosions
           if (!event.request.url.includes('.m3u8') && !event.request.url.includes('.ts')) {
               cache.put(event.request, responseClone);
           }
         });
         return response;
      })
      .catch(() => caches.match(event.request))
  );
});
