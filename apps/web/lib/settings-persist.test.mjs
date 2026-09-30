import test from 'node:test'
import assert from 'node:assert/strict'
import { partializeSettings, mergeSettings, isSleepTimerDue } from './settings-persist.ts'

test('partializeSettings drops sleep timer fields and functions', () => {
  const state = { theme: 'dark', sleepTimer: 30, sleepTimerEnd: 123, setTheme: () => {} }
  assert.deepEqual(partializeSettings(state), { theme: 'dark' })
})

test('mergeSettings ignores a legacy persisted sleepTimerEnd', () => {
  const current = { theme: 'dark', sleepTimer: 0, sleepTimerEnd: null, setTheme: () => {} }
  const legacy = { theme: 'light', sleepTimer: 15, sleepTimerEnd: 1000 }
  const merged = mergeSettings(legacy, current)
  assert.equal(merged.theme, 'light')
  assert.equal(merged.sleepTimer, 0)
  assert.equal(merged.sleepTimerEnd, null)
  assert.equal(typeof merged.setTheme, 'function')
})

test('mergeSettings tolerates missing / corrupt persisted state', () => {
  const current = { theme: 'dark' }
  assert.deepEqual(mergeSettings(undefined, current), { theme: 'dark' })
  assert.deepEqual(mergeSettings('garbage', current), { theme: 'dark' })
})

test('isSleepTimerDue', () => {
  assert.equal(isSleepTimerDue(null, 5), false)
  assert.equal(isSleepTimerDue(0, 5), false)
  assert.equal(isSleepTimerDue(10, 5), false)
  assert.equal(isSleepTimerDue(10, 10), true)
  assert.equal(isSleepTimerDue(10, 11), true)
})
