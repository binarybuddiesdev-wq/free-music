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
