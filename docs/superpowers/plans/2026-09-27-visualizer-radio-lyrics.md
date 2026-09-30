# Audio Visualizer, Song Radio & Lyrics Timing Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time Audio Visualizer in the Expanded Player, Instant Song Radio generator from song context menus, and fine-grained Lyrics Timing Offset synchronization controls.

**Architecture:**
- Audio Visualizer: Exposes a singleton Web Audio `AnalyserNode` from `AudioManager.tsx` and renders a performant canvas frequency waveform in `VisualizerCanvas.tsx` inside `ExpandedPlayer.tsx`, with graceful fallback if the context is uninitialized.
- Song Radio: Adds "Start radio" action in `ContextMenu.tsx` that fetches recommendations via `/api/search?recommendSongId=...`, queues the seed track followed by recommended tracks, and plays immediately.
- Lyrics Sync Offset: Adds `lyricsOffset` state in `settings.store.ts` and applies it in `LyricsPanel.tsx` with dynamic interactive nudge buttons (`-0.5s`, `Reset`, `+0.5s`).

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Web Audio API (`AnalyserNode`), HTML5 Canvas, Tailwind CSS v4 CSS variables.

## Global Constraints
- Audio lifecycle invariant: Audio element managed strictly by `AudioManager.tsx`.
- Theming invariant: Use only CSS variables (`var(--panel-bg)`, `var(--text-primary)`, `var(--border)`, etc.).
- Unit test invariant: Node.js test runner tests must pass with zero failures.
- Lint invariant: `pnpm --filter web lint` must produce 0 warnings and 0 errors.
- Build invariant: `pnpm --filter web build` must compile cleanly.

## Review Focus
1. Web Audio `createMediaElementSource` only invoked once on HTMLAudioElement to prevent `InvalidStateError`.
2. Canvas visualizer unmount cancels `requestAnimationFrame` loop to avoid CPU memory leaks.
3. Song Radio properly sets queue and preserves seed song playback without double buffering.
4. Lyrics offset calculates correctly across song boundaries and resets cleanly when requested.
5. All buttons accessible via keyboard and screen readers.

---

### Task 1: Web Audio AnalyserNode & Visualizer Canvas (Feature 1)

**Files:**
- Modify: `apps/web/components/AudioManager.tsx`
- Create: `apps/web/components/player/VisualizerCanvas.tsx`
- Modify: `apps/web/components/player/ExpandedPlayer.tsx`
- Test: `apps/web/lib/offline-autoplay.test.mjs`

**Interfaces:**
- Produces: `getAudioAnalyser(): AnalyserNode | null`
- Component: `<VisualizerCanvas isPlaying={boolean} />`

- [ ] **Step 1: Write unit test verifying visualizer frequency helper calculation**
- [ ] **Step 2: Run test to verify it fails/passes**
- [ ] **Step 3: Update `AudioManager.tsx` to initialize `analyserRef` and export `getAudioAnalyser`**
- [ ] **Step 4: Create `VisualizerCanvas.tsx` with smooth requestAnimationFrame canvas renderer**
- [ ] **Step 5: Mount `VisualizerCanvas` in `ExpandedPlayer.tsx` below artwork/controls**
- [ ] **Step 6: Run tests and ESLint to verify cleanliness**

---

### Task 2: Instant Song Radio Generator (Feature 3)

**Files:**
- Modify: `apps/web/components/ui/ContextMenu.tsx`
- Modify: `apps/web/components/player/ExpandedPlayer.tsx`
- Test: `apps/web/lib/offline-autoplay.test.mjs`

**Interfaces:**
- Action: "Start radio" context menu option and radio button
- Function: `startSongRadio(song: Song)`: queries `/api/search?recommendSongId=${song.id}` and plays queue `[song, ...recommendations]`

- [ ] **Step 1: Write unit test verifying radio queue composition logic**
- [ ] **Step 2: Add "Start radio" action with radio waves icon to `ContextMenu.tsx`**
- [ ] **Step 3: Add "Start radio" quick button in `ExpandedPlayer.tsx` header/actions**
- [ ] **Step 4: Verify seamless queue load and instant seed playback**
- [ ] **Step 5: Run tests and ESLint to verify cleanliness**

---

### Task 3: Lyrics Timing Offset Adjustment (Feature 4)

**Files:**
- Modify: `apps/web/stores/settings.store.ts`
- Modify: `apps/web/components/player/LyricsPanel.tsx`
- Test: `apps/web/lib/offline-autoplay.test.mjs`

**Interfaces:**
- State: `lyricsOffset: number` (seconds), `setLyricsOffset: (offset: number) => void`
- Logic: `effectiveProgress = progress + lyricsOffset` in `LyricsPanel.tsx`
- UI: Unobtrusive offset nudge buttons `[-0.5s]`, `[0.0s]`, `[+0.5s]`

- [ ] **Step 1: Write unit test verifying lyrics offset calculation with clamped boundaries**
- [ ] **Step 2: Add `lyricsOffset` and `setLyricsOffset` to `settings.store.ts`**
- [ ] **Step 3: Update `LyricsPanel.tsx` to compute active karaoke line using `progress + lyricsOffset`**
- [ ] **Step 4: Add interactive nudge buttons in `LyricsPanel.tsx` with toast feedback**
- [ ] **Step 5: Run tests, ESLint, and build verification**

---

### Task 4: Whole-Branch Code Review & Documentation Update

**Files:**
- Modify: `features.md`
- Code review pass: Review all changed files for quality, memory safety, and adherence to `AGENTS.md`
