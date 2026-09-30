import test from 'node:test'
import assert from 'node:assert/strict'

// Heuristic cleaning for YouTube video matching
function cleanTrackTitleForMatching(title) {
  if (!title) return ''
  return title
    .replace(/\s*\([^)]*(?:official|video|audio|lyric|remix|feat|ft|full song|hd|4k)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:official|video|audio|lyric|remix|feat|ft|full song|hd|4k)[^\]]*\]/gi, '')
    .trim()
}

// Video ID validation
function isValidYouTubeId(id) {
  if (typeof id !== 'string') return false
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

test('YouTube Matcher & Suggestion Parser', async (t) => {
  await t.test('Clean track title strips bracketed promotional noise for precise matching', () => {
    assert.equal(cleanTrackTitleForMatching('Fear Song (From "Devara") (Official Music Video)'), 'Fear Song (From "Devara")')
    assert.equal(cleanTrackTitleForMatching('Pushpa Pushpa [Lyric Video] [4K Ultra HD]'), 'Pushpa Pushpa')
    assert.equal(cleanTrackTitleForMatching('Chuttamalle (Audio) [Full Song]'), 'Chuttamalle')
  })

  await t.test('YouTube Video ID validator verifies standard 11-char alphanumeric identifiers', () => {
    assert.ok(isValidYouTubeId('dQw4w9WgXcQ'))
    assert.ok(isValidYouTubeId('9bZkp7q19f0'))
    assert.ok(isValidYouTubeId('a1b2c3d4e5f'))

    // Nasty / Invalid IDs
    assert.ok(!isValidYouTubeId('short'))
    assert.ok(!isValidYouTubeId('toolongvideoidentifier1234567'))
    assert.ok(!isValidYouTubeId('invalid@char!'))
    assert.ok(!isValidYouTubeId(''))
  })

  await t.test('Suggest parser extracts candidate strings from Google suggest query array', () => {
    const mockSuggestResponse = [
      'pushpa',
      [
        ['pushpa 2 songs', 0],
        ['pushpa pushpa', 0],
        ['pushpa 2 trailer', 0],
      ],
    ]

    const suggestions = Array.isArray(mockSuggestResponse[1])
      ? mockSuggestResponse[1].map((item) => (Array.isArray(item) ? item[0] : item))
      : []

    assert.equal(suggestions.length, 3)
    assert.equal(suggestions[0], 'pushpa 2 songs')
    assert.equal(suggestions[1], 'pushpa pushpa')
  })
})
