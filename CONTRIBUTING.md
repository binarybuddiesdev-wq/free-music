# Contributing to Free Music (YouTube Music Clone)

Thank you for your interest in contributing to **Free Music**! This project is an open-source, high-fidelity YouTube Music clone engineered with Next.js 15, React 19, Zustand, Tailwind CSS v4, and the Web Audio API.

---

## 1. Development Setup

### Prerequisites
- **Node.js**: v20.x or v22.x+
- **pnpm**: v9+ (`npm install -g pnpm`)

### Installation & Starting
```bash
# Clone the repository
git clone https://github.com/your-username/free-music.git
cd free-music

# Install monorepo dependencies
pnpm install

# Start development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

## 2. Invariants & Development Standards

When contributing, you MUST strictly adhere to the following invariants:

1. **Global Audio Lifecycle**:
   - Audio is controlled exclusively by [`apps/web/components/AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx).
   - **Never** instantiate `<audio>` elements or `new Audio()` in UI components.
   - UI components trigger playback via `usePlayerStore.getState().playSong(song, queue, index)`.

2. **Theming & Design Tokens**:
   - The app uses Tailwind CSS v4 and semantic CSS variables defined in [`apps/web/app/globals.css`](file:///C:/teja/coding/free-music/apps/web/app/globals.css).
   - **Never** hardcode dark-only colors (e.g. `#030303`, `#0f0f0f`, `#1f1f1f`).
   - Use semantic variables: `var(--bg-base)`, `var(--bg-surface)`, `var(--panel-bg)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--border)`.

3. **Audio Quality Mapping**:
   - JioSaavn CDN audio URLs end with `_48.mp4`, `_160.mp4`, or `_320.mp4`.
   - Use [`getAudioQualityUrl(url, quality)`](file:///C:/teja/coding/free-music/apps/web/lib/utils.ts) to switch bitrates based on `settings.store.ts`.

4. **Search vs. Section Discovery**:
   - In [`apps/web/lib/saavn.ts`](file:///C:/teja/coding/free-music/apps/web/lib/saavn.ts):
     - `searchSongs(query, language, page)` is for user search box queries with entity extraction and relevance filters.
     - `getSectionSongs(sectionId, language, page)` is for curated browse carousels. Do not filter section songs through entity relevance filters.

5. **Client-Side Offline Storage (IndexedDB)**:
   - Downloaded audio blobs are stored locally in IndexedDB (`free_music_db`, store `downloaded_songs`) via [`offline-storage.ts`](file:///C:/teja/coding/free-music/apps/web/lib/offline-storage.ts).
   - `AudioManager.tsx` checks `getOfflineSong` for offline blob URLs (`URL.createObjectURL(blob)`). Always revoke previous blob URLs to eliminate memory leaks.

6. **Web Audio Visualizer**:
   - `createMediaElementSource` is called only once on the HTMLAudioElement in `AudioManager.tsx`.
   - The `<audio>` element has `crossOrigin="anonymous"`.
   - Frequency analysis is exposed via the singleton `getAudioAnalyser()` and consumed by `VisualizerCanvas.tsx`.

---

## 3. Pull Request Checklist

Before submitting a pull request, run all verification steps:

```bash
# 1. Run unit test suite
pnpm --filter web test

# 2. Run ESLint check
pnpm --filter web lint

# 3. Compile production build
pnpm --filter web build
```

Ensure all tests pass, ESLint returns 0 errors/warnings, and the Next.js production build compiles cleanly.
