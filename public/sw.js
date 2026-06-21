// Service Worker - بسيط (cache-first للـ assets)
const CACHE = "mazaya-v1";
const ASSETS = ["/", "/manifest.json", "/logo.png", "/icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match("/")))
  );
});
