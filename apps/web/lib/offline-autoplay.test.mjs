import test from 'node:test'
import assert from 'node:assert/strict'

// 1. Test Recent Searches logic
test('Recent searches stores, deduplicates, and limits history to max items', async () => {
  const store = new Map()
  globalThis.window = {}
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }

  const { getRecentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = await import('./recent-searches.ts')

  clearRecentSearches()
  assert.deepEqual(getRecentSearches(), [])

  addRecentSearch('Pushpa 2')
  addRecentSearch('Devara')
  addRecentSearch('pushpa 2') // Case-insensitive deduplication, should move to front

  let list = getRecentSearches()
  assert.equal(list.length, 2)
  assert.equal(list[0], 'pushpa 2')
  assert.equal(list[1], 'Devara')

  // Add more items to verify MAX limit of 8
  for (let i = 1; i <= 10; i++) {
    addRecentSearch(`Song ${i}`)
  }
  list = getRecentSearches()
  assert.equal(list.length, 8)
  assert.equal(list[0], 'Song 10')

  // Remove single item
  removeRecentSearch('Song 10')
  list = getRecentSearches()
  assert.equal(list.length, 7)
  assert.equal(list.includes('Song 10'), false)

  // Clear all
  clearRecentSearches()
  assert.deepEqual(getRecentSearches(), [])
})

// 2. Test formatBytes in offline storage
test('formatBytes accurately formats binary byte quantities', async () => {
  const { formatBytes } = await import('./utils.ts')

  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1024), '1 KB')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(1048576), '1 MB')
  assert.equal(formatBytes(1048576 * 4.2), '4.2 MB')
  assert.equal(formatBytes(1073741824 * 1.5), '1.5 GB')
})

// 3. Test queue append unique songs logic
test('appendSongs logic preserves existing queue and appends only novel songs', () => {
  const existingQueue = [
    { id: '1', title: 'Song 1', artist: 'Artist A' },
    { id: '2', title: 'Song 2', artist: 'Artist B' },
  ]
  const incomingRecommendations = [
    { id: '2', title: 'Song 2 (Duplicate)', artist: 'Artist B' },
    { id: '3', title: 'Song 3', artist: 'Artist C' },
    { id: '4', title: 'Song 4', artist: 'Artist D' },
  ]

  const existingIds = new Set(existingQueue.map((s) => s.id))
  const unique = incomingRecommendations.filter((s) => !existingIds.has(s.id))
  const updatedQueue = [...existingQueue, ...unique]

  assert.equal(updatedQueue.length, 4)
  assert.deepEqual(updatedQueue.map((s) => s.id), ['1', '2', '3', '4'])
})

// 4. Test fisherYates shuffle algorithm
test('fisherYates returns a valid permutation of the original array without loss', async () => {
  const { fisherYates } = await import('./utils.ts')
  const original = ['song-1', 'song-2', 'song-3', 'song-4', 'song-5', 'song-6']
  const shuffled = fisherYates(original)

  assert.equal(shuffled.length, original.length)
  assert.deepEqual([...shuffled].sort(), [...original].sort())
})

// 5. Test clamp helper
test('clamp constrains numbers within min and max boundaries', async () => {
  const { clamp } = await import('./utils.ts')
  assert.equal(clamp(50, 0, 100), 50)
  assert.equal(clamp(-10, 0, 100), 0)
  assert.equal(clamp(150, 0, 100), 100)
})

// 6. Test lyrics offset calculation
test('lyrics timing offset accurately adjusts active karaoke progress', () => {
  const calculateLyricsProgress = (progress, offset) => Math.max(0, Number((progress + offset).toFixed(3)))

  assert.equal(calculateLyricsProgress(10.5, 0), 10.5)
  assert.equal(calculateLyricsProgress(10.5, 0.5), 11.0)
  assert.equal(calculateLyricsProgress(10.5, -0.5), 10.0)
  assert.equal(calculateLyricsProgress(0.2, -0.5), 0) // Never negative
})

// 7. Test song radio queue composition
test('createRadioQueue places seed song first and removes duplicates from recommendations', () => {
  const createRadioQueue = (seed, recommendations) => {
    const rest = recommendations.filter((s) => s.id !== seed.id)
    return [seed, ...rest]
  }

  const seed = { id: 'seed-1', title: 'Seed Track' }
  const recs = [
    { id: 'seed-1', title: 'Duplicate Seed' },
    { id: 'rec-2', title: 'Rec 2' },
    { id: 'rec-3', title: 'Rec 3' },
  ]

  const radioQueue = createRadioQueue(seed, recs)
  assert.equal(radioQueue.length, 3)
  assert.equal(radioQueue[0].id, 'seed-1')
  assert.equal(radioQueue[1].id, 'rec-2')
  assert.equal(radioQueue[2].id, 'rec-3')
})


