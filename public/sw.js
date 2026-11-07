/*
 * Service worker прототипа "Дека".
 * Активируется только в production-сборке (см. src/components/pwa-register.tsx).
 * Стратегии:
 *  — навигация (страницы): сеть → кэш → offline.html;
 *  — статика (/_next/static, иконки, шрифты): кэш → сеть (с фоновым обновлением);
 *  — /api/*: ТОЛЬКО сеть, никогда не кэшируем (персональные данные).
 */

const CACHE = "deka-static-v1";
const PRECACHE = ["/offline.html", "/icon.svg", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // персональные данные и сессии — только сеть, никакого кэша
  if (url.pathname.startsWith("/api/")) return;

  // навигация: сеть, при офлайне — кэш, затем offline.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached ?? caches.match("/offline.html").then((page) => page ?? Response.error()))
        )
    );
    return;
  }

  // статика: кэш с фоновым обновлением
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/offline.html" ||
    url.pathname.endsWith(".woff2");
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached ?? Response.error());
        return cached ?? network;
      })
    );
  }
});
