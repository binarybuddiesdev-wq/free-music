import test from 'node:test'
import assert from 'node:assert/strict'
import { sizedImage } from './utils.ts'

test('sizedImage rewrites JioSaavn artwork sizes', () => {
  assert.equal(sizedImage('https://c.saavncdn.com/123/Song-500x500.jpg', 150), 'https://c.saavncdn.com/123/Song-150x150.jpg')
  assert.equal(sizedImage('https://c.saavncdn.com/123/Song-50x50.jpg', 500), 'https://c.saavncdn.com/123/Song-500x500.jpg')
})

test('sizedImage leaves other URLs and empty input alone', () => {
  assert.equal(sizedImage('https://i.ytimg.com/vi/x/hqdefault.jpg', 150), 'https://i.ytimg.com/vi/x/hqdefault.jpg')
  assert.equal(sizedImage('', 150), '')
})
