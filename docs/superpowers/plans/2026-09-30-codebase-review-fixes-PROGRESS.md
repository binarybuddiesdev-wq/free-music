# Progress — Codebase Review Fixes

Plan: [`2026-09-30-codebase-review-fixes.md`](./2026-09-30-codebase-review-fixes.md)
Branch: `main` (user committed baseline manually; work continues on the same branch)

Baseline (before Task 1): 72 tests pass, lint clean, `tsc --noEmit` exit 0.

| Task | Title | Status | Verification |
|---|---|---|---|
| 0 | Branch and baseline | Done | User committed baseline; work stays on `main` |
| 1 | Skip redundant localStorage writes (#2) | Done | 79 tests pass, lint clean, tsc 0 |
| 2 | Accept every selectable language (#3) | Done | 82 tests pass, lint clean, tsc 0 |
| 3 | Pure queue logic module (#5, #6, #15) | Done | 98 tests pass, lint clean, tsc 0 |
| 4 | Wire queue UIs (#5, #6) | Done | 98 tests pass, lint clean, tsc 0 |
| 5 | Player store: mute, pause, video mode (#9, #10) | Done | 102 tests pass, lint clean, tsc 0 |
| 6 | Sleep timer (#4) | Done | 106 tests pass, lint clean, tsc 0 |
| 7 | AudioManager listeners/skip/preload (#7, #16, #21, #24) | Done | 108 tests pass, lint clean, tsc 0 |
| — | Checkpoint 1 (full build) | Done | `pnpm --filter web build` succeeded |
| 8 | Like buttons update immediately (#8) | Done | 108 tests pass, lint clean, tsc 0 |
| 9 | Isolate progress re-renders (#16) | Done | 111 tests pass, lint clean, tsc 0 |
| 10 | Home feed caching, no language side effect (#17, #12a) | Done | 123 tests pass (Task 10 added 7; Task 11 added 5), lint clean, tsc 0 |
| 11 | Varied radio + side-effect-free Start radio (#12b, #14) | Done | 123 tests pass, lint clean, tsc 0 |
| 12 | Faster lyrics lookup (#19) | Done | 127 tests pass, lint clean, tsc 0 |
| 13 | saavn.ts helper, parallel search, album/artist (#13, #19, #28, #31) | Done | 127 tests pass, lint clean, tsc 0; curl-verified |
| 14 | Lightweight search suggestions (#18) | Done | (same commit as 13); curl-verified |
| 15 | Replace broken service worker (#1) | Done | 128 tests pass, lint clean, tsc 0, build OK |
| — | Checkpoint 2 (full build) | Done | `pnpm --filter web build` succeeded |
| 16–21 | Phase 3 performance, cleanup, final verification | Pending | |

## Log

### Task 1 — done
- Added `apps/web/lib/dedup-storage.ts` and `dedup-storage.test.mjs` (7 tests), registered in the `test` script.
- All five persisted stores (`player`, `queue`, `library`, `settings`, `ui`) now use `createJSONStorage(() => dedupLocalStorage)`.
- Deviation: the test file and implementation were written together, so the RED run was not watched separately.
- Not done: the optional manual DevTools localStorage check.

### Task 2 — done
- Added `lib/languages.test.mjs` (3 tests), registered in the `test` script.
- Watched RED first: `odia must not fall back to telugu`.
- `ALLOWED_LANGUAGES` in `lib/security.ts` now matches `lib/languages.ts` (added `odia`, `assamese`, `urdu`).

### Task 3 — done
- Added `lib/queue-logic.ts` and `queue-logic.test.mjs` (16 tests), registered in the `test` script. Watched RED first (module not found), then GREEN.
- `queue.store.ts` now uses the pure functions; new actions `moveItem` and `removeAt`, and `jumpTo` / `addToQueue` now return a value.
- `player.store.ts` gained `playQueueIndex` (plays a queued item without rebuilding or reshuffling).
- `ContextMenu.tsx` shows "Added to queue" or "Already in queue".
- Known leftover: `ExpandedPlayer.tsx:556` also calls `addToQueue(song)` and ignores the new return value. It type-checks; Task 4/11 may revisit it.

### Task 4 — done (commit b16647e)
- `QueueDrawer.tsx`: uses `moveItem` / `removeAt` / `playQueueIndex`; highlight follows `qIndex` (active list); removed the duplicate `{...attributes}` on the drag button; ✕ is visible (opacity .7) and hidden on the playing row.
- `ExpandedPlayer.tsx` `UpNextPanel`: click plays via `playQueueIndex` (no re-shuffle).
- Manual browser checks from the plan were NOT run.

### Task 5 — done (commit 8090554)
- Added `lib/player-logic.ts` + `player-logic.test.mjs` (4 tests). Watched RED (module not found), then GREEN.
- Player store: mute keeps volume, `pause()` added, `togglePlay` in video mode returns to audio, `next`/`prev` reset `mode` to `audio`. Removed the dead video-progress interval in `ExpandedPlayer.tsx`.

### Task 6 — done (commit a894dbf)
- Added `lib/settings-persist.ts` + test (4 tests). Watched RED, then GREEN.
- Settings store uses `partializeSettings` / `mergeSettings` (sleep timer no longer persisted; legacy values dropped). Sleep timer now calls `pause()`.

### Task 7 — done (commit e41b84b)
- Added `lib/api-urls.ts` + test (2 tests). Watched RED, then GREEN.
- `AudioManager.tsx`: listeners attached once (read state via `getState()`), `skipUnplayableTrack` also handles empty URLs, preload is `metadata` only, MediaSession split into 9a/9b/9c, keyboard shortcuts registered once.
- Manual checklist from the plan (keyboard, media keys, network tab, blocked-domain skip) NOT run.

### Checkpoint 1
- Full `pnpm --filter web build` succeeded after Task 7.

### Phase 2 — done (Tasks 8–15)
- Task 8 `cfc00a7`: like state subscribes to `likedSongs`; `isLiked` removed from the store.
- Task 9 `3417bd6`: `lib/lyrics-sync.ts` (`findActiveLine`, 3 tests, RED first). LyricsPanel re-renders only when the line changes; MiniPlayer progress bar and time moved into `MiniProgressBar` / `PlaybackTime`.
- Task 10 `d3208fe`: `sessionPage` + `fetchSectionSongs` (7 tests, RED first). Sections use app-wide query cache; chips use `languageOverride`, no longer overwrite the saved language. `randomPage` removed.
- Task 11 `9760742`: `mergeRecommendations` (5 tests, RED first); `getSongRecommendations` uses random pages and both sources in parallel; Start radio no longer changes autoplay or restarts the song.
- Task 12 `55848e2`: `buildLyricsAttempts` / `pickLyrics` (4 tests, RED first); lrclib attempts run in parallel and JSON is awaited.
- Tasks 13+14 `8186ecb`: `saavnCall` helper, parallel primary/entity search, `getAlbumDetails` (real album title/artist/image), `getArtistDetails` returns null -> HTTP 502 (no junk Telugu fallback), artist page shows its error state, `getSong` deleted, `suggestSongs` + `suggest=1` (own 120/min bucket) used by the header. Checked with curl against the dev server: album metadata present, fake artist -> 502, suggestions ≤ 5 in ~0.15 s, search 40 songs, radio lists differ between calls, lyrics returned.
- Task 15: hand-written `public/sw.js` (audio/API/range requests bypass it), `workbox-*.js` and `next-pwa.d.ts` deleted, registration fixed for the already-loaded case (dev unregisters old workers), `/sw.js` served uncached. Service-worker test rewritten (RED against the old file, then GREEN). Production server check: `/sw.js` returns the no-cache headers; `offline.html`, icons and manifest return 200.
- Checkpoint 2: full `pnpm --filter web build` succeeded.
- NOT run: any in-browser manual check (service worker activation/offline reload, queue/like/profiler checks, network-tab request counts).

## Rulings
- Working directly on `main` rather than `fix/codebase-review`, per user instruction.
- Stopping after each task to update this file, per user instruction. Latest instruction: stop after each PHASE; Phase 1 (Tasks 1–7) finished in one run, stopped at Checkpoint 1.
- Task 11: "Start radio" calls `setQueue(radioQueue, 0, true)` (plan said `false`). `false` would silently turn shuffle off; `true` keeps the user's shuffle setting with the current song first. Cost if wrong: radio starts unshuffled instead of keeping shuffle.
- Tasks 13 and 14 are one commit because both edit `saavn.ts` and `app/api/search/route.ts`; splitting would need hunk-level staging.
