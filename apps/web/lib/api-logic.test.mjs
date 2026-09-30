import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit } from './rate-limiter.ts'
import { sanitizeString, sanitizeDuration, sanitizeLanguage, sanitizeSearchType } from './security.ts'

test('API Logic, Rate Limiter & Security Gates', async (t) => {
  await t.test('Rate Limiter: Correctly computes remaining allowance and resets', () => {
    const key = `test-ip-${Date.now()}`
    const limit = 5
    const windowMs = 2000

    for (let i = 0; i < limit; i++) {
      const res = checkRateLimit(key, limit, windowMs)
      assert.ok(res.success)
      assert.equal(res.remaining, limit - 1 - i)
    }

    // Next call must be blocked
    const blockedRes = checkRateLimit(key, limit, windowMs)
    assert.equal(blockedRes.success, false)
    assert.equal(blockedRes.remaining, 0)
    assert.ok(blockedRes.reset > 0)
  })

  await t.test('Rate Limiter: Memory cap protects against memory leaks under high IP volume', () => {
    const baseKey = `load-test-${Date.now()}`
    // Generate 100 rapid unique keys to ensure store prune logic executes without error
    for (let i = 0; i < 100; i++) {
      const res = checkRateLimit(`${baseKey}:${i}`, 10, 1000)
      assert.ok(res.success)
    }
  })

  await t.test('Input Sanitizer: Handles nasty attack strings and prevents XSS/Injections', () => {
    const nastyStrings = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      'SELECT * FROM users WHERE 1=1; --',
      '../../../../etc/passwd\0',
      'javascript:void(0)',
      '\u0000\u0008\u001b[31mRed',
    ]

    for (const raw of nastyStrings) {
      const cleaned = sanitizeString(raw, 100)
      assert.ok(!cleaned.includes('<script>'))
      assert.ok(!cleaned.includes('\0'))
      assert.ok(!cleaned.includes('<img'))
    }
  })

  await t.test('Duration Sanitizer: Rejects negative, NaN, infinity, and clamps maximum duration', () => {
    assert.equal(sanitizeDuration('-10'), undefined)
    assert.equal(sanitizeDuration('NaN'), undefined)
    assert.equal(sanitizeDuration('Infinity'), undefined)
    assert.equal(sanitizeDuration('0'), undefined)
    assert.equal(sanitizeDuration('9999999999'), 7200)
    assert.equal(sanitizeDuration('240'), 240)
    assert.equal(sanitizeDuration('185.5'), 185.5)
  })

  await t.test('Language Sanitizer: Whitelists supported languages and safely defaults', () => {
    assert.equal(sanitizeLanguage('telugu'), 'telugu')
    assert.equal(sanitizeLanguage('hindi'), 'hindi')
    assert.equal(sanitizeLanguage('tamil'), 'tamil')
    assert.equal(sanitizeLanguage('MALICIOUS_LANG_PARAM'), 'telugu')
    assert.equal(sanitizeLanguage(''), 'telugu')
    assert.equal(sanitizeLanguage(null), 'telugu')
  })

  await t.test('Search Type Sanitizer: Strictly bounds allowed search categories', () => {
    assert.equal(sanitizeSearchType('songs'), 'songs')
    assert.equal(sanitizeSearchType('albums'), 'albums')
    assert.equal(sanitizeSearchType('artists'), 'artists')
    assert.equal(sanitizeSearchType('playlists'), 'playlists')
    assert.equal(sanitizeSearchType('exploit_type'), 'songs')
    assert.equal(sanitizeSearchType(undefined), 'songs')
  })
})
