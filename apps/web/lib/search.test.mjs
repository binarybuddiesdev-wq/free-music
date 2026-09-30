import test from 'node:test';
import assert from 'node:assert/strict';
import { preprocessQuery, calculateRelevance, isDiscoveryQuery } from './search-engine.ts';

test('isDiscoveryQuery accurately identifies discovery vs specific entity queries', () => {
  assert.equal(isDiscoveryQuery(['telugu', 'hits', '2025']), true);
  assert.equal(isDiscoveryQuery(['telugu', 'mass']), true);
  assert.equal(isDiscoveryQuery(['romantic', 'songs']), true);
  assert.equal(isDiscoveryQuery(['abhilasha']), false);
  assert.equal(isDiscoveryQuery(['pushpa', '2']), false);
  assert.equal(isDiscoveryQuery(['chiranjeevi']), false);
});

test('preprocessQuery fixes typos and extracts entities correctly', () => {
  const t1 = preprocessQuery('abhilasha move songs');
  assert.equal(t1.cleaned, 'abhilasha movie songs');
  assert.equal(t1.entity, 'abhilasha');
  assert.deepEqual(t1.coreWords, ['abhilasha']);

  const t2 = preprocessQuery('pushpa 2 move songs');
  assert.equal(t2.cleaned, 'pushpa 2 movie songs');
  assert.equal(t2.entity, 'pushpa 2');

  const t3 = preprocessQuery('chiranjeevi hit songs');
  assert.equal(t3.entity, 'chiranjeevi');

  const t4 = preprocessQuery('anirudh songs');
  assert.equal(t4.entity, 'anirudh');

  const t5 = preprocessQuery('telgu songes');
  assert.equal(t5.cleaned, 'telugu songs');

  const t6 = preprocessQuery('devara all songs jukebox');
  assert.equal(t6.entity, 'devara');
});

test('calculateRelevance accurately scores matching vs non-matching items', () => {
  const matchingSong = {
    title: 'Sande Poddula',
    subtitle: 'S.P. Balasubrahmanyam - Abhilasha',
    album: 'Abhilasha',
  };
  const unrelatedSong = {
    title: 'Move - Yeh Ishq Ishq',
    subtitle: 'Dhurandhar',
    album: 'Dhurandhar',
  };

  const scoreMatch = calculateRelevance(matchingSong, ['abhilasha']);
  const scoreUnrelated = calculateRelevance(unrelatedSong, ['abhilasha']);

  assert.ok(scoreMatch > 0, 'Matching song must have score > 0');
  assert.equal(scoreUnrelated, 0, 'Unrelated song must have score 0');
});
