'use client'
import { useState, useEffect, useRef, useContext } from 'react'
import { SeenSongsContext } from '@/components/home/SeenSongsContext'
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

function ListenAgainSection() {
  const history = useLibraryStore((s) => s.history)
  const seenIds = useContext(SeenSongsContext)
  const [songs, setSongs] = useState<Song[]>([])
  const initializedRef = useRef(false)

  // Keep carousel order stable during the session — don't jump card to #1 when clicked
  useEffect(() => {
    if (history.length === 0) {
      setSongs([])
      initializedRef.current = false
      return
    }
    if (!initializedRef.current && history.length > 0) {
      setSongs(dedupSongs(history).slice(0, 20))
      initializedRef.current = true
    }
  }, [history])

  // Reserve these songs so the sections below don't repeat them
  useEffect(() => {
    const seen = seenIds?.current
    if (!seen) return
    songs.forEach((s) => seen.add(s))
    return () => songs.forEach((s) => seen.delete(s))
  }, [songs, seenIds])

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
  const [seenIds] = useState(() => ({ current: createSongSet() }))
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
    <SeenSongsContext.Provider value={seenIds}>
      <div>
        <Greeting />
        <MoodChips active={activeMood} onSelect={handleSelectChip} />
        {isAllOrGeneral && (
          <>
            <ForYouSection languageOverride={chipLanguage} />
            <ListenAgainSection />
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
