// Network-first for the player's own files (so updates show up), cache fallback
// when offline. EmulatorJS files from the CDN are cache-first (they never change).
const CACHE = 'gba-player-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && url.hostname !== 'cdn.emulatorjs.org') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (same) {
      try {
        const res = await fetch(req, {cache: 'no-cache'});
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return (await cache.match(req)) || (await cache.match(req, {ignoreSearch: true})) || Response.error();
      }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  })());
});
