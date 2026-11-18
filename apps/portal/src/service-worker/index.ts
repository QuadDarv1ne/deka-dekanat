/// <reference lib="webworker" />
import { immutable, assets as staticFiles } from '$app/manifest';
import { version } from '$app/env';
const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `deka-static-${version}`;
const offline = '/offline.html';
const assets = [
  ...immutable.map((file) => file.path),
  ...staticFiles.map((file) => file.path).filter((path) => /^\/(fonts|brand)\//.test(path)),
  offline
];
const allowed = new Set(assets);
worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});
worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith('deka-static-') && name !== cacheName) await caches.delete(name);
      await worker.clients.claim();
    })()
  );
});
worker.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== worker.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(offline)) ??
          new Response('Нет подключения', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
      )
    );
  } else if (allowed.has(url.pathname))
    event.respondWith(
      caches
        .open(cacheName)
        .then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request))
    );
});
