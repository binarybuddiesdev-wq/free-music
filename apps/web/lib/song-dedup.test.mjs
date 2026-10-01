import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupSongs, songKey, isSameSong } from './song-dedup.ts'

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

const withAlbum = (id, title, artist, album, image) => ({ ...s(id, title, artist, 215), album, image })

test('when copies collapse, the original movie release wins over the compilation copy', () => {
  const compilation = withAlbum('sHkFzHxL', 'Ammo Naku Bhayam (From "Nyayam Kavali")', 'P. Susheela, S.P. Balasubrahmanyam', 'Ever Youth Mega Star - Chiru Hits', 'chiru-hits.jpg')
  const original = withAlbum('eDX6QfxU', 'Ammo Naku Bhayam', 'P. Susheela, S.P. Balasubrahmanyam', 'Nyayam Kavali', 'nyayam-kavali.jpg')
  const out = dedupSongs([s('x', 'Before', 'A'), compilation, s('y', 'After', 'A'), original])
  assert.deepEqual(out.map((x) => x.id), ['x', 'eDX6QfxU', 'y']) // original takes the first copy's place
  assert.equal(out[1].image, 'nyayam-kavali.jpg')
})

test('a "(From ...)" copy on its own movie album is not treated as a compilation', () => {
  const single = withAlbum('a', 'Naatu Naatu (From "RRR")', 'Rahul', 'RRR', 'rrr.jpg')
  const comp = withAlbum('b', 'Naatu Naatu', 'Rahul', 'Best of 2022', 'best.jpg')
  // neither is clearly a compilation by the "From" rule alone; the first one stays
  assert.equal(dedupSongs([single, comp])[0].id, 'a')
})

test('spreadByAlbum shows at most N songs per album first and keeps the rest at the end', async () => {
  const { spreadByAlbum } = await import('./song-dedup.ts')
  const song = (id, album) => ({ ...s(String(id), 'T' + id, 'A' + id), album })
  const list = [song(1, 'Hits'), song(2, 'Hits'), song(3, 'Hits'), song(4, 'Movie'), song(5, 'Hits'), song(6, 'Other')]
  assert.deepEqual(spreadByAlbum(list, 2).map((x) => x.id), ['1', '2', '4', '6', '3', '5'].map((x) => x))
  assert.equal(spreadByAlbum(list, 2).length, list.length)
})

test('spreadByAlbum treats songs without an album as separate', async () => {
  const { spreadByAlbum } = await import('./song-dedup.ts')
  const list = [1, 2, 3].map((n) => ({ ...s(String(n), 'T' + n, 'A'), album: '' }))
  assert.deepEqual(spreadByAlbum(list, 1).map((x) => x.id), ['1', '2', '3'])
})

test('songs with an unknown duration only merge when the full titles match', () => {
  const a = { id: '1', title: 'Naatu Naatu (From "RRR")', artist: 'Rahul Sipligunj', duration: 0 }
  const b = { id: '2', title: 'Naatu Naatu', artist: 'Rahul Sipligunj', duration: 215 }
  const c = { id: '3', title: 'Naatu Naatu (From "RRR")', artist: 'Rahul Sipligunj', duration: 0 }
  assert.equal(isSameSong(a, b), false)
  assert.equal(isSameSong(a, c), true)
})
