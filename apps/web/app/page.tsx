'use client'
import { SectionRow } from '@/components/home/SectionRow'
import { QuickPicksSection } from '@/components/home/QuickPicksSection'
import { Greeting } from '@/components/home/Greeting'
import { MoodChips } from '@/components/home/MoodChips'

const SECTIONS = [
  { id: 'listen-again',  title: 'Listen again' },
  { id: 'new-releases',  title: 'New releases' },
  { id: 'trending',      title: 'Trending' },
  { id: 'top-charts',    title: 'Top charts' },
  { id: 'classics',      title: 'Timeless classics' },
  { id: 'mass-hits',     title: 'Mass hits' },
  { id: 'romance',       title: 'Romantic' },
  { id: 'throwback',     title: 'Throwback' },
  { id: 'fresh-hits',    title: 'Fresh hits' },
  { id: 'devotional',    title: 'Devotional' },
  { id: 'sad-songs',     title: 'Sad songs' },
]

export default function HomePage() {
  return (
    <div>
      <Greeting />
      <MoodChips />
      <QuickPicksSection />
      {SECTIONS.map((s) => (
        <SectionRow key={s.id} id={s.id} title={s.title} />
      ))}
    </div>
  )
}
