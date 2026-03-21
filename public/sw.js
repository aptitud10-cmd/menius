// SW v13 — SELF-DESTRUCT MODE
// Clears all caches, navigates all tabs to fresh network fetches, then
// unregisters itself so the browser falls back to plain network requests.
// The layout.tsx "kill SW" script will keep it unregistered permanently.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((c) => c.navigate(c.url).catch(() => {}));
      })
      .then(() => self.registration.unregister())
  );
});

// No fetch handler — all requests fall through to the network directly.
