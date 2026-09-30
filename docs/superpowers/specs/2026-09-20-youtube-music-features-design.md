# YouTube Music Clone — Core Features Implementation Design

**Date**: 2026-09-20  
**Status**: Approved for Implementation  
**Scope**: 6 features (Queue Drawer, Playlist Detail Page, Settings Page, Lyrics Enhancement, PWA Full Offline, Search Filters)

---

## 1. Queue Drawer (Sidebar Panel)

### Architecture
- New component `components/player/QueueDrawer.tsx` — slides in from right, shares space with `ExpandedPlayer` (z-index 35)
- State in `stores/ui.store.ts`: `queueOpen: boolean`, `toggleQueue()`
- Renders in `MainShell.tsx` alongside `ExpandedPlayer`
- Uses `@dnd-kit/core` + `@dnd-kit/sortable` for reordering (accessible, lightweight)

### Data Flow
```
User drags row → @dnd-kit onDragEnd → queue.store.setQueue(newOrder) → persist → UI updates
```

### UI Details
- **Header**: "Up Next" + count + "Clear queue" + "Save as playlist"
- **Rows**: Drag handle (grip), song art (40px), title/artist, duration, remove (✕)
- **Empty state**: "Queue is empty. Play something to fill it."
- **Keyboard**: `Tab`/`Shift+Tab` navigate, `Space`/`Enter` play, `Delete` remove, `↑/↓` move focus

### Accessibility
- `role="list"` container, `role="listitem"` rows
- `aria-label` on drag handle: "Drag to reorder"
- `aria-roledescription="draggable"` on rows
- Live region for queue count changes

---

## 2. Playlist Detail Page (`/playlist/[id]`)

### Architecture
- Dynamic route: `app/playlist/[id]/page.tsx` (client component)
- Loads playlist from `useLibraryStore` by ID
- Editable name (inline), generated cover from first 4 song images
- Reorderable songs (same dnd-kit pattern)

### Data Flow
```
Page mounts → useLibraryStore playlists[id] → render
User reorders → library.store.updatePlaylistSongs(newOrder)
User edits name → library.store.updatePlaylistName(id, newName)
User deletes → library.store.deletePlaylist(id) → router.back()
```

### UI Details
- **Header**: Back button, cover (120px square, rounded 8), editable name, song count, "Play all" (red), "Shuffle" (outline), "Delete" (outline red)
- **Song list**: Same `SongRow` as library but with drag handle, remove-from-playlist in context menu
- **Empty state**: Illustration + "Add songs" button → opens search modal (future) or toast "Right-click songs to add"

### New Store Methods
- `updatePlaylistName(id: string, name: string)`
- `updatePlaylistSongs(id: string, songs: Song[])`

---

## 3. Settings Page (`/settings`)

### Architecture
- Route: `app/settings/page.tsx` with section components
- Extended `stores/settings.store.ts` with all settings + persist
- `AudioManager.tsx` integrates Equalizer via Web Audio API

### Settings Schema
```typescript
interface SettingsState {
  // existing
  language: string
  // appearance
  theme: 'dark' | 'light' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  // playback
  audioQuality: 'low' | 'normal' | 'high'  // maps to API bitrate params
  crossfade: number  // 0-12 seconds
  gapless: boolean
  sleepTimer: number  // minutes, 0 = off
  // equalizer
  eqEnabled: boolean
  eqPreset: 'flat' | 'bass' | 'vocal' | 'rock' | 'electronic' | 'custom'
  eqCustom: number[10]  // -12 to +12 dB per band
  // lyrics
  lyricsFontSize: number  // 12-24
  // data
  // about
}
```

### Equalizer Implementation
- `AudioManager` creates `AudioContext` → `BiquadFilterNode` x10 → `GainNode` → destination
- Filters at standard ISO frequencies: 31, 62, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz
- Preset curves applied on `eqPreset` change
- Cleanup on unmount

### UI Sections
Each section: `<section>` with `<h2>`, controls in grid/flex
- Theme: radio group (Dark/Light/System) → sets `document.documentElement.dataset.theme`
- Sleep timer: dropdown + custom input
- EQ: preset selector + "Custom" expands 10 sliders

---

## 4. Lyrics Enhancement

### Current State
`LyricsPanel` already renders as tab in `ExpandedPlayer` with:
- Synced lyrics: active line highlight, auto-scroll, click-to-seek
- Plain lyrics: scrollable with mask fade
- Loading / empty / error states

