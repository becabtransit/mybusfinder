const CACHE_VERSION = 'v1-' + new Date().getTime();
const OFFLINE_CACHE = 'offline-only-' + CACHE_VERSION;
const OFFLINE_PAGE = 'offline.html';

self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache => {
      return cache.add(OFFLINE_PAGE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== OFFLINE_CACHE) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/') || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        
        return new Response('', {
          status: 503,
          statusText: 'Service temporairement indisponible'
        });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});