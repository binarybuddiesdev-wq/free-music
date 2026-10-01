/**
 * JioSaavn lists one recording under many ids (single, movie album, every
 * compilation playlist), often with slightly different durations. Identity for
 * display purposes is therefore title + artists, not id.
 *
 * Pure module: type-only imports (unit-tested with node --test).
 */
import type { Song } from '../types/music'

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export function songKey(song: Pick<Song, 'title' | 'artist'>): string {
  const artists = song.artist.split(',').map(norm).filter(Boolean).sort().join(',')
  return `${norm(song.title)}|${artists}`
}

/** Keeps the first occurrence of each song (by id and by title+artists), preserving order. */
export function dedupSongs<T extends Pick<Song, 'id' | 'title' | 'artist'>>(songs: T[]): T[] {
  const ids = new Set<string>()
  const keys = new Set<string>()
  return songs.filter((s) => {
    const key = songKey(s)
    if (ids.has(s.id) || keys.has(key)) return false
    ids.add(s.id)
    keys.add(key)
    return true
  })
}
