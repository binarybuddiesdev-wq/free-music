'use client'
import { useRef, useState, useEffect, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { randomPage } from '@/lib/session'
import { SeenSongsContext } from './SeenSongsContext'
import { CarouselRow } from './CarouselRow'
import { SongCard } from './SongCard'
import { SkeletonCard } from './SkeletonCard'
import type { Song } from '@/types/music'

interface SectionRowProps {
  id: string
  title: string
}

export function SectionRow({ id, title }: SectionRowProps) {
  const language = useSettingsStore((s) => s.language)
  const page = useRef(randomPage()).current
  const seenIds = useContext(SeenSongsContext)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', id, language, page],
    queryFn: () =>
      fetch(`/api/search?section=${id}&lang=${language}&page=${page}`).then((r) => r.json()),
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    if (!data?.songs) return
    const seen = seenIds?.current ?? new Set<string>()
    const fresh = data.songs.filter((s) => !seen.has(s.id))
    fresh.forEach((s) => seen.add(s.id))
    setFilteredSongs(fresh)
    return () => {
      // Clean up on unmount so Strict Mode double-invoke stays correct
      fresh.forEach((s) => seen.delete(s.id))
    }
  }, [data, seenIds])

  const songs = filteredSongs

  if (!isLoading && songs.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{title}</h2>
      </div>

      <CarouselRow>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : songs.map((song, i) => (
              <SongCard key={song.id} song={song} queue={songs} index={i} />
            ))}
      </CarouselRow>
    </section>
  )
}
