import { NextRequest, NextResponse } from 'next/server'
import {
  searchSongs,
  searchAlbums,
  searchArtists,
  searchPlaylists,
  getAlbumSongs,
  getPlaylistSongs,
  getArtistDetails,
  getSectionSongs,
  getSongRecommendations,
} from '@/lib/saavn'
import {
  sanitizeString,
  sanitizeSafeId,
  sanitizeLanguage,
  sanitizeSearchType,
  sanitizePage,
} from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  // 1. Rate Limiting Protection (DoS / Bot defense: 60 req/min per IP)
  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(`search:${clientIp}`, 60, 60000)

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset),
  }

  const successHeaders = {
    ...rateLimitHeaders,
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
  }

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', retryAfter: rateLimit.reset },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.reset),
        },
      }
    )
  }

  // 2. Input Validation & Sanitization (XSS, Injection, Boundary limits)
  const { searchParams } = req.nextUrl
  const q = sanitizeString(searchParams.get('q'), 150)
  const lang = sanitizeLanguage(searchParams.get('lang'))
  const section = sanitizeString(searchParams.get('section'), 50) || null
  const type = sanitizeSearchType(searchParams.get('type'))
  const page = sanitizePage(searchParams.get('page'))
  const albumId = sanitizeSafeId(searchParams.get('albumId'))
  const playlistId = sanitizeSafeId(searchParams.get('playlistId'))
  const artistId = sanitizeSafeId(searchParams.get('artistId'))
  const recommendSongId = sanitizeSafeId(searchParams.get('recommendSongId'))

  try {
    // 0. Recommendations / Radio mode lookup
    if (recommendSongId) {
      const artist = sanitizeString(searchParams.get('artist'), 100) || undefined
      const songs = await getSongRecommendations(recommendSongId, artist, lang)
      return NextResponse.json(
        { type: 'recommendations', page: 1, songs, results: songs },
        { headers: successHeaders }
      )
    }

    // 1. Specific album songs lookup
    if (albumId) {
      const songs = await getAlbumSongs(albumId)
      return NextResponse.json(
        { type: 'album_songs', page: 1, songs, results: songs },
        { headers: successHeaders }
      )
    }

    // 2. Specific playlist songs lookup
    if (playlistId) {
      const songs = await getPlaylistSongs(playlistId)
      return NextResponse.json(
        { type: 'playlist_songs', page: 1, songs, results: songs },
        { headers: successHeaders }
      )
    }

    // 3. Specific artist details lookup
    if (artistId) {
      const data = await getArtistDetails(artistId)
      return NextResponse.json(
        {
          type: 'artist_details',
          page: 1,
          artist: data.artist,
          songs: data.songs,
          albums: data.albums,
          results: data.songs,
        },
        { headers: successHeaders }
      )
    }

    // 4. Home section songs lookup
    if (section) {
      const songs = await getSectionSongs(section, lang, page)
      return NextResponse.json(
        { type: 'songs', page, songs, results: songs },
        { headers: successHeaders }
      )
    }

    // 5. Categorized searches
    switch (type) {
      case 'albums': {
        const albums = await searchAlbums(q, lang, page)
        return NextResponse.json(
          { type: 'albums', page, results: albums, albums, songs: [] },
          { headers: successHeaders }
        )
      }
      case 'artists': {
        const artists = await searchArtists(q, lang, page)
        return NextResponse.json(
          { type: 'artists', page, results: artists, artists, songs: [] },
          { headers: successHeaders }
        )
      }
      case 'playlists': {
        const playlists = await searchPlaylists(q, lang, page)
        return NextResponse.json(
          { type: 'playlists', page, results: playlists, playlists, songs: [] },
          { headers: successHeaders }
        )
      }
      case 'songs':
      default: {
        const songs = await searchSongs(q, lang, page)
        return NextResponse.json(
          { type: 'songs', page, results: songs, songs },
          { headers: successHeaders }
        )
      }
    }
  } catch (err) {
    logger.error('Error handling /api/search request', err, { q, type, page, lang })
    return NextResponse.json(
      { type, page, songs: [], albums: [], artists: [], playlists: [], results: [] },
      { status: 200, headers: successHeaders }
    )
  }
}
