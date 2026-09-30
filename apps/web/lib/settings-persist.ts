/**
 * Which settings survive a reload. A running sleep timer describes the current
 * session, not a preference — restoring it made an expired timer fire on reload.
 *
 * Pure module: no imports (unit-tested with node --test).
 */
export const SESSION_ONLY_SETTINGS = ['sleepTimer', 'sleepTimerEnd'] as const

function isSessionOnly(key: string): boolean {
  return (SESSION_ONLY_SETTINGS as readonly string[]).includes(key)
}

export function partializeSettings<T extends object>(state: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function' || isSessionOnly(key)) continue
    out[key] = value
  }
  return out as Partial<T>
}

/** Used as persist `merge`: also strips session-only keys written by older versions. */
export function mergeSettings<T extends object>(persisted: unknown, current: T): T {
  if (!persisted || typeof persisted !== 'object') return current
  return { ...current, ...partializeSettings(persisted as Partial<T>) }
}

export function isSleepTimerDue(end: number | null, now: number): boolean {
  return end !== null && end > 0 && now >= end
}
