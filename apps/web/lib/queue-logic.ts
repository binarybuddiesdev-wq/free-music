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
