'use client'
import { useState, useEffect, useRef } from 'react'
import { SeenSongsContext } from '@/components/home/SeenSongsContext'
import { CarouselRow } from '@/components/home/CarouselRow'
import { SectionRow } from '@/components/home/SectionRow'
import { QuickPicksSection } from '@/components/home/QuickPicksSection'
import { Greeting } from '@/components/home/Greeting'
import { ForYouSection } from '@/components/home/ForYouSection'
import { SongCard } from '@/components/home/SongCard'
import { useLibraryStore } from '@/stores/library.store'
import { MoodChips } from '@/components/home/MoodChips'
import { useSettingsStore } from '@/stores/settings.store'
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
      setSongs(history.slice(0, 20))
      initializedRef.current = true
    }
  }, [history])

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
  const seenIds = useRef(new Set<string>())
  const [activeMood, setActiveMood] = useState('All')
  const setLanguage = useSettingsStore((s) => s.setLanguage)

  const handleSelectChip = (chip: string) => {
    setActiveMood(chip)
    if (chip === 'Telugu' || chip === 'Hindi') {
      setLanguage(chip.toLowerCase())
    }
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
            <ForYouSection />
            <ListenAgainSection />
            <QuickPicksSection />
          </>
        )}
        {visibleSections.map((s) => (
          <SectionRow key={`${s.id}-${activeMood}`} id={s.id} title={s.title} />
        ))}
      </div>
    </SeenSongsContext.Provider>
  )
}
