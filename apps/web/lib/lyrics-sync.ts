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

export interface LrcLibResponse {
  syncedLyrics?: string | null
  plainLyrics?: string | null
}

export interface LyricsResult {
  lines: LyricLine[]
  plain: string
  synced: boolean
}

/** lrclib /get query strings, most specific first, without duplicates. */
export function buildLyricsAttempts(title: string, artist: string, duration?: number): string[] {
  const candidates: Array<Record<string, string>> = [
    { track_name: title, artist_name: artist, ...(duration ? { duration: String(Math.round(duration)) } : {}) },
    { track_name: title, artist_name: artist },
    { track_name: title },
  ]
  const out: string[] = []
  for (const c of candidates) {
    const params = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== ''))
    const qs = new URLSearchParams(params).toString()
    if (!out.includes(qs)) out.push(qs)
  }
  return out
}

/** First attempt (in priority order) with any lyrics wins; synced preferred within an attempt. */
export function pickLyrics(
  results: Array<LrcLibResponse | null>,
  parse: (lrc: string) => LyricLine[]
): LyricsResult | null {
  for (const data of results) {
    if (!data) continue
    if (data.syncedLyrics) return { lines: parse(data.syncedLyrics), plain: data.plainLyrics ?? '', synced: true }
    if (data.plainLyrics) return { lines: [], plain: data.plainLyrics, synced: false }
  }
  return null
}