### Enhancements
1. **Translation toggle**: API returns `lines[{time, text, translation?}]` → toggle button shows translation below original
2. **Romanization toggle**: For non-Latin scripts (Telugu, Hindi, etc.)
3. **Font size slider**: 12-24px, persists in `settings.store.lyricsFontSize`
4. **Keyboard navigation**: `↑/↓` moves active line, `Enter` seeks
5. **Panel header**: Translation | Romanization | Font size controls

### Type Changes
```typescript
export interface LyricLine {
  time: number
  text: string
  translation?: string
  romanization?: string
}
```

---

## 5. PWA Full Offline (`next-pwa`)

### Configuration
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    { urlPattern: /^https:\/\/.*\.mp3|.*\.m4a/, handler: 'CacheFirst', options: { cacheName: 'audio', plugins: [rangeRequestsPlugin] }},
    { urlPattern: /^https:\/\/.*\/(search|video-id|lyrics)/, handler: 'NetworkFirst', options: { cacheName: 'api', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 5*60 }}},
    { urlPattern: /\.(png|jpg|jpeg|svg|webp)/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 30*24*60*60 }}},
    { urlPattern: /^https:\/\/fonts\.googleapis\.com/, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' }},
  ],
  fallbacks: { document: '/offline' }
})
```

### Manifest
```json
{
  "name": "Music",
  "short_name": "Music",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" }, { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```

### Offline Page
`public/offline.html` — minimal HTML with retry button, loads app shell from cache

### Install Prompt
- Listen for `beforeinstallprompt` in `Header` → store event → show toast "Install Music App" with button
- On click: `prompt()`, then `userChoice`

---

## 6. Search Filters (Songs/Albums/Artists/Playlists)

### API Extension
`/api/search?type=songs|albums|artists|playlists`
- `saavn.ts` new functions: `searchAlbums(q, lang, page)`, `searchArtists(q, lang, page)`, `searchPlaylists(q, lang, page)`
- Each returns `{ items: Type[] }` with consistent shape

### Types
```typescript
export interface Album { id: string; title: string; artist: string; year?: string; image: string; songCount: number }
export interface Artist { id: string; name: string; image: string; subscriberCount?: number; genres?: string[] }
export interface Playlist { id: string; title: string; owner: string; image: string; songCount: number }
```

### UI
- Tab bar under search header: `Songs | Albums | Artists | Playlists`
- Active tab fetches corresponding type via `useQuery` with `type` in queryKey
- Results:
  - **Songs**: existing `SongCard` grid (flex-wrap)
  - **Albums**: `AlbumCard` — art (160px), title, artist, year, song count
  - **Artists**: `ArtistCard` — avatar (160px circle), name, subscriber count, top genre
  - **Playlists**: `PlaylistCard` — cover (160px), title, owner, song count
- URL sync: `?q=...&type=albums` for deep linking

### New Components
- `components/search/AlbumCard.tsx`
- `components/search/ArtistCard.tsx`
- `components/search/PlaylistCard.tsx`

---

## Dependencies to Add
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "next-pwa": "^5.6.0",
  "workbox-range-requests": "^7.0.0"
}
```

## File Summary

| Feature | New Files | Edited Files |
|---------|-----------|--------------|
| Queue Drawer | `components/player/QueueDrawer.tsx` | `stores/ui.store.ts`, `components/layout/MainShell.tsx` |
| Playlist Detail | `app/playlist/[id]/page.tsx` | `stores/library.store.ts` |
| Settings | `app/settings/page.tsx`, `components/settings/*` | `stores/settings.store.ts`, `AudioManager.tsx` |
| Lyrics | — | `components/player/LyricsPanel.tsx`, `types/music.ts`, `stores/settings.store.ts` |
| PWA | `next.config.js`, `public/manifest.json`, `public/offline.html`, `public/icons/*` | `package.json`, `components/layout/Header.tsx` |
| Search Filters | `components/search/*` (3 cards) | `app/search/page.tsx`, `app/api/search/route.ts`, `lib/saavn.ts` |

---

## Implementation Order
1. **Queue Drawer** — foundational UI, used by playlist detail
2. **Playlist Detail Page** — uses queue patterns
3. **Settings Page** — extends store, needed for EQ/lyrics font size
4. **Lyrics Enhancement** — uses settings
5. **PWA** — standalone, can parallelize
6. **Search Filters** — new API + components

---

## Testing Checklist
- [ ] Queue drag reorder persists across reload
- [ ] Playlist create/edit/delete/rename works
- [ ] Theme toggle applies immediately + persists
- [ ] Equalizer presets audible, custom sliders work
- [ ] Lyrics translation/romanization toggle
- [ ] PWA installs, works offline (cached assets + audio)
- [ ] Search tabs switch, URL updates, results render correctly