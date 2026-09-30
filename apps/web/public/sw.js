/* Free Music service worker — hand-written, no build step.
 * Bump CACHE_VERSION whenever the caching rules or SHELL_URLS change.
 * Audio is intentionally NOT cached here: offline songs live in IndexedDB (lib/offline-storage.ts). */
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `fm-shell-${CACHE_VERSION}`
const STATIC_CACHE = `fm-static-${CACHE_VERSION}`
const IMAGE_CACHE = `fm-images-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE]

const OFFLINE_URL = '/offline.html'
const SHELL_URLS = ['/', OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']
const MAX_PAGE_ENTRIES = 50
const MAX_IMAGE_ENTRIES = 200

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  // Also removes caches left by the old workbox worker (start-url, audio-cache, api-cache, …)
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Audio streams (range requests), media files and API calls always go straight to the network
  if (request.headers.has('range')) return
  if (url.pathname.startsWith('/api/')) return
  if (/\.(mp4|m4a|mp3|aac|ogg|webm)$/i.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url))
    return
  }
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }
  if (request.destination === 'image' && url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES))
  }
})

async function handleNavigation(request, url) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(url.pathname, response.clone())
      trimCache(SHELL_CACHE, MAX_PAGE_ENTRIES + SHELL_URLS.length)
    }
    return response
  } catch {
    return (
      (await cache.match(url.pathname)) ||
      (await cache.match('/')) ||
      (await cache.match(OFFLINE_URL)) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    )
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      // Opaque (cross-origin no-cors) responses are not ok and are never stored
      if (response.ok) {
        cache.put(request, response.clone())
        if (maxEntries) trimCache(cacheName, maxEntries)
      }
      return response
    })
    .catch(() => cached)
  return cached || network
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)))
}
