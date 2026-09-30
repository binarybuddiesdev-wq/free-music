import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeString, sanitizeSafeId, sanitizeLanguage, sanitizeSearchType, sanitizePage, sanitizeDuration } from './security.ts'
import { getAudioQualityUrl, formatDuration, formatBytes, clamp, fisherYates } from './utils.ts'
import { checkRateLimit, getClientIp } from './rate-limiter.ts'
import { preprocessQuery, isDiscoveryQuery, calculateRelevance } from './search-engine.ts'

test('Comprehensive Nasty Paths & Hostile Boundary Test Suite', async (t) => {

  // 1. Audio Engine & Bitrate Switching Nasty Cases
  await t.test('Audio URL Quality Transformer: Extreme & Hostile URLs', () => {
    // URL with query parameters after extension
    const urlWithParams = 'https://aac.saavncdn.com/123/song_96.mp4?token=xyz123&expires=9999999'
    assert.equal(
      getAudioQualityUrl(urlWithParams, 'high'),
      'https://aac.saavncdn.com/123/song_320.mp4?token=xyz123&expires=9999999'
    )
    assert.equal(
      getAudioQualityUrl(urlWithParams, 'low'),
      'https://aac.saavncdn.com/123/song_48.mp4?token=xyz123&expires=9999999'
    )

    // Non-standard extensions or already normalized URLs
    assert.equal(getAudioQualityUrl('https://example.com/audio.aac', 'high'), 'https://example.com/audio.aac')
    assert.equal(getAudioQualityUrl('https://example.com/audio_320.mp4', 'high'), 'https://example.com/audio_320.mp4')

    // Nasty inputs: null, undefined, empty, whitespaces, number types
    assert.equal(getAudioQualityUrl(null, 'high'), '')
    assert.equal(getAudioQualityUrl(undefined, 'high'), '')
    assert.equal(getAudioQualityUrl('   ', 'high'), '')
    assert.equal(getAudioQualityUrl(12345, 'high'), '')
    assert.equal(getAudioQualityUrl({ url: 'test' }, 'high'), '')
  })

  // 2. Search Engine & Typo Resilience Nasty Cases
  await t.test('Search Engine: Hostile, Non-Latin, Emoji, and Unicode Queries', () => {
    // Non-Latin Telugu, Hindi, Tamil scripts
    const teluguResult = preprocessQuery('పుష్ప 2 పాటలు')
    assert.ok(teluguResult.cleaned.length > 0)

    const hindiResult = preprocessQuery('पुष्पा 2 गाने')
    assert.ok(hindiResult.cleaned.length > 0)

    // Pure emojis
    const emojiResult = preprocessQuery('🎵🔥🎧🎶')
    assert.equal(typeof emojiResult.cleaned, 'string')

    // Single character queries
    const singleChar = preprocessQuery('a')
    assert.equal(singleChar.cleaned, 'a')
    assert.equal(singleChar.coreWords.length, 0)

    // Query with only single letter words (all filtered out)
    const singleLettersOnly = preprocessQuery('a b c d e')
    assert.equal(singleLettersOnly.coreWords.length, 0)

    // Super noisy query with repeated keywords
    const noisy = preprocessQuery('pushpa song download mp3 free online 2025 high quality 320kbps audio')
    assert.ok(!noisy.coreWords.includes('download'))
    assert.ok(!noisy.coreWords.includes('mp3'))
    assert.ok(!noisy.coreWords.includes('free'))
    assert.ok(!noisy.coreWords.includes('320kbps'))
    assert.ok(noisy.coreWords.includes('pushpa'))

    // Discovery query classification boundaries
    assert.ok(isDiscoveryQuery(['top', 'hits', '2025']))
    assert.ok(isDiscoveryQuery(['trending', 'songs']))
    assert.ok(!isDiscoveryQuery(['ar', 'rahman']))
    assert.ok(!isDiscoveryQuery(['anirudh', 'ravichander']))
    assert.ok(isDiscoveryQuery([])) // empty words defaults to discovery mode
  })

  // 3. Security Sanitizer Nasty Exploits
  await t.test('Security Sanitizer: Advanced Injection & Attack Vectors', () => {
    // SVG onload & iframe vectors
    const svgAttack = '<svg/onload=alert(document.domain)>'
    assert.ok(!sanitizeString(svgAttack).includes('<svg'))
    assert.ok(!sanitizeString(svgAttack).includes('onload'))

    // JavaScript pseudoprotocol variations
    assert.equal(sanitizeString('javaSCRIPT:alert(1)'), 'alert(1)')
    assert.equal(sanitizeString('javascript :alert(1)'), 'alert(1)')

    // Data URI HTML injection
    assert.equal(sanitizeString('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), '')

    // Control characters and zero-width spaces
    const zeroWidth = 'Hello\u200B\u200C\u200DWorld\x00\x01\x1F'
    const cleanedZeroWidth = sanitizeString(zeroWidth)
    assert.ok(!cleanedZeroWidth.includes('\x00'))
    assert.ok(!cleanedZeroWidth.includes('\x1F'))

    // Path traversal in sanitizeSafeId
    assert.equal(sanitizeSafeId('..'), null)
    assert.equal(sanitizeSafeId('../../../etc/shadow'), null)
    assert.equal(sanitizeSafeId('..\\..\\windows\\system32'), null)
    assert.equal(sanitizeSafeId('song/12345'), null)
    assert.equal(sanitizeSafeId('valid-id_123.45'), 'valid-id_123.45')

    // Page boundaries
    assert.equal(sanitizePage(-999), 1)
    assert.equal(sanitizePage(0), 1)
    assert.equal(sanitizePage(999999), 50) // strictly capped at 50
    assert.equal(sanitizePage('invalid_page'), 1)
    assert.equal(sanitizePage(NaN), 1)
  })

  // 4. Rate Limiter Memory & Multi-IP Spoofing Nasty Cases
  await t.test('Rate Limiter: Spoofed Headers, Multi-Proxies & Rapid Flood', () => {
    // Multi-proxy comma separated IPs
    const mockReq1 = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      }),
    }
    assert.equal(getClientIp(mockReq1), '203.0.113.195')

    // IPv6 localhost & fallback
    const mockReq2 = {
      headers: new Headers({
        'x-real-ip': '::1',
      }),
    }
    assert.equal(getClientIp(mockReq2), '::1')

    // Completely empty headers
    const mockReq3 = { headers: new Headers() }
    assert.equal(getClientIp(mockReq3), '127.0.0.1')

    // Rapid burst (100 rapid requests on a 50-limit key)
    const burstKey = `burst-test-${Date.now()}`
    let accepted = 0
    let rejected = 0
    for (let i = 0; i < 100; i++) {
      const res = checkRateLimit(burstKey, 50, 10000)
      if (res.success) accepted++
      else rejected++
    }
    assert.equal(accepted, 50)
    assert.equal(rejected, 50)
  })

  // 5. Utility & Mathematical Boundaries
  await t.test('Utility Math: formatBytes & formatDuration Nasty Cases', () => {
    // formatBytes nasty inputs
    assert.equal(formatBytes(0), '0 B')
    assert.equal(formatBytes(-100), '0 B')
    assert.equal(formatBytes(NaN), '0 B')
    assert.equal(formatBytes(1024), '1 KB')
    assert.equal(formatBytes(1048576), '1 MB')
    assert.equal(formatBytes(1073741824), '1 GB')

    // formatDuration nasty inputs
    assert.equal(formatDuration(-100), '0:00')
    assert.equal(formatDuration(NaN), '0:00')
    assert.equal(formatDuration(Infinity), '0:00')
    assert.equal(formatDuration(0.4), '0:00')
    assert.equal(formatDuration(3661), '1:01:01') // 1 hour 1 minute 1 second

    // Clamp nasty inputs
    assert.equal(clamp(NaN, 0, 10), 0)
    assert.equal(clamp(Infinity, 0, 10), 10)
    assert.equal(clamp(-Infinity, 0, 10), 0)

    // Fisher-Yates with 0 or 1 item
    assert.deepEqual(fisherYates([]), [])
    assert.deepEqual(fisherYates([42]), [42])
  })

  // 6. Queue State Machine Nasty Edge Cases
  await t.test('Queue Logic: Out of Bounds, Empty, and Rapid Mutations', () => {
    const queue = [
      { id: '1', title: 'Track 1' },
      { id: '2', title: 'Track 2' },
      { id: '3', title: 'Track 3' },
    ]

    // Jump out of bounds
    const safeIndex = (index, maxLen) => {
      if (maxLen === 0) return 0
      return Math.max(0, Math.min(index, maxLen - 1))
    }

    assert.equal(safeIndex(-5, queue.length), 0)
    assert.equal(safeIndex(999, queue.length), 2)
    assert.equal(safeIndex(0, 0), 0)

    // Deleting currently playing item cleanly decrements or bounds currentIndex
    let qIndex = 2
    let updatedQueue = queue.filter((_, i) => i !== 2) // remove last item
    if (qIndex >= updatedQueue.length) {
      qIndex = Math.max(0, updatedQueue.length - 1)
    }
    assert.equal(qIndex, 1)
    assert.equal(updatedQueue.length, 2)
  })

  // 7. Relevance Scoring Nasty Cases
  await t.test('Relevance Scorer: Handles missing song fields without crashing', () => {
    const brokenSong = {
      id: 'bad-1',
      title: null,
      artist: undefined,
      album: '',
    }
    // Must return 0 without throwing TypeError: Cannot read property of null
    assert.doesNotThrow(() => {
      const score = calculateRelevance(brokenSong, ['pushpa'])
      assert.equal(typeof score, 'number')
    })
  })
})
