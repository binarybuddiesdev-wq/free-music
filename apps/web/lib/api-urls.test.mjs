import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendationsUrl } from './api-urls.ts'

test('recommendationsUrl encodes all params', () => {
  assert.equal(
    recommendationsUrl({ id: 'a b', artist: 'S. P. Balu & Co', language: 'telugu' }),
    '/api/search?recommendSongId=a%20b&artist=S.%20P.%20Balu%20%26%20Co&lang=telugu'
  )
})

test('recommendationsUrl defaults language to telugu', () => {
  assert.match(recommendationsUrl({ id: '1', artist: 'x', language: '' }), /&lang=telugu$/)
})
