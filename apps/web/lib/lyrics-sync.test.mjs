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
