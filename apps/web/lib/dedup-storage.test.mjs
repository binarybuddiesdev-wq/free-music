import test from 'node:test'
import assert from 'node:assert/strict'
import { createDedupStorage } from './dedup-storage.ts'

function fakeStorage() {
  const map = new Map()
  let writes = 0
  let failNext = false
  return {
    api: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (failNext) { failNext = false; throw new Error('QuotaExceededError') }
        writes++
        map.set(k, v)
      },
      removeItem: (k) => map.delete(k),
    },
    writes: () => writes,
    failOnce: () => { failNext = true },
    map,
  }
}

test('identical consecutive writes are skipped', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('ytm-player', '{"a":1}')
  storage.setItem('ytm-player', '{"a":1}')
  storage.setItem('ytm-player', '{"a":1}')
  assert.equal(fake.writes(), 1)
})

test('changed values are written', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('k', '1')
  storage.setItem('k', '2')
  assert.equal(fake.writes(), 2)
  assert.equal(fake.map.get('k'), '2')
})

test('keys are tracked independently', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('a', 'x')
  storage.setItem('b', 'x')
  assert.equal(fake.writes(), 2)
})

test('getItem primes the cache so re-writing the stored value is skipped', () => {
  const fake = fakeStorage()
  fake.map.set('k', 'stored')
  const storage = createDedupStorage(() => fake.api)
  assert.equal(storage.getItem('k'), 'stored')
  storage.setItem('k', 'stored')
  assert.equal(fake.writes(), 0)
})

test('after removeItem the same value is written again', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  storage.setItem('k', 'v')
  storage.removeItem('k')
  storage.setItem('k', 'v')
  assert.equal(fake.writes(), 2)
})

test('a failed write is retried next time with the same value', () => {
  const fake = fakeStorage()
  const storage = createDedupStorage(() => fake.api)
  fake.failOnce()
  assert.throws(() => storage.setItem('k', 'v'))
  storage.setItem('k', 'v')
  assert.equal(fake.writes(), 1)
})

test('missing storage (SSR) is a silent no-op', () => {
  const storage = createDedupStorage(() => undefined)
  assert.equal(storage.getItem('k'), null)
  assert.doesNotThrow(() => storage.setItem('k', 'v'))
  assert.doesNotThrow(() => storage.removeItem('k'))
})
