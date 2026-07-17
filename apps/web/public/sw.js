const SHELL_CACHE = "vagaciones-shell-v1";
const DOCUMENT_CACHE = "vagaciones-documents-v1";
const OFFLINE_SHELL = "/offline/offline.html";
const SAFE_NAVIGATION = [
  "/trips/europa-2026",
  "/trips/europa-2026/reservas",
  "/trips/europa-2026/hotel",
  "/trips/europa-2026/offline",
  OFFLINE_SHELL,
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SAFE_NAVIGATION)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/documents/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(event.request));
    return;
  }

  if (event.request.mode === "navigate" && isSafeNavigation(url.pathname)) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isSafeNavigation(url.pathname) && (event.request.headers.has("RSC") || event.request.headers.has("Next-Router-Prefetch"))) {
    event.respondWith(networkFirstNavigation(event.request));
  }
});

function isSafeNavigation(pathname) {
  return SAFE_NAVIGATION.includes(pathname) || /^\/trips\/europa-2026\/days\/\d+$/.test(pathname);
}

async function cacheFirst(request) {
  const cache = await caches.open(DOCUMENT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.headers.get("X-Vagaciones-Cacheable") === "true") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_SHELL));
  }
}
