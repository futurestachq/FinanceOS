const CACHE_NAME = 'financeos-v41';
// H8: install-time precache stays same-origin only (guaranteed available).
// The 4 pinned CDN scripts are runtime-cached on first use instead, so a CDN
// hiccup can never fail the install.
const APP_SHELL = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png'
];
// Version-pinned runtime deps (must match the <script> tags in index.html).
// Served stale-while-revalidate so the app boots offline after first load.
const CDN_ALLOWLIST = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // never interfere with writes
  const requestUrl = new URL(event.request.url);

  // H8a: navigations (/, /index.html, ...) are network-first with a fallback
  // to the cached shell, so cold starts at any route work offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isAppShell = APP_SHELL.some((p) => requestUrl.pathname.endsWith(p) || requestUrl.pathname.endsWith(p.replace('./', '/')));
  const isPinnedCdn = CDN_ALLOWLIST.indexOf(event.request.url) !== -1;

  if (isAppShell || isPinnedCdn) {
    // Stale-while-revalidate: serve cached instantly, update cache in background
    // so the app shell always converges to the latest deployed version.
    // NOTE: <script> fetches are no-cors (opaque, status 0) — those must be
    // cached too, or the CDN entries would never persist (old bug).
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const network = fetch(event.request).then((response) => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // H8b: everything else — Firestore/Google APIs, unlisted third-party — goes
  // straight to network and is NEVER cached. The old generic branch cached
  // cross-origin API responses indefinitely (stale data served as truth).
  event.respondWith(fetch(event.request));
});

// Handle push-style notifications sent from the main page via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = event.data;
    self.registration.showNotification(title, {
      body: body,
      tag: tag,
      icon: icon || './icon-192.svg',
      badge: icon || './icon-192.svg',
      requireInteraction: false,
      data: { url: './index.html' }
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
