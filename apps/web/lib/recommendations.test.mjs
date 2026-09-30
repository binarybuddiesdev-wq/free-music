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
