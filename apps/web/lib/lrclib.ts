import { parseLrc } from './utils'
import { buildLyricsAttempts, pickLyrics, type LrcLibResponse, type LyricsResult } from './lyrics-sync'

const BASE = 'https://lrclib.net/api'

async function fetchLyrics(query: string): Promise<LrcLibResponse | null> {
  try {
    const res = await fetch(`${BASE}/get?${query}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    return (await res.json()) as LrcLibResponse
  } catch {
    return null
  }
}

/** All attempts run in parallel (worst case ~6 s instead of ~18 s); priority order decides the winner. */
export async function getLyrics(title: string, artist: string, duration?: number): Promise<LyricsResult | null> {
  const results = await Promise.all(buildLyricsAttempts(title, artist, duration).map(fetchLyrics))
  return pickLyrics(results, parseLrc)
}
