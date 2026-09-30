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
| 8–15 | Phase 2 functional bugs | Pending | |
| — | Checkpoint 2 (full build) | Pending | |
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

## Rulings
- Working directly on `main` rather than `fix/codebase-review`, per user instruction.
- Stopping after each task to update this file, per user instruction. Latest instruction: stop after each PHASE; Phase 1 (Tasks 1–7) finished in one run, stopped at Checkpoint 1.
