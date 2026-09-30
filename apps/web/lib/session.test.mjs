import test from 'node:test'
import assert from 'node:assert/strict'
import { sessionPage } from './session.ts'

test('sessionPage is stable for the same key during a page load', () => {
  const a = sessionPage('section:trending:telugu')
  for (let i = 0; i < 20; i++) assert.equal(sessionPage('section:trending:telugu'), a)
})

test('sessionPage maps the random value into 1..maxPage', () => {
  assert.equal(sessionPage('k-low', 5, () => 0), 1)
  assert.equal(sessionPage('k-high', 5, () => 0.9999), 5)
})

test('different keys are independent', () => {
  assert.equal(sessionPage('k1', 8, () => 0), 1)
  assert.equal(sessionPage('k2', 8, () => 0.5), 5)
})
