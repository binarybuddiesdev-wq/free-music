'use client'
import { useRef, useMemo, useState, useEffect, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLibraryStore } from '@/stores/library.store'
import { useSettingsStore } from '@/stores/settings.store'
import { sessionPage } from '@/lib/session'
import { createSongSet, takeFresh } from '@/lib/song-dedup'
import { SeenSongsContext } from './SeenSongsContext'
import { CarouselRow } from './CarouselRow'
import { SongCard } from './SongCard'
import { SkeletonCard } from './SkeletonCard'
import type { Song } from '@/types/music'

// Extract the most-played artist from the last N songs in history
function getTopArtist(history: Song[]): string | null {
  if (history.length < 3) return null
  const counts: Record<string, number> = {}
  for (const s of history.slice(0, 50)) {
    const artist = s.artist.split(',')[0].trim() // take first artist if multiple
    counts[artist] = (counts[artist] ?? 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

export function ForYouSection({ languageOverride }: { languageOverride?: string }) {
  const history = useLibraryStore((s) => s.history)
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  const [topArtist, setTopArtist] = useState<string | null>(null)
  // Page range 1–3: deep pages of an artist search are mostly irrelevant
  const page = sessionPage(`for-you:${topArtist ?? ''}:${language}`, 3)
  const initializedRef = useRef(false)

  // Keep topArtist stable during the session
  useEffect(() => {
    if (history.length === 0) {
      setTopArtist(null)
      initializedRef.current = false
      return
    }
    if (!initializedRef.current && history.length >= 3) {
      const artist = getTopArtist(history)
      if (artist) {
        setTopArtist(artist)
        initializedRef.current = true
      }
    }
  }, [history])

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['for-you', topArtist, language, page],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(`${topArtist} ${language}`)}&lang=${language}&page=${page}`)
      if (!res.ok) throw new Error(`For you failed: HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!topArtist,
  })

  const seenIds = useContext(SeenSongsContext)
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => {
    if (!data?.songs) return
    const seen = seenIds?.current ?? createSongSet()
    const fresh = takeFresh(data.songs, seen)
    setSongs(fresh)
    return () => fresh.forEach((s) => seen.delete(s))
  }, [data, seenIds])

  if (!topArtist) return null

  if (!isLoading && songs.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>
            More of {topArtist}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Based on your recent listening</div>
        </div>
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
