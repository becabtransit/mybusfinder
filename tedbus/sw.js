const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('offline-cache').then(cache => {
      return cache.add(OFFLINE_PAGE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {

        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        
        return new Response('', {
          status: 408,
          statusText: 'Connexion réseau non disponible'
        });
      })
  );
});