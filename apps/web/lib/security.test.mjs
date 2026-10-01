import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeString,
  sanitizeSafeId,
  sanitizeLanguage,
  sanitizeSearchType,
  sanitizePage,
  sanitizeDuration,
} from './security.ts'
import { checkRateLimit, resetRateLimiter } from './rate-limiter.ts'

test('sanitizeString strips null bytes, control characters, and HTML tags', () => {
  assert.equal(sanitizeString('hello\0world'), 'helloworld')
  assert.equal(sanitizeString('foo\x00bar\x1Fbaz'), 'foobarbaz')
  assert.equal(sanitizeString('<script>alert("xss")</script>Pushpa 2'), 'alert("xss")Pushpa 2')
  assert.equal(sanitizeString('javascript:stealData()'), 'stealData()')
  assert.equal(sanitizeString('   normal query   '), 'normal query')
})

test('sanitizeString truncates overly long queries to avoid ReDoS or memory exhaustion', () => {
  const longQuery = 'a'.repeat(500)
  const sanitized = sanitizeString(longQuery, 200)
  assert.equal(sanitized.length, 200)
  assert.equal(sanitizeString(null), '')
  assert.equal(sanitizeString(undefined), '')
})

test('sanitizeSafeId accepts safe alphanumeric IDs and rejects path traversal', () => {
  assert.equal(sanitizeSafeId('album_123-abc.45'), 'album_123-abc.45')
  assert.equal(sanitizeSafeId('xM2k9L_p0'), 'xM2k9L_p0')

  // Reject path traversal / directory injection
  assert.equal(sanitizeSafeId('../../etc/passwd'), null)
  assert.equal(sanitizeSafeId('..\\windows\\system32'), null)
  assert.equal(sanitizeSafeId('album/123'), null)

  // Reject SQL / script characters
  assert.equal(sanitizeSafeId('album; DROP TABLE users;--'), null)
  assert.equal(sanitizeSafeId('<script>'), null)
  assert.equal(sanitizeSafeId(''), null)
  assert.equal(sanitizeSafeId('a'.repeat(100)), null) // Length exceeds 64
})

test('sanitizeLanguage validates against allowlist and defaults safely', () => {
  assert.equal(sanitizeLanguage('telugu'), 'telugu')
  assert.equal(sanitizeLanguage('HINDI'), 'hindi')
  assert.equal(sanitizeLanguage('Tamil'), 'tamil')
  assert.equal(sanitizeLanguage('malicious_lang'), 'telugu')
  assert.equal(sanitizeLanguage(''), 'telugu')
  assert.equal(sanitizeLanguage(null), 'telugu')
})

test('sanitizeSearchType enforces valid search types', () => {
  assert.equal(sanitizeSearchType('songs'), 'songs')
  assert.equal(sanitizeSearchType('ALBUMS'), 'albums')
  assert.equal(sanitizeSearchType('artists'), 'artists')
  assert.equal(sanitizeSearchType('playlists'), 'playlists')
  assert.equal(sanitizeSearchType('malicious'), 'songs')
  assert.equal(sanitizeSearchType(undefined), 'songs')
})

test('sanitizePage bounds pagination between 1 and 50', () => {
  assert.equal(sanitizePage(1), 1)
  assert.equal(sanitizePage(10), 10)
  assert.equal(sanitizePage(0), 1)
  assert.equal(sanitizePage(-5), 1)
  assert.equal(sanitizePage(999999), 50)
  assert.equal(sanitizePage('3'), 3)
  assert.equal(sanitizePage('invalid'), 1)
})

test('sanitizeDuration bounds track duration safely', () => {
  assert.equal(sanitizeDuration(240), 240)
  assert.equal(sanitizeDuration('180.5'), 180.5)
  assert.equal(sanitizeDuration(-10), undefined)
  assert.equal(sanitizeDuration(0), undefined)
  assert.equal(sanitizeDuration(99999), 7200)
  assert.equal(sanitizeDuration(null), undefined)
})

test('checkRateLimit enforces sliding window limits per key and resets', () => {
  resetRateLimiter()
  const testKey = 'test-client-ip-1'

  // Allow up to 3 requests in a 10-second window
  const res1 = checkRateLimit(testKey, 3, 10000)
  assert.equal(res1.success, true)
  assert.equal(res1.remaining, 2)

  const res2 = checkRateLimit(testKey, 3, 10000)
  assert.equal(res2.success, true)
  assert.equal(res2.remaining, 1)

  const res3 = checkRateLimit(testKey, 3, 10000)
  assert.equal(res3.success, true)
  assert.equal(res3.remaining, 0)

  // 4th request exceeds limit
  const res4 = checkRateLimit(testKey, 3, 10000)
  assert.equal(res4.success, false)
  assert.equal(res4.remaining, 0)
  assert.ok(res4.reset > 0)

  // Different key has independent limit
  const resOther = checkRateLimit('different-client-ip', 3, 10000)
  assert.equal(resOther.success, true)
  assert.equal(resOther.remaining, 2)
})

test('production HTTP security headers and CSP are configured in next.config.ts', async () => {
  const nextConfigModule = await import('../next.config.ts')
  const nextConfig = nextConfigModule.default
  assert.ok(typeof nextConfig.headers === 'function', 'nextConfig.headers should be a function')

  const headersConfig = await nextConfig.headers()
  assert.ok(Array.isArray(headersConfig) && headersConfig.length > 0)

  const globalRule = headersConfig.find((r) => r.source === '/:path*')
  assert.ok(globalRule, 'Global header rule for /:path* should exist')

  const headerMap = new Map(globalRule.headers.map((h) => [h.key, h.value]))

  assert.equal(headerMap.get('X-Frame-Options'), 'SAMEORIGIN')
  assert.equal(headerMap.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headerMap.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.ok(headerMap.get('Strict-Transport-Security')?.includes('max-age=63072000'))
  assert.ok(headerMap.get('Content-Security-Policy')?.includes("default-src 'self'"))
  assert.ok(headerMap.get('Content-Security-Policy')?.includes("frame-ancestors 'self'"))
  assert.ok(headerMap.get('Permissions-Policy')?.includes('camera=()'))
  assert.ok(headerMap.get('Permissions-Policy')?.includes('microphone=()'))
})

test('sanitizeString keeps a stray "<" that is not an HTML tag', () => {
  assert.equal(sanitizeString('I <3 You'), 'I <3 You')
  assert.equal(sanitizeString('a < b'), 'a < b')
  assert.equal(sanitizeString('Song <Remix>'), 'Song')
  assert.equal(sanitizeString('hi <script'), 'hi')
})
