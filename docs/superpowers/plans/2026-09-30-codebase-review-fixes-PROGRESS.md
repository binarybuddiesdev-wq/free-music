# Progress — Codebase Review Fixes

Plan: [`2026-09-30-codebase-review-fixes.md`](./2026-09-30-codebase-review-fixes.md)
Branch: `main` (user committed baseline manually; work continues on the same branch)

Baseline (before Task 1): 72 tests pass, lint clean, `tsc --noEmit` exit 0.

| Task | Title | Status | Verification |
|---|---|---|---|
| 0 | Branch and baseline | Done | User committed baseline; work stays on `main` |
| 1 | Skip redundant localStorage writes (#2) | Done | 79 tests pass, lint clean, tsc 0 |
| 2 | Accept every selectable language (#3) | Pending | |
| 3 | Pure queue logic module (#5, #6, #15) | Pending | |
| 4 | Wire queue UIs (#5, #6) | Pending | |
| 5 | Player store: mute, pause, video mode (#9, #10) | Pending | |
| 6 | Sleep timer (#4) | Pending | |
| 7 | AudioManager listeners/skip/preload (#7, #16, #21, #24) | Pending | |
| — | Checkpoint 1 (full build) | Pending | |
| 8–15 | Phase 2 functional bugs | Pending | |
| — | Checkpoint 2 (full build) | Pending | |
| 16–21 | Phase 3 performance, cleanup, final verification | Pending | |

## Log

### Task 1 — done
- Added `apps/web/lib/dedup-storage.ts` and `dedup-storage.test.mjs` (7 tests), registered in the `test` script.
- All five persisted stores (`player`, `queue`, `library`, `settings`, `ui`) now use `createJSONStorage(() => dedupLocalStorage)`.
- Deviation: the test file and implementation were written together, so the RED run was not watched separately.
- Not done: the optional manual DevTools localStorage check.

## Rulings
- Working directly on `main` rather than `fix/codebase-review`, per user instruction.
- Stopping after each task to update this file, per user instruction.
