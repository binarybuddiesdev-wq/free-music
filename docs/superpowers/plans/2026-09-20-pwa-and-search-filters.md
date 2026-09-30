# PWA Full Offline & Search Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement full offline PWA capabilities (manifest, icons, service worker with audio range requests caching, offline fallback, install prompt) and YouTube Music style search filters (Songs, Albums, Artists, Playlists tabs with dedicated cards and URL synchronization).

**Architecture:** 
- **Search Filters:** Extend Saavn API client with typed queries for albums, artists, and playlists. Extend `/api/search` with a `type` parameter. Build dedicated UI cards (`AlbumCard`, `ArtistCard`, `PlaylistCard`) and integrate filter tabs in `app/search/page.tsx` with smooth shallow URL synchronization.
- **PWA Full Offline:** Provide `public/manifest.json`, high-resolution icons, and a standalone `public/offline.html`. Implement a production-ready Service Worker (`public/sw.js`) supporting byte-range request handling for audio seeking offline, network-first API caching, and image/font caching. Register the worker in the client provider and add an install prompt button to `Header.tsx`.

**Tech Stack:** Next.js 15, React 19, Zustand 5, TanStack Query 5, Web Audio API, Service Worker API, Cache Storage API, PWA Web App Manifest.

---

### Task 1: Search Types & Saavn API Extension
**Files:**
- Modify: `apps/web/types/music.ts`
- Modify: `apps/web/lib/saavn.ts`
- Modify: `apps/web/app/api/search/route.ts`

**Issues Addressed:** Add backend capability to search by Albums, Artists, and Playlists in addition to Songs.

- [x] **Step 1: Add Album, Artist, and SearchPlaylist interfaces to `types/music.ts`**
- [x] **Step 2: Add `searchAlbums`, `searchArtists`, and `searchPlaylists` functions to `lib/saavn.ts`**
- [x] **Step 3: Update `app/api/search/route.ts` to support `type` param (`songs` | `albums` | `artists` | `playlists`)**
- [x] **Step 4: Verify search route with unit/smoke tests**

---

### Task 2: Search Result Card Components
**Files:**
- Create: `apps/web/components/search/AlbumCard.tsx`
- Create: `apps/web/components/search/ArtistCard.tsx`
- Create: `apps/web/components/search/PlaylistCard.tsx`

**Issues Addressed:** Distinct visual presentation for Albums (square with metadata), Artists (circular avatar with follower/genre info), and Playlists (square artwork with owner and track count).

- [x] **Step 1: Create `AlbumCard.tsx` with hover effect and click interaction**
- [x] **Step 2: Create `ArtistCard.tsx` with circular styling and artist info**
- [x] **Step 3: Create `PlaylistCard.tsx` with track count and owner info**

---

### Task 3: Filtered Search Page with Tabs & URL Synchronization
**Files:**
- Modify: `apps/web/app/search/page.tsx`

**Issues Addressed:** Multi-category search navigation, responsive pill tabs, loading skeletons for each tab, and bookmarkable/shareable URL state (`?q=...&type=...`).

- [x] **Step 1: Add tab bar for Songs, Albums, Artists, Playlists**
- [x] **Step 2: Implement URL synchronization with `router.replace` without full reload**
- [x] **Step 3: Render tab-specific grids and loading skeletons**
- [x] **Step 4: Verify search tab switching and query persistence**

---

### Task 4: PWA Web App Manifest, App Icons & Offline Fallback Page
**Files:**
- Create: `apps/web/public/manifest.json`
- Create: `apps/web/public/offline.html`
- Create: `apps/web/public/icons/icon-192.png`
- Create: `apps/web/public/icons/icon-512.png`
- Create: `apps/web/public/icons/maskable-512.png`
- Modify: `apps/web/app/layout.tsx`

**Issues Addressed:** Web app installability, home screen icons, standalone display mode, and offline page fallback.

- [x] **Step 1: Create `manifest.json` with app metadata, theme color, icons, and shortcuts**
- [x] **Step 2: Generate valid PNG brand icons at 192x192 and 512x512**
- [x] **Step 3: Create `offline.html` fallback page with retry and auto-reload**
- [x] **Step 4: Link manifest and mobile meta tags in `app/layout.tsx`**

---

### Task 5: Service Worker with Range Requests & Runtime Caching
**Files:**
- Create: `apps/web/public/sw.js`
- Modify: `apps/web/components/providers.tsx`

**Issues Addressed:** Full offline support, audio caching with byte-range request support for seeking, API network-first caching, and image caching.

- [x] **Step 1: Implement `sw.js` with audio range request handler and runtime caches**
- [x] **Step 2: Register service worker in `providers.tsx`**
- [x] **Step 3: Verify service worker lifecycle and cache storage**

---

### Task 6: PWA Install Prompt in Header
**Files:**
- Modify: `apps/web/components/layout/Header.tsx`

**Issues Addressed:** Enable users on supported browsers (Chrome, Edge, mobile browsers) to install the web app to their desktop or home screen.

- [x] **Step 1: Add `beforeinstallprompt` event listener and state in `Header.tsx`**
- [x] **Step 2: Add styled Install button in Header controls**
- [x] **Step 3: Handle installation trigger and toast notification**

---

### Task 7: Verification & Production Build
**Files:**
- Run: `node apps/web/lib/quality.test.mjs`
- Run: `pnpm --filter web build`

**Issues Addressed:** Ensure zero build errors, type safety across all new components, and end-to-end functionality.

- [x] **Step 1: Run unit tests**
- [x] **Step 2: Run production Next.js build**
- [x] **Step 3: Verify all routes and components compile cleanly**
