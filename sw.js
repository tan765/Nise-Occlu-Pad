const CACHE_NAME = 'kirakira-v6';
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
  '/games/whack-mole.html',
  '/games/whack-mole.js',
  '/games/fruit-catch.html',
  '/games/fruit-catch.js',
  '/games/light-button.html',
  '/games/light-button.js',
  '/js/game-core-v2.js',
  '/games/touch-sparkle-v2.html',
  '/games/touch-sparkle-v2.js',
  '/games/balloon-pop-v2.html',
  '/games/balloon-pop-v2.js',
  '/games/free-draw-v2.html',
  '/games/free-draw-v2.js',
  '/games/sparkle-fish-v2.html',
  '/games/sparkle-fish-v2.js',
  '/games/alien-smash-v2.html',
  '/games/alien-smash-v2.js',
  '/games/fly-swatter-v2.html',
  '/games/fly-swatter-v2.js',
  '/games/whack-mole-v2.html',
  '/games/whack-mole-v2.js',
  '/games/fruit-catch-v2.html',
  '/games/fruit-catch-v2.js',
  '/games/light-button-v2.html',
  '/games/light-button-v2.js',
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
