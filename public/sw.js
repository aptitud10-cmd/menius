// SW v16 — MENIUS PWA
// Strategy:
//   - Static assets (JS/CSS/fonts/icons): Cache-first, very long TTL
//   - HTML pages: Network-first with cache fallback (keeps menus fresh)
//   - API calls: Network-only (always fresh data)
//   - Offline: serve /offline fallback page (driver pages → /driver/offline)
//   - Background Sync: replay queued driver status actions on reconnect

const CACHE_NAME = 'menius-v16';
const OFFLINE_URL = '/offline';
const DRIVER_OFFLINE_URL = '/driver/offline';

// Assets to pre-cache on install (shell of the app)
const PRECACHE_URLS = [
  OFFLINE_URL,
  DRIVER_OFFLINE_URL,
];

// Install: pre-cache the offline pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-same-origin, and API/auth/supabase requests (always fresh)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/monitoring') ||
    url.hostname.includes('supabase')
  ) {
    return;
  }

  // Static assets: JS, CSS, images, fonts → cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // HTML navigation requests: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
          // Driver pages get a driver-specific offline screen
          if (url.pathname.startsWith('/driver/track/')) {
            return (await cache.match(DRIVER_OFFLINE_URL)) || new Response('Offline', { status: 503 });
          }
          return (await cache.match(OFFLINE_URL)) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { title: 'MENIUS', body: event.data?.text() ?? '' }; }

  const title = data.title || 'MENIUS';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification clicked — open or focus the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Background Sync — replay queued driver status actions ─────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'driver-status-sync') {
    event.waitUntil(replayStatusQueue());
  }
});

async function replayStatusQueue() {
  let db;
  try { db = await openDriverDB(); } catch { return; }
  const pending = await getAllPending(db);
  for (const item of pending) {
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: item.token, action: item.action }),
      });
      // Remove on success or permanent client error (4xx) — not on 5xx/network error
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await deleteItem(db, item.id);
      }
    } catch {
      break; // Still offline — stop; sync event will fire again on reconnect
    }
  }
}

// ── IndexedDB helpers (raw API, no external deps) ─────────────────────────────

function openDriverDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('menius-driver', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('status_queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('status_queue', 'readonly');
    const req = tx.objectStore('status_queue').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('status_queue', 'readwrite');
    const req = tx.objectStore('status_queue').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
