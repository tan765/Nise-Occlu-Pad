const CACHE_NAME = 'kirakira-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/common.css',
  '/js/utils.js',
  '/js/particles.js',
  '/js/audio.js',
  '/games/touch-sparkle.html',
  '/games/touch-sparkle.js',
  '/games/balloon-pop.html',
  '/games/balloon-pop.js',
  '/games/free-draw.html',
  '/games/free-draw.js',
  '/games/sparkle-fish.html',
  '/games/sparkle-fish.js',
  '/games/alien-smash.html',
  '/games/alien-smash.js',
  '/games/fly-swatter.html',
  '/games/fly-swatter.js',
  '/manifest.webmanifest',
];

// インストール時に全アセットをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュの削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-First 戦略
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
