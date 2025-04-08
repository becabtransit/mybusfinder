const CACHE_VERSION = 'v1';
const OFFLINE_CACHE = 'offline-only-' + CACHE_VERSION;
const OFFLINE_PAGE = 'offline.html';

self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache => {
      return cache.add(new Request(OFFLINE_PAGE, {cache: 'reload'}));
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

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_PAGE);
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
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