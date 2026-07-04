// Service Worker — minimal & safe
// Caches only static assets (icons, fonts, manifest). Never caches:
//   - API responses (/api/*)
//   - Auth routes (/api/auth/*)
//   - HTML navigation pages (let Next.js handle routing & auth redirects)
// The browser's normal HTTP cache plus middleware (proxy.ts) handle
// everything else. This SW exists primarily so the app works offline
// after first visit and is installable as a PWA.

const CACHE = "mazaya-v2";
const ASSETS = [
  "/manifest.json",
  "/logo.png",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  // Pre-cache critical assets. Don't fail install if one asset is missing.
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((url) =>
          fetch(url, { cache: "no-cache" })
            .then((res) => (res.ok ? c.put(url, res) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Same-origin only — never intercept cross-origin requests
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Never cache or proxy API responses (auth, data, mutations).
  // Letting the SW touch these causes stale 401s, stale data, and
  // confusing "Failed to convert value to 'Response'" errors.
  if (path.startsWith("/api/")) return;

  // Never cache the service worker file itself or the manifest lookup
  if (path === "/sw.js") return;

  // For everything else (static assets, navigations): cache-first with
  // a safe network fallback. If both fail, return a synthetic 503
  // Response (NEVER undefined — that throws in respondWith).
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        // Refresh in background (stale-while-revalidate), but don't await.
        fetch(req).then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
          }
        }).catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(req);
        // Only cache successful, basic/cors responses
        if (res && res.ok && (res.type === "basic" || res.type === "default")) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      } catch (err) {
        // Both cache miss AND network failure — return a valid Response
        // so respondWith() never receives undefined.
        return new Response("", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});
