'use client'
import { dedupSongs } from '@/lib/song-dedup'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSettingsStore } from '@/stores/settings.store'
import { SongCard } from '@/components/home/SongCard'
import { AlbumCard } from '@/components/search/AlbumCard'
import { ArtistCard } from '@/components/search/ArtistCard'
import { PlaylistCard } from '@/components/search/PlaylistCard'
import { SkeletonCard } from '@/components/home/SkeletonCard'
import type { Song, Album, Artist, SearchPlaylist } from '@/types/music'

const TABS = ['Songs', 'Albums', 'Artists', 'Playlists'] as const
type SearchTab = typeof TABS[number]

interface SearchResponse {
  type: string
  page?: number
  songs?: Song[]
  albums?: Album[]
  artists?: Artist[]
  playlists?: SearchPlaylist[]
  results?: unknown[]
}

function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const typeParam = (searchParams.get('type') ?? 'songs').toLowerCase()

  const validTab = TABS.find((t) => t.toLowerCase() === typeParam) ?? 'Songs'
  const [activeTab, setActiveTab] = useState<SearchTab>(validTab)

  const language = useSettingsStore((s) => s.language)

  // Pagination state
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  // Identifies the query/language/tab the list belongs to, so a slow "load more" for an old one is dropped
  const listKey = `${q}|${language}|${activeTab}`
  const listKeyRef = useRef(listKey)
  listKeyRef.current = listKey

  // Sync state if URL type changes
  useEffect(() => {
    const matched = TABS.find((t) => t.toLowerCase() === typeParam)
    if (matched && matched !== activeTab) {
      setActiveTab(matched)
    }
  }, [typeParam, activeTab])

  // Reset pagination when query, language, or tab changes
  useEffect(() => {
    setPage(1)
    setItems([])
    setHasMore(true)
  }, [q, language, activeTab])

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', tab.toLowerCase())
    router.replace(`/search?${params.toString()}`, { scroll: false })
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<SearchResponse>({
    queryKey: ['search', q, language, activeTab.toLowerCase()],
    queryFn: async ({ signal }) => {
      if (!q) return { type: activeTab.toLowerCase(), results: [] }
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&lang=${language}&type=${activeTab.toLowerCase()}&page=1`,
        { signal }
      )
      if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`)
      return res.json()
    },
    enabled: q.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  // Populate initial page results
  useEffect(() => {
    if (data) {
      const initialItems =
        activeTab === 'Songs'
          ? data.songs || (data.results as Song[] | undefined) || []
          : activeTab === 'Albums'
          ? data.albums || (data.results as Album[] | undefined) || []
          : activeTab === 'Artists'
          ? data.artists || (data.results as Artist[] | undefined) || []
          : data.playlists || (data.results as SearchPlaylist[] | undefined) || []

      setItems(initialItems)
      // A refetch replaces the list with page 1 again, so paging must restart too
      setPage(1)
      // The API returns deduplicated/filtered lists, so a short first page does not mean the end
      setHasMore(initialItems.length > 0)
    }
  }, [data, activeTab])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const requestKey = listKey
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&lang=${language}&type=${activeTab.toLowerCase()}&page=${nextPage}`
      )
      // A failed page is not the end of the list: keep "Load more" so the user can retry
      if (!res.ok) return
      const json: SearchResponse = await res.json()
      if (listKeyRef.current !== requestKey) return
      const newItems =
        activeTab === 'Songs'
          ? json.songs || (json.results as Song[] | undefined) || []
          : activeTab === 'Albums'
          ? json.albums || (json.results as Album[] | undefined) || []
          : activeTab === 'Artists'
          ? json.artists || (json.results as Artist[] | undefined) || []
          : json.playlists || (json.results as SearchPlaylist[] | undefined) || []

      if (newItems.length > 0) {
        const deduplicated =
          activeTab === 'Songs'
            ? dedupSongs([...(items as Song[]), ...(newItems as Song[])]).slice(items.length)
            : newItems.filter((x: any) => !new Set(items.map((i) => i.id)).has(x.id))
        if (deduplicated.length > 0) {
          setItems((prev) => [...prev, ...deduplicated])
          setPage(nextPage)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch {
      // Network error: leave hasMore as is so "Load more" can be retried
    } finally {
      setLoadingMore(false)
    }
  }

  if (!q) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Search for songs, albums, artists, or playlists
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Discover music in any language
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 64 }}>
      {/* ── Search Filter Tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                background: isActive ? 'var(--text-primary)' : 'var(--panel-bg)',
                color: isActive ? 'var(--bg-base)' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s ease',
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <h1 style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {isLoading ? 'Searching…' : `${activeTab} results for "${q}"`}
      </h1>

      {/* ── Loading State ── */}
      {isLoading ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 16 }}>
            Something went wrong while searching.
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            style={{
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '8px 22px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRefetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', marginTop: 40, fontSize: 15, textAlign: 'center' }}>
          No {activeTab.toLowerCase()} found for &quot;{q}&quot;
        </div>
      ) : (
        <div>
          {activeTab === 'Songs' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(items as Song[]).map((song, i) => (
                <SongCard key={song.id} song={song} queue={items as Song[]} index={i} />
              ))}
            </div>
          )}

          {activeTab === 'Albums' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(items as Album[]).map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}

          {activeTab === 'Artists' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(items as Artist[]).map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}

          {activeTab === 'Playlists' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(items as SearchPlaylist[]).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}

          {/* ── Pagination: Load More Button ── */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  background: 'var(--panel-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 24,
                  padding: '10px 32px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loadingMore ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'background .15s ease',
                }}
                onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { if (!loadingMore) e.currentTarget.style.background = 'var(--panel-bg)' }}
              >
                {loadingMore ? 'Loading more…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, color: 'var(--text-tertiary)' }}>Loading search…</div>}>
      <SearchResults />
    </Suspense>
  )
}
