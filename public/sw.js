// Travel Plan App — Service Worker
const CACHE_NAME = "travel-plan-v1";

const PRECACHE_URLS = [
  "/",
  "/login",
  "/manifest.json",
];

// Install: precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-only for API, Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Authenticated API responses must not be cached by URL.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: Cache-first
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
    return;
  }

  // Navigation (HTML pages): Network-first, fallback to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") || new Response("Offline"))
    );
    return;
  }
});

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    console.error("Error fetching resource:", err);
    return new Response(null, { status: 504, statusText: "Network Error" });
  }
}
