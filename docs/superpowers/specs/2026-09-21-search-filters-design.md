# Feature 6: Search Filters (Songs/Albums/Artists/Playlists) — Design Specification

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Effort**: Medium

---

## Objective
Add YTM-style filtered search with tabs: **Songs | Albums | Artists | Playlists**  
Each tab shows dedicated result cards, shares URL state (`?q=...&type=albums`), and supports pagination.

---

## API Changes

### `app/api/search/route.ts`
Extend to accept `type` query param:

```ts
// New imports needed
import { searchAlbums, searchArtists, searchPlaylists } from '@/lib/saavn'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const lang = searchParams.get('lang') ?? 'telugu'
  const type = searchParams.get('type') ?? 'songs'  // NEW
  const page = parseInt(searchParams.get('page') ?? '1')

  try {
    let songs: Song[] = []
    switch (type) {
      case 'albums':
        songs = await searchAlbums(q, lang, page)
        break
      case 'artists':
        songs = await searchArtists(q, lang, page)
        break
      case 'playlists':
        songs = await searchPlaylists(q, lang, page)
        break
      case 'songs':
      default:
        songs = await searchSongs(q, lang, page)
    }
    return NextResponse.json({ songs })
  } catch {
    return NextResponse.json({ songs: [] }, { status: 200 })
  }
}
```

---

## New Types (`types/music.ts`)

```ts
export interface Album {
  id: string
  title: string
  artist: string
  year?: string
  image: string
  songCount: number
}

export interface Artist {
  id: string
  name: string
  image: string
  subscriberCount?: number
  genres?: string[]
}

export interface Playlist {
  id: string
  title: string
  owner: string
  image: string
  songCount: number
}
```

---

## New Saavn Functions (`lib/saavn.ts`)

```ts
// Add to existing file

interface RawAlbum {
  id?: string
  title?: string
  subtitle?: string
  image?: string
  year?: string
  more_info?: {
    song_count?: string | number
  }
}

interface RawArtist {
  id?: string
  name?: string
  image?: string
  followers?: string
  genre?: string
}

interface RawPlaylist {
  id?: string
  title?: string
  subtitle?: string
  image?: string
  more_info?: {
    song_count?: string | number
  }
}

function normalizeAlbum(raw: RawAlbum): Album {
  return {
    id: String(raw.id),
    title: decodeHtml(raw.title ?? 'Unknown'),
    artist: decodeHtml(raw.subtitle ?? 'Various Artists'),
    year: raw.year?.toString(),
    image: hiResImage(raw.image ?? ''),
    songCount: Number(raw.more_info?.song_count ?? 0)
  }
}

function normalizeArtist(raw: RawArtist): Artist {
  return {
    id: String(raw.id),
    name: decodeHtml(raw.name ?? 'Unknown'),
    image: hiResImage(raw.image ?? ''),
    subscriberCount: raw.followers ? Number(raw.followers) : undefined,
    genres: raw.genre ? [raw.genre] : undefined
  }
}

function normalizePlaylist(raw: RawPlaylist): Playlist {
  return {
    id: String(raw.id),
    title: decodeHtml(raw.title ?? 'Unknown'),
    owner: decodeHtml(raw.subtitle ?? 'Unknown'),
    image: hiResImage(raw.image ?? ''),
    songCount: Number(raw.more_info?.song_count ?? 0)
  }
}

const BASE = 'https://www.jiosaavn.com/api.php'

async function jiosaavnSearchType(call: string, query: string, n = 40, p = 1): Promise<any[]> {
  const params = new URLSearchParams({
    __call: call,
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    q: query,
    n: String(n),
    p: String(p),
  })
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0...' },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return []
  const json = await res.json()
  return json?.results ?? []
}

export async function searchAlbums(query: string, language: string, page = 1): Promise<Album[]> {
  const results = await jiosaavnSearchType('search.getAlbumResults', query, 40, page)
  return results.filter((r: any) => r.type === 'album').map(normalizeAlbum)
}

export async function searchArtists(query: string, language: string, page = 1): Promise<Artist[]> {
  const results = await jiosaavnSearchType('search.getArtistResults', query, 40, page)
  return results.filter((r: any) => r.type === 'artist').map(normalizeArtist)
}

export async function searchPlaylists(query: string, language: string, page = 1): Promise<Playlist[]> {
  const results = await jiosaavnSearchType('search.getPlaylistResults', query, 40, page)
  return results.filter((r: any) => r.type === 'playlist').map(normalizePlaylist)
}
```

---

## New Components

### `components/search/AlbumCard.tsx`
```tsx
'use client'
import Image from 'next/image'
import { usePlayerStore } from '@/stores/player.store'
import type { Album } from '@/types/music'
import { formatDuration } from '@/lib/utils'

interface AlbumCardProps {
  album: Album
}

export function AlbumCard({ album }: AlbumCardProps) {
  const playSong = usePlayerStore((s) => s.playSong)

  return (
    <div
      style={{ width: 160, flexShrink: 0, cursor: 'pointer' }}
      onClick={() => { /* navigate to /album/[id] — future */ }}
      title={album.title}
    >
      <div style={{ position: 'relative', width: 160, height: 160, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}>
        {album.image && <Image src={album.image} alt={album.title} fill sizes="160px" style={{ objectFit: 'cover' }} unoptimized />}
      </div>
      <div style={{ marginTop: 8, textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {album.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
          {album.artist}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
          {album.songCount} song{album.songCount !== 1 ? 's' : ''}{album.year ? ` · ${album.year}` : ''}
        </div>
      </div>
    </div>
  )
}
```

