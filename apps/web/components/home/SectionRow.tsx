'use client'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { sessionPage } from '@/lib/session'
import { fetchSectionSongs } from '@/lib/home-feed'
import { useFreshSongs } from './useFreshSongs'
import { CarouselRow } from './CarouselRow'
import { SongCard } from './SongCard'
import { SkeletonCard } from './SkeletonCard'
import type { Song } from '@/types/music'

interface SectionRowProps {
  id: string
  title: string
  /** Temporary language chosen with a home chip; does not change the saved setting. */
  languageOverride?: string
}

export function SectionRow({ id, title, languageOverride }: SectionRowProps) {
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  const page = sessionPage(`section:${id}:${language}`)
  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', id, language, page],
    queryFn: () => fetchSectionSongs(id, language, page),
  })

  // One song shows once per page, even when it is listed under different ids
  const { songs, pending } = useFreshSongs(data?.songs)
  const loading = isLoading || pending

  if (!loading && songs.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{title}</h2>
      </div>

      <CarouselRow>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : songs.map((song, i) => (
              <SongCard key={song.id} song={song} queue={songs} index={i} />
            ))}
      </CarouselRow>
    </section>
  )
}
