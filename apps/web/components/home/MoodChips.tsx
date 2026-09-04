'use client'
import { useState } from 'react'

const CHIPS = [
  'All', 'Music', 'Telugu', 'Hindi', 'Trending', 'New releases',
  'Chill', 'Workout', 'Romantic', 'Devotional', 'Party', 'Sad',
]

export function MoodChips() {
  const [active, setActive] = useState('All')

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }} className="no-scrollbar">
      {CHIPS.map((chip) => {
        const isActive = chip === active
        return (
          <button
            key={chip}
            onClick={() => setActive(chip)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              fontFamily: 'Roboto, sans-serif', whiteSpace: 'nowrap',
              background: isActive ? '#fff' : 'rgba(255,255,255,.1)',
              color: isActive ? '#030303' : '#fff',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.18)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.1)' }}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
