/** Radio / autoplay list building. Pure module: type-only imports (unit-tested with node --test). */
import type { Song } from '../types/music'

const MAX_ARTIST_SONGS = 10

export function mergeRecommendations(opts: {
  seedId: string
  primaryArtist: string
  artistSongs: Song[]
  discoverySongs: Song[]
  limit?: number
  shuffle: <T>(items: T[]) => T[]
}): Song[] {
  const { seedId, primaryArtist, artistSongs, discoverySongs, limit = 25, shuffle } = opts
  const seen = new Set<string>([seedId])
  const take = (list: Song[]) =>
    list.filter((s) => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

  // A name search also returns songs that merely mention the artist — keep real matches only
  const artistLc = primaryArtist.trim().toLowerCase()
  const byArtist = artistLc ? artistSongs.filter((s) => s.artist.toLowerCase().includes(artistLc)) : []
  const artistPart = take(shuffle(byArtist)).slice(0, MAX_ARTIST_SONGS)
  const discoveryPart = take(shuffle(discoverySongs))

  const result: Song[] = []
  let a = 0
  let d = 0
  while (result.length < limit && (a < artistPart.length || d < discoveryPart.length)) {
    if (a < artistPart.length) result.push(artistPart[a++])
    for (let k = 0; k < 2 && d < discoveryPart.length && result.length < limit; k++) result.push(discoveryPart[d++])
  }
  return result.slice(0, limit)
}
