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

// Real JioSaavn data: the same recording listed as a single, a movie album and a compilation
const jaamu = [
  s('1RbailDj', 'Jaamurathiri', 'S.P. Balasubrahmanyam, Chitra', 301),
  s('TkejXmTs', 'Jaamurathiri (From "Kshana Kshanam")', 'S.P. Balasubrahmanyam, Chitra', 301),
  s('NjkmHzJ1', 'Jaamurathiri', 'Sirivennela Seetharama Sastry, M. M. Keeravani, S. P. Balasubrahmanyam, K. S. Chithra', 301),
]

test('"(From ...)" suffix and extra credits do not make a different song', () => {
  assert.deepEqual(dedupSongs(jaamu).map((x) => x.id), ['1RbailDj'])
})

test('remixes, other versions and other recordings are still kept', () => {
  const out = dedupSongs([
    s('a', 'Love', 'X', 200),
    s('b', 'Love (Remix)', 'X', 200),
    s('c', 'Love (Lofi)', 'X', 200),
    s('d', 'Love', 'X', 260), // same title and artist but clearly another recording
  ])
  assert.deepEqual(out.map((x) => x.id), ['a', 'b', 'c', 'd'])
})

test('song set remembers songs across lists and can forget them', async () => {
  const { createSongSet, takeFresh } = await import('./song-dedup.ts')
  const seen = createSongSet()
  const first = takeFresh([jaamu[0], s('z', 'Other', 'Y')], seen)
  assert.deepEqual(first.map((x) => x.id), ['1RbailDj', 'z'])
  assert.deepEqual(takeFresh([jaamu[1], jaamu[2]], seen), [])
  first.forEach((x) => seen.delete(x))
  assert.deepEqual(takeFresh([jaamu[2]], seen).map((x) => x.id), ['NjkmHzJ1'])
})
