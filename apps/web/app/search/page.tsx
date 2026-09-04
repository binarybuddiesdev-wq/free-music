'use client'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { SongCard } from '@/components/home/SongCard'
import { SkeletonCard } from '@/components/home/SkeletonCard'
import type { Song } from '@/types/music'
import { Suspense } from 'react'

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const language = useSettingsStore((s) => s.language)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['search', q, language],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${language}`).then((r) => r.json()),
    enabled: q.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  if (!q) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 500 }}>Search for songs, artists, albums</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8 }}>Find anything in millions of songs</div>
      </div>
    )
  }

  const songs = data?.songs ?? []

  return (
    <div>
      <h1 style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20, fontWeight: 400 }}>
        {isLoading ? 'Searching…' : `Results for "${q}"`}
      </h1>

      {isLoading ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : songs.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', marginTop: 40, fontSize: 15 }}>No results found for &quot;{q}&quot;</div>
      ) : (
        <>
          <h2 style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Songs</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {songs.map((song, i) => (
              <SongCard key={song.id} song={song} queue={songs} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
