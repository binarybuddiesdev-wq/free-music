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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.2px' }}>{title}</h2>
        {songs.length > 0 && (
          <button
            style={{
              padding: '6px 16px', borderRadius: 20,
              background: 'rgba(255,255,255,.1)', color: '#fff',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 0,
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
          >
            See all
          </button>
        )}
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          scrollBehavior: 'smooth', scrollSnapType: 'x mandatory',
          paddingBottom: 8, margin: '0 -24px',
          paddingLeft: 24, paddingRight: 24,
        }}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : songs.length === 0
            ? <p style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>No songs found</p>
            : songs.map((song, i) => (
                <SongCard key={song.id} song={song} queue={songs} index={i} />
              ))}
      </div>
    </section>
  )
}
