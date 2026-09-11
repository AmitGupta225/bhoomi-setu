const CACHE_NAME = 'bhoomi-setu-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/bhoomi-icon.svg',
  '/hero_banner.jpg',
  '/login_banner.jpg',
  '/dashboard_banner.jpg',
  '/earth_satellite_bg.jpg',
  '/satellite_earth.jpg'
];

// 1. Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical asset failed to pre-cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch interceptor
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (POST/PUT handled by outbox queue in IndexedDB)
  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML page loads): Network-First, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Update cache with latest index.html
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          return cachedIndex || new Response('<h1>Bhoomi Setu Offline</h1><p>Application shell cached. Please refresh.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

const FALLBACK_GRID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#0a1628" stroke="#1e293b" stroke-width="1"/>
  <path d="M 0 64 L 256 64 M 0 128 L 256 128 M 0 192 L 256 192 M 64 0 L 64 256 M 128 0 L 128 256 M 192 0 L 192 256" stroke="#1e3a5f" stroke-width="0.75" stroke-dasharray="3,3"/>
  <circle cx="128" cy="128" r="3" fill="#0ea5e9" opacity="0.8"/>
  <text x="128" y="136" font-family="system-ui, sans-serif" font-size="8" fill="#64748b" text-anchor="middle" font-weight="700">OFFLINE CADASTRE</text>
  <text x="128" y="150" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">SPATIAL GRID</text>
</svg>`;

  // Map Tiles (OpenStreetMap / Carto / Esri): Cache-First with Network fallback
  if (url.hostname.includes('tile.openstreetmap') || url.hostname.includes('basemaps.cartocdn') || url.hostname.includes('arcgisonline')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        
        // 1. Check exact match
        let cachedResponse = await cache.match(request);
        
        // 2. If OSM tile, try matching canonical URL (handles a., b., c. rotation)
        if (!cachedResponse && url.hostname.includes('tile.openstreetmap')) {
          const canonicalUrl = `https://tile.openstreetmap.org${url.pathname}`;
          cachedResponse = await cache.match(canonicalUrl);
        }

        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. Try fetching from network
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            cache.put(request, clone);
          }
          return networkResponse;
        } catch (err) {
          // 4. Return clean, high-contrast Cadastral Grid SVG tile so screen NEVER goes black
          return new Response(FALLBACK_GRID_SVG, {
            status: 200,
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'public, max-age=86400'
            }
          });
        }
      })()
    );
    return;
  }

  // API Requests: Network-First with cached JSON fallback for GET
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({
            success: false,
            offline: true,
            message: 'Network offline. Using local cached records.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, SVGs, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message listener (for skipWaiting or manual cache purge)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
