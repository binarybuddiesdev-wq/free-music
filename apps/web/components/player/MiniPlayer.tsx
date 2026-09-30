'use client'
import Image from 'next/image'
import { useRef, useState, forwardRef } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useLibraryStore } from '@/stores/library.store'
import { useUIStore } from '@/stores/ui.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration } from '@/lib/utils'

export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLoading = usePlayerStore((s) => s.isLoading)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setExpanded = usePlayerStore((s) => s.setExpanded)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const liked = useLibraryStore((s) => (currentSong ? Boolean(s.likedSongs[currentSong.id]) : false))
  const toggleQueue = useUIStore((s) => s.toggleQueue)

  const moreRef = useRef<HTMLButtonElement>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)

  if (!currentSong) return null

  const subtitle = [currentSong.artist, currentSong.album, currentSong.year].filter(Boolean).join(' • ')

  return (
  <>
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
      background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', userSelect: 'none',
      transition: 'background-color .2s ease, border-color .2s ease',
      paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
    }}>
      {/* ── Red progress bar — sits at top edge of player ── */}
      <MiniProgressBar />

      {/* ── Main bar ── */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8 }}>

        {/* ── LEFT: prev / play / next + timestamp ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <IcoBtn onClick={prev} title="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </IcoBtn>
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
          >
            {isLoading ? (
              <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTop: '2px solid var(--text-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '3px' }} />
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <IcoBtn onClick={next} title="Next">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </IcoBtn>
          <PlaybackTime />
        </div>

        {/* ── CENTER: thumbnail + title + artist•album•year ── */}
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', minWidth: 0, padding: '0 24px', cursor: 'pointer' }}
          onClick={() => setExpanded(true)}
        >
          <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--panel-bg)' }}>
            {currentSong.image && <Image src={currentSong.image} alt={currentSong.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />}
          </div>
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong.title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: like · dislike · more · volume · repeat · shuffle · expand ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
<IcoBtn onClick={() => toggleLike(currentSong)} title={liked ? 'Unlike' : 'Like'} active={liked}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/></svg>
          </IcoBtn>
          <IcoBtn
            ref={moreRef}
            onClick={() => {
              const rect = moreRef.current?.getBoundingClientRect()
              if (rect) setCtx({ x: rect.left, y: rect.top - 8 })
            }}
            title="More options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </IcoBtn>
          {/* Volume: icon toggles mute, slider controls level */}
          <div className="mp-hide-xs" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IcoBtn onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
              {(muted || volume === 0)
                ? <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                : volume < 0.5
                ? <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              }
            </IcoBtn>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume level"
              style={{ width: 72, accentColor: '#ff0000', cursor: 'pointer' }}
            />
          </div>

          {/* Repeat — shows "1" badge when in repeat-one mode */}
          <span className="mp-hide-mid" style={{ display: 'inline-flex' }}>
          <IcoBtn active={repeatMode !== 'none'} onClick={toggleRepeat} title={repeatMode === 'none' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}>
            <div style={{ position: 'relative', display: 'flex' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
              {repeatMode === 'one' && (
                <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 8, fontWeight: 800, color: '#fff', background: '#cc0000', borderRadius: 3, padding: '0 2px', lineHeight: '12px' }}>1</span>
              )}
            </div>
          </IcoBtn>
        </span>

          <span className="mp-hide-mid" style={{ display: 'inline-flex' }}>
          <IcoBtn active={shuffleOn} onClick={toggleShuffle} title={shuffleOn ? 'Shuffle on' : 'Shuffle off'}>
            <div style={{ position: 'relative', display: 'flex' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              {shuffleOn && (
                <span style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--text-primary)' }} />
              )}
            </div>
          </IcoBtn>
        </span>
          {/* Expand/collapse arrow */}
          <IcoBtn onClick={toggleQueue} title="Open queue">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </IcoBtn>
          <IcoBtn onClick={() => setExpanded(!isExpanded)} title={isExpanded ? 'Minimize player' : 'Expand player'}>
            {isExpanded
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            }
          </IcoBtn>
        </div>
      </div>
    </div>

    {ctx && currentSong && (
      <ContextMenu song={currentSong} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />
    )}
  </>
  )
}

/** Owns the ~4 Hz progress subscription so the rest of the mini player doesn't re-render. */
function MiniProgressBar() {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)
  const barRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0

  function seekFromClientX(clientX: number) {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seek(fraction * duration)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!duration) return
    isDraggingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    seekFromClientX(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    seekFromClientX(e.clientX)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      aria-valuenow={Math.round(progress || 0)}
      aria-valuetext={`${formatDuration(progress)} of ${formatDuration(duration)}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!duration) return
        if (e.key === 'ArrowRight') seek(Math.min(duration, progress + 5))
        if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 5))
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ width: '100%', height: 6, padding: '1.5px 0', background: 'transparent', cursor: 'pointer', position: 'relative', touchAction: 'none' }}
    >
      <div style={{ width: '100%', height: 3, background: 'var(--panel-bg)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#f00', transition: isDraggingRef.current ? 'none' : 'width .1s linear' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: '#f00', boxShadow: '0 0 3px rgba(255,0,0,.6)' }} />
      </div>
    </div>
  )
}

/** Re-renders once per second (whole seconds), not on every progress tick. */
function PlaybackTime() {
  const seconds = usePlayerStore((s) => Math.floor(s.progress))
  const duration = usePlayerStore((s) => s.duration)
  return (
    <span className="mp-hide-mid" style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: .2 }}>
      {formatDuration(seconds)}&nbsp;/&nbsp;{formatDuration(duration)}
    </span>
  )
}

const IcoBtn = forwardRef<HTMLButtonElement, { onClick?: () => void; children: React.ReactNode; title?: string; active?: boolean }>(
  function IcoBtn({ onClick, children, title, active }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        title={title}
        aria-label={title}
        style={{
          background: 'transparent', border: 0, padding: 9, borderRadius: '50%',
          color: active ? '#ff0000' : 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .12s, background .12s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--panel-bg)' }}
        onMouseLeave={e => { e.currentTarget.style.color = active ? '#ff0000' : 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
      >
        {children}
      </button>
    )
  }
)
