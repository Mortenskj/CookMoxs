const CACHE_NAME = 'cookmoxs-v1-1-1';
const RECIPE_CACHE_NAME = 'cookmoxs-recipes-v1-1-1';
const APP_SHELL = ['/', '/manifest.webmanifest'];
const SAVED_RECIPES_CACHE_PATH = '/__recipe-cache/saved-recipes.json';
const ACTIVE_RECIPE_CACHE_PATH = '/__recipe-cache/active-recipe.json';

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== RECIPE_CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET' && (url.pathname === SAVED_RECIPES_CACHE_PATH || url.pathname === ACTIVE_RECIPE_CACHE_PATH)) {
    event.respondWith(
      caches.open(RECIPE_CACHE_NAME).then((cache) => cache.match(request)).then((cached) => {
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Recipe cache entry not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    return;
  }

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  // Non-navigation assets: serve from cache only — never fall back to the app shell HTML
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
