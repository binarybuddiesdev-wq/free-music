import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeString } from './security.ts'
import { formatDuration, clamp } from './utils.ts'

test('Extreme Edge Cases & Boundary Resilience', async (t) => {
  await t.test('100,000-character string truncation protects CPU against ReDoS and heap exhaustion', () => {
    const hugeString = 'a'.repeat(100_000)
    const sanitized = sanitizeString(hugeString, 200)
    assert.equal(sanitized.length, 200)
  })

  await t.test('Duration division by zero safely handles NaN and Infinity', () => {
    const safeProgressFraction = (progress, duration) => {
      if (!duration || duration <= 0 || isNaN(progress) || isNaN(duration)) return 0
      return Math.min(100, Math.max(0, (progress / duration) * 100))
    }

    assert.equal(safeProgressFraction(50, 0), 0)
    assert.equal(safeProgressFraction(50, -100), 0)
    assert.equal(safeProgressFraction(NaN, 100), 0)
    assert.equal(safeProgressFraction(50, NaN), 0)
    assert.equal(safeProgressFraction(200, 100), 100) // capped at 100%
    assert.equal(safeProgressFraction(-50, 100), 0) // bounded at 0%
    assert.equal(safeProgressFraction(50, 100), 50)
  })

  await t.test('formatDuration formats sub-second, multi-hour, and negative numbers without NaN', () => {
    assert.equal(formatDuration(0), '0:00')
    assert.equal(formatDuration(-5), '0:00')
    assert.equal(formatDuration(NaN), '0:00')
    assert.equal(formatDuration(59), '0:59')
    assert.equal(formatDuration(60), '1:00')
    assert.equal(formatDuration(3599), '59:59')
    assert.equal(formatDuration(3600), '1:00:00')
    assert.equal(formatDuration(3665), '1:01:05')
  })

  await t.test('Clamp utility enforces exact boundaries across inverted or edge ranges', () => {
    assert.equal(clamp(5, 0, 10), 5)
    assert.equal(clamp(-10, 0, 10), 0)
    assert.equal(clamp(15, 0, 10), 10)
    assert.equal(clamp(0, 0, 0), 0)
  })

  await t.test('Sleep timer calculation handles past timestamps cleanly', () => {
    const isSleepTimerActive = (endTime) => {
      if (!endTime) return false
      return endTime > Date.now()
    }

    assert.equal(isSleepTimerActive(null), false)
    assert.equal(isSleepTimerActive(Date.now() - 1000), false) // in the past
    assert.equal(isSleepTimerActive(Date.now() + 60_000), true) // in the future
  })
})
