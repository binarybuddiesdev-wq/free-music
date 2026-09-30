/** Lyrics timing helpers. Pure module: type-only imports (unit-tested with node --test). */
import type { LyricLine } from '../types/music'

/** Index of the last line with time <= t, or -1. `lines` must be sorted by time (parseLrc sorts). */
export function findActiveLine(lines: LyricLine[], t: number): number {
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= t) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
