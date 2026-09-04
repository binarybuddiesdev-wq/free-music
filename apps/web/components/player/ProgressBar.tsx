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

  const pct = duration ? (progress / duration) * 100 : 0

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    setHoverTime(ratio * duration)
    setHoverX(x)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {!compact && (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 11, minWidth: 32, textAlign: 'right' }}>
          {formatDuration(progress)}
        </span>
      )}
      <div
        ref={barRef}
        style={{ position: 'relative', flex: 1, height: compact ? 2 : 4, cursor: 'pointer' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* Track */}
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-active)', borderRadius: 2 }} />
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: hovering ? 'var(--accent)' : 'var(--text-primary)',
            borderRadius: 2,
            transition: hovering ? 'none' : 'width 0.1s',
          }}
        />
        {/* Thumb */}
        {hovering && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--text-primary)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Tooltip */}
        {hovering && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: hoverX,
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 3,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {formatDuration(hoverTime)}
          </div>
        )}
      </div>
      {!compact && (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 11, minWidth: 32 }}>
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}
