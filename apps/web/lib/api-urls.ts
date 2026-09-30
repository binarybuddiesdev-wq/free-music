/** Client-side URL builders for our own API routes. Pure module: type-only imports. */
import type { Song } from '../types/music'

export function recommendationsUrl(song: Pick<Song, 'id' | 'artist' | 'language'>): string {
  return `/api/search?recommendSongId=${encodeURIComponent(song.id)}&artist=${encodeURIComponent(song.artist)}&lang=${encodeURIComponent(song.language || 'telugu')}`
}
