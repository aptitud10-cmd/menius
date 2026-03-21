const SW_VERSION = '11';
const CACHE_NAME = 'menius-v' + SW_VERSION;
const STATIC_CACHE = 'menius-static-v' + SW_VERSION;
const IMAGE_CACHE = 'menius-images-v' + SW_VERSION;
const MENU_CACHE = 'menius-menu-v' + SW_VERSION;

const PRECACHE_URLS = ['/offline'];

const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'];

const RESERVED_PATHS = new Set([
  'app', 'api', 'auth', 'admin', 'blog', 'changelog', 'cookies', 'demo',
  'faq', 'offline', 'onboarding', 'privacy', 'r', 'setup-profesional',
  'start', 'status', 'terms', 'login', 'signup', 'kds', 'counter',
  '_next', 'manifest.webmanifest', 'sitemap.xml', 'robots.txt',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const allCaches = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE, MENU_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => !allCaches.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: SW_VERSION })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/webpack')) return;
  if (url.pathname.startsWith('/auth/')) return;

  // Never intercept order tracking, review, or checkout — always fetch fresh
  const _segs = url.pathname.split('/').filter(Boolean);
  if (_segs[1] === 'orden' || _segs[1] === 'review' || _segs[1] === 'checkout') return;

  const ext = url.pathname.includes('.') ? url.pathname.substring(url.pathname.lastIndexOf('.')) : '';

  // Images + Supabase CDN — cache first, long TTL
  if (IMAGE_EXTENSIONS.includes(ext) || url.hostname.includes('supabase.co') || url.hostname.includes('unsplash.com')) {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
    return;
  }

  // Static JS/CSS/fonts — cache first
  if (STATIC_EXTENSIONS.includes(ext) || url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // Public restaurant menus — both /r/slug and /{slug} patterns
  if (isMenuRoute(url.pathname)) {
    event.respondWith(menuNetworkFirst(request));
    return;
  }

  // Dashboard and other app routes
  if (url.pathname.startsWith('/app')) {
    event.respondWith(networkFirstWithCache(request, CACHE_NAME, 3000));
    return;
  }

  event.respondWith(networkFirstWithCache(request, CACHE_NAME, 5000));
});

function isMenuRoute(pathname) {
  if (pathname.startsWith('/r/')) return true;
  const segs = pathname.split('/').filter(Boolean);
  const firstSegment = segs[0];
  const secondSegment = segs[1];
  // Only treat as menu if it's the root slug page, not a sub-page
  if (secondSegment) return false;
  return firstSegment && !RESERVED_PATHS.has(firstSegment);
}

async function menuNetworkFirst(request) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    if (response && response.ok && request.headers.get('accept')?.includes('text/html')) {
      caches.open(MENU_CACHE).then((c) => c.put(request, response.clone())).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline');
    if (offline) return offline;
    return new Response('<h1>Sin conexión</h1>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function networkFirstWithCache(request, cacheName, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    if (response && response.ok) {
      caches.open(cacheName).then((c) => c.put(request, response.clone())).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      const offline = await caches.match('/offline');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      caches.open(cacheName).then((c) => c.put(request, response.clone())).catch(() => {});
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ── Push notifications ──

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'MENIUS', body: event.data.text() }; }
  const { title = 'MENIUS', body = '', icon, badge, url, data, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icons/icon-192.svg',
      badge: badge || '/icons/icon-96.svg',
      tag: tag || 'menius-order',
      renotify: true,
      vibrate: [100, 50, 100],
      data: { url, ...(data || {}) },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
