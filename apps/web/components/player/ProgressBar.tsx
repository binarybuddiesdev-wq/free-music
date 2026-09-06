'use client'
import { useState, useRef } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { formatDuration } from '@/lib/utils'

export function ProgressBar({ compact = false }: { compact?: boolean }) {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)
  const [hovering, setHovering] = useState(false)
  const [hoverTime, setHoverTime] = useState(0)
  const [hoverX, setHoverX] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)

  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverTime(Math.max(0, Math.min(1, x / rect.width)) * duration)
    setHoverX(x)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      {/* Elapsed */}
      {!compact && (
        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatDuration(progress)}
        </span>
      )}

      {/* Bar */}
      <div
        ref={barRef}
        style={{ position: 'relative', flex: 1, height: hovering ? 5 : 3, cursor: 'pointer', transition: 'height .1s' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* Track */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.2)', borderRadius: 3 }} />
        {/* Fill — YouTube red */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#f00', borderRadius: 3, transition: hovering ? 'none' : 'width .12s linear' }} />
        {/* Thumb — appears on hover */}
        {hovering && (
          <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%)', width: 13, height: 13, borderRadius: '50%', background: '#fff', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
        )}
        {/* Hover tooltip */}
        {hovering && duration > 0 && (
          <div style={{ position: 'absolute', bottom: 12, left: Math.min(Math.max(hoverX, 24), (barRef.current?.offsetWidth ?? 0) - 24), transform: 'translateX(-50%)', background: 'rgba(0,0,0,.85)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 3, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {formatDuration(hoverTime)}
          </div>
        )}
      </div>

      {/* Total duration */}
      {!compact && (
        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, minWidth: 34, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}
