# Codebase Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Also use **superpowers:test-driven-development** for every task that has a "Write the failing test" step, **superpowers:systematic-debugging** if any step fails unexpectedly, and **superpowers:verification-before-completion** before claiming any task is done.

**Goal:** Fix every bug and inefficiency listed in the 2026-09-30 codebase review of the Free Music (YouTube Music clone) app, without adding new features.

**Architecture:** Next.js 15 App Router app in `apps/web` (pnpm monorepo). Client state lives in Zustand stores (`apps/web/stores/*`); audio is owned exclusively by `components/AudioManager.tsx`; data comes from the JioSaavn API via server routes in `app/api/*`. The fix strategy is: pull every piece of tricky logic (queue edits, mute math, lyric sync, recommendation merging, persistence filtering) out into small **pure modules in `apps/web/lib/`** that have no runtime imports, test those with Node's built-in test runner, and then make stores/components call them.

**Tech Stack:** Next.js 15.3, React 19, TypeScript 5 (strict), Zustand 5 (`persist` middleware), TanStack React Query 5, Tailwind CSS v4 + CSS variables, `node --test` (Node 24, native TypeScript type-stripping), Playwright (e2e), IndexedDB, a hand-written service worker.

**Spec:** [`docs/superpowers/specs/2026-09-30-codebase-review-findings.md`](../specs/2026-09-30-codebase-review-findings.md). Finding numbers like **(#5)** refer to that file.

## Global Constraints

- All commands run from the repo root `C:\teja\coding\free-music` unless a step says otherwise. The shell is Git Bash on Windows (POSIX syntax).
- Follow `CLAUDE.md` invariants exactly:
  - NEVER create `<audio>` / `new Audio()` outside `components/AudioManager.tsx`.
  - DO NOT hardcode dark-only colors (`#030303`, `#0f0f0f`, `#1f1f1f`, `#1a1a1a`) in components; use `var(--bg-base)`, `var(--bg-surface)`, `var(--panel-bg)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--border)`.
  - Use `getAudioQualityUrl(url, quality)` for bitrate switching.
  - DO NOT route `getSectionSongs` through the `searchSongs` relevance filter.
  - Keep `if (typeof (globalThis as any).self === 'undefined') (globalThis as any).self = globalThis` at the top of `apps/web/next.config.ts`.
  - IndexedDB DB `free_music_db`, store `downloaded_songs`; revoke old blob URLs on track change.
  - `createMediaElementSource` is called only once; `<audio>` keeps `crossOrigin="anonymous"`.
- **Pure-module rule (critical for tests):** unit tests are `.mjs` files run by `node --test`, which imports `.ts` files directly using Node's type-stripping. Therefore any new `lib/*.ts` module that a test imports must have **no runtime imports**. `import type { … } from '../types/music'` is fine (it is erased). A runtime import such as `import { x } from './utils'` will crash the test (Node needs the `.ts` extension, and adding `.ts` breaks the Next build).
- **Every new test file must be appended to the `"test"` script in `apps/web/package.json`.** That script lists files explicitly; a test not listed there never runs in `pnpm --filter web test`.
- Per-task verification (run after every task, all must pass before committing):
  - `pnpm --filter web test` → all pass
  - `pnpm --filter web lint` → `✔ No ESLint warnings or errors`
  - `pnpm --filter web exec tsc --noEmit` → exit 0, no output (≈7 s; type-check without a full build)
- Full build `pnpm --filter web build` must succeed at every **Checkpoint** (end of each phase) and at the end.
- No new npm dependencies.
- Keep the existing inline-style coding style (components use `style={{…}}` objects, not Tailwind classes). Match surrounding code; don't reformat untouched code.
- Commit after every task with a conventional-commit message (`fix(scope): …`, `perf(scope): …`, `refactor(scope): …`, `test(scope): …`). Use your harness's normal commit attribution trailer.

## Review Focus

These are the inputs most likely to bite a real user that no feature-level test would naturally exercise. Each one has a pinned test in the task that owns it.

1. **Legacy persisted state from before this upgrade** — localStorage from the old version still contains `sleepTimerEnd` in the past, and `{ muted: true, volume: 0 }` (the old mute bug). Expected: the app loads, no timer fires, and unmuting restores an audible volume. → Tests in Task 5 (`toggleMuteState` from `{muted:true, volume:0}`) and Task 6 (`mergeSettings` drops legacy `sleepTimerEnd`).
2. **Shuffle ON while reordering/removing in the queue** — Expected: the song that is playing stays the "current" song, shuffle stays ON, and "next" plays the song shown below the current one. → Tests in Task 3.
3. **A section whose random deep page is empty** (small catalogs such as Assamese/Odia on page 7). Expected: the section still shows songs from page 1 instead of disappearing. → Test in Task 10.
4. **Incoming song batch containing duplicates of itself or of the queue** (autoplay/radio). Expected: each song appears once; dnd-kit keys stay unique. → Test in Task 3.
5. **Very long autoplay sessions** (hundreds of appended tracks). Expected: queue is capped, the playing song and everything after it survive, only already-played songs are dropped. → Test in Task 3.

---

## File Map

**New pure modules (unit-tested):**

| File | Responsibility |
|---|---|
| `apps/web/lib/dedup-storage.ts` | localStorage wrapper that skips identical consecutive writes (#2) |
| `apps/web/lib/queue-logic.ts` | Pure queue operations: active list, jump, move, remove, append-unique, cap (#5, #6, #15) |
| `apps/web/lib/player-logic.ts` | Pure volume/mute math (#9) |
| `apps/web/lib/settings-persist.ts` | Which settings persist; legacy-state merge; sleep-timer due check (#4) |
| `apps/web/lib/lyrics-sync.ts` | Active-line binary search, lrclib attempt building/picking (#16, #19) |
| `apps/web/lib/recommendations.ts` | Merge artist + discovery songs into a varied radio list (#14) |
| `apps/web/lib/api-urls.ts` | Shared client URL builders (recommendations) |
| `apps/web/lib/home-feed.ts` | Client fetch for home sections with empty-page fallback (#17) |

**New client helpers (not unit-tested, browser-only):**

| File | Responsibility |
|---|---|
| `apps/web/lib/detail-queries.ts` | Shared React Query definitions for album / public playlist (#28) |

**Modified:** stores (`player`, `queue`, `settings`, `library`, `ui`), `components/AudioManager.tsx`, `components/player/{MiniPlayer,ExpandedPlayer,QueueDrawer,LyricsPanel,VisualizerCanvas}.tsx`, `components/home/{SongCard,QuickPicksSection,SectionRow,ForYouSection}.tsx`, `components/ui/ContextMenu.tsx`, `components/layout/Header.tsx`, `components/providers.tsx`, `components/search/{AlbumCard,PlaylistCard}.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/album/[id]/page.tsx`, `app/artist/[id]/page.tsx`, `app/playlist/[id]/page.tsx`, `app/library/page.tsx`, `app/api/search/route.ts`, `lib/{saavn,lrclib,security,session,utils,offline-storage}.ts`, `next.config.ts`, `public/sw.js`, `lib/pwa.test.mjs`, `package.json` (test script).

**Deleted:** `apps/web/public/workbox-1d075dc5.js`, `apps/web/next-pwa.d.ts`.

---

## Phase 0 — Setup

### Task 0: Branch and baseline

**Files:** none changed.

- [ ] **Step 1: Ask the user about the uncommitted work**

The working tree has ~135 uncommitted files (the user's in-progress work). Ask the user exactly:
> "Before I start: should I commit the current uncommitted work on `main` as a baseline commit, then create a `fix/codebase-review` branch for these fixes?"

Do NOT commit, stash, or discard anything until the user answers. If they say yes:

```bash
cd /c/teja/coding/free-music
git add -A
git commit -m "chore: baseline before codebase review fixes"
git checkout -b fix/codebase-review
```

If they say no, ask what they prefer (e.g. just `git checkout -b fix/codebase-review` carrying the changes along) and do that.

- [ ] **Step 2: Record the baseline**

```bash
cd /c/teja/coding/free-music
pnpm --filter web test 2>&1 | tail -8
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit; echo "tsc exit $?"
```

Expected: `ℹ pass 72`, `ℹ fail 0`; lint clean; `tsc exit 0`. If anything fails here, stop and report to the user — do not start fixing on a red baseline.

---

## Phase 1 — Critical fixes (#1–#7)

### Task 1: Stop redundant localStorage writes (#2)

Zustand's `persist` calls `storage.setItem` after **every** `set()`, even when the partialized slice didn't change. We wrap localStorage so identical consecutive writes are skipped.

**Files:**
- Create: `apps/web/lib/dedup-storage.ts`
- Create: `apps/web/lib/dedup-storage.test.mjs`
- Modify: `apps/web/stores/player.store.ts`, `apps/web/stores/queue.store.ts`, `apps/web/stores/library.store.ts`, `apps/web/stores/settings.store.ts`, `apps/web/stores/ui.store.ts`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces: `createDedupStorage(getStorage: () => StringStorage | undefined): StringStorage`, `dedupLocalStorage: StringStorage`, `interface StringStorage { getItem(name): string | null; setItem(name, value: string): void; removeItem(name): void }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/dedup-storage.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createDedupStorage } from './dedup-storage.ts'

function fakeStorage() {
  const map = new Map()
  let writes = 0
  let failNext = false
  return {
    api: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (failNext) { failNext = false; throw new Error('QuotaExceededError') }
        writes++
        map.set(k, v)
      },
      removeItem: (k) => map.delete(k),
    },
    writes: () => writes,
    failOnce: () => { failNext = true },
    map,
  }
}

test('identical consecutive writes are skipped', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('ytm-player', '{"a":1}')
  storage.setItem('ytm-player', '{"a":1}')
  storage.setItem('ytm-player', '{"a":1}')
  assert.equal(fake.writes(), 1)
})

test('changed values are written', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('k', '1')
  storage.setItem('k', '2')
  assert.equal(fake.writes(), 2)
  assert.equal(fake.map.get('k'), '2')
})

test('keys are tracked independently', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('a', 'x')
  storage.setItem('b', 'x')
  assert.equal(fake.writes(), 2)
})

test('getItem primes the cache so re-writing the stored value is skipped', () => {
  const fake = fakeStorage()
  fake.map.set('k', 'stored')
  const storage = createDedupStorage(() => fake.api)
  assert.equal(storage.getItem('k'), 'stored')
  storage.setItem('k', 'stored')
  assert.equal(fake.writes(), 0)
})

test('after removeItem the same value is written again', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('k', 'v')
  storage.removeItem('k')
  storage.setItem('k', 'v')
  assert.equal(fake.writes(), 2)
})

test('a failed write is retried next time with the same value', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  fake.failOnce()
  assert.throws(() => storage.setItem('k', 'v'))
  storage.setItem('k', 'v')
  assert.equal(fake.writes(), 1)
})

test('missing storage (SSR) is a silent no-op', () => {
  const storage = createDedupStorage(() => undefined)
  assert.equal(storage.getItem('k'), null)
  assert.doesNotThrow(() => storage.setItem('k', 'v'))
  assert.doesNotThrow(() => storage.removeItem('k'))
})
```

Append ` lib/dedup-storage.test.mjs` to the end of the `"test"` script string in `apps/web/package.json` (inside the quotes, after `lib/nasty-paths.test.mjs`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/teja/coding/free-music && pnpm --filter web test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '…/lib/dedup-storage.ts'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/dedup-storage.ts`:

```ts
/**
 * Zustand's persist middleware calls storage.setItem after *every* state change,
 * even when the partialized slice is unchanged (e.g. progress ticks ~4x/second).
 * This wrapper remembers the last string written per key and skips identical writes.
 *
 * Pure module: no runtime imports (unit-tested with node --test).
 */
export interface StringStorage {
  getItem: (name: string) => string | null
  setItem: (name: string, value: string) => void
  removeItem: (name: string) => void
}

export function createDedupStorage(getStorage: () => StringStorage | undefined): StringStorage {
  const lastWritten = new Map<string, string>()

  return {
    getItem: (name) => {
      const value = getStorage()?.getItem(name) ?? null
      if (value !== null) lastWritten.set(name, value)
      return value
    },
    setItem: (name, value) => {
      if (lastWritten.get(name) === value) return
      const storage = getStorage()
      if (!storage) return
      storage.setItem(name, value)
      // Only remember the value once it was actually written (a quota error must be retried)
      lastWritten.set(name, value)
    },
    removeItem: (name) => {
      lastWritten.delete(name)
      getStorage()?.removeItem(name)
    },
  }
}

export const dedupLocalStorage = createDedupStorage(() =>
  typeof window !== 'undefined' ? window.localStorage : undefined
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/teja/coding/free-music && pnpm --filter web test 2>&1 | tail -8`
Expected: all pass, `ℹ fail 0`.

- [ ] **Step 5: Use it in all five persisted stores**

In each of `stores/player.store.ts`, `stores/queue.store.ts`, `stores/library.store.ts`, `stores/settings.store.ts`, `stores/ui.store.ts`:

1. Change `import { persist } from 'zustand/middleware'` to:
   ```ts
   import { persist, createJSONStorage } from 'zustand/middleware'
   import { dedupLocalStorage } from '@/lib/dedup-storage'
   ```
2. Add `storage: createJSONStorage(() => dedupLocalStorage),` to the persist options object, directly after the `name:` line. Example for the player store:
   ```ts
   {
     name: 'ytm-player',
     storage: createJSONStorage(() => dedupLocalStorage),
     skipHydration: true,
     partialize: (s) => ({ … unchanged … }),
   }
   ```
   For single-line option objects like `{ name: 'ytm-library', skipHydration: true }`, expand to
   `{ name: 'ytm-library', storage: createJSONStorage(() => dedupLocalStorage), skipHydration: true }`.

- [ ] **Step 6: Verify**

```bash
cd /c/teja/coding/free-music
pnpm --filter web test 2>&1 | tail -4
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit; echo "tsc exit $?"
```
Expected: pass / clean / `tsc exit 0`.

Manual check (optional, fast): `pnpm dev`, play a song, open DevTools → Application → Local Storage. The `ytm-player` value must not flicker/update while the song plays (it only changes on track/volume change).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/dedup-storage.ts apps/web/lib/dedup-storage.test.mjs apps/web/stores apps/web/package.json
git commit -m "perf(stores): skip identical localStorage writes from zustand persist"
```

---

### Task 2: Accept every selectable language in the API (#3)

**Files:**
- Modify: `apps/web/lib/security.ts:7-19`
- Create: `apps/web/lib/languages.test.mjs`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Consumes: `LANGUAGES` from `lib/languages.ts` (its only import is `import type`, so Node can load it), `sanitizeLanguage`, `ALLOWED_LANGUAGES` from `lib/security.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/languages.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES, DEFAULT_LANGUAGE } from './languages.ts'
import { sanitizeLanguage, ALLOWED_LANGUAGES } from './security.ts'

test('every language offered in the UI is accepted by the API allowlist', () => {
  for (const lang of LANGUAGES) {
    assert.equal(sanitizeLanguage(lang.value), lang.value, `${lang.value} must not fall back to telugu`)
  }
})

test('allowlist has no languages the UI cannot select', () => {
  const selectable = new Set(LANGUAGES.map((l) => l.value))
  for (const lang of ALLOWED_LANGUAGES) {
    assert.ok(selectable.has(lang), `${lang} is allowed but not selectable`)
  }
})

test('default language is allowed', () => {
  assert.equal(sanitizeLanguage(DEFAULT_LANGUAGE), DEFAULT_LANGUAGE)
})
```

Append ` lib/languages.test.mjs` to the `"test"` script.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test 2>&1 | grep -A3 "odia\|not ok" | head -20`
Expected: FAIL — `odia must not fall back to telugu`.

- [ ] **Step 3: Fix the allowlist**

In `apps/web/lib/security.ts`, replace the `ALLOWED_LANGUAGES` array with (same order as `lib/languages.ts`):

```ts
export const ALLOWED_LANGUAGES = [
  'telugu',
  'hindi',
  'tamil',
  'kannada',
  'malayalam',
  'punjabi',
  'marathi',
  'bengali',
  'gujarati',
  'odia',
  'assamese',
  'urdu',
  'bhojpuri',
  'english',
] as const
```

- [ ] **Step 4: Verify** — run the three Global Constraints verification commands. Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/security.ts apps/web/lib/languages.test.mjs apps/web/package.json
git commit -m "fix(api): accept odia, assamese and urdu instead of falling back to telugu"
```

---

### Task 3: Pure queue logic module (#5, #6, #15)

All queue editing moves into one tested module. Key rule: **`qIndex` always indexes the *active* list** (the shuffled list when shuffle is on, else the original list), and every edit keeps `qIndex` pointing at the song that is currently playing.

**Files:**
- Create: `apps/web/lib/queue-logic.ts`
- Create: `apps/web/lib/queue-logic.test.mjs`
- Modify: `apps/web/stores/queue.store.ts`
- Modify: `apps/web/stores/player.store.ts`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces (in `lib/queue-logic.ts`):
  - `interface QueueSnapshot { queue: Song[]; shuffledQueue: Song[]; qIndex: number; shuffleOn: boolean }`
  - `MAX_QUEUE_LENGTH = 300`
  - `getActiveQueue(s: QueueSnapshot): Song[]`
  - `jumpToIndex<T extends QueueSnapshot>(s: T, index: number): T` — returns `s` itself (same reference) when out of range
  - `moveInQueue<T extends QueueSnapshot>(s: T, from: number, to: number): T`
  - `removeFromQueue<T extends QueueSnapshot>(s: T, index: number): T` — no-op (same reference) when `index === s.qIndex`
  - `appendUnique<T extends QueueSnapshot>(s: T, songs: Song[]): T` — dedups, then caps
  - `capQueue<T extends QueueSnapshot>(s: T, max?: number): T`
- Produces (queue store): `jumpTo(index: number): Song | null`, `moveItem(from: number, to: number): void`, `removeAt(index: number): void`, `addToQueue(song: Song): boolean` (true when added), `appendSongs(songs: Song[]): void`
- Produces (player store): `playQueueIndex(index: number): void` — plays an item already in the queue **without rebuilding/reshuffling** the queue.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/queue-logic.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getActiveQueue,
  jumpToIndex,
  moveInQueue,
  removeFromQueue,
  appendUnique,
  capQueue,
  MAX_QUEUE_LENGTH,
} from './queue-logic.ts'

const song = (id) => ({ id, title: id, artist: 'A', album: '', duration: 1, image: '', downloadUrl: '', language: 'telugu' })
const songs = (...ids) => ids.map(song)
const ids = (list) => list.map((s) => s.id)
const current = (s) => getActiveQueue(s)[s.qIndex]?.id

const plain = (qIndex = 1) => ({ queue: songs('a', 'b', 'c', 'd', 'e'), shuffledQueue: songs('e', 'd', 'c', 'b', 'a'), qIndex, shuffleOn: false })
const shuffled = (qIndex = 1) => ({ queue: songs('a', 'b', 'c', 'd', 'e'), shuffledQueue: songs('c', 'a', 'e', 'b', 'd'), qIndex, shuffleOn: true })

test('getActiveQueue returns the shuffled list only when shuffle is on and non-empty', () => {
  assert.deepEqual(ids(getActiveQueue(plain())), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(ids(getActiveQueue(shuffled())), ['c', 'a', 'e', 'b', 'd'])
  assert.deepEqual(ids(getActiveQueue({ ...shuffled(), shuffledQueue: [] })), ['a', 'b', 'c', 'd', 'e'])
})

test('jumpToIndex sets qIndex and ignores out-of-range indexes', () => {
  const s = plain(0)
  assert.equal(jumpToIndex(s, 3).qIndex, 3)
  assert.equal(jumpToIndex(s, -1), s)
  assert.equal(jumpToIndex(s, 5), s)
})

test('moveInQueue keeps the playing song current for every from/to pair (plain)', () => {
  for (let from = 0; from < 5; from++) {
    for (let to = 0; to < 5; to++) {
      const s = plain(2) // playing "c"
      const next = moveInQueue(s, from, to)
      assert.equal(current(next), 'c', `from=${from} to=${to}`)
      assert.equal(next.queue.length, 5)
    }
  }
})

test('moveInQueue keeps the playing song current and shuffle ON (shuffled)', () => {
  for (let from = 0; from < 5; from++) {
    for (let to = 0; to < 5; to++) {
      const s = shuffled(2) // playing "e"
      const next = moveInQueue(s, from, to)
      assert.equal(current(next), 'e', `from=${from} to=${to}`)
      assert.equal(next.shuffleOn, true)
      assert.deepEqual(ids(next.queue), ['a', 'b', 'c', 'd', 'e'], 'original order untouched')
    }
  }
})

test('moveInQueue reorders the active list', () => {
  const next = moveInQueue(plain(0), 3, 1)
  assert.deepEqual(ids(next.queue), ['a', 'd', 'b', 'c', 'e'])
})

test('moveInQueue ignores invalid moves', () => {
  const s = plain(1)
  assert.equal(moveInQueue(s, 2, 2), s)
  assert.equal(moveInQueue(s, -1, 2), s)
  assert.equal(moveInQueue(s, 1, 9), s)
})

test('removeFromQueue before current shifts qIndex so the same song stays current', () => {
  const next = removeFromQueue(plain(2), 0)
  assert.deepEqual(ids(next.queue), ['b', 'c', 'd', 'e'])
  assert.equal(current(next), 'c')
})

test('removeFromQueue after current keeps qIndex', () => {
  const next = removeFromQueue(plain(2), 4)
  assert.deepEqual(ids(next.queue), ['a', 'b', 'c', 'd'])
  assert.equal(current(next), 'c')
})

test('removeFromQueue refuses to remove the playing song', () => {
  const s = plain(2)
  assert.equal(removeFromQueue(s, 2), s)
})

test('removeFromQueue in shuffle mode removes from both lists and keeps shuffle ON', () => {
  const next = removeFromQueue(shuffled(2), 0) // remove "c" (active[0]); playing "e"
  assert.equal(next.shuffleOn, true)
  assert.deepEqual(ids(next.shuffledQueue), ['a', 'e', 'b', 'd'])
  assert.deepEqual(ids(next.queue), ['a', 'b', 'd', 'e'])
  assert.equal(current(next), 'e')
})

test('appendUnique skips songs already queued and duplicates inside the batch', () => {
  const next = appendUnique(plain(0), songs('c', 'f', 'f', 'g'))
  assert.deepEqual(ids(next.queue), ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  assert.deepEqual(ids(next.shuffledQueue).slice(-2), ['f', 'g'])
})

test('appendUnique returns the same reference when nothing is new', () => {
  const s = plain(0)
  assert.equal(appendUnique(s, songs('a', 'b')), s)
  assert.equal(appendUnique(s, []), s)
})

test('capQueue drops only already-played songs and keeps the current song', () => {
  const many = Array.from({ length: MAX_QUEUE_LENGTH + 5 }, (_, i) => song(`s${i}`))
  const s = { queue: many, shuffledQueue: [...many], qIndex: 250, shuffleOn: false }
  const next = capQueue(s)
  assert.equal(next.queue.length, MAX_QUEUE_LENGTH)
  assert.equal(current(next), 's250')
  assert.equal(next.shuffledQueue.length, MAX_QUEUE_LENGTH)
})

test('capQueue never drops the current or upcoming songs', () => {
  const many = Array.from({ length: MAX_QUEUE_LENGTH + 5 }, (_, i) => song(`s${i}`))
  const s = { queue: many, shuffledQueue: [...many], qIndex: 3, shuffleOn: false }
  const next = capQueue(s)
  assert.equal(next.queue.length, MAX_QUEUE_LENGTH + 2) // only 3 played songs could be dropped
  assert.equal(current(next), 's3')
})

test('capQueue returns the same reference when under the limit', () => {
  const s = plain(0)
  assert.equal(capQueue(s), s)
})

test('appendUnique caps a long autoplay session', () => {
  const many = Array.from({ length: MAX_QUEUE_LENGTH }, (_, i) => song(`s${i}`))
  const s = { queue: many, shuffledQueue: [...many], qIndex: MAX_QUEUE_LENGTH - 1, shuffleOn: false }
  const next = appendUnique(s, songs('new1', 'new2'))
  assert.equal(next.queue.length, MAX_QUEUE_LENGTH)
  assert.equal(current(next), `s${MAX_QUEUE_LENGTH - 1}`)
  assert.deepEqual(ids(next.queue).slice(-2), ['new1', 'new2'])
})
```

Append ` lib/queue-logic.test.mjs` to the `"test"` script.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test 2>&1 | tail -8`
Expected: FAIL — cannot find `queue-logic.ts`.

- [ ] **Step 3: Write the module**

Create `apps/web/lib/queue-logic.ts`:

```ts
/**
 * Pure queue operations. Invariant: `qIndex` always indexes the ACTIVE list
 * (shuffledQueue when shuffle is on, otherwise queue), and every operation keeps
 * qIndex pointing at the song that is currently playing.
 *
 * Every function returns the SAME object reference when nothing changes, so
 * `set((s) => fn(s))` in Zustand is a no-op for invalid input.
 *
 * Pure module: type-only imports (unit-tested with node --test).
 */
import type { Song } from '../types/music'

export interface QueueSnapshot {
  queue: Song[]
  shuffledQueue: Song[]
  qIndex: number
  shuffleOn: boolean
}

export const MAX_QUEUE_LENGTH = 300

function usesShuffled(s: QueueSnapshot): boolean {
  return s.shuffleOn && s.shuffledQueue.length > 0
}

export function getActiveQueue(s: QueueSnapshot): Song[] {
  return usesShuffled(s) ? s.shuffledQueue : s.queue
}

/** Returns `s` with the active list replaced and the inactive list replaced. */
function withLists<T extends QueueSnapshot>(s: T, active: Song[], inactive: Song[], qIndex: number): T {
  return usesShuffled(s)
    ? { ...s, shuffledQueue: active, queue: inactive, qIndex }
    : { ...s, queue: active, shuffledQueue: inactive, qIndex }
}

function inactiveList(s: QueueSnapshot): Song[] {
  return usesShuffled(s) ? s.queue : s.shuffledQueue
}

function removeFirstById(list: Song[], id: string): Song[] {
  const i = list.findIndex((x) => x.id === id)
  return i === -1 ? list : [...list.slice(0, i), ...list.slice(i + 1)]
}

export function jumpToIndex<T extends QueueSnapshot>(s: T, index: number): T {
  const active = getActiveQueue(s)
  if (!Number.isInteger(index) || index < 0 || index >= active.length) return s
  return { ...s, qIndex: index }
}

export function moveInQueue<T extends QueueSnapshot>(s: T, from: number, to: number): T {
  const active = getActiveQueue(s)
  if (from === to || from < 0 || to < 0 || from >= active.length || to >= active.length) return s

  const reordered = [...active]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)

  let qIndex = s.qIndex
  if (from === s.qIndex) qIndex = to
  else if (from < s.qIndex && to >= s.qIndex) qIndex = s.qIndex - 1
  else if (from > s.qIndex && to <= s.qIndex) qIndex = s.qIndex + 1

  return withLists(s, reordered, inactiveList(s), qIndex)
}

export function removeFromQueue<T extends QueueSnapshot>(s: T, index: number): T {
  const active = getActiveQueue(s)
  if (index < 0 || index >= active.length || index === s.qIndex) return s

  const removed = active[index]
  const nextActive = [...active.slice(0, index), ...active.slice(index + 1)]
  const qIndex = index < s.qIndex ? s.qIndex - 1 : s.qIndex
  return withLists(s, nextActive, removeFirstById(inactiveList(s), removed.id), qIndex)
}

export function capQueue<T extends QueueSnapshot>(s: T, max = MAX_QUEUE_LENGTH): T {
  const active = getActiveQueue(s)
  // Only songs BEFORE the current one (already played) may be dropped
  const excess = Math.min(active.length - max, s.qIndex)
  if (excess <= 0) return s

  const dropped = active.slice(0, excess)
  let inactive = inactiveList(s)
  for (const d of dropped) inactive = removeFirstById(inactive, d.id)
  return withLists(s, active.slice(excess), inactive, s.qIndex - excess)
}

export function appendUnique<T extends QueueSnapshot>(s: T, songs: Song[]): T {
  const existing = new Set(s.queue.map((x) => x.id))
  const unique: Song[] = []
  for (const song of songs) {
    if (existing.has(song.id)) continue
    existing.add(song.id)
    unique.push(song)
  }
  if (unique.length === 0) return s
  return capQueue({ ...s, queue: [...s.queue, ...unique], shuffledQueue: [...s.shuffledQueue, ...unique] })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test 2>&1 | tail -8`
Expected: all pass.

- [ ] **Step 5: Rewire `stores/queue.store.ts`**

Replace the file's interface and actions as follows (keep the `persist` options from Task 1 unchanged):

```ts
'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Song } from '@/types/music'
import { fisherYates } from '@/lib/utils'
import { dedupLocalStorage } from '@/lib/dedup-storage'
import {
  getActiveQueue,
  jumpToIndex,
  moveInQueue,
  removeFromQueue,
  appendUnique,
} from '@/lib/queue-logic'

interface QueueState {
  queue: Song[]
  shuffledQueue: Song[]
  qIndex: number
  shuffleOn: boolean
  repeatMode: 'none' | 'one' | 'all'
  setQueue: (songs: Song[], startIndex: number, keepShuffle?: boolean) => void
  next: () => Song | null
  prev: () => Song | null
  toggleShuffle: () => void
  toggleRepeat: () => void
  /** Point the queue at an index of the ACTIVE list; returns that song or null if out of range. */
  jumpTo: (index: number) => Song | null
  /** Reorder within the ACTIVE list, keeping the playing song current. */
  moveItem: (from: number, to: number) => void
  /** Remove an item of the ACTIVE list (never the playing one). */
  removeAt: (index: number) => void
  /** Append one song; returns false if it was already in the queue. */
  addToQueue: (song: Song) => boolean
  appendSongs: (songs: Song[]) => void
  currentSong: () => Song | null
}
```

Actions (replace the old `currentSong`, `next`, `prev`, `toggleShuffle`, `jumpTo`, `addToQueue`, `appendSongs`; keep `setQueue` and `toggleRepeat` as they are):

```ts
      currentSong: () => {
        const s = get()
        return getActiveQueue(s)[s.qIndex] ?? null
      },

      next: () => {
        const s = get()
        const active = getActiveQueue(s)
        if (s.repeatMode === 'one') return active[s.qIndex] ?? null
        const next = s.qIndex + 1
        if (next >= active.length) {
          if (s.repeatMode === 'all') {
            set({ qIndex: 0 })
            return active[0] ?? null
          }
          return null
        }
        set({ qIndex: next })
        return active[next]
      },

      prev: () => {
        const s = get()
        const prev = Math.max(0, s.qIndex - 1)
        set({ qIndex: prev })
        return getActiveQueue(s)[prev] ?? null
      },

      toggleShuffle: () => {
        const s = get()
        const currentSong = getActiveQueue(s)[s.qIndex]
        if (!s.shuffleOn) {
          const rest = s.queue.filter((x) => x.id !== currentSong?.id)
          const newShuffled = currentSong ? [currentSong, ...fisherYates(rest)] : fisherYates(s.queue)
          set({ shuffleOn: true, shuffledQueue: newShuffled, qIndex: 0 })
        } else {
          const newIndex = currentSong ? s.queue.findIndex((x) => x.id === currentSong.id) : 0
          set({ shuffleOn: false, qIndex: Math.max(0, newIndex) })
        }
      },

      jumpTo: (index) => {
        const s = get()
        const next = jumpToIndex(s, index)
        if (next === s) return null
        set({ qIndex: next.qIndex })
        return getActiveQueue(next)[next.qIndex] ?? null
      },

      moveItem: (from, to) => set((s) => moveInQueue(s, from, to)),

      removeAt: (index) => set((s) => removeFromQueue(s, index)),

      addToQueue: (song) => {
        if (get().queue.some((x) => x.id === song.id)) return false
        set((s) => appendUnique(s, [song]))
        return true
      },

      appendSongs: (newSongs) => {
        if (!newSongs || newSongs.length === 0) return
        set((s) => appendUnique(s, newSongs))
      },
```

- [ ] **Step 6: Add `playQueueIndex` to `stores/player.store.ts`**

Add to the `PlayerState` interface (after `playSong`):

```ts
  /** Play an item that is already in the queue (Up Next / queue drawer). Does NOT rebuild or reshuffle the queue. */
  playQueueIndex: (index: number) => void
```

Add the implementation directly after `playSong`:

```ts
      playQueueIndex: (index) => {
        const song = useQueueStore.getState().jumpTo(index)
        if (!song) return
        const { audioRef, currentSong } = get()
        const isSame = currentSong?.id === song.id
        useLibraryStore.getState().addToHistory(song)
        if (isSame && audioRef?.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
        set({ currentSong: { ...song }, isPlaying: true, isLoading: !isSame, progress: 0, mode: 'audio' })
      },
```

- [ ] **Step 7: Fix the one caller whose signature changed**

`components/ui/ContextMenu.tsx:182` currently does `onClick={() => { addToQueue(song); onClose() }}`. Replace with:

```tsx
onClick={() => {
  const added = addToQueue(song)
  showToast(added ? 'Added to queue' : 'Already in queue')
  onClose()
}}
```

(`showToast` is already imported in that file.)

- [ ] **Step 8: Verify**

Run the three verification commands. `tsc` will flag any other caller relying on the old `jumpTo(): void` return; the only other caller is `ExpandedPlayer.tsx` (rewired in Task 4 — its current code still type-checks because it ignores the return value).

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/queue-logic.ts apps/web/lib/queue-logic.test.mjs apps/web/stores apps/web/components/ui/ContextMenu.tsx apps/web/package.json
git commit -m "fix(queue): pure queue logic that keeps the playing song current on move/remove/append"
```

---

### Task 4: Wire the queue UIs to the new actions (#5, #6)

**Files:**
- Modify: `apps/web/components/player/QueueDrawer.tsx`
- Modify: `apps/web/components/player/ExpandedPlayer.tsx` (`UpNextPanel`, lines ~335–452)

**Interfaces:**
- Consumes: `useQueueStore` → `moveItem`, `removeAt`, `setQueue`, `qIndex`; `usePlayerStore` → `playQueueIndex`.

- [ ] **Step 1: Rewrite `QueueDrawer`'s logic**

In `components/player/QueueDrawer.tsx`:

1. In `SortableQueueItem`, add a `canRemove: boolean` prop (add it to the destructuring and to the props type).
2. Remove `{...attributes}` from the inner drag-handle `<button>` (it is already spread on the outer wrapper `div`; spreading twice creates two focus stops with the same ARIA role). Keep `{...attributes} {...listeners}` on the outer `div`.
3. Replace the remove button so it is visible and hidden for the playing song:

```tsx
        {canRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7, transition: 'opacity .15s, color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff0000'; e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0.7' }}
            title="Remove from queue"
            aria-label={`Remove ${song.title} from queue`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        )}
```

4. In `QueueDrawer()`, replace the selector block and handlers (from `const queue = …` down to and including `handleDragEnd`) with:

```tsx
  const queue = useQueueStore((s) => s.queue)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)
  const qIndex = useQueueStore((s) => s.qIndex)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const setQueue = useQueueStore((s) => s.setQueue)
  const moveItem = useQueueStore((s) => s.moveItem)
  const removeAt = useQueueStore((s) => s.removeAt)
  const playQueueIndex = usePlayerStore((s) => s.playQueueIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const autoplay = useSettingsStore((s) => s.autoplay)
  const setAutoplay = useSettingsStore((s) => s.setAutoplay)
  const queueOpen = useUIStore((s) => s.queueOpen)
  const setQueueOpen = useUIStore((s) => s.setQueueOpen)
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)
  const [mounted, setMounted] = useState(false)

  // qIndex always indexes the active list (see lib/queue-logic.ts)
  const activeQueue = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
  const activeIndex = qIndex

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeQueue.findIndex((s) => s.id === active.id)
    const newIndex = activeQueue.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    moveItem(oldIndex, newIndex)
  }
```

5. In the list render, change the `SortableQueueItem` props:

```tsx
                <SortableQueueItem
                  key={song.id}
                  song={song}
                  index={i}
                  isCurrent={i === activeIndex}
                  isPlaying={isPlaying && i === activeIndex}
                  canRemove={i !== activeIndex}
                  onPlay={() => playQueueIndex(i)}
                  onRemove={() => removeAt(i)}
                  onContextMenu={(e, s) => setCtx({ x: e.clientX, y: e.clientY, song: s })}
                />
```

6. Remove now-unused imports/variables (`arrayMove`, `playSong`, `currentSong` if unused). `pnpm --filter web lint` lists them.

The "Clear" button keeps `setQueue([], 0)`.

- [ ] **Step 2: Rewire `UpNextPanel` in `ExpandedPlayer.tsx`**

Replace the selectors at the top of `UpNextPanel` with:

```tsx
  const queue = useQueueStore((s) => s.queue)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const qIndex = useQueueStore((s) => s.qIndex)
  const playQueueIndex = usePlayerStore((s) => s.playQueueIndex)
  const currentSong = usePlayerStore((s) => s.currentSong)

  const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
```

In the list:

```tsx
            const isCurrent = i === qIndex
```
and
```tsx
                onClick={() => playQueueIndex(i)}
                onKeyDown={(e) => onEnterSpace(e, () => playQueueIndex(i))}
```

(The "Start radio" button in this panel is fixed in Task 11 — leave it for now.)

- [ ] **Step 3: Verify**

Run the three verification commands. Then manual check with `pnpm dev` (http://localhost:3000):
1. Play a song from a home section (queue gets ~20 songs). Open the queue drawer (≡ button in mini player).
2. Turn shuffle ON (mini player). The highlighted row in the drawer must be the song that is playing.
3. Drag a song from below the current one to above it. The highlight stays on the playing song; press "Next" in the mini player → the song directly below the highlighted row plays. Shuffle is still ON.
4. Hover a non-playing row: the ✕ is visible (dim) and removes that row; the playing row has no ✕.
5. Click a row in the Expanded player's "UP NEXT" tab: that song plays and the order of the list does NOT change.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/player/QueueDrawer.tsx apps/web/components/player/ExpandedPlayer.tsx
git commit -m "fix(queue-ui): reorder/remove/play-from-queue keep order, shuffle and current song"
```

---

### Task 5: Player store — mute, pause, video mode (#9, #10)

**Files:**
- Create: `apps/web/lib/player-logic.ts`
- Create: `apps/web/lib/player-logic.test.mjs`
- Modify: `apps/web/stores/player.store.ts`
- Modify: `apps/web/components/player/ExpandedPlayer.tsx` (delete the video progress interval)
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces (in `lib/player-logic.ts`): `interface VolumeState { volume: number; muted: boolean }`, `DEFAULT_UNMUTE_VOLUME = 0.8`, `toggleMuteState(s: VolumeState): VolumeState`, `setVolumeState(v: number): VolumeState`
- Produces (player store): `pause(): void` (used by Tasks 6 and 7)

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/player-logic.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleMuteState, setVolumeState, DEFAULT_UNMUTE_VOLUME } from './player-logic.ts'

test('muting keeps the previous volume', () => {
  assert.deepEqual(toggleMuteState({ muted: false, volume: 0.35 }), { muted: true, volume: 0.35 })
})

test('unmuting restores the previous volume', () => {
  const muted = toggleMuteState({ muted: false, volume: 0.35 })
  assert.deepEqual(toggleMuteState(muted), { muted: false, volume: 0.35 })
})

test('unmuting legacy state {muted:true, volume:0} restores an audible default', () => {
  assert.deepEqual(toggleMuteState({ muted: true, volume: 0 }), { muted: false, volume: DEFAULT_UNMUTE_VOLUME })
})

test('setVolumeState clamps and derives muted', () => {
  assert.deepEqual(setVolumeState(0.5), { volume: 0.5, muted: false })
  assert.deepEqual(setVolumeState(0), { volume: 0, muted: true })
  assert.deepEqual(setVolumeState(1.7), { volume: 1, muted: false })
  assert.deepEqual(setVolumeState(-2), { volume: 0, muted: true })
  assert.deepEqual(setVolumeState(Number.NaN), { volume: 0, muted: true })
})
```

Append ` lib/player-logic.test.mjs` to the `"test"` script.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test 2>&1 | tail -8` → FAIL (module missing).

- [ ] **Step 3: Write the module**

Create `apps/web/lib/player-logic.ts`:

```ts
/** Pure volume/mute math. Pure module: no imports (unit-tested with node --test). */
export interface VolumeState {
  volume: number
  muted: boolean
}

export const DEFAULT_UNMUTE_VOLUME = 0.8

/** Mute never touches the stored volume, so unmute can restore it. */
export function toggleMuteState(s: VolumeState): VolumeState {
  if (s.muted) return { muted: false, volume: s.volume > 0 ? s.volume : DEFAULT_UNMUTE_VOLUME }
  return { muted: true, volume: s.volume }
}

export function setVolumeState(v: number): VolumeState {
  const volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
  return { volume, muted: volume === 0 }
}
```

- [ ] **Step 4: Run to verify it passes** → `pnpm --filter web test 2>&1 | tail -8`, all pass.

- [ ] **Step 5: Update `stores/player.store.ts`**

1. Add import: `import { toggleMuteState, setVolumeState } from '@/lib/player-logic'`
2. Add to the interface: `pause: () => void`
3. Replace `togglePlay`, `setVolume`, `toggleMute`, `next`, `prev` and add `pause`:

```ts
      togglePlay: () => {
        const { audioRef, isPlaying, mode } = get()
        // In video mode the audio element is intentionally paused; "play" means go back to audio
        if (mode === 'video') {
          get().switchToAudio()
          return
        }
        if (!audioRef?.current) return
        if (isPlaying) {
          audioRef.current.pause()
          set({ isPlaying: false })
        } else {
          audioRef.current.play().catch(() => {})
          set({ isPlaying: true })
        }
      },

      pause: () => {
        get().audioRef?.current?.pause()
        set({ isPlaying: false })
      },

      setVolume: (v) => {
        const next = setVolumeState(v)
        const el = get().audioRef?.current
        if (el) {
          el.volume = next.volume
          el.muted = next.muted
        }
        set(next)
      },

      toggleMute: () => {
        const { muted, volume } = get()
        const next = toggleMuteState({ muted, volume })
        const el = get().audioRef?.current
        if (el) {
          el.muted = next.muted
          el.volume = next.volume
        }
        set(next)
      },
```

In `next` and `prev`, add `mode: 'audio'` to the final `set({...})` calls so changing track always leaves video mode:

```ts
        set({ currentSong: { ...song }, progress: 0, isPlaying: true, isLoading: true, mode: 'audio' })
```

- [ ] **Step 6: Delete the dead video-progress interval**

In `components/player/ExpandedPlayer.tsx` delete the whole effect commented `// Keep progress advancing while watching video (audio element stays paused)` (the `useEffect(() => { if (mode !== 'video' || !isPlaying) return … }, [mode, isPlaying])` block). It never ran: pausing audio sets `isPlaying=false`. Remove `useEffect` from the React import if it is now unused (lint will tell you).

- [ ] **Step 7: Verify**

Run the three verification commands. Manual (`pnpm dev`):
1. Set the volume slider to ~30%, click the speaker icon (mute), click again → slider returns to ~30%.
2. Expanded player → "Video" (pick a popular song so a video exists) → audio stops, video plays. Press the mini player "Next" → video closes (Song mode) and the next track plays as audio only — no double audio.
3. While in Video mode, press Space → switches back to Song mode and resumes audio.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/player-logic.ts apps/web/lib/player-logic.test.mjs apps/web/stores/player.store.ts apps/web/components/player/ExpandedPlayer.tsx apps/web/package.json
git commit -m "fix(player): mute remembers volume, track change leaves video mode, add pause()"
```

---

### Task 6: Sleep timer pauses instead of toggling; never restored after reload (#4)

**Files:**
- Create: `apps/web/lib/settings-persist.ts`
- Create: `apps/web/lib/settings-persist.test.mjs`
- Modify: `apps/web/stores/settings.store.ts`
- Modify: `apps/web/components/AudioManager.tsx` (effect "4. Handle sleep timer countdown")
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Consumes: `pause()` from Task 5.
- Produces: `SESSION_ONLY_SETTINGS`, `partializeSettings<T extends object>(state: T): Partial<T>`, `mergeSettings<T extends object>(persisted: unknown, current: T): T`, `isSleepTimerDue(end: number | null, now: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/settings-persist.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { partializeSettings, mergeSettings, isSleepTimerDue } from './settings-persist.ts'

test('partializeSettings drops sleep timer fields and functions', () => {
  const state = { theme: 'dark', sleepTimer: 30, sleepTimerEnd: 123, setTheme: () => {} }
  assert.deepEqual(partializeSettings(state), { theme: 'dark' })
})

test('mergeSettings ignores a legacy persisted sleepTimerEnd', () => {
  const current = { theme: 'dark', sleepTimer: 0, sleepTimerEnd: null, setTheme: () => {} }
  const legacy = { theme: 'light', sleepTimer: 15, sleepTimerEnd: 1000 }
  const merged = mergeSettings(legacy, current)
  assert.equal(merged.theme, 'light')
  assert.equal(merged.sleepTimer, 0)
  assert.equal(merged.sleepTimerEnd, null)
  assert.equal(typeof merged.setTheme, 'function')
})

test('mergeSettings tolerates missing / corrupt persisted state', () => {
  const current = { theme: 'dark' }
  assert.deepEqual(mergeSettings(undefined, current), { theme: 'dark' })
  assert.deepEqual(mergeSettings('garbage', current), { theme: 'dark' })
})

test('isSleepTimerDue', () => {
  assert.equal(isSleepTimerDue(null, 5), false)
  assert.equal(isSleepTimerDue(0, 5), false)
  assert.equal(isSleepTimerDue(10, 5), false)
  assert.equal(isSleepTimerDue(10, 10), true)
  assert.equal(isSleepTimerDue(10, 11), true)
})
```

Append ` lib/settings-persist.test.mjs` to the `"test"` script.

- [ ] **Step 2: Run to verify it fails** → module missing.

- [ ] **Step 3: Write the module**

Create `apps/web/lib/settings-persist.ts`:

```ts
/**
 * Which settings survive a reload. A running sleep timer describes the current
 * session, not a preference — restoring it made an expired timer fire on reload.
 *
 * Pure module: no imports (unit-tested with node --test).
 */
export const SESSION_ONLY_SETTINGS = ['sleepTimer', 'sleepTimerEnd'] as const

function isSessionOnly(key: string): boolean {
  return (SESSION_ONLY_SETTINGS as readonly string[]).includes(key)
}

export function partializeSettings<T extends object>(state: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function' || isSessionOnly(key)) continue
    out[key] = value
  }
  return out as Partial<T>
}

/** Used as persist `merge`: also strips session-only keys written by older versions. */
export function mergeSettings<T extends object>(persisted: unknown, current: T): T {
  if (!persisted || typeof persisted !== 'object') return current
  return { ...current, ...partializeSettings(persisted as Partial<T>) }
}

export function isSleepTimerDue(end: number | null, now: number): boolean {
  return end !== null && end > 0 && now >= end
}
```

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Use it in `stores/settings.store.ts`**

Add `import { partializeSettings, mergeSettings } from '@/lib/settings-persist'` and change the persist options to:

```ts
    {
      name: 'ytm-settings',
      storage: createJSONStorage(() => dedupLocalStorage),
      skipHydration: true,
      partialize: (s) => partializeSettings(s),
      merge: (persisted, current) => mergeSettings(persisted, current),
    }
```

(`app/layout.tsx`'s inline theme script reads `s.state.theme` / `s.state.fontSize` from `ytm-settings`; those keys are still persisted — no change needed there.)

- [ ] **Step 6: Fix the countdown in `components/AudioManager.tsx`**

Add import `import { isSleepTimerDue } from '@/lib/settings-persist'` and replace effect "4. Handle sleep timer countdown" with:

```tsx
  // 4. Handle sleep timer countdown — always PAUSES (never toggles, which could start playback)
  useEffect(() => {
    if (!sleepTimerEnd) return
    const interval = setInterval(() => {
      if (isSleepTimerDue(sleepTimerEnd, Date.now())) {
        usePlayerStore.getState().pause()
        setSleepTimer(0)
        showToast('Sleep timer ended. Playback paused.')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [sleepTimerEnd, setSleepTimer])
```

If `togglePlay` is now unused in AudioManager, don't worry yet — Task 7 rewrites the rest of the file; lint must still be clean at the end of this task, so remove the unused selector if lint flags it.

- [ ] **Step 7: Verify**

Run the three verification commands. Manual (`pnpm dev`):
1. Settings → Sleep timer → 15 min. In the DevTools console run
   `JSON.parse(localStorage['ytm-settings']).state.sleepTimerEnd` → `undefined` (no longer persisted).
2. Reload the page → the sleep timer shows as off; nothing starts playing.
3. The "timer ends → pause" path is covered by the `isSleepTimerDue` unit test plus the code above calling `pause()` (never `togglePlay()`). Don't wait 15 minutes to test it by hand.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/settings-persist.ts apps/web/lib/settings-persist.test.mjs apps/web/stores/settings.store.ts apps/web/components/AudioManager.tsx apps/web/package.json
git commit -m "fix(sleep-timer): pause instead of toggle and don't restore the timer after reload"
```

---

### Task 7: AudioManager — stable listeners, unplayable-track skip, lean preloading (#7, #16, #21, #24)

This task has no unit tests (it is DOM/audio wiring); it is verified by type-check, lint, build and a manual checklist. Make the edits exactly as written.

**Files:**
- Create: `apps/web/lib/api-urls.ts`
- Create: `apps/web/lib/api-urls.test.mjs`
- Modify: `apps/web/components/AudioManager.tsx`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Consumes: `getActiveQueue` (Task 3), `pause()` (Task 5).
- Produces: `recommendationsUrl(song: Pick<Song, 'id' | 'artist' | 'language'>): string` (used again in Task 11).

- [ ] **Step 1: Write the failing test for the URL helper**

Create `apps/web/lib/api-urls.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendationsUrl } from './api-urls.ts'

test('recommendationsUrl encodes all params', () => {
  assert.equal(
    recommendationsUrl({ id: 'a b', artist: 'S. P. Balu & Co', language: 'telugu' }),
    '/api/search?recommendSongId=a%20b&artist=S.%20P.%20Balu%20%26%20Co&lang=telugu'
  )
})

test('recommendationsUrl defaults language to telugu', () => {
  assert.match(recommendationsUrl({ id: '1', artist: 'x', language: '' }), /&lang=telugu$/)
})
```

Append ` lib/api-urls.test.mjs` to the `"test"` script. Run → FAIL.

- [ ] **Step 2: Create `apps/web/lib/api-urls.ts`**

```ts
/** Client-side URL builders for our own API routes. Pure module: type-only imports. */
import type { Song } from '../types/music'

export function recommendationsUrl(song: Pick<Song, 'id' | 'artist' | 'language'>): string {
  return `/api/search?recommendSongId=${encodeURIComponent(song.id)}&artist=${encodeURIComponent(song.artist)}&lang=${encodeURIComponent(song.language || 'telugu')}`
}
```

Run tests → PASS.

- [ ] **Step 3: Trim the component's subscriptions and refs**

In `components/AudioManager.tsx`:

1. Imports — add:
   ```ts
   import { getActiveQueue } from '@/lib/queue-logic'
   import { recommendationsUrl } from '@/lib/api-urls'
   ```
2. Delete these refs: `preloadBlobUrlRef`, `prewarmedTrackIdRef`.
3. Delete these store selectors (their values are now read with `getState()` inside handlers): `progress`, `duration`, `setProgress`, `setDuration`, `setIsPlaying`, `setIsLoading`, `togglePlay`, `toggleMute`, `setVolume`, `seek`, `next`, `prev`, `repeatMode`, `toggleShuffle`, `toggleRepeat`, `autoplay`, `crossfade`.
   Keep: `currentSong`, `isPlaying`, `volume`, `muted`, `setAudioRef`, `theme`, `fontSize`, `audioQuality`, `gapless`, `sleepTimerEnd`, `setSleepTimer`, `eqEnabled`, `eqPreset`, `eqCustom`, and the queue selectors `queue`, `qIndex`, `shuffleOn`, `shuffledQueue` (used by gapless preloading).
4. In effect "2. Register audio element…", the cleanup must only revoke `currentBlobUrlRef` (delete the `preloadBlobUrlRef` line).
5. In effect "3c", delete the line `prewarmedTrackIdRef.current = null`.

- [ ] **Step 4: Add the shared "skip unplayable track" callback**

Directly after the `sourceNodeRef` ref declaration (before effect "1."), add:

```tsx
  // Shared by the <audio> error handler and tracks that have no playable URL at all
  const skipUnplayableTrack = useCallback((title: string) => {
    const player = usePlayerStore.getState()
    player.setIsLoading(false)
    consecutiveErrorsRef.current += 1
    if (consecutiveErrorsRef.current >= 3) {
      player.setIsPlaying(false)
      showToast('Playback stopped: Multiple tracks failed to load. Please check your connection.')
      return
    }
    showToast(`Failed to play "${title}". Skipping to next track.`)
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current)
    skipTimeoutRef.current = setTimeout(() => usePlayerStore.getState().next(), 1000)
  }, [])
```

- [ ] **Step 5: Handle an empty audio URL in effect "3c" (#7)**

Inside `updateAudioSource`, immediately after the `if (offlineRecord?.blob) { … } else { … }` block that computes `targetUrl`, insert:

```tsx
      // Decryption failed / no media URL: never leave the spinner running forever
      if (!targetUrl) {
        currentSongRef.current = currentSong
        skipUnplayableTrack(currentSong.title)
        return
      }
```

Change the effect's dependency array from `[currentSong, audioQuality]` to `[currentSong, audioQuality, skipUnplayableTrack]`.

- [ ] **Step 6: Replace effect "5. Gapless Preloading" (#21)**

```tsx
  // 5. Gapless preloading: warm up the next CDN track's metadata only.
  // (preload="metadata" — the old preload="auto" + load() downloaded every next track twice)
  useEffect(() => {
    const preload = preloadRef.current
    if (!gapless || !isPlaying || !preload) return
    const nextSong = getActiveQueue({ queue, shuffledQueue, qIndex, shuffleOn })[qIndex + 1]
    if (!nextSong) return

    let isSubscribed = true
    getOfflineSong(nextSong.id).then((offlineRecord) => {
      // Downloaded tracks play from IndexedDB — nothing to warm up over the network
      if (!isSubscribed || offlineRecord?.blob) return
      const nextUrl = getAudioQualityUrl(nextSong.downloadUrl, audioQuality)
      if (nextUrl && preload.src !== nextUrl) preload.src = nextUrl
    })

    return () => {
      isSubscribed = false
    }
  }, [gapless, isPlaying, queue, qIndex, shuffleOn, shuffledQueue, audioQuality])
```

And change the preload element in the returned JSX to `preload="metadata"`:

```tsx
      <audio ref={preloadRef} id="ytm-preload-audio" preload="metadata" crossOrigin="anonymous" className="hidden" />
```

- [ ] **Step 7: Use the URL helper in `prefetchRecommendations`**

Replace the `fetch(\`/api/search?recommendSongId=…\`)` call inside `prefetchRecommendations` with `fetch(recommendationsUrl(seedSong))`.

- [ ] **Step 8: Replace effect "8. Audio element event listeners" (#24)**

Replace the entire effect (from the `// 8. Audio element event listeners` comment through its dependency array) with:

```tsx
  // 8. Audio element event listeners — attached ONCE; every handler reads the latest
  // state via getState(), so volume/queue changes no longer detach and re-attach them.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const clearBufferingTimer = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current)
        bufferingTimerRef.current = null
      }
    }

    const onTimeUpdate = () => {
      const player = usePlayerStore.getState()
      player.setProgress(el.currentTime)

      const { autoplay, crossfade } = useSettingsStore.getState()
      const queueState = useQueueStore.getState()
      const song = player.currentSong

      // Autoplay: prefetch recommendations when approaching the end of the queue
      if (
        autoplay &&
        song &&
        queueState.qIndex >= getActiveQueue(queueState).length - 1 &&
        el.duration > 15 &&
        el.currentTime >= el.duration - 12
      ) {
        prefetchRecommendations(song)
      }

      // Crossfade near the end of the song
      if (
        crossfade > 0 &&
        el.duration > crossfade + 2 &&
        el.currentTime >= el.duration - crossfade &&
        !isFadingRef.current
      ) {
        isFadingRef.current = true
        fadeVolume(0, crossfade, () => {
          usePlayerStore.getState().next()
          if (audioRef.current) audioRef.current.volume = 0
          isFadingRef.current = false
          fadeVolume(usePlayerStore.getState().volume, Math.min(2, crossfade / 2))
        })
      }
    }

    const onDuration = () => usePlayerStore.getState().setDuration(el.duration)

    const onWaiting = () => {
      const player = usePlayerStore.getState()
      player.setIsLoading(true)
      const song = player.currentSong
      // CDN bitrate adaptive recovery: if buffering stalls > 4 s on a slow connection
      if (
        !bufferingTimerRef.current &&
        !hasDowngradedForTrackRef.current &&
        song &&
        !currentBlobUrlRef.current &&
        useSettingsStore.getState().audioQuality === 'high'
      ) {
        bufferingTimerRef.current = setTimeout(() => {
          bufferingTimerRef.current = null
          const audio = audioRef.current
          if (!audio || audio.paused || usePlayerStore.getState().currentSong?.id !== song.id) return
          hasDowngradedForTrackRef.current = true
          const curTime = audio.currentTime
          const adaptedUrl = getAudioQualityUrl(song.downloadUrl, 'normal')
          if (adaptedUrl && audio.src !== adaptedUrl) {
            audio.src = adaptedUrl
            audio.currentTime = curTime
            audio.play().catch(() => {})
            showToast('Slow connection detected — adapted audio quality for smooth playback')
          }
        }, 4000)
      }
    }

    const onPlaying = () => {
      clearBufferingTimer()
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = null
      }
      consecutiveErrorsRef.current = 0
      const player = usePlayerStore.getState()
      player.setIsLoading(false)
      player.setIsPlaying(true)
    }

    const onPause = () => usePlayerStore.getState().setIsPlaying(false)

    const onCanPlay = () => {
      clearBufferingTimer()
      usePlayerStore.getState().setIsLoading(false)
    }

    const onError = () => {
      const song = usePlayerStore.getState().currentSong
      if (song) skipUnplayableTrack(song.title)
      else usePlayerStore.getState().setIsLoading(false)
    }

    const onEnded = async () => {
      const queueState = useQueueStore.getState()
      if (queueState.repeatMode === 'one') {
        el.currentTime = 0
        el.play().catch(() => {})
        return
      }

      const isAtEnd = queueState.qIndex >= getActiveQueue(queueState).length - 1
      const song = usePlayerStore.getState().currentSong
      if (isAtEnd && queueState.repeatMode === 'none' && useSettingsStore.getState().autoplay && song) {
        usePlayerStore.getState().setIsLoading(true)
        try {
          const res = await fetch(recommendationsUrl(song))
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data?.songs) && data.songs.length > 0) {
              useQueueStore.getState().appendSongs(data.songs)
            }
          }
        } catch {
          // Fall through to a normal next()
        } finally {
          usePlayerStore.getState().setIsLoading(false)
        }
      }

      usePlayerStore.getState().next()
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('pause', onPause)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)
    el.addEventListener('ended', onEnded)

    return () => {
      clearBufferingTimer()
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = null
      }
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
      el.removeEventListener('ended', onEnded)
    }
  }, [fadeVolume, prefetchRecommendations, skipUnplayableTrack])
```

- [ ] **Step 9: Replace effect "9. MediaSession API" (#16)**

Replace it with three effects:

```tsx
  // 9a. MediaSession metadata — only when the track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'YouTube Music',
      artwork: currentSong.image
        ? [
            { src: currentSong.image, sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    })
  }, [currentSong])

  // 9b. MediaSession playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // 9c. MediaSession action handlers — registered once, read the latest state on demand
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const player = () => usePlayerStore.getState()
    const currentTime = () => audioRef.current?.currentTime ?? player().progress
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { if (!player().isPlaying) player().togglePlay() }],
      ['pause', () => player().pause()],
      ['previoustrack', () => player().prev()],
      ['nexttrack', () => player().next()],
      ['seekto', (d) => { if (d.seekTime !== undefined) player().seek(d.seekTime) }],
      ['seekforward', (d) => player().seek(Math.min(player().duration, currentTime() + (d.seekOffset || 10)))],
      ['seekbackward', (d) => player().seek(Math.max(0, currentTime() - (d.seekOffset || 10)))],
    ]
    for (const [action, handler] of handlers) {
      try { ms.setActionHandler(action, handler) } catch { /* action unsupported by this browser */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { ms.setActionHandler(action, null) } catch { /* ignore */ }
      }
    }
  }, [])
```

(Bonus fix: the old `play`/`pause` handlers both called `togglePlay`, so a lock-screen "pause" could start playback.)

- [ ] **Step 10: Replace effect "10. Global Keyboard Shortcuts"**

```tsx
  // 10. Global keyboard shortcuts — registered once; reads the latest state per key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.getAttribute?.('role') === 'button' ||
          target.isContentEditable)
      ) {
        return
      }

      const player = usePlayerStore.getState()
      const queueStore = useQueueStore.getState()
      const cur = audioRef.current?.currentTime ?? player.progress
      const key = e.key.toLowerCase()

      if (e.code === 'Space' || key === 'k') {
        e.preventDefault()
        player.togglePlay()
      } else if (key === 'j') {
        e.preventDefault()
        player.seek(Math.max(0, cur - 10))
      } else if (key === 'l') {
        e.preventDefault()
        player.seek(Math.min(player.duration, cur + 10))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        player.seek(Math.max(0, cur - 5))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        player.seek(Math.min(player.duration, cur + 5))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        player.setVolume(Math.min(1, player.volume + 0.05))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        player.setVolume(Math.max(0, player.volume - 0.05))
      } else if (key === 'm') {
        e.preventDefault()
        player.toggleMute()
      } else if (e.shiftKey && key === 'n') {
        e.preventDefault()
        player.next()
      } else if (e.shiftKey && key === 'p') {
        e.preventDefault()
        player.prev()
      } else if (key === 's') {
        e.preventDefault()
        queueStore.toggleShuffle()
      } else if (key === 'r') {
        e.preventDefault()
        queueStore.toggleRepeat()
      } else if (e.key === 'Escape' && player.isExpanded) {
        e.preventDefault()
        player.setExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
```

- [ ] **Step 11: Verify**

```bash
cd /c/teja/coding/free-music
pnpm --filter web test 2>&1 | tail -4
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit; echo "tsc exit $?"
```

Lint will list any selector you forgot to delete (`'x' is assigned a value but never used`) — delete them. `react-hooks/exhaustive-deps` must report nothing.

Manual checklist (`pnpm dev`, Chrome, DevTools open):
1. Play a song: plays, spinner disappears, progress bar moves.
2. Keyboard: Space pauses/plays; `J`/`L` seek ±10 s; ↑/↓ volume; `M` mute; Shift+N next.
3. Drag the volume slider continuously — playback doesn't stutter.
4. Let a song end with autoplay ON at the end of the queue → a recommended song starts.
5. OS media keys / lock-screen controls (or Chrome's global media controls): play, pause, next work; "pause" never starts playback.
6. DevTools → Network, filter `saavncdn` + media: while a song plays with gapless ON, the next track is requested with a small transfer (metadata), not a full multi-MB download.
7. Unplayable track: DevTools → Network → right-click any `aac.saavncdn.com` media request → "Block request domain", then press Next. Expected: toast "Failed to play … Skipping to next track.", it skips, and after 3 consecutive failures playback stops with the "Multiple tracks failed" toast (no endless spinner). Remove the block afterwards. (The empty-URL branch added in Step 5 goes through the same `skipUnplayableTrack` path.)

- [ ] **Step 12: Commit**

```bash
git add apps/web/lib/api-urls.ts apps/web/lib/api-urls.test.mjs apps/web/components/AudioManager.tsx apps/web/package.json
git commit -m "perf(audio): attach listeners once, skip unplayable tracks, stop double-downloading next track"
```

---

### ✅ Checkpoint 1

- [ ] Run `pnpm --filter web build` — must succeed.
- [ ] Stop and give the user a short summary of Phase 1 (Tasks 1–7) with the manual checks they can do themselves. **Wait for the user to confirm before starting Phase 2** (the user prefers testing between steps).

---

## Phase 2 — Functional bugs (#8–#15, #1)

### Task 8: Like buttons update immediately (#8)

**Files:**
- Modify: `apps/web/components/home/SongCard.tsx:19,24`
- Modify: `apps/web/components/home/QuickPicksSection.tsx:19,57`
- Modify: `apps/web/components/player/MiniPlayer.tsx:32,38`
- Modify: `apps/web/components/ui/ContextMenu.tsx:21,175-176`
- Modify: `apps/web/stores/library.store.ts` (remove `isLiked`)

- [ ] **Step 1: Replace the stale selectors**

`SongCard.tsx` — replace
```tsx
  const isLiked = useLibraryStore((s) => s.isLiked)
```
with
```tsx
  const liked = useLibraryStore((s) => Boolean(s.likedSongs[song.id]))
```
and delete the later line `const liked = isLiked(song.id)`.

`QuickPicksSection.tsx` — replace `const isLiked = useLibraryStore((s) => s.isLiked)` with
```tsx
  const likedSongs = useLibraryStore((s) => s.likedSongs)
```
and `liked={isLiked(song.id)}` with `liked={Boolean(likedSongs[song.id])}`.

`MiniPlayer.tsx` — replace `const isLiked = useLibraryStore((s) => s.isLiked)` with
```tsx
  const liked = useLibraryStore((s) => (currentSong ? Boolean(s.likedSongs[currentSong.id]) : false))
```
and delete `const liked = currentSong ? isLiked(currentSong.id) : false`. (This hook must stay above the `if (!currentSong) return null` early return — it is.)

`ContextMenu.tsx` — replace `const isLiked = useLibraryStore((s) => s.isLiked)` with
```tsx
  const liked = useLibraryStore((s) => Boolean(s.likedSongs[song.id]))
```
and on lines ~175–176 use `filled={liked}` and `label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}`.

- [ ] **Step 2: Remove the footgun from the store**

In `stores/library.store.ts` delete `isLiked: (id: string) => boolean` from the interface and the `isLiked: (id) => …` implementation. Then:

Run: `grep -rn "isLiked" apps/web --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: no output.

- [ ] **Step 3: Verify** — three verification commands. Manual: right-click a Quick Picks row → "Save to Liked Songs" → the ♡ in that row turns ♥ immediately without moving the mouse; the heart badge on the matching home card appears immediately.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components apps/web/stores/library.store.ts
git commit -m "fix(likes): subscribe to likedSongs so like state re-renders immediately"
```

---

### Task 9: Isolate progress re-renders in MiniPlayer and LyricsPanel (#16)

**Files:**
- Create: `apps/web/lib/lyrics-sync.ts`
- Create: `apps/web/lib/lyrics-sync.test.mjs`
- Modify: `apps/web/components/player/LyricsPanel.tsx`
- Modify: `apps/web/components/player/MiniPlayer.tsx`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces: `findActiveLine(lines: LyricLine[], t: number): number` (−1 if none). Task 12 adds more exports to this same file.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/lyrics-sync.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { findActiveLine } from './lyrics-sync.ts'

const lines = [0.5, 3, 3, 7.25, 12].map((time, i) => ({ time, text: `l${i}` }))

test('findActiveLine returns -1 before the first line and for no lines', () => {
  assert.equal(findActiveLine(lines, 0), -1)
  assert.equal(findActiveLine([], 5), -1)
})

test('findActiveLine returns the last line whose time <= t', () => {
  assert.equal(findActiveLine(lines, 0.5), 0)
  assert.equal(findActiveLine(lines, 2.99), 0)
  assert.equal(findActiveLine(lines, 3), 2) // equal timestamps → the later line
  assert.equal(findActiveLine(lines, 8), 3)
  assert.equal(findActiveLine(lines, 999), 4)
})

test('findActiveLine agrees with a linear scan', () => {
  const linear = (t) => { let idx = -1; for (let i = 0; i < lines.length; i++) { if (lines[i].time <= t) idx = i; else break } return idx }
  for (let t = -1; t < 14; t += 0.25) assert.equal(findActiveLine(lines, t), linear(t), `t=${t}`)
})
```

Append ` lib/lyrics-sync.test.mjs` to the `"test"` script. Run → FAIL.

- [ ] **Step 2: Create `apps/web/lib/lyrics-sync.ts`**

```ts
/** Lyrics timing helpers. Pure module: type-only imports (unit-tested with node --test). */
import type { LyricLine } from '../types/music'

/** Index of the last line with time <= t, or -1. `lines` must be sorted by time (parseLrc sorts). */
export function findActiveLine(lines: LyricLine[], t: number): number {
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= t) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
```

Run → PASS.

- [ ] **Step 3: LyricsPanel subscribes to the active line index, not to progress**

In `components/player/LyricsPanel.tsx`:

1. Add import `import { findActiveLine } from '@/lib/lyrics-sync'`.
2. Add a module-level constant under the imports: `const EMPTY_LINES: LyricLine[] = []`
3. Delete `const progress = usePlayerStore((s) => s.progress)` and `const [activeLine, setActiveLine] = useState(-1)`.
4. Delete the effect that loops over `data.lines` and calls `setActiveLine`.
5. Directly after the `useQuery(...)` call add:

```tsx
  // Re-renders only when the highlighted line changes (not on every ~250 ms progress tick)
  const syncedLines = data?.synced ? data.lines : EMPTY_LINES
  const activeLine = usePlayerStore((s) =>
    findActiveLine(syncedLines, Math.max(0, s.progress + lyricsOffset))
  )
```

Keep the `scrollIntoView` effect keyed on `[activeLine]`. Remove `useState` from the React import if unused.

- [ ] **Step 4: MiniPlayer — move progress into two small components**

In `components/player/MiniPlayer.tsx`:

1. Delete from `MiniPlayer()`: the `progress`, `duration`, `seek` selectors, `barRef`, `isDraggingRef`, `pct`, and the functions `seekFromClientX`, `handlePointerDown`, `handlePointerMove`, `handlePointerUp`.
2. Replace the whole progress-bar `<div ref={barRef} role="slider" …> … </div>` block (the "Red progress bar" section) with `<MiniProgressBar />`.
3. Replace the timestamp `<span className="mp-hide-mid" …>{formatDuration(progress)}&nbsp;/&nbsp;{formatDuration(duration)}</span>` with `<PlaybackTime />`.
4. Add these components at the bottom of the file (above `IcoBtn`):

```tsx
/** Owns the ~4 Hz progress subscription so the rest of the mini player doesn't re-render. */
function MiniProgressBar() {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)
  const barRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0

  function seekFromClientX(clientX: number) {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seek(fraction * duration)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!duration) return
    isDraggingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    seekFromClientX(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    seekFromClientX(e.clientX)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      aria-valuenow={Math.round(progress || 0)}
      aria-valuetext={`${formatDuration(progress)} of ${formatDuration(duration)}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!duration) return
        if (e.key === 'ArrowRight') seek(Math.min(duration, progress + 5))
        if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 5))
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ width: '100%', height: 6, padding: '1.5px 0', background: 'transparent', cursor: 'pointer', position: 'relative', touchAction: 'none' }}
    >
      <div style={{ width: '100%', height: 3, background: 'var(--panel-bg)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#f00', transition: isDraggingRef.current ? 'none' : 'width .1s linear' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: '#f00', boxShadow: '0 0 3px rgba(255,0,0,.6)' }} />
      </div>
    </div>
  )
}

/** Re-renders once per second (whole seconds), not on every progress tick. */
function PlaybackTime() {
  const seconds = usePlayerStore((s) => Math.floor(s.progress))
  const duration = usePlayerStore((s) => s.duration)
  return (
    <span className="mp-hide-mid" style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: .2 }}>
      {formatDuration(seconds)}&nbsp;/&nbsp;{formatDuration(duration)}
    </span>
  )
}
```

(These are the original JSX/handlers moved verbatim — compare with the old code before deleting it.)

- [ ] **Step 5: Verify** — three verification commands. Manual: React DevTools → Profiler → "Highlight updates when components render": during playback only the thin progress bar and the time label flash in the mini player; in the Lyrics tab the lyrics list re-renders only when the highlighted line changes. Seeking by click/drag on the red bar and ←/→ on the focused bar still work.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/lyrics-sync.ts apps/web/lib/lyrics-sync.test.mjs apps/web/components/player/LyricsPanel.tsx apps/web/components/player/MiniPlayer.tsx apps/web/package.json
git commit -m "perf(player): isolate progress subscriptions from mini player and lyrics"
```

---

### Task 10: Home feed — cacheable pages, no remount storm, no language side effect (#17, #12a)

**Files:**
- Modify: `apps/web/lib/session.ts`
- Create: `apps/web/lib/session.test.mjs`
- Create: `apps/web/lib/home-feed.ts`
- Create: `apps/web/lib/home-feed.test.mjs`
- Modify: `apps/web/components/home/SectionRow.tsx`, `apps/web/components/home/QuickPicksSection.tsx`, `apps/web/components/home/ForYouSection.tsx`, `apps/web/app/page.tsx`
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces: `sessionPage(key: string, maxPage?: number, random?: () => number): number`; `fetchSectionSongs(sectionId: string, language: string, page: number, fetchImpl?: typeof fetch): Promise<{ songs: Song[] }>`
- Each home section component gains an optional prop `languageOverride?: string`.

Design notes (do not skip — this preserves an earlier user requirement): the user previously asked that **reloading the page shows different songs**. `sessionPage` still picks a random page per key on every page load (module state resets on reload), but reuses it while navigating inside the app, so React Query's cache can serve sections again instead of refetching ~12 requests per home visit.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/session.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { sessionPage } from './session.ts'

test('sessionPage is stable for the same key during a page load', () => {
  const a = sessionPage('section:trending:telugu')
  for (let i = 0; i < 20; i++) assert.equal(sessionPage('section:trending:telugu'), a)
})

test('sessionPage maps the random value into 1..maxPage', () => {
  assert.equal(sessionPage('k-low', 5, () => 0), 1)
  assert.equal(sessionPage('k-high', 5, () => 0.9999), 5)
})

test('different keys are independent', () => {
  assert.equal(sessionPage('k1', 8, () => 0), 1)
  assert.equal(sessionPage('k2', 8, () => 0.5), 5)
})
```

Create `apps/web/lib/home-feed.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchSectionSongs } from './home-feed.ts'

const song = (id) => ({ id, title: id, artist: 'A', album: '', duration: 1, image: '', downloadUrl: '', language: 'assamese' })

function fakeFetch(pages) {
  const calls = []
  const impl = async (url) => {
    calls.push(url)
    const page = Number(new URL(url, 'http://x').searchParams.get('page'))
    return { ok: true, status: 200, json: async () => ({ songs: pages[page] ?? [] }) }
  }
  return { impl, calls }
}

test('returns the requested page when it has songs', async () => {
  const f = fakeFetch({ 3: [song('a')] })
  const res = await fetchSectionSongs('trending', 'assamese', 3, f.impl)
  assert.deepEqual(res.songs.map((s) => s.id), ['a'])
  assert.equal(f.calls.length, 1)
})

test('falls back to page 1 when a deep page is empty (small catalogs)', async () => {
  const f = fakeFetch({ 1: [song('p1')] })
  const res = await fetchSectionSongs('trending', 'assamese', 7, f.impl)
  assert.deepEqual(res.songs.map((s) => s.id), ['p1'])
  assert.match(f.calls[1], /page=1/)
})

test('does not loop when page 1 itself is empty', async () => {
  const f = fakeFetch({})
  const res = await fetchSectionSongs('trending', 'assamese', 1, f.impl)
  assert.deepEqual(res.songs, [])
  assert.equal(f.calls.length, 1)
})

test('throws on HTTP errors so React Query can retry', async () => {
  const impl = async () => ({ ok: false, status: 429, json: async () => ({}) })
  await assert.rejects(() => fetchSectionSongs('trending', 'telugu', 2, impl), /429/)
})
```

Append ` lib/session.test.mjs lib/home-feed.test.mjs` to the `"test"` script. Run → FAIL.

- [ ] **Step 2: Implement**

Replace `apps/web/lib/session.ts` with:

```ts
/**
 * Random page per key, chosen once per page load. Reloading the tab picks new
 * pages (fresh songs); navigating inside the app reuses them so React Query can
 * serve cached sections instead of refetching everything.
 *
 * Pure module: no imports (unit-tested with node --test).
 */
const pages = new Map<string, number>()

export function sessionPage(key: string, maxPage = 8, random: () => number = Math.random): number {
  let page = pages.get(key)
  if (page === undefined) {
    page = Math.floor(random() * maxPage) + 1
    pages.set(key, page)
  }
  return page
}
```

Run `grep -rn "randomPage" apps/web --include=*.ts --include=*.tsx | grep -v node_modules` — the only callers are `SectionRow`, `QuickPicksSection`, `ForYouSection` (updated below).

Create `apps/web/lib/home-feed.ts`:

```ts
/** Client fetch for home sections. Pure module: type-only imports (unit-tested with node --test). */
import type { Song } from '../types/music'

export async function fetchSectionSongs(
  sectionId: string,
  language: string,
  page: number,
  fetchImpl: typeof fetch = fetch
): Promise<{ songs: Song[] }> {
  const load = async (p: number) => {
    const res = await fetchImpl(`/api/search?section=${encodeURIComponent(sectionId)}&lang=${encodeURIComponent(language)}&page=${p}`)
    if (!res.ok) throw new Error(`Section ${sectionId} failed: HTTP ${res.status}`)
    const json = (await res.json()) as { songs?: Song[] }
    return { songs: Array.isArray(json.songs) ? json.songs : [] }
  }

  const first = await load(page)
  // Smaller catalogs (e.g. Assamese, Odia) often have nothing on deep pages
  if (first.songs.length === 0 && page !== 1) return load(1)
  return first
}
```

Run tests → PASS.

- [ ] **Step 3: Update the section components**

`components/home/SectionRow.tsx`:

```tsx
interface SectionRowProps {
  id: string
  title: string
  /** Temporary language chosen with a home chip; does not change the saved setting. */
  languageOverride?: string
}

export function SectionRow({ id, title, languageOverride }: SectionRowProps) {
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  const page = sessionPage(`section:${id}:${language}`)
  const seenIds = useContext(SeenSongsContext)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', id, language, page],
    queryFn: () => fetchSectionSongs(id, language, page),
  })
```

(Removes `staleTime: 0` / `gcTime` so the app-wide defaults — 5 min stale, 10 min gc from `providers.tsx` — apply. Replace `import { randomPage } from '@/lib/session'` with `import { sessionPage } from '@/lib/session'` and add `import { fetchSectionSongs } from '@/lib/home-feed'`. Remove `useRef` from the React import if unused.)

`components/home/QuickPicksSection.tsx` — same pattern:

```tsx
export function QuickPicksSection({ languageOverride }: { languageOverride?: string }) {
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  …
  const page = sessionPage(`section:quick-picks:${language}`)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', 'quick-picks', language, page],
    queryFn: () => fetchSectionSongs('quick-picks', language, page),
  })
```

`components/home/ForYouSection.tsx`:

```tsx
export function ForYouSection({ languageOverride }: { languageOverride?: string }) {
  const history = useLibraryStore((s) => s.history)
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  …
  const page = sessionPage(`for-you:${topArtist ?? ''}:${language}`, 3)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['for-you', topArtist, language, page],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(`${topArtist} ${language}`)}&lang=${language}&page=${page}`)
      if (!res.ok) throw new Error(`For you failed: HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!topArtist,
  })
```

(Page range 1–3 for artist searches: deep pages of an artist search are mostly irrelevant.)

- [ ] **Step 4: Update `app/page.tsx`**

```tsx
export default function HomePage() {
  const seenIds = useRef(new Set<string>())
  const [activeMood, setActiveMood] = useState('All')
  // "Telugu"/"Hindi" chips filter this page only — they no longer overwrite the saved language
  const [chipLanguage, setChipLanguage] = useState<string | undefined>(undefined)

  const handleSelectChip = (chip: string) => {
    setActiveMood(chip)
    setChipLanguage(chip === 'Telugu' || chip === 'Hindi' ? chip.toLowerCase() : undefined)
  }
```

Remove the `setLanguage` selector and, if unused, the `useSettingsStore` import. In the JSX pass the override and drop the mood from the key:

```tsx
        {isAllOrGeneral && (
          <>
            <ForYouSection languageOverride={chipLanguage} />
            <ListenAgainSection />
            <QuickPicksSection languageOverride={chipLanguage} />
          </>
        )}
        {visibleSections.map((s) => (
          <SectionRow key={s.id} id={s.id} title={s.title} languageOverride={chipLanguage} />
        ))}
```

- [ ] **Step 5: Verify**

Three verification commands. Manual (`pnpm dev`, DevTools → Network filter `/api/search`):
1. Load `/` → ~11–12 `section=` requests.
2. Go to `/explore`, then back to `/` → **zero** new `section=` requests; the same songs are shown.
3. Click the "Chill" chip, then "All" → no refetch of sections already loaded.
4. Click "Hindi" chip → sections load in Hindi; open Settings → the saved language is unchanged.
5. Hard reload (Ctrl+Shift+R) → songs differ from before (new random pages).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/session.ts apps/web/lib/session.test.mjs apps/web/lib/home-feed.ts apps/web/lib/home-feed.test.mjs apps/web/components/home apps/web/app/page.tsx apps/web/package.json
git commit -m "perf(home): cache sections per page load, fall back from empty pages, chips no longer change saved language"
```

---

### Task 11: Varied radio/autoplay and a side-effect-free "Start radio" (#12b, #14)

**Files:**
- Create: `apps/web/lib/recommendations.ts`
- Create: `apps/web/lib/recommendations.test.mjs`
- Modify: `apps/web/lib/saavn.ts` (`getSongRecommendations`)
- Modify: `apps/web/components/player/ExpandedPlayer.tsx` (Start radio handler in `UpNextPanel`)
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Consumes: `recommendationsUrl` (Task 7), `useQueueStore.setQueue`.
- Produces: `mergeRecommendations(opts: { seedId: string; primaryArtist: string; artistSongs: Song[]; discoverySongs: Song[]; limit?: number; shuffle: <T>(items: T[]) => T[] }): Song[]`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/recommendations.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeRecommendations } from './recommendations.ts'

const song = (id, artist = 'Other') => ({ id, title: id, artist, album: '', duration: 1, image: '', downloadUrl: '', language: 'telugu' })
const identity = (items) => [...items]

test('keeps only songs actually by the seed artist from the artist search', () => {
  const out = mergeRecommendations({
    seedId: 'seed',
    primaryArtist: 'Sid Sriram',
    artistSongs: [song('a1', 'Sid Sriram'), song('x', 'Someone Else'), song('a2', 'Anirudh, Sid Sriram')],
    discoverySongs: [],
    shuffle: identity,
  })
  assert.deepEqual(out.map((s) => s.id), ['a1', 'a2'])
})

test('never includes the seed song and never duplicates', () => {
  const out = mergeRecommendations({
    seedId: 'seed',
    primaryArtist: 'A',
    artistSongs: [song('seed', 'A'), song('a1', 'A')],
    discoverySongs: [song('a1'), song('d1'), song('d1')],
    shuffle: identity,
  })
  assert.deepEqual(out.map((s) => s.id), ['a1', 'd1'])
})

test('interleaves one artist song with two discovery songs', () => {
  const out = mergeRecommendations({
    seedId: 's',
    primaryArtist: 'A',
    artistSongs: [song('a1', 'A'), song('a2', 'A')],
    discoverySongs: [song('d1'), song('d2'), song('d3'), song('d4')],
    shuffle: identity,
  })
  assert.deepEqual(out.map((s) => s.id), ['a1', 'd1', 'd2', 'a2', 'd3', 'd4'])
})

test('respects the limit and caps artist songs at 10', () => {
  const artist = Array.from({ length: 20 }, (_, i) => song(`a${i}`, 'A'))
  const discovery = Array.from({ length: 40 }, (_, i) => song(`d${i}`))
  const out = mergeRecommendations({ seedId: 's', primaryArtist: 'A', artistSongs: artist, discoverySongs: discovery, limit: 25, shuffle: identity })
  assert.equal(out.length, 25)
  assert.ok(out.filter((s) => s.id.startsWith('a')).length <= 10)
})

test('works with no primary artist (discovery only)', () => {
  const out = mergeRecommendations({ seedId: 's', primaryArtist: '', artistSongs: [song('a1', 'A')], discoverySongs: [song('d1')], shuffle: identity })
  assert.deepEqual(out.map((s) => s.id), ['d1'])
})
```

Append ` lib/recommendations.test.mjs` to the `"test"` script. Run → FAIL.

- [ ] **Step 2: Create `apps/web/lib/recommendations.ts`**

```ts
/** Radio / autoplay list building. Pure module: type-only imports (unit-tested with node --test). */
import type { Song } from '../types/music'

const MAX_ARTIST_SONGS = 10

export function mergeRecommendations(opts: {
  seedId: string
  primaryArtist: string
  artistSongs: Song[]
  discoverySongs: Song[]
  limit?: number
  shuffle: <T>(items: T[]) => T[]
}): Song[] {
  const { seedId, primaryArtist, artistSongs, discoverySongs, limit = 25, shuffle } = opts
  const seen = new Set<string>([seedId])
  const take = (list: Song[]) =>
    list.filter((s) => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

  // A name search also returns songs that merely mention the artist — keep real matches only
  const artistLc = primaryArtist.trim().toLowerCase()
  const byArtist = artistLc ? artistSongs.filter((s) => s.artist.toLowerCase().includes(artistLc)) : []
  const artistPart = take(shuffle(byArtist)).slice(0, MAX_ARTIST_SONGS)
  const discoveryPart = take(shuffle(discoverySongs))

  const result: Song[] = []
  let a = 0
  let d = 0
  while (result.length < limit && (a < artistPart.length || d < discoveryPart.length)) {
    if (a < artistPart.length) result.push(artistPart[a++])
    for (let k = 0; k < 2 && d < discoveryPart.length && result.length < limit; k++) result.push(discoveryPart[d++])
  }
  return result.slice(0, limit)
}
```

Note: with `identity` shuffle and the "interleave" test, `take` on artist runs before discovery, so a song present in both lists appears once (as an artist song). Run tests → PASS.

- [ ] **Step 3: Use it in `lib/saavn.ts`**

Add imports at the top of `saavn.ts`:
```ts
import { mergeRecommendations } from './recommendations'
import { fisherYates } from './utils'
```

Replace `getSongRecommendations` with:

```ts
const randomPageUpTo = (max: number) => Math.floor(Math.random() * max) + 1

export async function getSongRecommendations(
  songId: string,
  artist?: string,
  language = 'telugu'
): Promise<Song[]> {
  const primaryArtist = (artist || '').split(',')[0]?.trim() || ''
  // Random pages + alternating discovery sections keep long radio sessions from running dry
  const [artistResult, discoveryResult] = await Promise.allSettled([
    primaryArtist ? jiosaavnSearch(primaryArtist, 40, randomPageUpTo(2)) : Promise.resolve([] as Song[]),
    getSectionSongs(Math.random() < 0.5 ? 'trending' : 'quick-picks', language, randomPageUpTo(3)),
  ])
  return mergeRecommendations({
    seedId: songId,
    primaryArtist,
    artistSongs: artistResult.status === 'fulfilled' ? artistResult.value : [],
    discoverySongs: discoveryResult.status === 'fulfilled' ? discoveryResult.value : [],
    shuffle: fisherYates,
  })
}
```

- [ ] **Step 4: "Start radio" without side effects**

In `components/player/ExpandedPlayer.tsx` → `UpNextPanel`, replace the Start radio `onClick` handler with:

```tsx
            onClick={async () => {
              showToast(`Starting radio for "${currentSong.title}"…`)
              try {
                const res = await fetch(recommendationsUrl(currentSong))
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                const recs: Song[] = Array.isArray(data?.songs) ? data.songs : []
                const radioQueue = [currentSong, ...recs.filter((s) => s.id !== currentSong.id)]
                // Replace what plays next; keep the current song playing where it is
                useQueueStore.getState().setQueue(radioQueue, 0, false)
                showToast(`Radio playing • ${radioQueue.length} tracks queued`)
              } catch {
                showToast('Failed to load radio recommendations')
              }
            }}
```

Add `import { recommendationsUrl } from '@/lib/api-urls'`. Remove the `useSettingsStore` import from this file if it is now unused (lint).

- [ ] **Step 5: Verify**

Three verification commands. Manual: start playing a song, Expanded player → UP NEXT → "Start radio": the song keeps playing without restarting; the list below changes; Settings → autoplay is unchanged. Call the endpoint twice and compare:
```bash
curl -s "http://localhost:3000/api/search?recommendSongId=1&artist=Sid%20Sriram&lang=telugu" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).songs.map(x=>x.title).slice(0,8)))"
```
Run it 2–3 times: lists should differ.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/recommendations.ts apps/web/lib/recommendations.test.mjs apps/web/lib/saavn.ts apps/web/components/player/ExpandedPlayer.tsx apps/web/package.json
git commit -m "fix(radio): varied recommendations and start radio without restarting or changing settings"
```

---

### Task 12: Faster lyrics lookup (#19 lyrics part)

**Files:**
- Modify: `apps/web/lib/lyrics-sync.ts` (add exports)
- Modify: `apps/web/lib/lyrics-sync.test.mjs` (add tests)
- Modify: `apps/web/lib/lrclib.ts`

**Interfaces:**
- Produces: `buildLyricsAttempts(title: string, artist: string, duration?: number): string[]` (unique query strings, in priority order); `interface LrcLibResponse { syncedLyrics?: string | null; plainLyrics?: string | null }`; `interface LyricsResult { lines: LyricLine[]; plain: string; synced: boolean }`; `pickLyrics(results: Array<LrcLibResponse | null>, parse: (lrc: string) => LyricLine[]): LyricsResult | null`

- [ ] **Step 1: Add failing tests**

Append to `apps/web/lib/lyrics-sync.test.mjs`:

```js
import { buildLyricsAttempts, pickLyrics } from './lyrics-sync.ts'

const parse = (lrc) => [{ time: 0, text: lrc }]

test('buildLyricsAttempts orders most-specific first and drops duplicates', () => {
  assert.deepEqual(buildLyricsAttempts('Song', 'Artist', 201.6), [
    'track_name=Song&artist_name=Artist&duration=202',
    'track_name=Song&artist_name=Artist',
    'track_name=Song',
  ])
  assert.deepEqual(buildLyricsAttempts('Song', 'Artist'), [
    'track_name=Song&artist_name=Artist',
    'track_name=Song',
  ])
  assert.deepEqual(buildLyricsAttempts('Song', ''), ['track_name=Song'])
})

test('pickLyrics takes the first attempt (by priority) that has any lyrics', () => {
  const out = pickLyrics([null, { plainLyrics: 'plain2' }, { syncedLyrics: 'synced3' }], parse)
  assert.deepEqual(out, { lines: [], plain: 'plain2', synced: false })
})

test('pickLyrics prefers synced within the same attempt', () => {
  const out = pickLyrics([{ syncedLyrics: 'S', plainLyrics: 'P' }], parse)
  assert.deepEqual(out, { lines: [{ time: 0, text: 'S' }], plain: 'P', synced: true })
})

test('pickLyrics returns null when nothing matched', () => {
  assert.equal(pickLyrics([null, {}, { syncedLyrics: null, plainLyrics: '' }], parse), null)
})
```

Run → FAIL (exports missing).

- [ ] **Step 2: Implement in `lib/lyrics-sync.ts`** (append below `findActiveLine`):

```ts
export interface LrcLibResponse {
  syncedLyrics?: string | null
  plainLyrics?: string | null
}

export interface LyricsResult {
  lines: LyricLine[]
  plain: string
  synced: boolean
}

/** lrclib /get query strings, most specific first, without duplicates. */
export function buildLyricsAttempts(title: string, artist: string, duration?: number): string[] {
  const candidates: Array<Record<string, string>> = [
    { track_name: title, artist_name: artist, ...(duration ? { duration: String(Math.round(duration)) } : {}) },
    { track_name: title, artist_name: artist },
    { track_name: title },
  ]
  const out: string[] = []
  for (const c of candidates) {
    const params = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== ''))
    const qs = new URLSearchParams(params).toString()
    if (!out.includes(qs)) out.push(qs)
  }
  return out
}

/** First attempt (in priority order) with any lyrics wins; synced preferred within an attempt. */
export function pickLyrics(
  results: Array<LrcLibResponse | null>,
  parse: (lrc: string) => LyricLine[]
): LyricsResult | null {
  for (const data of results) {
    if (!data) continue
    if (data.syncedLyrics) return { lines: parse(data.syncedLyrics), plain: data.plainLyrics ?? '', synced: true }
    if (data.plainLyrics) return { lines: [], plain: data.plainLyrics, synced: false }
  }
  return null
}
```

Run tests → PASS.

- [ ] **Step 3: Rewrite `lib/lrclib.ts`**

```ts
import { parseLrc } from './utils'
import { buildLyricsAttempts, pickLyrics, type LrcLibResponse, type LyricsResult } from './lyrics-sync'

const BASE = 'https://lrclib.net/api'

async function fetchLyrics(query: string): Promise<LrcLibResponse | null> {
  try {
    const res = await fetch(`${BASE}/get?${query}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    return (await res.json()) as LrcLibResponse
  } catch {
    return null
  }
}

/** All attempts run in parallel (worst case ~6 s instead of ~18 s); priority order decides the winner. */
export async function getLyrics(title: string, artist: string, duration?: number): Promise<LyricsResult | null> {
  const results = await Promise.all(buildLyricsAttempts(title, artist, duration).map(fetchLyrics))
  return pickLyrics(results, parseLrc)
}
```

- [ ] **Step 4: Verify** — three verification commands, then with `pnpm dev`:
```bash
curl -s "http://localhost:3000/api/lyrics?title=Samajavaragamana&artist=Sid%20Sriram&duration=228" | head -c 300
```
Expected: JSON with `"lyrics":{…}` (or `{"lyrics":null}` if lrclib has none — try another popular song). Open the Lyrics tab in the app; lyrics appear and highlight in sync.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/lyrics-sync.ts apps/web/lib/lyrics-sync.test.mjs apps/web/lib/lrclib.ts
git commit -m "perf(lyrics): query lrclib attempts in parallel and fix unawaited json parse"
```

---

### Task 13: saavn.ts — one fetch helper, parallel search, artist failure, album details (#13, #19, #28, #31)

No unit tests are possible for `saavn.ts` itself (it imports `crypto-js` and extension-less relative modules). Its pure helpers are already tested (`search-engine`, `recommendations`). Verify with type-check, build and curl.

**Files:**
- Modify: `apps/web/lib/saavn.ts`
- Modify: `apps/web/app/api/search/route.ts`
- Modify: `apps/web/app/artist/[id]/page.tsx`
- Modify: `apps/web/app/album/[id]/page.tsx`

**Interfaces:**
- Produces: `getAlbumDetails(albumId: string): Promise<{ album: Album | null; songs: Song[] }>` (replaces `getAlbumSongs`); `getArtistDetails(artistId: string): Promise<{ artist: Artist; songs: Song[]; albums: Album[] } | null>` (null = not found / upstream failed). `getSong` is deleted (unused).
- API: `/api/search?albumId=…` now returns `{ type, page, album, songs, results }`; `/api/search?artistId=…` returns HTTP 502 `{ error, artist: null, songs: [], albums: [] }` on failure.

- [ ] **Step 1: Add the shared helper and rewrite the callers**

In `lib/saavn.ts`, below `DES_KEY`, add:

```ts
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'

/** Single place for JioSaavn API calls (was copy-pasted 6 times). Returns null on HTTP errors. */
async function saavnCall<T>(call: string, params: Record<string, string>, revalidate: number): Promise<T | null> {
  const qs = new URLSearchParams({
    __call: call,
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    ...params,
  })
  const res = await fetch(`${BASE}?${qs}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return null
  return (await res.json()) as T
}
```

Rewrite `jiosaavnSearch`:

```ts
async function jiosaavnSearch(query: string, n = 40, p = 1): Promise<Song[]> {
  const json = await saavnCall<{ results?: unknown[] }>('search.getResults', { q: query, n: String(n), p: String(p) }, 300)
  const results = json?.results ?? []
  return results
    .filter((r) => (r as Record<string, unknown>).type === 'song')
    .map((r) => normalize(r as RawSong))
}
```

Rewrite `jiosaavnSearchType`:

```ts
async function jiosaavnSearchType<T>(call: string, query: string, n = 30, p = 1): Promise<T[]> {
  const json = await saavnCall<{ results?: T[] }>(call, { q: query, n: String(n), p: String(p) }, 300)
  return json?.results ?? []
}
```

and update its three callers to pass the raw type, e.g. `jiosaavnSearchType<RawAlbum>('search.getAlbumResults', cleaned, 30, page)`, `jiosaavnSearchType<RawArtist>(…)`, `jiosaavnSearchType<RawPlaylist>(…)`.

Delete `getSong` entirely (verify first: `grep -rn "getSong\b" apps/web --include=*.ts --include=*.tsx | grep -v node_modules` shows only its definition).

Replace `getAlbumSongs` with:

```ts
export async function getAlbumDetails(albumId: string): Promise<{ album: Album | null; songs: Song[] }> {
  try {
    const json = await saavnCall<RawAlbum & { list?: RawSong[]; songs?: RawSong[] }>(
      'content.getAlbumDetails',
      { albumid: albumId },
      3600
    )
    if (!json) return { album: null, songs: [] }
    const songs = (json.songs ?? json.list ?? []).map(normalize)
    const album = json.title
      ? { ...normalizeAlbum(json), songCount: songs.length || Number(json.more_info?.song_count ?? 0) }
      : null
    return { album, songs }
  } catch {
    return { album: null, songs: [] }
  }
}
```

Rewrite `getPlaylistSongs`:

```ts
export async function getPlaylistSongs(playlistId: string): Promise<Song[]> {
  try {
    const json = await saavnCall<{ list?: RawSong[]; songs?: RawSong[] }>('playlist.getDetails', { listid: playlistId }, 3600)
    return (json?.songs ?? json?.list ?? []).map(normalize)
  } catch {
    return []
  }
}
```

Replace `getArtistDetails` (no more searching by the numeric id):

```ts
interface RawArtistPage {
  artistId?: string
  id?: string
  name?: string
  title?: string
  image?: string
  follower_count?: string | number
  fans?: string | number
  role?: string
  topSongs?: RawSong[]
  songs?: RawSong[]
  topAlbums?: RawAlbum[]
  albums?: RawAlbum[]
}

export async function getArtistDetails(
  artistId: string
): Promise<{ artist: Artist; songs: Song[]; albums: Album[] } | null> {
  try {
    const json = await saavnCall<RawArtistPage>(
      'artist.getArtistPageDetails',
      { artistId, n_song: '30', n_album: '20' },
      3600
    )
    if (!json) return null
    const rawSongs = json.topSongs ?? json.songs ?? []
    const name = json.name || json.title
    if (!name && rawSongs.length === 0) return null
    return {
      artist: normalizeArtist({
        id: json.artistId || json.id || artistId,
        name,
        image: json.image,
        follower_count: json.follower_count || json.fans,
        role: json.role || 'Artist',
      }),
      songs: rawSongs.map(normalize),
      albums: (json.topAlbums ?? json.albums ?? []).map(normalizeAlbum),
    }
  } catch {
    return null
  }
}
```

Make `searchSongs` run the primary and entity searches in parallel — replace its steps 1–2 with:

```ts
  // 1+2. Primary and entity searches in parallel (was sequential: up to 24 s worst case)
  const needsEntitySearch = entity !== cleaned
  const [primaryRaw, entityRaw] = await Promise.all([
    jiosaavnSearch(cleaned, 40, page),
    needsEntitySearch ? jiosaavnSearch(entity, 40, page) : Promise.resolve([] as Song[]),
  ])
  let raw = primaryRaw
  let relevant = primaryRaw.filter((s) => calculateRelevance(s, coreWords) > 0)
  if (relevant.length < 2 && needsEntitySearch) {
    const entityRelevant = entityRaw.filter((s) => calculateRelevance(s, coreWords) > 0)
    if (entityRelevant.length > relevant.length) {
      raw = entityRaw
      relevant = entityRelevant
    }
  }
```

(Step 3, the YouTube suggestion fallback, stays sequential — it only runs when both searches were weak.)

- [ ] **Step 2: Update the route**

In `app/api/search/route.ts`: import `getAlbumDetails` instead of `getAlbumSongs`, then:

```ts
    if (albumId) {
      const { album, songs } = await getAlbumDetails(albumId)
      return NextResponse.json(
        { type: 'album_songs', page: 1, album, songs, results: songs },
        { headers: successHeaders }
      )
    }
```

```ts
    if (artistId) {
      const data = await getArtistDetails(artistId)
      if (!data) {
        return NextResponse.json(
          { type: 'artist_details', error: 'Artist not found', artist: null, songs: [], albums: [], results: [] },
          { status: 502, headers: rateLimitHeaders }
        )
      }
      return NextResponse.json(
        { type: 'artist_details', page: 1, artist: data.artist, songs: data.songs, albums: data.albums, results: data.songs },
        { headers: successHeaders }
      )
    }
```

(502 responses deliberately use `rateLimitHeaders` without the public `Cache-Control`, so CDNs don't cache the failure.)

- [ ] **Step 3: Artist page surfaces the error state**

In `app/artist/[id]/page.tsx`, change the `queryFn` so a failed request reaches the existing `isError` / Retry UI:

```tsx
    queryFn: async () => {
      if (!id) return { artist: { id: '', name: '', image: '' }, songs: [], albums: [] }
      const res = await fetch(`/api/search?artistId=${id}`)
      if (!res.ok) throw new Error(`Artist request failed: HTTP ${res.status}`)
      return res.json()
    },
```

- [ ] **Step 4: Album page uses real album metadata**

In `app/album/[id]/page.tsx`:

```tsx
  const { data, isLoading, isError, refetch } = useQuery<{ album?: Album | null; songs: Song[] }>({
```

and replace the four derived values:

```tsx
  const songs = data?.songs ?? []
  const firstSong = songs[0]
  const album = data?.album
  const albumTitle = album?.title || firstSong?.album || 'Album'
  const albumArtist = album?.artist || firstSong?.artist || 'Various Artists'
  const albumImage = album?.image || firstSong?.image || ''
  const albumYear = album?.year || firstSong?.year
```

Add `Album` to the `import type { … } from '@/types/music'` line. (Task 17 moves this query into a shared helper; keep the inline query for now.)

- [ ] **Step 5: Verify**

Three verification commands, then with `pnpm dev`:

```bash
# pick a real album id
curl -s "http://localhost:3000/api/search?q=pushpa&type=albums" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).albums[0];console.log(a.id,a.title)})"
# then (replace <ID>):
curl -s "http://localhost:3000/api/search?albumId=<ID>" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.album, j.songs.length)})"
# artist failure path
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/search?artistId=000000000"
```

Expected: the album object has a non-empty `title`/`image`, songs > 0; the fake artist returns `502`. In the browser, `/artist/000000000` shows the Retry UI (not a Telugu song list). A normal search (e.g. "pushpa songs") still returns results.

If `j.album.artist` shows as `"Various Artists"` for a single-artist album, inspect the raw upstream JSON once (`curl "https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&_marker=0&api_version=4&ctx=web6dot0&albumid=<ID>" | head -c 1500`) and, if the artist lives in `more_info.artistMap.primary_artists`, extend `normalizeAlbum` to fall back to those names — report this to the user if you change it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/saavn.ts apps/web/app/api/search/route.ts "apps/web/app/artist/[id]/page.tsx" "apps/web/app/album/[id]/page.tsx"
git commit -m "refactor(saavn): shared fetch helper, parallel search, real album metadata, artist error instead of junk fallback"
```

---

### Task 14: Lightweight search suggestions (#18)

**Files:**
- Modify: `apps/web/lib/saavn.ts` (add `suggestSongs`)
- Modify: `apps/web/app/api/search/route.ts`
- Modify: `apps/web/components/layout/Header.tsx:111-120`

**Interfaces:**
- Produces: `suggestSongs(query: string, language: string): Promise<Song[]>` (≤ 5 songs, single upstream call); API `GET /api/search?q=…&lang=…&suggest=1` → `{ type: 'suggestions', songs, results }`, rate-limited in its own bucket (120/min).

- [ ] **Step 1: Add `suggestSongs` to `lib/saavn.ts`** (below `searchSongs`):

```ts
/** Typeahead: one upstream call, no relevance fallbacks, max 5 results. */
export async function suggestSongs(query: string, language: string): Promise<Song[]> {
  const { cleaned } = preprocessQuery(query)
  if (!cleaned) return []
  const songs = dedup(await jiosaavnSearch(cleaned, 10, 1))
  const lang = language.toLowerCase()
  return [...songs.filter((s) => s.language === lang), ...songs.filter((s) => s.language !== lang)].slice(0, 5)
}
```

- [ ] **Step 2: Route**

In `app/api/search/route.ts`, import `suggestSongs`, then replace the rate-limit lines at the top of `GET` with:

```ts
  const isSuggest = req.nextUrl.searchParams.get('suggest') === '1'
  // Typeahead gets its own, larger bucket so typing can't exhaust the page-load budget
  const clientIp = getClientIp(req)
  const rateLimit = isSuggest
    ? checkRateLimit(`suggest:${clientIp}`, 120, 60000)
    : checkRateLimit(`search:${clientIp}`, 60, 60000)
```

and add, right after the `try {` (before the recommendations branch):

```ts
    if (isSuggest) {
      const songs = q ? await suggestSongs(q, lang) : []
      return NextResponse.json({ type: 'suggestions', page: 1, songs, results: songs }, { headers: successHeaders })
    }
```

- [ ] **Step 3: Header uses it**

In `components/layout/Header.tsx`, change the suggestions fetch URL to:

```ts
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&lang=${language}&suggest=1`, { signal })
```

(`data?.songs?.slice(0, 5)` keeps working.)

- [ ] **Step 4: Verify** — three verification commands; `curl -s "http://localhost:3000/api/search?q=butta&lang=telugu&suggest=1" | head -c 400` returns ≤ 5 songs quickly; typing in the header search box shows suggestions; DevTools → Network shows `suggest=1` requests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/saavn.ts apps/web/app/api/search/route.ts apps/web/components/layout/Header.tsx
git commit -m "perf(search): single-call typeahead endpoint with its own rate-limit bucket"
```

---

### Task 15: Replace the broken service worker (#1)

**Files:**
- Replace: `apps/web/public/sw.js` (hand-written, no build step)
- Delete: `apps/web/public/workbox-1d075dc5.js`, `apps/web/next-pwa.d.ts`
- Modify: `apps/web/lib/pwa.test.mjs` (the SW test)
- Modify: `apps/web/components/providers.tsx` (registration)
- Modify: `apps/web/next.config.ts` (headers for `/sw.js`)

Design decisions (state them to the reviewer; don't change them):
- **Audio is never cached by the SW.** Offline audio lives in IndexedDB (`offline-storage.ts`); the old workbox rule cached every streamed `.mp4` (up to 200 × several MB) and duplicated downloads. Range requests and `/api/*` always go to the network.
- Navigations: network-first, cached copy per pathname (max 50), fallback to `/` then `/offline.html`.
- `/_next/static/*` (content-hashed, immutable): cache-first.
- Same-origin images and Google Fonts: stale-while-revalidate, **only `response.ok`** responses (cross-origin `<img>` responses are opaque and would each reserve ~7 MB of quota in Chrome).

- [ ] **Step 1: Update the SW test first (it currently asserts the old workbox strings)**

In `apps/web/lib/pwa.test.mjs`, replace the test `'Service worker exists and implements range request audio caching'` with:

```js
test('Service worker is hand-written, versioned and never intercepts audio or API requests', () => {
  const swPath = path.join(PUBLIC_DIR, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const content = fs.readFileSync(swPath, 'utf8');

  assert.ok(content.includes('offline.html'), 'Must reference offline.html fallback');
  assert.match(content, /const CACHE_VERSION = '/, 'Must declare CACHE_VERSION');
  assert.ok(!content.includes('precacheAndRoute'), 'Must not be a stale workbox build artifact');
  assert.ok(!content.includes('createPartialResponse') && !content.includes('_ref'), 'Must not call undefined helpers');
  assert.ok(content.includes("request.headers.has('range')"), 'Range (audio) requests must bypass the SW');
  assert.ok(content.includes("url.pathname.startsWith('/api/')"), 'API requests must bypass the SW');
});

test('No leftover workbox runtime files in public/', () => {
  const leftovers = fs.readdirSync(PUBLIC_DIR).filter((f) => /^workbox-.*\.js$/.test(f));
  assert.deepEqual(leftovers, []);
});
```

Run: `pnpm --filter web test 2>&1 | grep -B2 -A6 "not ok" | head -30` → both new tests FAIL.

- [ ] **Step 2: Write the new service worker**

Replace `apps/web/public/sw.js` entirely with:

```js
/* Free Music service worker — hand-written, no build step.
 * Bump CACHE_VERSION whenever the caching rules or SHELL_URLS change.
 * Audio is intentionally NOT cached here: offline songs live in IndexedDB (lib/offline-storage.ts). */
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `fm-shell-${CACHE_VERSION}`
const STATIC_CACHE = `fm-static-${CACHE_VERSION}`
const IMAGE_CACHE = `fm-images-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE]

const OFFLINE_URL = '/offline.html'
const SHELL_URLS = ['/', OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']
const MAX_PAGE_ENTRIES = 50
const MAX_IMAGE_ENTRIES = 200

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  // Also removes caches left by the old workbox worker (start-url, audio-cache, api-cache, …)
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Audio streams (range requests), media files and API calls always go straight to the network
  if (request.headers.has('range')) return
  if (url.pathname.startsWith('/api/')) return
  if (/\.(mp4|m4a|mp3|aac|ogg|webm)$/i.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url))
    return
  }
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }
  if (request.destination === 'image' && url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES))
  }
})

async function handleNavigation(request, url) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(url.pathname, response.clone())
      trimCache(SHELL_CACHE, MAX_PAGE_ENTRIES + SHELL_URLS.length)
    }
    return response
  } catch {
    return (
      (await cache.match(url.pathname)) ||
      (await cache.match('/')) ||
      (await cache.match(OFFLINE_URL)) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    )
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      // Opaque (cross-origin no-cors) responses are not ok and are never stored
      if (response.ok) {
        cache.put(request, response.clone())
        if (maxEntries) trimCache(cacheName, maxEntries)
      }
      return response
    })
    .catch(() => cached)
  return cached || network
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)))
}
```

Delete the leftovers:

```bash
cd /c/teja/coding/free-music
git rm -q --cached apps/web/public/workbox-1d075dc5.js 2>/dev/null; rm -f apps/web/public/workbox-1d075dc5.js
rm -f apps/web/next-pwa.d.ts
grep -rn "next-pwa" apps/web --include=*.ts --include=*.tsx --include=*.json | grep -v node_modules
```
Expected: last command prints nothing.

- [ ] **Step 3: Fix registration in `components/providers.tsx`**

Replace the `// 2. Service Worker registration with update prompt` block with:

```tsx
    // 2. Service Worker registration with update prompt (production only)
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        const register = () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
              reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing
                if (!newWorker) return
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showToast('New version available — reload to update')
                  }
                })
              })
            })
            .catch(() => {})
        }
        // The effect usually runs after 'load' already fired — the old code never registered then
        if (document.readyState === 'complete') register()
        else window.addEventListener('load', register, { once: true })
      } else {
        // Dev: remove any worker left from a production build so it can't serve stale chunks
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
      }
    }
```

- [ ] **Step 4: Serve `sw.js` uncached**

In `apps/web/next.config.ts`, change `headers()` to return an extra entry **before** the catch-all:

```ts
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
```

(Keep the `globalThis.self` polyfill at the top of the file — CLAUDE.md invariant.)

- [ ] **Step 5: Verify**

```bash
cd /c/teja/coding/free-music
pnpm --filter web test 2>&1 | tail -4
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit; echo "tsc exit $?"
pnpm --filter web build
```

Then production check (the SW only registers in production):

```bash
pnpm --filter web start   # http://localhost:3000, run in background / second terminal
```

In Chrome:
1. Open http://localhost:3000, browse Home → Library once. DevTools → Application → Service Workers: `sw.js` is **activated and running**, no errors in the console. Cache Storage shows only `fm-shell-v1`, `fm-static-v1`, `fm-images-v1`.
2. Download a song (right-click → Download for offline) and wait for the toast.
3. DevTools → Network → "Offline". Reload the page → the app shell loads (not the browser's dino page). Library → Downloads → the downloaded song plays.
4. Navigate to a page you never visited while offline → `offline.html` or the cached home page appears.
5. Uncheck Offline. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/public apps/web/lib/pwa.test.mjs apps/web/components/providers.tsx apps/web/next.config.ts apps/web/next-pwa.d.ts
git commit -m "fix(pwa): replace stale workbox artifact with a hand-written service worker and fix registration"
```

---

### ✅ Checkpoint 2

- [ ] `pnpm --filter web build` succeeds.
- [ ] Summarize Phase 2 (Tasks 8–15) for the user with their manual checks. **Wait for confirmation before Phase 3.**

---

## Phase 3 — Performance & cleanup (#20–#23, #26, #28, #29)

### Task 16: Right-sized artwork for small thumbnails (#20)

**Files:**
- Modify: `apps/web/lib/utils.ts` (add `sizedImage`)
- Create: `apps/web/lib/image-size.test.mjs`
- Modify: every component that renders a ≤ 64 px song thumbnail (found by grep below)
- Modify: `apps/web/package.json` (test script)

**Interfaces:**
- Produces: `type ArtworkSize = 50 | 150 | 500`; `sizedImage(url: string, size: ArtworkSize): string`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/image-size.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { sizedImage } from './utils.ts'

test('sizedImage rewrites JioSaavn artwork sizes', () => {
  assert.equal(sizedImage('https://c.saavncdn.com/123/Song-500x500.jpg', 150), 'https://c.saavncdn.com/123/Song-150x150.jpg')
  assert.equal(sizedImage('https://c.saavncdn.com/123/Song-50x50.jpg', 500), 'https://c.saavncdn.com/123/Song-500x500.jpg')
})

test('sizedImage leaves other URLs and empty input alone', () => {
  assert.equal(sizedImage('https://i.ytimg.com/vi/x/hqdefault.jpg', 150), 'https://i.ytimg.com/vi/x/hqdefault.jpg')
  assert.equal(sizedImage('', 150), '')
})
```

Append ` lib/image-size.test.mjs` to the `"test"` script. Run → FAIL.

- [ ] **Step 2: Implement** — append to `apps/web/lib/utils.ts`:

```ts
export type ArtworkSize = 50 | 150 | 500

/** JioSaavn artwork URLs end in -50x50/-150x150/-500x500; other hosts are returned unchanged. */
export function sizedImage(url: string, size: ArtworkSize): string {
  if (!url) return ''
  return url.replace(/-(50x50|150x150|500x500)(\.\w+)$/, `-${size}x${size}$2`)
}
```

Run → PASS.

- [ ] **Step 3: Apply to small thumbnails**

Run:
```bash
cd /c/teja/coding/free-music/apps/web
grep -rn 'sizes="\(40\|46\|48\|56\|64\)px"' app components
```

For each hit, change `src={X.image}` to `src={sizedImage(X.image, 150)}` (150 px covers 2× DPR for ≤ 64 px). Add `sizedImage` to that file's existing `import { … } from '@/lib/utils'` (or add the import). Do NOT change 160 px cards, the 220 px album header, or the expanded player art — they keep 500 px. Also leave `navigator.mediaSession` artwork unchanged.

- [ ] **Step 4: Verify** — three verification commands. Manual: open the queue drawer; DevTools → Network → Img: thumbnails request `-150x150.jpg`; they still look sharp.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/utils.ts apps/web/lib/image-size.test.mjs apps/web/components apps/web/app apps/web/package.json
git commit -m "perf(images): load 150px artwork for small thumbnails instead of 500px"
```

---

### Task 17: Offline storage and detail-page cache sharing (#22, #28)

**Files:**
- Modify: `apps/web/lib/offline-storage.ts`
- Modify: `apps/web/app/library/page.tsx` (`refreshDownloads`)
- Create: `apps/web/lib/detail-queries.ts`
- Modify: `apps/web/components/search/AlbumCard.tsx`, `apps/web/components/search/PlaylistCard.tsx`, `apps/web/app/album/[id]/page.tsx`, `apps/web/app/playlist/[id]/page.tsx`

**Interfaces:**
- Produces: `countOfflineSongs(): Promise<number>`; `getOfflineStorageEstimate(knownSongs?: OfflineSongRecord[])`; `albumQuery(id: string)`, `publicPlaylistQuery(id: string)` returning `{ queryKey, queryFn, staleTime }` objects usable with both `useQuery` and `queryClient.fetchQuery`.

- [ ] **Step 1: Cache the IndexedDB connection and add cheap reads**

In `lib/offline-storage.ts`, replace `openDB` with:

```ts
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environments'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      // Another tab upgraded the DB: close ours so the upgrade isn't blocked, reopen lazily
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}
```

Replace `isSongDownloaded` (it no longer loads the audio blob):

```ts
export async function isSongDownloaded(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getKey(id)
      req.onsuccess = () => resolve(req.result !== undefined)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function countOfflineSongs(): Promise<number> {
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(0)
    })
  } catch {
    return 0
  }
}
```

Replace `getOfflineStorageEstimate`:

```ts
/** Pass the list you already loaded to avoid reading every record a second time. */
export async function getOfflineStorageEstimate(
  knownSongs?: OfflineSongRecord[]
): Promise<{ usage: number; quota: number; count: number }> {
  try {
    let usage = 0
    let quota = 0
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate()
      usage = est.usage || 0
      quota = est.quota || 0
    }
    // Only read all records when we must sum sizes ourselves
    const songs = knownSongs ?? (usage > 0 ? null : await getAllOfflineSongs())
    const count = songs ? songs.length : await countOfflineSongs()
    const songsBytes = songs ? songs.reduce((sum, s) => sum + (s.fileSize || s.blob?.size || 0), 0) : 0
    return { usage: usage > 0 ? usage : songsBytes, quota, count }
  } catch {
    return { usage: 0, quota: 0, count: 0 }
  }
}
```

In `app/library/page.tsx`, change `refreshDownloads` to:

```ts
  const refreshDownloads = async () => {
    const list = await getAllOfflineSongs()
    setDownloads(list)
    setStorageEstimate(await getOfflineStorageEstimate(list))
  }
```

- [ ] **Step 2: Shared detail queries**

Create `apps/web/lib/detail-queries.ts`:

```ts
import type { Album, Song } from '@/types/music'

const FIVE_MINUTES = 5 * 60 * 1000

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

/** Shared by the album page and AlbumCard's play button so they reuse one cache entry. */
export function albumQuery(id: string) {
  return {
    queryKey: ['album', id] as const,
    queryFn: () => getJson<{ album?: Album | null; songs: Song[] }>(`/api/search?albumId=${encodeURIComponent(id)}`),
    staleTime: FIVE_MINUTES,
  }
}

/** Shared by the public playlist page and PlaylistCard's play button. */
export function publicPlaylistQuery(id: string) {
  return {
    queryKey: ['public-playlist', id] as const,
    queryFn: () => getJson<{ songs: Song[] }>(`/api/search?playlistId=${encodeURIComponent(id)}`),
    staleTime: FIVE_MINUTES,
  }
}
```

Use it:

- `app/album/[id]/page.tsx`: replace the `useQuery({...})` call with
  ```tsx
  const { data, isLoading, isError, refetch } = useQuery({ ...albumQuery(id ?? ''), enabled: !!id })
  ```
- `app/playlist/[id]/page.tsx` (~line 154): replace the public playlist `useQuery({...})` with
  ```tsx
  const { data: publicData, isLoading: publicLoading } = useQuery({
    ...publicPlaylistQuery(playlistId),
    enabled: !playlist && !!playlistId,
  })
  ```
  (`enabled` is copied from the current code: local playlists never hit the API.)
- `components/search/AlbumCard.tsx` `handlePlayAlbum`: add `const queryClient = useQueryClient()` (import from `@tanstack/react-query`) at the top of the component and replace the fetch lines with
  ```tsx
      const data = await queryClient.fetchQuery(albumQuery(album.id))
      const songs: Song[] = data.songs || []
  ```
- `components/search/PlaylistCard.tsx`: same pattern with `publicPlaylistQuery(playlist.id)`.

- [ ] **Step 3: Verify** — three verification commands. Manual: search "pushpa" → Albums tab → press play on an album card, then open that album → DevTools shows **no second** `albumId=` request. Library → Downloads still lists songs and shows the storage figure; context menu "Download"/"Remove download" state is correct.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/offline-storage.ts apps/web/lib/detail-queries.ts apps/web/app apps/web/components/search
git commit -m "perf(data): reuse IndexedDB connection, cheap download checks, shared album/playlist queries"
```

---

### Task 18: Visualizer efficiency (#11)

Behavior kept: when no analyser exists (EQ off) the visualizer still shows the simulated animation — changing that is a product decision, not a fix. What changes: the loop stops when paused and settled, no per-frame allocations, crisp on HiDPI.

**Files:**
- Modify: `apps/web/components/player/VisualizerCanvas.tsx` (full replacement)

- [ ] **Step 1: Replace the file**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { getAudioAnalyser } from '@/components/AudioManager'

interface VisualizerCanvasProps {
  isPlaying: boolean
  barCount?: number
  height?: number
}

export function VisualizerCanvas({ isPlaying, barCount = 32, height = 48 }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smoothedRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Crisp on HiDPI screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = canvas.clientWidth || 360
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (smoothedRef.current.length !== barCount) smoothedRef.current = new Array(barCount).fill(2)
    const smoothed = smoothedRef.current

    // Allocated once per effect run, not per frame / per bar
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#ff4e45')
    gradient.addColorStop(1, '#ff0000')
    let freqData = new Uint8Array(0)

    const gap = 3
    const barWidth = Math.max(2, (width - (barCount - 1) * gap) / barCount)
    let rafId = 0

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      const analyser = isPlaying ? getAudioAnalyser() : null
      if (analyser) {
        if (freqData.length !== analyser.frequencyBinCount) freqData = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(freqData)
      }

      ctx.fillStyle = gradient
      let settled = true

      for (let i = 0; i < barCount; i++) {
        let targetHeight = 2
        if (isPlaying) {
          if (analyser && freqData.length > 0) {
            // Sample frequency bins across a log-ish spectrum
            const binIndex = Math.min(freqData.length - 1, Math.floor(Math.pow(i / barCount, 1.2) * (freqData.length * 0.75)))
            targetHeight = Math.max(3, ((freqData[binIndex] || 0) / 255) * (height - 4))
          } else {
            // Simulated harmonic rhythm when the analyser is unavailable (EQ off)
            const combined = (Math.sin(time * 0.004 + i * 0.35) + Math.cos(time * 0.007 + i * 0.2) + 2) / 4
            targetHeight = Math.max(3, combined * (height - 6))
          }
        }

        smoothed[i] += (targetHeight - smoothed[i]) * 0.25
        if (Math.abs(targetHeight - smoothed[i]) > 0.5) settled = false

        const barH = smoothed[i]
        const x = i * (barWidth + gap)
        const y = height - barH
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0])
        else ctx.rect(x, y, barWidth, barH)
        ctx.fill()
      }

      // Paused: keep animating only until the bars have eased down to the idle line
      if (isPlaying || !settled) rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, barCount, height])

  return (
    <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 360, height, display: 'block' }} />
    </div>
  )
}
```

- [ ] **Step 2: Verify** — three verification commands. Manual: open the expanded player; bars animate while playing; pause → bars ease down and DevTools → Performance (record 3 s) shows no continuous animation frames; with EQ enabled in Settings the bars react to the music.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/player/VisualizerCanvas.tsx
git commit -m "perf(visualizer): stop the loop when paused, no per-frame allocations, HiDPI canvas"
```

---

### Task 19: Config, theme and leftovers (#23, #26, #29)

**Files:**
- Modify: `apps/web/next.config.ts` (CSP)
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/components/player/ExpandedPlayer.tsx` (`#1a1a1a`)
- Modify (strip BOM): `apps/web/.eslintrc.json`, `apps/web/components/home/SeenSongsContext.ts`, `apps/web/.env.example`

- [ ] **Step 1: CSP**

In `next.config.ts`, above `ContentSecurityPolicy` add:

```ts
// Next.js dev (React Refresh) needs eval; production does not
const isDev = process.env.NODE_ENV !== 'production'
```

and change the two affected directives inside the template string:

```ts
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.youtube.com https://s.ytimg.com;
```
```ts
  connect-src 'self' https://lrclib.net https://suggestqueries.google.com https://www.youtube.com https://*.saavncdn.com;
```
(`https://saavn.sumit.co` removed — dead mirror, nothing calls it: confirm with `grep -rn "sumit" apps/web --include=*.ts --include=*.tsx | grep -v node_modules` → only next.config before the edit.)

- [ ] **Step 2: Layout duplicates, theme color, fonts**

1. `viewport.themeColor` → follow the system theme:
   ```ts
   export const viewport: Viewport = {
     themeColor: [
       { media: '(prefers-color-scheme: light)', color: '#ffffff' },
       { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
     ],
   }
   ```
2. Build, start, and look at what Next already emits:
   ```bash
   cd /c/teja/coding/free-music && pnpm --filter web build >/dev/null && (pnpm --filter web start &) && sleep 8
   curl -s http://localhost:3000 | grep -o '<link rel="manifest"[^>]*>\|<meta name="[a-z-]*capable"[^>]*>\|<meta name="apple-mobile-web-app-status-bar-style"[^>]*>'
   ```
   Every tag that appears **twice** in that output is duplicated by the manual tags in `app/layout.tsx`'s `<head>` — delete the manual copy (keep the one generated from `metadata`). Expected candidates: `<link rel="manifest">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`. Stop the server afterwards (`pkill -f "next start"` or close the terminal).
3. Fonts: Roboto weight 300 is not used anywhere (`grep -rn "fontWeight: 300" apps/web/app apps/web/components` → nothing). Change the stylesheet URL to
   `https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap`.
   Do NOT migrate to `next/font`: the existing comment says fonts load at runtime on purpose to avoid a build-time network dependency — that's the owner's decision.

- [ ] **Step 3: Theme token**

In `components/player/ExpandedPlayer.tsx`, replace `background: '#1a1a1a',` (album-art placeholder) with `background: 'var(--panel-bg)',`.
(`app/global-error.tsx` keeps its hard-coded colors: it renders its own `<html>` outside the root layout, so the CSS variables are not loaded there.)

- [ ] **Step 4: Strip BOMs**

```bash
cd /c/teja/coding/free-music/apps/web
for f in .eslintrc.json components/home/SeenSongsContext.ts .env.example; do sed -i '1s/^\xEF\xBB\xBF//' "$f"; done
head -c 3 .eslintrc.json | od -c | head -1   # must NOT start with 357 273 277
```

- [ ] **Step 5: Verify**

Three verification commands + `pnpm --filter web build`. Then `pnpm --filter web start` and in Chrome check the console on `/`, `/watch` (with a song playing and a video available) and `/search?q=test`: **no CSP violation errors**. Toggle Settings → theme Light: the browser/OS status bar color follows the system scheme.

- [ ] **Step 6: Commit**

```bash
git add apps/web/next.config.ts apps/web/app/layout.tsx apps/web/components/player/ExpandedPlayer.tsx apps/web/.eslintrc.json apps/web/components/home/SeenSongsContext.ts apps/web/.env.example
git commit -m "chore(config): tighten CSP, dedupe head tags, theme-aware status bar, drop unused font weight"
```

---

### Task 20: `vercel.json` (#25) — owner decision, do not change silently

**Files:** possibly `vercel.json` (repo root).

- [ ] **Step 1: Ask the user**

> "`vercel.json` rewrites every path to `/apps/web/$1`, which will probably 404 all routes on Vercel. The standard fix is to delete the `rewrites` block and set the project's **Root Directory** to `apps/web` in the Vercel dashboard (then `buildCommand`/`outputDirectory` can also be removed). Is this app deployed on Vercel, and do you want me to make that change?"

- [ ] **Step 2: Only if the user says yes**, replace `vercel.json` with:

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build"
}
```

and tell the user they must set Root Directory = `apps/web` in Vercel → Project Settings → General, then verify on a preview deployment that `/`, `/search?q=test` and `/api/health` load.

- [ ] **Step 3: Commit** (only if changed): `git add vercel.json && git commit -m "fix(deploy): remove path rewrite that broke routing on Vercel"`

---

### Task 21: Final verification and hand-off

- [ ] **Step 1: Full verification (CLAUDE.md protocol)**

```bash
cd /c/teja/coding/free-music
pnpm --filter web test 2>&1 | tail -8
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit; echo "tsc exit $?"
pnpm --filter web build 2>&1 | tail -25
```
Expected: `ℹ fail 0` (test count > 72 now), lint clean, `tsc exit 0`, build succeeds.

- [ ] **Step 2: E2E smoke (optional but recommended)**

```bash
cd /c/teja/coding/free-music && pnpm test:e2e 2>&1 | tail -20
```
If a Playwright browser is missing, run `pnpm --filter web exec playwright install chromium` first. Report failures verbatim; do not "fix" tests by weakening assertions.

- [ ] **Step 3: Coverage check against the spec**

For each finding #1–#31 in `docs/superpowers/specs/2026-09-30-codebase-review-findings.md`, confirm which task fixed it (see the table below). Report any item you skipped and why.

| Finding | Task | Finding | Task |
|---|---|---|---|
| #1 | 15 | #17 | 10 |
| #2 | 1 | #18 | 14 |
| #3 | 2 | #19 | 12, 13 |
| #4 | 6 | #20 | 16 |
| #5 | 3, 4 | #21 | 7 |
| #6 | 3, 4 | #22 | 17 |
| #7 | 7 | #23 | 19 (weights only; next/font deliberately not done) |
| #8 | 8 | #24 | 7 |
| #9 | 5 | #25 | 20 (owner decision) |
| #10 | 5 | #26 | 19 |
| #11 | 18 | #27 | documented only, no change |
| #12 | 10, 11 | #28 | 13, 17 (two queue UIs kept; both now share the same store actions) |
| #13 | 13 | #29 | 15, 19 |
| #14 | 11 | #30 | new real-module tests in Tasks 1–3, 5, 6, 9–12, 16 |
| #15 | 3 | #31 | 13 |
| #16 | 7, 9 | | |

- [ ] **Step 4: Request review**

Use **superpowers:requesting-code-review** on the whole branch, then **superpowers:finishing-a-development-branch** to let the user choose how to integrate (merge / PR / keep).
