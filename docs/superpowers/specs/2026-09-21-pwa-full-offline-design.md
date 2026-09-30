# Feature 5: PWA Full Offline — Design Specification

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Effort**: Medium

---

## Objective
Make the app installable and fully functional offline:
- Static assets cached (JS, CSS, images, fonts)
- API responses cached with NetworkFirst strategy
- **Audio files cached with range request support** for seeking
- Install prompt on supported browsers
- Offline fallback page

---

## Technical Stack
- `next-pwa` v5.6+ (wraps `next.config.js`)
- `workbox-range-requests` v7+ (audio seeking)
- Workbox runtime caching
- Service Worker auto-generated at build time

---

## Files to Create

### 1. `public/manifest.json`
```json
{
  "name": "Music",
  "short_name": "Music",
  "description": "YouTube Music clone — stream millions of songs offline",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["music", "entertainment"],
  "shortcuts": [
    { "name": "Search", "url": "/search", "description": "Search songs" },
    { "name": "Library", "url": "/library", "description": "Your library" }
  ]
}
```

### 2. `public/offline.html`
Minimal offline fallback page with retry button and auto-reload when connection restores.

### 3. Icon Files (required)
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/maskable-512.png` (512×512, maskable)

---

## Files to Modify

### 1. `package.json`
Add dependencies:
```json
{
  "dependencies": {
    "next-pwa": "^5.6.0",
    "workbox-range-requests": "^7.0.0"
  }
}
```

### 2. `next.config.js` (create if missing, or wrap existing)
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Audio files — CacheFirst with range requests
    {
      urlPattern: /\.(?:mp3|m4a|mp4|aac|ogg|webm)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        plugins: [
          require('workbox-range-requests').createPlugin(),
          {
            cacheWillUpdate: async ({ response }) => {
              if (response.status === 200 || response.status === 206) return response
              return null
            }
          }
        ],
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
      }
    },
    // API endpoints — NetworkFirst with 5s timeout
    {
      urlPattern: /^https:\/\/.*\/(api\/search|api\/video-id|api\/lyrics)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 }
      }
    },
    // Images — CacheFirst
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
      }
    },
    // Google Fonts — StaleWhileRevalidate
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'font-cache' }
    }
  ],
  fallbacks: {
    document: '/offline'
  }
})

module.exports = withPWA({
  // your existing next config here
  reactStrictMode: true,
})
```

### 3. `components/layout/Header.tsx` — Install Prompt
Add to Header component:
```tsx
// Types (add to global.d.ts or top of file)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Inside Header component
const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

useEffect(() => {
  const handler = (e: BeforeInstallPromptEvent) => {
    e.preventDefault()
    setDeferredPrompt(e)
    // Show toast with install action
    showToast('App installable', { 
      action: { label: 'Install', onClick: installApp } 
    })
  }
  window.addEventListener('beforeinstallprompt', handler as EventListener)
  return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
}, [])

const installApp = async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') showToast('Installing…')
  setDeferredPrompt(null)
}

// In JSX (e.g., in right icon area or settings menu)
{deferredPrompt && (
  <button onClick={installApp} style={{...}} title="Install App">
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  </button>
)}
```

---

## Verification Checklist

| Test | Expected |
|------|----------|
| `pnpm build` succeeds | ✅ `public/sw.js` + `workbox-*.js` generated |
| Lighthouse PWA audit | Score ≥ 90 |
| Install prompt appears | On mobile Chrome / Edge / Brave |
| Offline: Home page loads | From cache |
| Offline: Search (cached queries) | Works via `api-cache` |
| Offline: Audio playback | Works via `audio-cache` |
| Offline: Audio seeking | Works (range requests via `workbox-range-requests`) |
| Offline page shows | When no cache match |
| Service Worker updates | `skipWaiting` + `clients.claim` on reload |

---

## Notes for Implementer
- **Icons**: Generate from app logo using a tool like `pwa-asset-generator` or manually create
- **Audio caching**: Saavn returns direct media URLs (JioSaavn CDN). Workbox will cache on first play. Range requests enable seeking without full download.
- **Development**: `disable: true` in dev mode to avoid SW interference with HMR
- **HTTPS required**: Service Workers only work on `localhost` or HTTPS. Test on `localhost` or deploy to preview.

---

## Dependencies Summary
```bash
pnpm add next-pwa@5.6.0 workbox-range-requests@7.0.0
```