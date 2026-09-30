# GEMINI.md — Gemini AI Developer Guide

Welcome to the **Free Music (YouTube Music Clone)** codebase. This document is tailored specifically for Gemini models, Antigravity AI coding assistants, and automated development agents managing this repository.

---

## 1. Quick Verification & Execution Commands

Always run these commands from the repository root:

```bash
# 1. Start local development server
pnpm dev

# 2. Run unit test suite (Node.js native test runner)
pnpm --filter web test

# 3. Validate zero ESLint warnings or errors
pnpm --filter web lint

# 4. Compile production bundle (App Router + PWA Service Worker)
pnpm --filter web build
```

---

## 2. Core Architectural Invariants (NEVER VIOLATE)

### 1. Global Audio Lifecycle
- Audio is managed **exclusively** by [`apps/web/components/AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx).
- **NEVER** instantiate `<audio>` elements or `new Audio()` inside page components or UI widgets.
- Control playback strictly via Zustand actions: `usePlayerStore.getState().playSong(song, queue, index)`, `togglePlay()`, `seek()`, `next()`, `prev()`.

### 2. Audio Bitrate & Quality Transformation
- JioSaavn CDN audio URLs end with `_48.mp4` (Low), `_160.mp4` (Normal), or `_320.mp4` (High).
- Always transform streaming URLs using [`getAudioQualityUrl(url, quality)`](file:///C:/teja/coding/free-music/apps/web/lib/utils.ts) based on `settings.store.ts`.

### 3. Pure CSS Variable Theming (Zero Hardcoded Dark Colors)
- Styling uses Tailwind CSS v4 and semantic design tokens defined in [`apps/web/app/globals.css`](file:///C:/teja/coding/free-music/apps/web/app/globals.css).
- **DO NOT** hardcode fixed dark shades (e.g. `#030303`, `#0f0f0f`, `#212121`).
- Always use semantic tokens:
  - `var(--bg-base)`: Main window background
  - `var(--bg-surface)`: Header, navigation surfaces, cards
  - `var(--panel-bg)`: Inputs, dropdown items, pill buttons
  - `var(--text-primary)`: Primary headings, active song titles
  - `var(--text-secondary)`: Subtitles, artist credits
  - `var(--text-tertiary)`: Durations, timestamps, subtle captions
  - `var(--border)`: Borders and dividers

### 4. Search vs. Section Discovery Routing
- In [`apps/web/lib/saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts):
  - **`searchSongs(query, language, page)`** is for user-submitted search box queries. It applies spelling corrections, entity extraction, and strict relevance ranking.
  - **`getSectionSongs(sectionId, language, page)`** is for curated browse carousels (e.g., Quick Picks, Trending, Workout, Romance).
  - **DO NOT** pass `getSectionSongs` through entity filters or curated songs will be stripped.

### 5. Web Audio API & Real-Time Visualizer
- In the Web Audio graph inside [`AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx):
  - The `<audio>` element has `crossOrigin="anonymous"` so JioSaavn CDN audio streams with CORS headers can be inspected by `AudioContext`.
  - `ctx.createMediaElementSource(el)` can only be called **once** per HTMLAudioElement to avoid `InvalidStateError`.
  - Frequency analysis is exposed via the singleton [`getAudioAnalyser()`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx) and consumed by [`VisualizerCanvas.tsx`](file:///C:/teja/coding/free-music/apps/web/components/player/VisualizerCanvas.tsx).

### 6. PWA & Workbox Polyfill
- In [`apps/web/next.config.ts`](file:///C:/teja/coding/free-music/apps/web/next.config.ts), Workbox packages require `self` to be defined in Node 20+. Always keep:
  ```ts
  if (typeof (globalThis as any).self === 'undefined') {
    (globalThis as any).self = globalThis
  }
  ```

### 7. Client-Side Offline Storage (IndexedDB)
- Downloaded audio blobs are stored locally in IndexedDB (`free_music_db`, store `downloaded_songs`) via [`offline-storage.ts`](file:///C:/teja/coding/free-music/apps/web/lib/offline-storage.ts).
- `AudioManager.tsx` checks `getOfflineSong` before querying CDN URLs. If an offline blob exists, an object URL (`URL.createObjectURL(blob)`) is used for instant local streaming. Revoke previous blob URLs to eliminate memory leaks.

---

## 3. Directory Layout & Module Responsibilities

```
apps/web/
├── app/
│   ├── api/search/route.ts      # Server API handler for songs, albums, artists, playlists
│   ├── api/lyrics/route.ts      # Server API handler for LRCLIB synced lyrics
│   ├── api/video-id/route.ts    # Server API handler for YouTube video ID matching
│   ├── album/[id]/page.tsx      # Dynamic album view with Play All & Shuffle
│   ├── artist/[id]/page.tsx     # Dynamic artist view with Top Tracks & Discography
│   ├── playlist/[id]/page.tsx   # Custom & JioSaavn public playlist view
│   ├── search/page.tsx          # Multi-tab search page with pagination
│   ├── explore/page.tsx         # Mood & genre discovery grids
│   ├── library/page.tsx         # Liked songs, custom playlists, offline downloads
│   ├── settings/page.tsx        # Audio quality, equalizer, theme, language
│   ├── watch/page.tsx           # Fullscreen YouTube synchronized video player
│   └── layout.tsx               # Root shell, Providers, AudioManager
├── components/
│   ├── AudioManager.tsx         # Singleton HTML5 audio element & Web Audio controller
│   ├── layout/Header.tsx        # Search bar (350ms debounce), recent searches, PWA install
│   ├── player/MiniPlayer.tsx    # Bottom player bar
│   ├── player/ExpandedPlayer.tsx# Fullscreen blurred player & lyrics viewer
│   ├── player/VisualizerCanvas.tsx # 32-band real-time audio visualizer
│   ├── player/LyricsPanel.tsx   # Karaoke lyrics with [-0.5s]/[+0.5s] sync offset
│   ├── player/QueueDrawer.tsx   # DND reorderable queue drawer with drag sensors
│   ├── home/MoodChips.tsx       # Interactive mood filter chips
│   └── ui/ContextMenu.tsx       # Right-click context menu (Start Radio, Download, Playlist)
├── lib/
│   ├── saavn.ts                 # JioSaavn API fetcher & DES decryptor
│   ├── search-engine.ts         # Query normalizer, typo fixer, relevance scoring
│   ├── offline-storage.ts       # IndexedDB audio blob storage engine
│   ├── recent-searches.ts       # LocalStorage persistent search history
│   ├── utils.ts                 # Audio quality switcher & fisherYates shuffle
│   └── *.test.mjs               # Node test runner test suites
└── stores/                      # Zustand state machines (player, queue, library, settings, ui)
```

---

## 4. Verification Gate for Any Change

Before concluding any work, every AI agent must execute:
1. `pnpm --filter web test` $\rightarrow$ Must pass 100% of unit tests.
2. `pnpm --filter web lint` $\rightarrow$ Must produce zero warnings and zero errors.
3. `pnpm --filter web build` $\rightarrow$ Must compile Next.js App Router and service worker without errors.
