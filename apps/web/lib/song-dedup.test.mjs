import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupSongs, songKey } from './song-dedup.ts'

const s = (id, title, artist, duration = 200) => ({ id, title, artist, album: '', duration, image: '', downloadUrl: '', language: 'hindi' })

test('same song under different ids and durations collapses to the first', () => {
  const out = dedupSongs([s('a', 'Sweety (From "Race Gurram")', 'Rabbit Mac', 265), s('b', 'Sweety (From "Race Gurram")', 'Rabbit Mac', 266)])
  assert.deepEqual(out.map((x) => x.id), ['a'])
})

test('case, whitespace and artist order are ignored', () => {
  assert.equal(songKey(s('a', ' Bommali ', 'Hema Chandra, Malavika')), songKey(s('b', 'bommali', 'malavika,  hema chandra')))
})

test('different songs or different artists are kept', () => {
  const out = dedupSongs([s('a', 'Love', 'X'), s('b', 'Love', 'Y'), s('c', 'Love Remix', 'X')])
  assert.equal(out.length, 3)
})

test('same id is removed too and order is preserved', () => {
  assert.deepEqual(dedupSongs([s('a', 'A', 'x'), s('b', 'B', 'x'), s('a', 'A', 'x')]).map((x) => x.id), ['a', 'b'])
})
