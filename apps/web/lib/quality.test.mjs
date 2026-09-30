import test from 'node:test';
import assert from 'node:assert/strict';
import { getAudioQualityUrl } from './utils.ts';

test('getAudioQualityUrl transforms URLs correctly for each quality tier', () => {
  const sampleUrl = 'https://aac.saavncdn.com/218/3d34604c59ae05815f6ad40e90d970af_96.mp4';

  assert.equal(
    getAudioQualityUrl(sampleUrl, 'low'),
    'https://aac.saavncdn.com/218/3d34604c59ae05815f6ad40e90d970af_48.mp4',
    'low should map to _48.mp4'
  );

  assert.equal(
    getAudioQualityUrl(sampleUrl, 'normal'),
    'https://aac.saavncdn.com/218/3d34604c59ae05815f6ad40e90d970af_160.mp4',
    'normal should map to _160.mp4'
  );

  assert.equal(
    getAudioQualityUrl(sampleUrl, 'high'),
    'https://aac.saavncdn.com/218/3d34604c59ae05815f6ad40e90d970af_320.mp4',
    'high should map to _320.mp4'
  );
});

test('getAudioQualityUrl handles empty and edge-case URLs', () => {
  assert.equal(getAudioQualityUrl('', 'high'), '');
  assert.equal(getAudioQualityUrl(null, 'normal'), '');
  assert.equal(getAudioQualityUrl(undefined, 'low'), '');
});

test('getAudioQualityUrl works when starting from any bitrate tier', () => {
  const url320 = 'https://aac.saavncdn.com/abc/song_320.mp4';
  const url160 = 'https://aac.saavncdn.com/abc/song_160.mp4';
  const url48 = 'https://aac.saavncdn.com/abc/song_48.mp4';

  assert.equal(getAudioQualityUrl(url320, 'low'), 'https://aac.saavncdn.com/abc/song_48.mp4');
  assert.equal(getAudioQualityUrl(url160, 'high'), 'https://aac.saavncdn.com/abc/song_320.mp4');
  assert.equal(getAudioQualityUrl(url48, 'normal'), 'https://aac.saavncdn.com/abc/song_160.mp4');
});
