'use client'
import Image from 'next/image'
import { useRef } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useLibraryStore } from '@/stores/library.store'
import { formatDuration } from '@/lib/utils'

export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setExpanded = usePlayerStore((s) => s.setExpanded)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const isLiked = useLibraryStore((s) => s.isLiked)

  const barRef = useRef<HTMLDivElement>(null)
  const liked = currentSong ? isLiked(currentSong.id) : false
  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0

  if (!currentSong) return null

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration)
  }

  const subtitle = [currentSong.artist, currentSong.album, currentSong.year].filter(Boolean).join(' • ')

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
      background: '#030303', userSelect: 'none',
    }}>
      {/* ── Red progress bar — sits at top edge of player ── */}
      <div
        ref={barRef}
        onClick={handleSeek}
        style={{ width: '100%', height: 3, background: 'rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative' }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#f00', transition: 'width .1s linear' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: '#f00', boxShadow: '0 0 3px rgba(255,0,0,.6)' }} />
      </div>

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
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
          >
            {isPlaying
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <IcoBtn onClick={next} title="Next">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </IcoBtn>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', whiteSpace: 'nowrap', marginLeft: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: .2 }}>
            {formatDuration(progress)}&nbsp;/&nbsp;{formatDuration(duration)}
          </span>
        </div>

        {/* ── CENTER: thumbnail + title + artist•album•year ── */}
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', minWidth: 0, padding: '0 24px', cursor: 'pointer' }}
          onClick={() => setExpanded(true)}
        >
          <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1a1a1a' }}>
            {currentSong.image && <Image src={currentSong.image} alt={currentSong.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />}
          </div>
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong.title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
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
          <IcoBtn onClick={() => {}} title="Dislike">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1.91l.01.01L1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
          </IcoBtn>
          <IcoBtn onClick={() => {}} title="More options">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </IcoBtn>
          <IcoBtn onClick={() => {}} title="Volume">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          </IcoBtn>
          <IcoBtn active={repeatMode !== 'none'} onClick={toggleRepeat} title="Repeat">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          </IcoBtn>
          <IcoBtn active={shuffleOn} onClick={toggleShuffle} title="Shuffle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
          </IcoBtn>
          {/* Expand/collapse arrow */}
          <IcoBtn onClick={() => setExpanded(!isExpanded)} title={isExpanded ? 'Minimize player' : 'Expand player'}>
            {isExpanded
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            }
          </IcoBtn>
        </div>
      </div>
    </div>
  )
}

function IcoBtn({ onClick, children, title, active }: { onClick?: () => void; children: React.ReactNode; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent', border: 0, padding: 7, borderRadius: '50%',
        color: active ? '#fff' : 'rgba(255,255,255,.65)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color .12s, background .12s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.1)' }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,.65)'; e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
