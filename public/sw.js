const CACHE_PREFIX = `travel-os-shell:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}BUILD_VERSION`;
const SHELL = ['./'];
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font', 'manifest']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./')));
    return;
  }
  if (!CACHEABLE_DESTINATIONS.has(event.request.destination)) return;
  event.respondWith(fetch(event.request).then((response) => {
    // Clone before returning: the browser may consume the body while the cache opens.
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {}));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
