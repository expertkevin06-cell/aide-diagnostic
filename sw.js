const CACHE_NAME = 'diag-kevin-v4';  // ← Changez ce numéro à chaque mise à jour !
const urlsToCache = ['/index.html', '/app.js', '/manifest.json'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Nouveau cache installé :', CACHE_NAME);
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // Force l'activation immédiate
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                          .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim(); // Prend le contrôle immédiatement
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
