// Menius Admin Service Worker
// Handles push notifications and offline caching for the admin panel

const CACHE_NAME = 'menius-admin-v1';
const OFFLINE_URLS = ['/admin', '/admin/dev', '/admin/metrics'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Menius Admin';
  const options = {
    body: data.body ?? 'Hay una actualización en el sistema.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-96.svg',
    tag: data.tag ?? 'menius-admin',
    renotify: true,
    data: { url: data.url ?? '/admin/dev' },
    actions: data.actions ?? [
      { action: 'open', title: 'Ver en Dev Tool' },
      { action: 'dismiss', title: 'Descartar' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/admin/dev';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('/admin'));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

// Fetch: network-first for admin routes, cache fallback
self.addEventListener('fetch', (event) => {
  if (!event.request.url.includes('/admin')) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
