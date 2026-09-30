# Specification: Continuous Auto-Play, Offline Downloads, and Recent Searches

**Date**: 2026-09-21  
**Status**: Approved  
**Target Scope**: `apps/web`

---

## 1. Feature Overview

This specification introduces three core YouTube Music features:
1. **Continuous Auto-Play (Radio Mode)**: Automatically fetches and appends related songs when the queue reaches the end so music never stops.
2. **Offline Downloads**: Explicitly downloads and caches audio files and metadata into client-side IndexedDB for true offline playback, with a dedicated Downloads view in `/library`.
3. **Recent Searches**: Saves and displays recent search terms in the header search dropdown with quick selection, single deletion, and clear-all capabilities.

---

## 2. Feature 1: Continuous Auto-Play (Radio Mode)

### Requirements & Behavior
- Add an `autoplay` boolean flag in `settings.store.ts` (default: `true`).
- Add an "Autoplay" toggle switch inside `QueueDrawer.tsx` with description: *"Similar songs will automatically play when the queue ends"*.
- In `AudioManager.tsx`:
  - When a song ends (`onended` event):
    - If `loopMode === 'one'`: re-play current song.
    - If `currentIndex < queue.length - 1`: advance to `currentIndex + 1`.
    - If `currentIndex === queue.length - 1`:
      - If `loopMode === 'all'`: loop back to index 0.
      - If `autoplay === true`:
        - Trigger `fetchAutoplayRecommendations(currentSong)`:
          - Calls JioSaavn recommendation API: `https://www.jiosaavn.com/api.php?__call=reco.getSongRecommendations&_format=json&_marker=0&api_version=4&ctx=web6dot0&pids=${currentSong.id}`.
          - If the recommendation API returns empty or fails, fall back to querying songs from the same primary artist (`searchSongs(primaryArtist, currentSong.language)`).
          - Filters out any song IDs already in `queue` or `history` to avoid duplicates.
          - Appends the recommended songs to the queue in `queue.store.ts`.
          - Immediately advances to the newly appended song index and starts playback smoothly.
      - If `autoplay === false`: stop playback and set `isPlaying = false`.

---

## 3. Feature 2: Offline Downloads

### Requirements & Behavior
- Create an IndexedDB utility [`apps/web/lib/offline-storage.ts`](file:///C:/teja/coding/free-music/apps/web/lib/offline-storage.ts) managing an object store named `downloaded_songs`:
  - Stores: `{ id, song: Song, blob: Blob, downloadedAt: number, sizeBytes: number }`.
  - Functions:
    - `saveOfflineSong(song: Song): Promise<boolean>`: Fetches `song.downloadUrl` as `blob()`, stores into IndexedDB with metadata.
    - `removeOfflineSong(id: string): Promise<boolean>`: Deletes the song entry from IndexedDB.
    - `getOfflineSong(id: string): Promise<{ song: Song, blob: Blob } | null>`: Retrieves offline entry.
    - `getAllOfflineSongs(): Promise<Song[]>`.
    - `isSongDownloaded(id: string): Promise<boolean>`.
    - `getOfflineStorageEstimate(): Promise<{ totalBytes: number, count: number }>`.
- Add an `offlineBlobUrl` resolution in `AudioManager.tsx`:
  - Before setting `audio.src = streamUrl`, checks if `id` exists in IndexedDB. If found, uses `URL.createObjectURL(blob)` for instant zero-network playback.
- UI Touchpoints:
  - **Song Cards & Rows**: Download status icon / button.
  - **Context Menu**: "Download song" / "Remove download" action item.
  - **Library Page (`/library`)**:
    - Add a **"Downloads"** tab alongside "Playlists" and "Liked Songs".
    - Displays total downloaded storage size (e.g. `12 songs · 98 MB`), a "Delete All Downloads" action, and a track list with instant playback.

---

## 4. Feature 3: Recent Searches

### Requirements & Behavior
- Storage: Stored in `localStorage` under `recent_searches` as an array of strings (max 8 items).
- In `Header.tsx`:
  - When the search input is focused:
    - If `query.trim().length === 0`: the dropdown displays the "Recent searches" view.
    - If `query.trim().length >= 2`: the dropdown displays live search suggestion tracks (existing behavior).
  - Recent searches view layout:
    - Header: *"Recent searches"* with a *"Clear all"* button on the right.
    - Items: History clock icon on the left, search text in the center, and an *"✕"* remove button on the right.
    - Clicking anywhere on the row executes that search (`router.push('/search?q=' + encodeURIComponent(term))`).
    - Clicking *"✕"* removes that specific query from `recent_searches` without navigating.
  - Search Submission:
    - When any query is submitted via the search input or suggested item, prepend it to `recent_searches`, remove duplicates, trim to 8 items, and persist.

---

## 5. Testing & Verification

1. Unit tests in `apps/web/lib/search.test.mjs` and a new `apps/web/lib/offline.test.mjs`.
2. `pnpm --filter web test`: Ensure all test suites pass.
3. `pnpm --filter web lint`: Ensure zero ESLint warnings or errors.
4. `pnpm --filter web build`: Verify Next.js 15 production build compiles cleanly.
5. Update `features.md`, `ARCHITECTURE.md`, `AGENTS.md`.
