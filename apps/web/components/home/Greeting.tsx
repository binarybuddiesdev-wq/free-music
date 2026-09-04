'use client'
import { useMemo } from 'react'

export function Greeting() {
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.3px' }}>{greeting}</h1>
      <p style={{ color: '#aaa', fontSize: 14 }}>Music picked for you</p>
    </div>
  )
}
