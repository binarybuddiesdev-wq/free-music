'use client'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { SongCard } from '@/components/home/SongCard'
import { SkeletonCard } from '@/components/home/SkeletonCard'
import type { Song } from '@/types/music'

const MOODS = [
  { label: 'Happy', emoji: '😊', query: 'happy upbeat songs' },
  { label: 'Romantic', emoji: '❤️', query: 'romantic love songs' },
  { label: 'Devotional', emoji: '🙏', query: 'devotional songs' },
  { label: 'Sad', emoji: '😢', query: 'sad emotional songs' },
  { label: 'Party', emoji: '🎉', query: 'party dance songs' },
  { label: 'Chill', emoji: '😌', query: 'chill relaxing songs' },
  { label: 'Workout', emoji: '💪', query: 'workout motivation songs' },
  { label: 'Folk', emoji: '🎸', query: 'folk traditional songs' },
]

function MoodSection({ mood, language }: { mood: typeof MOODS[0]; language: string }) {
  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['explore', mood.query, language],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(mood.query + ' ' + language)}&lang=${language}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const songs = data?.songs ?? []

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
        {mood.emoji} {mood.label}
      </h2>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : songs.slice(0, 10).map((song, i) => (
              <SongCard key={song.id} song={song} queue={songs} index={i} />
            ))}
      </div>
    </section>
  )
}

export default function ExplorePage() {
  const language = useSettingsStore((s) => s.language)

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Explore</h1>
      {MOODS.map((mood) => (
        <MoodSection key={mood.label} mood={mood} language={language} />
      ))}
    </div>
  )
}
