# Implementation Plan: Continuous Auto-Play, Offline Downloads, and Recent Searches

This plan breaks down the implementation into 4 sequential phases:
- **Phase 1: Recent Searches in Header Dropdown**
- **Phase 2: Continuous Auto-Play & Radio Mode**
- **Phase 3: Client-Side Offline Downloads (IndexedDB)**
- **Phase 4: Library Downloads View, Testing & Documentation**

---

## Phase 1: Recent Searches in Header Dropdown

### Tasks
- [x] Add `recentSearches` helper utilities to read/write/delete search terms from `localStorage` in `apps/web/lib/recent-searches.ts`.
- [x] Update `apps/web/components/layout/Header.tsx`:
  - Read `recentSearches` state on mount.
  - When input is focused and `query.trim().length === 0`, render the recent searches list with history clock icon and `✕` delete buttons.
  - Add "Clear all" button.
  - On search submit or item selection, prepend the query to `recentSearches`.
- [x] Verify keyboard navigation and mouse interactions on recent search items.

---

## Phase 2: Continuous Auto-Play & Radio Mode

### Tasks
- [x] Add `autoplay: boolean` to `apps/web/stores/settings.store.ts` (default: `true`) with toggle action `setAutoplay(enabled: boolean)`.
- [x] Implement `getSongRecommendations(songId: string, artist?: string, language?: string)` in `apps/web/lib/saavn.ts` calling primary artist discography and language discovery mix.
- [x] Add API endpoint handling `recommendSongId` in `/api/search/route.ts`.
- [x] Update `apps/web/components/player/QueueDrawer.tsx` and `settings/page.tsx` with Autoplay toggle switches.
- [x] Update `apps/web/components/AudioManager.tsx`:
  - Zero-latency background prefetching when nearing the end of the final track in queue.
  - When `onended` is fired on the last song and `autoplay` is enabled, fetch recommendations, append them to `queue.store`, and continue playback.

---

## Phase 3: Client-Side Offline Downloads (IndexedDB)

### Tasks
- [x] Create `apps/web/lib/offline-storage.ts`:
  - Initialize IndexedDB database `free_music_db`, store `downloaded_songs`.
  - Implement `saveOfflineSong`, `removeOfflineSong`, `getOfflineSong`, `getAllOfflineSongs`, `isSongDownloaded`, `getOfflineStorageEstimate`.
- [x] Update `apps/web/components/AudioManager.tsx`:
  - Intercept playback: check if current song is downloaded in IndexedDB; if so, create blob URL and stream directly offline with automatic revocation.
- [x] Update `apps/web/components/ui/ContextMenu.tsx`:
  - Add "Download for offline" / "Remove download" action with toast notifications.

---

## Phase 4: Library Downloads View, Testing & Documentation

### Tasks
- [x] Update `apps/web/app/library/page.tsx`:
  - Add a **"Downloads"** tab alongside Liked Songs, History, and Playlists.
  - Display downloaded tracks with track count, storage size estimate, individual track removal, and "Clear all" action.
- [x] Add unit test suite in `apps/web/lib/offline-autoplay.test.mjs` testing storage estimation, serialization, recent searches, and queue appending logic.
- [x] Run `pnpm --filter web test`, `pnpm --filter web lint`, and `pnpm --filter web build`.
- [x] Update `features.md`, `ARCHITECTURE.md`, `AGENTS.md`.
