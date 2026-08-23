const CACHE_NAME = 'diag-kevin-v5';
const urlsToCache = [
    '/aide-diagnostic/',
    '/aide-diagnostic/index.html',
    '/aide-diagnostic/app.js',
    '/aide-diagnostic/manifest.json'
];

self.addEventListener('install', event => {
    console.log('[SW] Installation cache:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activation');
    event.waitUntil(
        caches.keys().then(names => 
            Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(r => r || fetch(event.request))
    );
});

self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
