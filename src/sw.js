require('node_modules/sw-toolbox/sw-toolbox.js');
console.log('[ServiceWorker] File loaded');

let cacheName = 'soundcloud-v1';
let filesToCache = [
  '/',
  '/index.html'
];

addEventListener('install', event => {
  console.log('[ServiceWorker] Install');

  event.waitUntil(
    caches.open(cacheName).then(cache => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');

  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key !== cacheName) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
    })
  );
  return self.clients.claim();
});
