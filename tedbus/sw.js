const OFFLINE_CACHE = 'offline-cache-v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then(cache => {
        console.log('Mise en cache de la page hors ligne');
        return fetch(OFFLINE_PAGE)
          .then(response => {
            if (!response.ok) {
              throw new Error('Échec lors de la mise en cache de la page offline');
            }
            return cache.put(OFFLINE_PAGE, response);
          })
          .catch(err => {
            console.error('Erreur lors de la mise en cache de offline', err);
          });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== OFFLINE_CACHE)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(OFFLINE_CACHE)
            .then(cache => {
              return cache.match(OFFLINE_PAGE)
                .then(cachedResponse => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                  return fetch(OFFLINE_PAGE)
                    .then(response => {
                      cache.put(OFFLINE_PAGE, response.clone());
                      return response;
                    })
                    .catch(() => {
                      return new Response(
                        '<html><body><h1>Vous êtes hors ligne</h1></body></html>',
                        {
                          headers: { 'Content-Type': 'text/html' }
                        }
                      );
                    });
                });
            });
        })
    );
  } else if (!event.request.url.includes('/api/') && 
             event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            '', 
            { status: 503, statusText: 'Service indisponible' }
          );
        })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FORCE_REFRESH') {
    self.skipWaiting();
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-offline-page') {
    event.waitUntil(
      caches.open(OFFLINE_CACHE)
        .then(cache => {
          return cache.match(OFFLINE_PAGE)
            .then(cachedResponse => {
              if (!cachedResponse) {
                return fetch(OFFLINE_PAGE)
                  .then(response => cache.put(OFFLINE_PAGE, response));
              }
              return Promise.resolve();
            });
        })
    );
  }
});