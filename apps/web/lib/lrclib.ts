import type { LyricLine } from '@/types/music'
import { parseLrc } from './utils'

const BASE = 'https://lrclib.net/api'

interface LrcLibResponse {
  syncedLyrics?: string
  plainLyrics?: string
}

async function fetchLyrics(params: URLSearchParams): Promise<LrcLibResponse | null> {
  try {
    const res = await fetch(`${BASE}/get?${params}`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getLyrics(
  title: string,
  artist: string,
  duration?: number
): Promise<{ lines: LyricLine[]; plain: string; synced: boolean } | null> {
  const attempts = [
    new URLSearchParams({ track_name: title, artist_name: artist, ...(duration ? { duration: String(Math.round(duration)) } : {}) }),
    new URLSearchParams({ track_name: title, artist_name: artist }),
    new URLSearchParams({ track_name: title }),
  ]

  for (const params of attempts) {
    const data = await fetchLyrics(params)
    if (!data) continue

    if (data.syncedLyrics) {
      return { lines: parseLrc(data.syncedLyrics), plain: data.plainLyrics ?? '', synced: true }
    }
    if (data.plainLyrics) {
      return { lines: [], plain: data.plainLyrics, synced: false }
    }
  }

  return null
}
