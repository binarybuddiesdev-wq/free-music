/** Pure volume/mute math. Pure module: no imports (unit-tested with node --test). */
export interface VolumeState {
  volume: number
  muted: boolean
}

export const DEFAULT_UNMUTE_VOLUME = 0.8

/** Mute never touches the stored volume, so unmute can restore it. */
export function toggleMuteState(s: VolumeState): VolumeState {
  if (s.muted) return { muted: false, volume: s.volume > 0 ? s.volume : DEFAULT_UNMUTE_VOLUME }
  return { muted: true, volume: s.volume }
}

export function setVolumeState(v: number): VolumeState {
  const volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
  return { volume, muted: volume === 0 }
}
