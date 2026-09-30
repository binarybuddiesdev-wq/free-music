# Codebase Issues Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix all 15 audited bugs and issues across audio playback, queue synchronization, theming, input handling, and resilience.

**Architecture:** Incrementally resolve domain issues by component and store responsibility: audio playback engine and Web Audio API resilience, queue and shuffle state synchronization, theme variables in playlist and chips, settings import and input safety, and search/lyrics scraper reliability.

**Tech Stack:** Next.js 15, React 19, Zustand 5, Web Audio API, HTMLMediaElement, CSS Custom Properties.

---

### Task 1: Equalizer Web Audio API Safety & Fallback
**Files:**
- Modify: `apps/web/components/AudioManager.tsx:143-200`
- Modify: `apps/web/stores/settings.store.ts`

**Issues Addressed:** Web Audio API CORS silence trap when Equalizer is enabled on cross-origin CDN audio.

- [x] **Step 1: Add audio element CORS error detection and fallback in AudioManager**
Ensure that if `createMediaElementSource` fails or if the audio element triggers a security error, `setupEqualizer` safely falls back to direct unmuted playback and displays an explanatory toast ("Equalizer requires browser CORS permissions; falling back to direct audio").
- [x] **Step 2: Verify audio plays cleanly when EQ is toggled**
- [x] **Step 3: Commit Task 1**

---

### Task 2: Shuffle Toggle Synchronization & Queue State
**Files:**
- Modify: `apps/web/stores/queue.store.ts:67-75`
- Modify: `apps/web/stores/player.store.ts:57-71`

**Issues Addressed:** Shuffle toggle desynchronizes active song index; `playSong` unconditionally disables shuffle.

- [x] **Step 1: Fix toggleShuffle in queue.store.ts**
When turning shuffle ON, find the current playing song and put it at `qIndex: 0` (or set `qIndex` to its index in `shuffledQueue`).
When turning shuffle OFF, set `qIndex` to `queue.findIndex(s => s.id === currentSong.id)` so playback continues from the current song in the original queue.
- [x] **Step 2: Update playSong in player.store.ts**
Preserve `shuffleOn` if the user already had shuffle active, updating the shuffled queue with the new queue.
- [x] **Step 3: Commit Task 2**

---

### Task 3: Audio Error Skip Guard (Prevent Infinite Skip Loop)
**Files:**
- Modify: `apps/web/components/AudioManager.tsx:234-240`

**Issues Addressed:** Infinite skip loop on network or file playback failure.

- [x] **Step 1: Implement consecutive error counter in AudioManager**
Add `errorCountRef = useRef(0)`.
Reset `errorCountRef.current = 0` on `playing` event.
In `onError`: increment `errorCountRef.current`. If `errorCountRef.current > 3`, pause playback and show a toast ("Playback failed: Multiple tracks could not be loaded. Please check your connection.") instead of skipping indefinitely.
- [x] **Step 2: Commit Task 3**

---

### Task 4: Crossfade Smooth Transition & `prev()` Store Desync
**Files:**
- Modify: `apps/web/components/AudioManager.tsx:210-224`
- Modify: `apps/web/stores/player.store.ts:150-168`

**Issues Addressed:** Abrupt volume spike during crossfade; store `progress` not reset when restarting track via `prev()`.

- [x] **Step 1: Fix `prev()` in player.store.ts**
When `progress > 3`, reset both `audioRef.current.currentTime = 0` AND store `set({ progress: 0 })`.
- [x] **Step 2: Fix crossfade volume handoff in AudioManager**
In crossfade handler, ensure new track starts at volume 0 before ramping up to target volume, avoiding the initial volume blast.
- [x] **Step 3: Commit Task 4**

---

### Task 5: Light Mode Theming on Playlist View & MoodChips
**Files:**
- Modify: `apps/web/app/playlist/[id]/page.tsx`
- Modify: `apps/web/components/home/MoodChips.tsx`

**Issues Addressed:** Hardcoded white/dark colors render text invisible in Light Mode.

- [x] **Step 1: Replace hardcoded colors in playlist/[id]/page.tsx**
Use `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--panel-bg)`, `var(--bg-surface)`, and `var(--bg-elevated)`.
- [x] **Step 2: Update MoodChips.tsx inactive styles**
Use `var(--text-primary)` and `var(--panel-bg)` with theme-aware borders.
- [x] **Step 3: Commit Task 5**

---

### Task 6: Settings File Import Double-Trigger & JSON Schema Validation
**Files:**
- Modify: `apps/web/app/settings/page.tsx:316-375`

**Issues Addressed:** `<button>` inside `<label>` opens file picker twice; `importFile` accepts invalid shapes that crash app.

- [x] **Step 1: Remove `<label>` wrapping `<button>` in SettingsPage**
Use a standalone styled `<div>` or `<button>` that invokes the hidden file input ref cleanly.
- [x] **Step 2: Add validation to `importFile`**
Verify `data.playlists` is a non-null object with valid playlist structure, `data.likedSongs` is a valid record, and `data.history` is an array before setting state.
- [x] **Step 3: Commit Task 6**

---

### Task 7: Mini Player Scrub/Drag Seek & Toast Key Collision
**Files:**
- Modify: `apps/web/components/player/MiniPlayer.tsx:58-67`
- Modify: `apps/web/components/ui/Toast.tsx:18-25`

**Issues Addressed:** Mini player progress bar cannot be dragged/scrubbed; `Date.now()` causes toast key collision.

- [x] **Step 1: Add drag-to-seek pointer events to MiniPlayer progress bar**
Implement `pointerdown`, `pointermove`, `pointerup` with pointer capture for scrubbing.
- [x] **Step 2: Update ToastContainer ID generator**
Use an auto-incrementing ID counter `let toastSeq = 0` to guarantee unique keys.
- [x] **Step 3: Commit Task 7**

---

### Task 8: Video Mode Sync, Lyrics Timeout & YouTube Scraper Regex
**Files:**
- Modify: `apps/web/components/player/ExpandedPlayer.tsx:56-65`
- Modify: `apps/web/lib/lrclib.ts:11-19`
- Modify: `apps/web/lib/youtube.ts:38-42`

**Issues Addressed:** Hanging lyrics requests, video progress mismatch, YouTube scraper missing JSON video IDs.

- [x] **Step 1: Add AbortSignal.timeout to lrclib.ts**
Add `signal: AbortSignal.timeout(6000)` to `fetchLyrics`.
- [x] **Step 2: Improve YouTube regex in youtube.ts**
Match both `\/watch\?v=([a-zA-Z0-9_-]{11})` and `\"videoId\"\:\"([a-zA-Z0-9_-]{11})\"`.
- [x] **Step 3: Bound video mode progress update**
Only advance progress when video is actively playing.
- [x] **Step 4: Commit Task 8**

---

### Task 9: Working Tree Cleanup & Verification
**Files:**
- Delete untracked png screenshots in project root
- Run `pnpm --filter web build`
- Run `node apps/web/lib/quality.test.mjs`

- [x] **Step 1: Remove stray root PNG files**
- [x] **Step 2: Run full build and test suite**
- [x] **Step 3: Final commit**
