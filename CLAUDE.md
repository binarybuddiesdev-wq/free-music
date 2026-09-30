# CLAUDE.md — Claude Code Developer Guide

This document contains guidelines, architectural invariants, and verification instructions for Claude Code and Anthropic assistants working on the **Free Music (YouTube Music Clone)** codebase.

---

## 1. Quick Start & Verification Commands

All commands should be executed from the repository root:

```bash
# Start local development server
pnpm dev

# Run unit tests (Node.js test runner)
pnpm --filter web test

# Run ESLint validation
pnpm --filter web lint

# Build production bundle
pnpm --filter web build
```

---

## 2. Invariants & Rules

1. **Global Audio Lifecycle**:
   - Audio is controlled exclusively by [`apps/web/components/AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx).
   - NEVER create `<audio>` elements or `new Audio()` inside page components or UI widgets.
   - UI components control playback strictly via `usePlayerStore` and `useQueueStore`.

2. **Theming & Design Tokens**:
   - Uses Tailwind CSS v4 and semantic CSS variables in [`apps/web/app/globals.css`](file:///C:/teja/coding/free-music/apps/web/app/globals.css).
   - DO NOT hardcode dark-only colors (`#030303`, `#0f0f0f`, `#1f1f1f`).
   - Use `var(--bg-base)`, `var(--bg-surface)`, `var(--panel-bg)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--border)`.

3. **Audio Quality Mapping**:
   - JioSaavn CDN audio URLs end with `_48.mp4`, `_160.mp4`, or `_320.mp4`.
   - Use [`getAudioQualityUrl(url, quality)`](file:///C:/teja/coding/free-music/apps/web/lib/utils.ts) to switch bitrates based on `settings.store.ts`.

4. **Search vs. Section Discovery**:
   - `searchSongs` in [`saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts) is for user search box queries.
   - `getSectionSongs` in [`saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts) is for curated discovery carousels.
   - DO NOT route `getSectionSongs` through `searchSongs` entity relevance filter.

5. **PWA Polyfill**:
   - Always preserve `if (typeof (globalThis as any).self === 'undefined') (globalThis as any).self = globalThis` at the top of [`apps/web/next.config.ts`](file:///C:/teja/coding/free-music/apps/web/next.config.ts).

6. **Client-Side Offline Storage (IndexedDB)**:
   - Powered by [`offline-storage.ts`](file:///C:/teja/coding/free-music/apps/web/lib/offline-storage.ts) with DB `free_music_db` and store `downloaded_songs`.
   - `AudioManager.tsx` checks `getOfflineSong` for offline blob URLs (`URL.createObjectURL(blob)`). Always revoke old blob URLs on track changes.

7. **Web Audio Visualizer**:
   - Web Audio `createMediaElementSource` is called only once on the HTMLAudioElement in `AudioManager.tsx`.
   - The `<audio>` element has `crossOrigin="anonymous"`.
   - `getAudioAnalyser()` returns the active `AnalyserNode` for [`VisualizerCanvas.tsx`](file:///C:/teja/coding/free-music/apps/web/components/player/VisualizerCanvas.tsx).

---

## 3. Verification Protocol

Before completing any task:
1. Run `pnpm --filter web test` (Must pass 100%).
2. Run `pnpm --filter web lint` (Must have 0 warnings/errors).
3. Run `pnpm --filter web build` (Must succeed).
