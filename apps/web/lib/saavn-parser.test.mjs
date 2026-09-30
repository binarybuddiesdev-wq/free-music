import test from 'node:test'
import assert from 'node:assert/strict'
import CryptoJS from 'crypto-js'

// Mirror of decryptMediaUrl in saavn.ts
function decryptUrl(encrypted) {
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591')
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    )
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

// Mirror of decodeHtml in saavn.ts
function decodeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

test('Saavn Media Parser & Cryptography', async (t) => {
  await t.test('HTML entity decoding restores escaped symbols in titles and artists', () => {
    assert.equal(decodeHtml('Rock &amp; Roll'), 'Rock & Roll')
    assert.equal(decodeHtml('Can&#039;t Stop'), "Can't Stop")
    assert.equal(decodeHtml('&quot;Hello World&quot;'), '"Hello World"')
    assert.equal(decodeHtml(''), '')
  })

  await t.test('DES Decryptor handles malformed base64 strings gracefully without throwing', () => {
    assert.doesNotThrow(() => {
      const res = decryptUrl('not-valid-base64-!!!')
      assert.equal(typeof res, 'string')
    })
  })

  await t.test('Song format normalizer handles missing artist and album fallbacks', () => {
    const rawSong = {
      id: 'abc-123',
      song: 'Test Track',
      more_info: {},
    }

    const title = decodeHtml(rawSong.song || 'Unknown Title')
    const artist = decodeHtml(rawSong.more_info?.artistMap?.primary_artists?.[0]?.name || rawSong.more_info?.singers || 'Unknown Artist')
    const album = decodeHtml(rawSong.more_info?.album || '')

    assert.equal(title, 'Test Track')
    assert.equal(artist, 'Unknown Artist')
    assert.equal(album, '')
  })

  await t.test('Artwork URL upsizing transforms 50x50 / 150x150 to high-res 500x500', () => {
    const transformImage = (img) => {
      if (!img) return ''
      return img.replace(/150x150/g, '500x500').replace(/50x50/g, '500x500')
    }

    assert.equal(
      transformImage('https://c.saavncdn.com/123/art_150x150.jpg'),
      'https://c.saavncdn.com/123/art_500x500.jpg'
    )
    assert.equal(
      transformImage('https://c.saavncdn.com/123/art_50x50.jpg'),
      'https://c.saavncdn.com/123/art_500x500.jpg'
    )
    assert.equal(transformImage(null), '')
  })
})
