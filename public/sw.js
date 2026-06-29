/* NutriPlanner service worker — app-shell precache + runtime caching.
 * Hand-written (no build plugin) so it never interferes with the Next/Turbopack
 * build or the Firebase requests. Registered only in production. */

// Bump this on every deploy that changes the precached shell. The activate
// handler deletes every cache whose name !== CACHE, so bumping forces a clean
// purge of stale assets (the old 'v1' cache never got cleared because the name
// never changed).
const CACHE = 'nutriplanner-v2';
const APP_SHELL = [
  '/',
  '/dashboard',
  '/mobile',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin (Firebase Auth/Firestore/Storage, Google APIs)
  // or our own API routes — let the network handle those untouched.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first (fresh when online), fall back to the cached
  // page or the root shell when offline. The root ('/') re-runs the viewport
  // router, so it works for both mobile and desktop — '/dashboard' would have
  // served the desktop UI to phones.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first, populate the cache on a miss.
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      )
    );
  }
});
