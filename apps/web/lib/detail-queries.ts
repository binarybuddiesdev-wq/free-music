import type { Album, Song } from '@/types/music'

const FIVE_MINUTES = 5 * 60 * 1000

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

/** Shared by the album page and AlbumCard's play button so they reuse one cache entry. */
export function albumQuery(id: string) {
  return {
    queryKey: ['album', id] as const,
    queryFn: () => getJson<{ album?: Album | null; songs: Song[] }>(`/api/search?albumId=${encodeURIComponent(id)}`),
    staleTime: FIVE_MINUTES,
  }
}

/** Shared by the public playlist page and PlaylistCard's play button. */
export function publicPlaylistQuery(id: string) {
  return {
    queryKey: ['public-playlist', id] as const,
    queryFn: () => getJson<{ songs: Song[] }>(`/api/search?playlistId=${encodeURIComponent(id)}`),
    staleTime: FIVE_MINUTES,
  }
}
