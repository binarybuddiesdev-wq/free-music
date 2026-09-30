import test from 'node:test'
import assert from 'node:assert/strict'

// Mirror of parseLrc in lrclib.ts
function parseLrc(lrc) {
  if (!lrc) return []
  const lines = lrc.split('\n')
  const result = []
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const matches = [...trimmed.matchAll(timeRegex)]
    if (!matches.length) continue

    const text = trimmed.replace(timeRegex, '').trim()
    for (const match of matches) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const frac = parseInt(match[3], 10)
      const ms = match[3].length === 2 ? frac * 10 : frac
      const time = min * 60 + sec + ms / 1000
      result.push({ time, text })
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

test('LRCLIB Synced Lyrics Parsing & Synchronization', async (t) => {
  await t.test('Correctly parses standard 2-digit centisecond and 3-digit millisecond timestamps', () => {
    const rawLrc = `
[00:12.50]First line of the song
[00:15.200]Second line with millisecond precision
[01:02.05]One minute mark
    `
    const parsed = parseLrc(rawLrc)
    assert.equal(parsed.length, 3)
    assert.equal(parsed[0].time, 12.5)
    assert.equal(parsed[0].text, 'First line of the song')
    assert.equal(parsed[1].time, 15.2)
    assert.equal(parsed[2].time, 62.05)
  })

  await t.test('Ignores metadata headers and malformed timestamp tags', () => {
    const noisyLrc = `
[ti:Awesome Song]
[ar:Super Artist]
[al:Hit Album]
[by:Lyricist]
[invalid_tag]
[00:05.10]Actual lyric line
[99:99.99]Out of bounds line
    `
    const parsed = parseLrc(noisyLrc)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].text, 'Actual lyric line')
  })

  await t.test('Sorts out-of-order timestamp lines chronologically', () => {
    const scrambledLrc = `
[00:20.00]Line 3
[00:05.00]Line 1
[00:12.00]Line 2
    `
    const parsed = parseLrc(scrambledLrc)
    assert.equal(parsed[0].text, 'Line 1')
    assert.equal(parsed[1].text, 'Line 2')
    assert.equal(parsed[2].text, 'Line 3')
  })

  await t.test('Handles multi-timestamp lines (repeated chorus refrain)', () => {
    const repeatedLrc = `[00:10.00][00:30.00]Catchy Chorus Refrain`
    const parsed = parseLrc(repeatedLrc)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].time, 10)
    assert.equal(parsed[0].text, 'Catchy Chorus Refrain')
    assert.equal(parsed[1].time, 30)
    assert.equal(parsed[1].text, 'Catchy Chorus Refrain')
  })

  await t.test('Handles empty and whitespace strings without error', () => {
    assert.deepEqual(parseLrc(''), [])
    assert.deepEqual(parseLrc('   \n\n  \t '), [])
  })
})
