# AGENTS.md — Developer & AI System Guide

This document is intended for AI coding assistants (Gemini, Claude, Cursor, Copilot) and human engineers onboarding to this codebase. It provides direct, actionable instructions on codebase conventions, architectural invariants, and common pitfalls.

---

## 1. Quick Start Commands

All commands should be executed from the monorepo root or with `--filter web`:

```bash
# Start development server
pnpm dev

# Run unit tests (Node.js native test runner)
pnpm --filter web test

# Run ESLint validation
pnpm --filter web lint

# Build production bundle
pnpm --filter web build
```

---

## 2. Critical Architectural Invariants

### 1. Global Audio Lifecycle
- Audio is handled **exclusively** by [`AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx).
- **NEVER** instantiate `<audio>` elements or `new Audio()` inside page components or player buttons.
- UI components control playback strictly by calling methods from [`player.store.ts`](file:///C:/teja/coding/free-music/apps/web/stores/player.store.ts) and [`queue.store.ts`](file:///C:/teja/coding/free-music/apps/web/stores/queue.store.ts) (e.g. `playSong(song, queue, index)`).

### 2. Search vs. Section Discovery Logic
- In [`apps/web/lib/saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts):
  - **`searchSongs(query, language, page)`** is for **user search box queries** (e.g. `"abhilasha move songs"`, `"pushpa 2"`). It applies typo corrections, entity extraction, and relevance filtering.
  - **`getSectionSongs(sectionId, language, page)`** is for **curated discovery carousels** (e.g. Quick Picks, Mass Hits, New Releases).
  - **DO NOT** route `getSectionSongs` through `searchSongs`'s entity relevance filter, or curated songs (which don't contain words like "hits" or "2025" in their titles) will be stripped out.
  - Use `isDiscoveryQuery(coreWords)` in [`search-engine.ts`](file:///C:/teja/coding/free-music/apps/web/lib/search-engine.ts) to classify generic browse queries (`"telugu hits"`, `"romantic songs"`) vs specific movie/artist queries.

### 3. PWA & Workbox Compatibility
- In [`apps/web/next.config.ts`](file:///C:/teja/coding/free-music/apps/web/next.config.ts), Workbox packages require `self` to be defined. Always keep the top-level compatibility guard:
  ```ts
  if (typeof (globalThis as any).self === 'undefined') {
    (globalThis as any).self = globalThis
  }
  ```
  Omitting this will cause `ReferenceError: self is not defined` when starting `next dev` on Node 20+.
- Avoid using `fallbacks` inside `withPWAInit` to prevent Next.js 15 App Router webpack Babel loader compilation errors; the custom service worker precaches [`offline.html`](file:///C:/teja/coding/free-music/apps/web/public/offline.html) directly.

### 4. Audio Quality URL Transformation
- JioSaavn CDN audio URLs end with `_48.mp4`, `_160.mp4`, or `_320.mp4`.
- Use [`getAudioQualityUrl(url, quality)`](file:///C:/teja/coding/free-music/apps/web/lib/utils.ts) to switch bitrates based on `settings.store.ts` (`'low'` $\rightarrow$ `_48.mp4`, `'normal'` $\rightarrow$ `_160.mp4`, `'high'` $\rightarrow$ `_320.mp4`).

### 5. Theming & Styling Guidelines
- The app uses Tailwind CSS v4 and CSS variables defined in [`apps/web/app/globals.css`](file:///C:/teja/coding/free-music/apps/web/app/globals.css).
- **DO NOT** hardcode dark-only colors (e.g. `#0f0f0f`, `#ffffff`, `#1f1f1f`).
- Always use the semantic CSS variables:
  - `var(--bg-base)`: Main page background
  - `var(--bg-surface)`: Header, cards, panels
  - `var(--panel-bg)`: Inputs, button hovers, dropdown items
  - `var(--text-primary)`: Primary heading and title text
  - `var(--text-secondary)`: Subtitles, artist names
  - `var(--text-tertiary)`: Meta text, durations, timestamps
  - `var(--border)`: Borders and dividers

### 6. Client-Side Offline Storage (IndexedDB)
- Downloaded audio blobs are stored locally in IndexedDB (`free_music_db`, store `downloaded_songs`) via [`offline-storage.ts`](file:///C:/teja/coding/free-music/apps/web/lib/offline-storage.ts).
- [`AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx) checks `getOfflineSong` before querying CDN URLs. If an offline blob is present, an object URL (`URL.createObjectURL(blob)`) is used for instant playback with zero data usage. Always revoke old object URLs on track changes to prevent memory leaks.

### 7. Continuous Auto-Play & Recommendations
- Autoplay state is stored in [`settings.store.ts`](file:///C:/teja/coding/free-music/apps/web/stores/settings.store.ts) (`autoplay: boolean`).
- Recommendations are generated via `getSongRecommendations` in [`saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts) (exposed at `/api/search?recommendSongId=...`), blending artist tracks and language trending playlists.
- In `AudioManager.tsx`, prefetching begins 12 seconds before the final queue track completes, appending fresh recommendations via `appendSongs` in [`queue.store.ts`](file:///C:/teja/coding/free-music/apps/web/stores/queue.store.ts) to ensure gapless transitions.

### 8. Web Audio API & Visualizer Frequency Analyser
- In [`AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx), the audio element has `crossOrigin="anonymous"` to allow CORS frequency extraction from `aac.saavncdn.com`.
- Web Audio `ctx.createMediaElementSource(el)` is called **exactly once** per audio element to prevent browser `InvalidStateError`.
- The active `AnalyserNode` (`fftSize = 128`, 64 frequency bins) is exposed globally via `getAudioAnalyser()`.
- [`VisualizerCanvas.tsx`](file:///C:/teja/coding/free-music/apps/web/components/player/VisualizerCanvas.tsx) renders animated gradient frequency bars matching the active theme without consuming CPU when audio is paused.

### 9. Lyrics Timing Synchronization & Offset
- Lyrics are fetched from LRCLIB via `/api/lyrics?title=...&artist=...&duration=...`.
- User synchronization nudges (`lyricsOffset`) are stored in `settings.store.ts` and can be adjusted interactively in `[-0.5s]` increments via [`LyricsPanel.tsx`](file:///C:/teja/coding/free-music/apps/web/components/player/LyricsPanel.tsx).

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
│   ├── home/MoodChips.tsx       # Dynamic mood filters (Energize, Relax, Focus, etc.)
│   └── home/CarouselRow.tsx     # Horizontal song row with custom scrollbars
├── lib/
│   ├── saavn.ts                 # JioSaavn API fetcher & DES decryptor
│   ├── search-engine.ts         # Query normalizer, typo fixer, relevance scoring
│   ├── offline-storage.ts       # IndexedDB audio blob storage & byte stats
│   ├── recent-searches.ts       # Search history manager in localStorage
│   ├── lrclib.ts                # LRCLIB API client
│   ├── youtube.ts               # YouTube video matcher & suggest client
│   ├── utils.ts                 # Audio quality switcher & time formatters
│   └── *.test.mjs               # Node test runner unit tests
└── stores/                      # Zustand state machines
```

---

## 4. Testing & Verification Requirements

When making modifications, you MUST verify:
1. **Unit Tests**: Run `pnpm --filter web test` to ensure all PWA, audio quality, and search intelligence tests pass.
2. **ESLint**: Run `pnpm --filter web lint` to ensure zero ESLint errors or warnings.
3. **Build**: Run `pnpm --filter web build` to ensure Next.js App Router and PWA service workers compile cleanly.
