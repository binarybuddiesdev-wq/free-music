'use client'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'
import { useSettingsStore } from '@/stores/settings.store'
import { showToast } from '@/components/ui/Toast'
import { findActiveLine } from '@/lib/lyrics-sync'
import type { LyricLine } from '@/types/music'

const EMPTY_LINES: LyricLine[] = []

export function LyricsPanel() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const lyricsFontSize = useSettingsStore((s) => s.lyricsFontSize)
  const lyricsOffset = useSettingsStore((s) => s.lyricsOffset)
  const setLyricsOffset = useSettingsStore((s) => s.setLyricsOffset)
  const activeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lyrics', currentSong?.id],
    queryFn: async () => {
      if (!currentSong) return null
      const params = new URLSearchParams({
        title: currentSong.title,
        artist: currentSong.artist,
        duration: String(currentSong.duration),
      })
      const res = await fetch(`/api/lyrics?${params}`)
      const json = await res.json()
      return json.lyrics as { lines: LyricLine[]; plain: string; synced: boolean } | null
    },
    enabled: !!currentSong,
    staleTime: Infinity,
  })

  // Re-renders only when the highlighted line changes (not on every ~250 ms progress tick)
  const syncedLines = data?.synced ? data.lines : EMPTY_LINES
  const activeLine = usePlayerStore((s) =>
    findActiveLine(syncedLines, Math.max(0, s.progress + lyricsOffset))
  )

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLine])

  if (!currentSong) {
    return (
      <div style={centerStyle}>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Play a song to see lyrics</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 12 }}>Loading lyrics…</span>
      </div>
    )
  }

  if (!data || (!data.lines.length && !data.plain)) {
    return (
      <div style={centerStyle}>
        <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="48" height="48" style={{ marginBottom: 12 }}>
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No lyrics found for this song</span>
      </div>
    )
  }

  if (!data.synced) {
    return (
      <div
        ref={containerRef}
        style={{
          overflowY: 'auto',
          height: '100%',
          padding: '40px 32px',
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: lyricsFontSize,
          lineHeight: 2,
          whiteSpace: 'pre-line',
          textAlign: 'center',
        }}>
          {data.plain}
        </p>
      </div>
    )
  }

  const handleNudge = (delta: number) => {
    const nextOffset = Math.round((lyricsOffset + delta) * 10) / 10
    setLyricsOffset(nextOffset)
    const sign = nextOffset > 0 ? '+' : ''
    showToast(`Lyrics sync: ${sign}${nextOffset}s`)
  }

  const handleReset = () => {
    setLyricsOffset(0)
    showToast('Lyrics sync reset to 0.0s')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sync offset toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}>
        <span>Sync: {lyricsOffset > 0 ? `+${lyricsOffset}s` : `${lyricsOffset}s`}</span>
        <button
          onClick={() => handleNudge(-0.5)}
          style={syncBtnStyle}
          title="Delay lyrics highlight by 0.5s"
        >
          -0.5s
        </button>
        {lyricsOffset !== 0 && (
          <button
            onClick={handleReset}
            style={syncBtnStyle}
            title="Reset sync offset to 0"
          >
            Reset
          </button>
        )}
        <button
          onClick={() => handleNudge(0.5)}
          style={syncBtnStyle}
          title="Advance lyrics highlight by 0.5s"
        >
          +0.5s
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 28px',
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        {data.lines.map((line, i) => {
          const isActive = i === activeLine
          const isPast = i < activeLine
          const dist = Math.abs(i - activeLine)
          const opacity = isActive ? 1 : isPast ? Math.max(0.18, 0.55 - dist * 0.06) : Math.max(0.18, 0.45 - dist * 0.05)

          const baseSize = lyricsFontSize
          const activeSize = Math.round(baseSize * 1.3)
          const inactiveSize = baseSize

          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => {
                const { seek } = usePlayerStore.getState()
                seek(line.time)
              }}
              style={{
                fontSize: isActive ? activeSize : inactiveSize,
                fontWeight: isActive ? 700 : 500,
                color: 'var(--text-primary)',
                opacity,
                lineHeight: 1.5,
                padding: '6px 0',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'font-size 0.25s ease, opacity 0.25s ease, font-weight 0.25s ease',
                letterSpacing: isActive ? 0.2 : 0,
              }}
            >
              {line.text || ' '}
            </div>
          )
        })}
        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}

const syncBtnStyle: React.CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background .15s',
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: 8,
}

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: '2px solid var(--border)',
  borderTop: '2px solid var(--text-primary)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
