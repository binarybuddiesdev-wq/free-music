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
