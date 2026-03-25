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
      .catch(() => caches.match(event.request).then(cachedRes => {
          if (cachedRes) return cachedRes;
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>离线 | FanTv</title><meta name="theme-color" content="#1c1c1e"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#1c1c1e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;"><div style="text-align:center;"><svg style="width:64px;height:64px;margin:0 auto 20px;color:#4b5563;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><h2>无连网</h2><p style="color:#9ca3af;margin-bottom:24px;font-size:14px;">请检查您的网络连接后重试</p><button onclick="window.location.reload()" style="padding:10px 24px;border:none;border-radius:8px;background:#3b82f6;color:white;font-weight:bold;cursor:pointer;font-size:15px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">刷新重试</button></div></body></html>',
                { status: 200, headers: { 'Content-Type': 'text/html' } }
              );
          }
          return new Response('', { status: 408, statusText: 'Request Timeout' });
      }))
  );
});