### `components/search/ArtistCard.tsx`
```tsx
'use client'
import Image from 'next/image'
import type { Artist } from '@/types/music'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <div style={{ width: 160, flexShrink: 0, cursor: 'pointer', textAlign: 'center' }} title={artist.name}>
      <div style={{ width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', margin: '0 auto' }}>
        {artist.image && <Image src={artist.image} alt={artist.name} fill sizes="160px" style={{ objectFit: 'cover' }} unoptimized />}
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {artist.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>
          {artist.genres?.[0] ? `${artist.genres[0]} artist` : 'Artist'}
          {artist.subscriberCount ? ` · ${(artist.subscriberCount / 1e6).toFixed(1)}M subscribers` : ''}
        </div>
      </div>
    </div>
  )
}
```

### `components/search/PlaylistCard.tsx`
```tsx
'use client'
import Image from 'next/image'
import { usePlayerStore } from '@/stores/player.store'
import type { Playlist } from '@/types/music'

interface PlaylistCardProps {
  playlist: Playlist
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const playSong = usePlayerStore((s) => s.playSong)

  return (
    <div
      style={{ width: 160, flexShrink: 0, cursor: 'pointer' }}
      onClick={() => { /* navigate to /playlist/[id] */ }}
      title={playlist.title}
    >
      <div style={{ position: 'relative', width: 160, height: 160, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}>
        {playlist.image && <Image src={playlist.image} alt={playlist.title} fill sizes="160px" style={{ objectFit: 'cover' }} unoptimized />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,.6))' }} />
      </div>
      <div style={{ marginTop: 8, textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {playlist.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
          {playlist.owner}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
          {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
```

---

## Updated Search Page (`app/search/page.tsx`)

```tsx
'use client'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { SongCard } from '@/components/home/SongCard'
import { AlbumCard } from '@/components/search/AlbumCard'
import { ArtistCard } from '@/components/search/ArtistCard'
import { PlaylistCard } from '@/components/search/PlaylistCard'
import { SkeletonCard } from '@/components/home/SkeletonCard'
import type { Song, Album, Artist, Playlist } from '@/types/music'
import { Suspense, useState, useEffect } from 'react'

const TABS = ['Songs', 'Albums', 'Artists', 'Playlists'] as const
type Tab = typeof TABS[number]

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const type = (searchParams.get('type') as Tab) ?? 'Songs'
  const language = useSettingsStore((s) => s.language)

  const [activeTab, setActiveTab] = useState<Tab>(type)

  // Sync URL with tab
  useEffect(() => {
    if (TABS.includes(type)) setActiveTab(type)
  }, [type])

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<{ songs: Song[] }>({
    queryKey: ['search', q, language, activeTab],
    queryFn: async () => {
      if (!q) return { songs: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${language}&type=${activeTab.toLowerCase()}`)
      return res.json()
    },
    enabled: q.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  if (!q) return <EmptySearchState />

  const songs = data?.songs ?? []

  const renderResults = () => {
    if (isLoading) return <SkeletonGrid count={activeTab === 'Songs' ? 12 : 8} />
    if (isError) return <ErrorState refetch={refetch} isRefetching={isRefetching} />
    if (songs.length === 0) return <NoResults q={q} />

    switch (activeTab) {
      case 'Songs':
        return (
          <>
            <h2 className="section-title">Songs</h2>
            <div className="song-grid">
              {songs.map((song, i) => (
                <SongCard key={song.id} song={song} queue={songs} index={i} />
              ))}
            </div>
          </>
        )
      case 'Albums':
        return (
          <>
            <h2 className="section-title">Albums</h2>
            <div className="card-grid">
              {songs.map((album: Album) => <AlbumCard key={album.id} album={album} />)}
            </div>
          </>
        )
      case 'Artists':
        return (
          <>
            <h2 className="section-title">Artists</h2>
            <div className="card-grid">
              {songs.map((artist: Artist) => <ArtistCard key={artist.id} artist={artist} />)}
            </div>
          </>
        )
      case 'Playlists':
        return (
          <>
            <h2 className="section-title">Playlists</h2>
            <div className="card-grid">
              {songs.map((playlist: Playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
            </div>
          </>
        )
    }
  }

  return <div>{renderResults()}</div>
}

export default function SearchPage() {
  return <Suspense fallback={<SkeletonGrid count={12} /> }><SearchResults /></Suspense>
}
```

---

## URL Sync & Shareable Links
- `?q=arijit&type=albums` → opens Albums tab
- `?q=arijit&type=artists` → opens Artists tab
- Tab change updates URL via `router.replace()` (no full reload)

---

## Verification Checklist

| Test | Expected |
|------|----------|
| Search "arijit" default → Songs tab | Grid of `SongCard` |
| Click Albums tab | Fetches `/api/search?type=albums`, shows `AlbumCard` grid |
| Click Artists tab | Shows `ArtistCard` grid with circular avatars |
| Click Playlists tab | Shows `PlaylistCard` grid |
| URL updates on tab switch | `?q=...&type=albums` etc. |
| Direct URL with `type` param | Opens correct tab |
| Pagination works per tab | Page param passed to API |
| Error/retry works per tab | Per-tab error state |
| Loading skeletons match card type | Album/Artist/Playlist skeletons |

---

## Files Summary

| Path | Action |
|------|--------|
| `types/music.ts` | Add `Album`, `Artist`, `Playlist` interfaces |
| `lib/saavn.ts` | Add `searchAlbums`, `searchArtists`, `searchPlaylists` |
| `app/api/search/route.ts` | Handle `type` param, dispatch to new functions |
| `components/search/AlbumCard.tsx` | New |
| `components/search/ArtistCard.tsx` | New |
| `components/search/PlaylistCard.tsx` | New |
| `app/search/page.tsx` | Add tabs, conditional rendering, URL sync |

---

## Dependencies
No new npm packages required. Uses existing `next`, `react-query`, `zustand`.