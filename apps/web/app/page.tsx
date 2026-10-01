'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { SeenSongsContext, type SeenSongs } from '@/components/home/SeenSongsContext'
import { createSongSet, dedupSongs } from '@/lib/song-dedup'
import { CarouselRow } from '@/components/home/CarouselRow'
import { SectionRow } from '@/components/home/SectionRow'
import { QuickPicksSection } from '@/components/home/QuickPicksSection'
import { Greeting } from '@/components/home/Greeting'
import { ForYouSection } from '@/components/home/ForYouSection'
import { SongCard } from '@/components/home/SongCard'
import { useLibraryStore } from '@/stores/library.store'
import { MoodChips } from '@/components/home/MoodChips'
import type { Song } from '@/types/music'

interface SectionConfig {
  id: string
  title: string
  moods: string[]
}

const ALL_SECTIONS: SectionConfig[] = [
  { id: 'new-releases',  title: 'New releases', moods: ['All', 'New releases', 'Trending'] },
  { id: 'trending',      title: 'Trending', moods: ['All', 'Trending', 'Party'] },
  { id: 'top-charts',    title: 'Top charts', moods: ['All', 'Trending'] },
  { id: 'workout',       title: 'Workout & Energy', moods: ['Workout'] },
  { id: 'party',         title: 'Party & Dance', moods: ['Party'] },
  { id: 'chill',         title: 'Chill & Relax', moods: ['Chill'] },
  { id: 'romance',       title: 'Romantic melodies', moods: ['All', 'Romantic', 'Chill'] },
  { id: 'mass-hits',     title: 'Mass hits', moods: ['All', 'Workout', 'Party'] },
  { id: 'classics',      title: 'Timeless classics', moods: ['All', 'Chill'] },
  { id: 'fresh-hits',    title: 'Fresh hits', moods: ['All', 'New releases', 'Workout'] },
  { id: 'throwback',     title: 'Throwback', moods: ['All'] },
  { id: 'devotional',    title: 'Devotional', moods: ['All', 'Devotional'] },
  { id: 'sad-songs',     title: 'Sad & Melancholy', moods: ['All', 'Sad', 'Chill'] },
]

/** Snapshot of the history, kept stable during the session: clicking a card must not jump it to #1. */
function useListenAgainSongs(): Song[] {
  const history = useLibraryStore((s) => s.history)
  const [songs, setSongs] = useState<Song[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    if (history.length === 0) {
      setSongs([])
      initializedRef.current = false
      return
    }
    if (!initializedRef.current) {
      setSongs(dedupSongs(history).slice(0, 20))
      initializedRef.current = true
    }
  }, [history])

  return songs
}

function ListenAgainSection({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.2px', marginBottom: 16 }}>Listen again</h2>
      <CarouselRow>
        {songs.map((song, i) => (
          <SongCard key={song.id} song={song} queue={songs} index={i} />
        ))}
      </CarouselRow>
    </section>
  )
}

export default function HomePage() {
  // Songs already shown on this page; every section filters against it so a song appears once
  const [seen] = useState(() => ({ current: createSongSet() }))
  // Reserved up front (not by effect order), so a section that loaded first cannot repeat these songs
  const listenAgainSongs = useListenAgainSongs()
  const seenSongs = useMemo<SeenSongs>(() => ({ seen, reserved: listenAgainSongs }), [seen, listenAgainSongs])
  const [activeMood, setActiveMood] = useState('All')
  // "Telugu"/"Hindi" chips filter this page only — they no longer overwrite the saved language
  const [chipLanguage, setChipLanguage] = useState<string | undefined>(undefined)

  const handleSelectChip = (chip: string) => {
    setActiveMood(chip)
    setChipLanguage(chip === 'Telugu' || chip === 'Hindi' ? chip.toLowerCase() : undefined)
  }

  const isAllOrGeneral = activeMood === 'All' || activeMood === 'Music' || activeMood === 'Telugu' || activeMood === 'Hindi'
  const visibleSections = isAllOrGeneral
    ? ALL_SECTIONS.filter((s) => s.moods.includes('All'))
    : ALL_SECTIONS.filter((s) => s.moods.includes(activeMood))

  return (
    <SeenSongsContext.Provider value={seenSongs}>
      <div>
        <Greeting />
        <MoodChips active={activeMood} onSelect={handleSelectChip} />
        {isAllOrGeneral && (
          <>
            <ForYouSection languageOverride={chipLanguage} />
            <ListenAgainSection songs={listenAgainSongs} />
            <QuickPicksSection languageOverride={chipLanguage} />
          </>
        )}
        {visibleSections.map((s) => (
          <SectionRow key={s.id} id={s.id} title={s.title} languageOverride={chipLanguage} />
        ))}
      </div>
    </SeenSongsContext.Provider>
  )
}
