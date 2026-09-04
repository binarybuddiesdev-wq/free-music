'use client'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { SongCard } from './SongCard'
import { SkeletonCard } from './SkeletonCard'
import type { Song } from '@/types/music'

interface SectionRowProps {
  id: string
  title: string
}

export function SectionRow({ id, title }: SectionRowProps) {
  const language = useSettingsStore((s) => s.language)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', id, language],
    queryFn: () =>
      fetch(`/api/search?section=${id}&lang=${language}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const songs = data?.songs ?? []

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {songs.length > 0 && (
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}
            className="hover:text-[var(--text-primary)]"
          >
            See all
          </button>
        )}
      </div>

      <div
        className="no-scrollbar"
        style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : songs.map((song, i) => (
              <SongCard key={song.id} song={song} queue={songs} index={i} />
            ))}
      </div>
    </section>
  )
}
