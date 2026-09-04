import { SectionRow } from '@/components/home/SectionRow'

const SECTIONS = [
  { id: 'listen-again', title: 'Listen again' },
  { id: 'new-releases', title: 'New releases' },
  { id: 'top-charts', title: 'Top charts' },
  { id: 'moods-moments', title: 'Moods & moments' },
]

export default function HomePage() {
  return (
    <div>
      {SECTIONS.map((s) => (
        <SectionRow key={s.id} id={s.id} title={s.title} />
      ))}
    </div>
  )
}
