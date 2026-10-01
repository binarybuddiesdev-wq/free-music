/**
 * JioSaavn lists one recording under many ids (single, movie album, every
 * compilation playlist). The copies differ in id, in a `(From "...")` title
 * suffix, in extra credits on the artist string (lyricist, composer) and by a
 * second or two of duration. Two songs are "the same" for display when they
 * share the base title, share at least one artist and have (nearly) the same
 * duration. Remixes, lofi/reprise versions and re-recordings stay separate.
 *
 * Pure module: type-only imports (unit-tested with node --test).
 */
import type { Song } from '../types/music'

type Identity = Pick<Song, 'id' | 'title' | 'artist'> & { duration?: number }

const DURATION_TOLERANCE_SECONDS = 3

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Title without a `(From "...")` / `[Original ...]` / `- From "..."` suffix. */
function baseTitle(title: string): string {
  return norm(
    title
      .replace(/\s*[(\[]\s*(?:from|original)\b[^)\]]*[)\]]/gi, '')
      .replace(/\s+-\s*from\b.*$/i, '')
  )
}

/** "S.P. Balasubrahmanyam" and "S. P. Balasubrahmanyam" are the same person. */
const artistName = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function artistSet(artist: string): string[] {
  return artist.split(',').map(artistName).filter(Boolean)
}

/** Kept for callers that want a stable string key (exact title + artist set). */
export function songKey(song: Pick<Song, 'title' | 'artist'>): string {
  return `${norm(song.title)}|${artistSet(song.artist).sort().join(',')}`
}

export function isSameSong(a: Identity, b: Identity): boolean {
  if (a.id === b.id) return true
  if (baseTitle(a.title) !== baseTitle(b.title)) return false
  const da = a.duration ?? 0
  const db = b.duration ?? 0
  if (da > 0 && db > 0 && Math.abs(da - db) > DURATION_TOLERANCE_SECONDS) return false
  const artistsB = new Set(artistSet(b.artist))
  const artistsA = artistSet(a.artist)
  // No artist info on either side: the title and duration are all we have
  if (artistsA.length === 0 || artistsB.size === 0) return true
  return artistsA.some((x) => artistsB.has(x))
}

export interface SongSet {
  has(song: Identity): boolean
  add(song: Identity): void
  delete(song: Identity): void
}

/** Remembers songs across several lists so a song shows up once per page. */
export function createSongSet(): SongSet {
  const byTitle = new Map<string, Identity[]>()
  const bucket = (song: Identity) => baseTitle(song.title)
  return {
    has: (song) => (byTitle.get(bucket(song)) ?? []).some((other) => isSameSong(song, other)),
    add(song) {
      const key = bucket(song)
      const list = byTitle.get(key) ?? []
      if (!list.some((other) => isSameSong(song, other))) list.push(song)
      byTitle.set(key, list)
    },
    delete(song) {
      const key = bucket(song)
      const list = (byTitle.get(key) ?? []).filter((other) => other.id !== song.id)
      if (list.length > 0) byTitle.set(key, list)
      else byTitle.delete(key)
    },
  }
}

/** Returns the songs not yet in `seen` (also collapsing repeats inside `songs`) and records them. */
export function takeFresh<T extends Identity>(songs: T[], seen: SongSet, limit = Infinity): T[] {
  const fresh: T[] = []
  for (const song of songs) {
    if (fresh.length >= limit) break
    if (seen.has(song)) continue
    seen.add(song)
    fresh.push(song)
  }
  return fresh
}

/** Keeps the first occurrence of each song, preserving order. */
export function dedupSongs<T extends Identity>(songs: T[]): T[] {
  return takeFresh(songs, createSongSet())
}
