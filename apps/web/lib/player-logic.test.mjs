import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleMuteState, setVolumeState, DEFAULT_UNMUTE_VOLUME } from './player-logic.ts'

test('muting keeps the previous volume', () => {
  assert.deepEqual(toggleMuteState({ muted: false, volume: 0.35 }), { muted: true, volume: 0.35 })
})

test('unmuting restores the previous volume', () => {
  const muted = toggleMuteState({ muted: false, volume: 0.35 })
  assert.deepEqual(toggleMuteState(muted), { muted: false, volume: 0.35 })
})

test('unmuting legacy state {muted:true, volume:0} restores an audible default', () => {
  assert.deepEqual(toggleMuteState({ muted: true, volume: 0 }), { muted: false, volume: DEFAULT_UNMUTE_VOLUME })
})

test('setVolumeState clamps and derives muted', () => {
  assert.deepEqual(setVolumeState(0.5), { volume: 0.5, muted: false })
  assert.deepEqual(setVolumeState(0), { volume: 0, muted: true })
  assert.deepEqual(setVolumeState(1.7), { volume: 1, muted: false })
  assert.deepEqual(setVolumeState(-2), { volume: 0, muted: true })
  assert.deepEqual(setVolumeState(Number.NaN), { volume: 0, muted: true })
})
