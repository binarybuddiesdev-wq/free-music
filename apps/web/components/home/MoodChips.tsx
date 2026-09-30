'use client'
import { useState } from 'react'

const CHIPS = [
  'All', 'Music', 'Telugu', 'Hindi', 'Trending', 'New releases',
  'Chill', 'Workout', 'Romantic', 'Devotional', 'Party', 'Sad',
]

interface MoodChipsProps {
  active?: string
  onSelect?: (chip: string) => void
}

export function MoodChips({ active: controlledActive, onSelect }: MoodChipsProps = {}) {
  const [internalActive, setInternalActive] = useState('All')
  const active = controlledActive ?? internalActive

  const handleClick = (chip: string) => {
    if (controlledActive === undefined) {
      setInternalActive(chip)
    }
    onSelect?.(chip)
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }} className="no-scrollbar">
      {CHIPS.map((chip) => {
        const isActive = chip === active
        return (
          <button
            key={chip}
            onClick={() => handleClick(chip)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              fontFamily: 'Roboto, sans-serif', whiteSpace: 'nowrap',
              background: isActive ? 'var(--text-primary)' : 'var(--panel-bg)',
              color: isActive ? 'var(--bg-base)' : 'var(--text-primary)',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--border)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--panel-bg)' }}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
