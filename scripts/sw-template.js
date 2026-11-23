const scope = self.registration.scope
const prefix = `hellafast:${scope}:`
const cacheName = `${prefix}__VERSION__`
// The build substitutes the complete local file list.
// eslint-disable-next-line no-undef
const assets = __ASSETS__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(async (keys) => {
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)))
    await self.clients.claim()
  }))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return
  event.respondWith(caches.open(cacheName).then(async (cache) => {
    if (request.mode === 'navigate') {
      return (await cache.match(new URL('./index.html', scope))) ?? fetch(request)
    }
    return (await cache.match(request)) ?? fetch(request)
  }))
})
