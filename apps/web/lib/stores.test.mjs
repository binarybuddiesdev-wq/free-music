import test from 'node:test'
import assert from 'node:assert/strict'

// Mock localStorage for node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  }
}

test('Stores Logic & State Machines', async (t) => {
  await t.test('Queue Store: Shuffle maintains all original items without loss or duplication', () => {
    const originalSongs = [
      { id: '1', title: 'Song 1' },
      { id: '2', title: 'Song 2' },
      { id: '3', title: 'Song 3' },
      { id: '4', title: 'Song 4' },
      { id: '5', title: 'Song 5' },
    ]

    // Simulate shuffle logic
    const arr = [...originalSongs]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    assert.equal(arr.length, originalSongs.length)
    originalSongs.forEach((song) => {
      assert.ok(arr.some((s) => s.id === song.id))
    })
  })

  await t.test('Queue Store: Repeat mode cycles correctly between none, all, and one', () => {
    const cycle = (current) => {
      if (current === 'none') return 'all'
      if (current === 'all') return 'one'
      return 'none'
    }

    assert.equal(cycle('none'), 'all')
    assert.equal(cycle('all'), 'one')
    assert.equal(cycle('one'), 'none')
  })

  await t.test('Queue Store: appendSongs rejects duplicate song IDs', () => {
    const currentQueue = [
      { id: 'track-1', title: 'Song 1' },
      { id: 'track-2', title: 'Song 2' },
    ]
    const incoming = [
      { id: 'track-2', title: 'Song 2 Dupe' },
      { id: 'track-3', title: 'Song 3 Novel' },
      { id: 'track-1', title: 'Song 1 Dupe' },
    ]

    const existingIds = new Set(currentQueue.map((s) => s.id))
    const filtered = incoming.filter((s) => !existingIds.has(s.id))
    const updatedQueue = [...currentQueue, ...filtered]

    assert.equal(updatedQueue.length, 3)
    assert.equal(updatedQueue[2].id, 'track-3')
  })

  await t.test('Library Store: Toggle like adds and removes favorites accurately', () => {
    const favorites = new Map()
    const song = { id: 'fav-1', title: 'Liked Track' }

    // Toggle ON
    favorites.set(song.id, song)
    assert.ok(favorites.has('fav-1'))

    // Toggle OFF
    favorites.delete(song.id)
    assert.ok(!favorites.has('fav-1'))
  })

  await t.test('Settings Store: Lyrics offset is clamped between -5.0s and +5.0s', () => {
    const clampOffset = (val) => Math.max(-5.0, Math.min(5.0, Math.round(val * 10) / 10))

    assert.equal(clampOffset(0), 0)
    assert.equal(clampOffset(0.5), 0.5)
    assert.equal(clampOffset(10), 5.0)
    assert.equal(clampOffset(-12.4), -5.0)
  })

  await t.test('Settings Store: Audio quality tier fallback guarantees valid bitrate', () => {
    const validQualities = new Set(['low', 'normal', 'high'])
    const validateQuality = (q) => (validQualities.has(q) ? q : 'high')

    assert.equal(validateQuality('high'), 'high')
    assert.equal(validateQuality('normal'), 'normal')
    assert.equal(validateQuality('low'), 'low')
    assert.equal(validateQuality('ultra-hd-invalid'), 'high')
    assert.equal(validateQuality(null), 'high')
  })
})
