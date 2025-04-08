self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/') || 
        !event.request.url.startsWith(self.location.origin)) {
      return;
    }
  
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            console.log('Hors ligne offline.html');
            return caches.match(OFFLINE_PAGE)
              .then(response => {
                if (response) {
                  return response;
                }
                return new Response('Hors ligne et pas offline html.', {
                  headers: { 'Content-Type': 'text/html' }
                });
              });
          }
          
          return new Response('', {
            status: 503,
            statusText: 'Service temporairement indisponible'
          });
        })
    );
  });