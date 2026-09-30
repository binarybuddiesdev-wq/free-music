# GitHub Copilot Instructions — Free Music (YouTube Music Clone)

When assisting in this repository, GitHub Copilot must strictly obey these invariants and architectural patterns:

---

## 1. Global Audio Lifecycle
- Audio is managed **exclusively** by [`apps/web/components/AudioManager.tsx`](file:///C:/teja/coding/free-music/apps/web/components/AudioManager.tsx).
- **NEVER** write `new Audio()` or create `<audio>` tags inside page components, buttons, or custom widgets.
- Trigger playback only via Zustand actions:
  ```ts
  usePlayerStore.getState().playSong(song, queue, index)
  ```

## 2. Web Audio Analyser & CORS
- The singleton `<audio>` element has `crossOrigin="anonymous"`.
- `createMediaElementSource(audioRef.current)` must only be called **once** per element lifetime.
- Visualizers consume frequency data via `getAudioAnalyser()` in [`VisualizerCanvas.tsx`](file:///C:/teja/coding/free-music/apps/web/components/player/VisualizerCanvas.tsx).

## 3. Pure CSS Variable Theming
- Tailwind CSS v4 is used with semantic CSS variables defined in [`apps/web/app/globals.css`](file:///C:/teja/coding/free-music/apps/web/app/globals.css).
- **DO NOT** suggest hardcoded hex dark colors (e.g. `#0f0f0f`, `#030303`, `#1f1f1f`).
- Always use semantic variables:
  - `var(--bg-base)`: Main background
  - `var(--bg-surface)`: Header, cards, sheets
  - `var(--panel-bg)`: Inputs, dropdown items, pill chips
  - `var(--text-primary)`: Primary text and active track titles
  - `var(--text-secondary)`: Subtitles and artist credits
  - `var(--text-tertiary)`: Durations and timestamps
  - `var(--border)`: Borders and divider lines

## 4. Audio Quality Bitrates
- Streaming URLs map to JioSaavn CDN formats:
  - `'low'` $\rightarrow$ `_48.mp4`
  - `'normal'` $\rightarrow$ `_160.mp4`
  - `'high'` $\rightarrow$ `_320.mp4`
- Always use [`getAudioQualityUrl(url, quality)`](file:///C:/teja/coding/free-music/apps/web/lib/utils.ts).

## 5. Search vs. Discovery Logic
- In `apps/web/lib/saavn.ts`:
  - `searchSongs`: User search bar queries with spellcheck & entity extraction.
  - `getSectionSongs`: Curated carousels (Quick Picks, Trending, Hits). Never route through entity filters.

## 6. Verification Commands
Always verify code changes with:
```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web build
```
