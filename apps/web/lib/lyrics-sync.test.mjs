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
