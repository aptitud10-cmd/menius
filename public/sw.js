const SW_VERSION = '4';
const CACHE_NAME = 'menius-v' + SW_VERSION;
const STATIC_CACHE = 'menius-static-v' + SW_VERSION;
const IMAGE_CACHE = 'menius-images-v' + SW_VERSION;

const PRECACHE_URLS = [
  '/',
  '/offline',
];

const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/webpack')) return;

  if (url.pathname.startsWith('/r/')) {
    event.respondWith(networkFirstWithCache(request, CACHE_NAME, 5000));
    return;
  }

  const ext = url.pathname.substring(url.pathname.lastIndexOf('.'));

  if (IMAGE_EXTENSIONS.includes(ext) || url.hostname.includes('unsplash') || url.hostname.includes('supabase')) {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
    return;
  }

  if (STATIC_EXTENSIONS.includes(ext) || url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith('/app')) {
    event.respondWith(networkFirstWithCache(request, CACHE_NAME, 3000));
    return;
  }

  event.respondWith(networkFirstWithCache(request, CACHE_NAME, 5000));
});

async function networkFirstWithCache(request, cacheName, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}
