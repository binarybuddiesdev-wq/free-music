'use client'
import Image from 'next/image'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useLibraryStore } from '@/stores/library.store'
import { ProgressBar } from './ProgressBar'
import { truncate } from '@/lib/utils'

export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setExpanded = usePlayerStore((s) => s.setExpanded)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const isLiked = useLibraryStore((s) => s.isLiked)

  const liked = currentSong ? isLiked(currentSong.id) : false

  if (!currentSong) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
      height: 64, display: 'flex', alignItems: 'center',
      background: '#030303', borderTop: '1px solid rgba(255,255,255,.1)',
    }}>
      {/* ── Left: thumbnail · title · artist · like ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: 'clamp(200px, 28%, 360px)', padding: '0 16px', flexShrink: 0,
      }}>
        {/* Thumbnail */}
        <div style={{ width: 48, height: 48, borderRadius: 4, background: '#272727', flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
          {currentSong.image && (
            <Image src={currentSong.image} alt={currentSong.title} fill sizes="48px" style={{ objectFit: 'cover' }} unoptimized />
          )}
        </div>

        {/* Title + artist */}
        <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => setExpanded(true)}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {currentSong.title}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2, lineHeight: 1.3 }}>
            {truncate(currentSong.artist, 32)}
          </div>
        </div>

        {/* Like (heart) */}
        <IcoBtn onClick={() => toggleLike(currentSong)} title={liked ? 'Unlike' : 'Like'} active={liked} size={20}>
          {liked
            ? <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>
          }
        </IcoBtn>
      </div>

      {/* ── Center: controls + progress bar ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: 680, margin: '0 auto' }}>
        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Shuffle */}
          <IcoBtn active={shuffleOn} onClick={toggleShuffle} title="Shuffle" size={18}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
          </IcoBtn>

          {/* Prev */}
          <IcoBtn onClick={prev} title="Previous" size={20}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </IcoBtn>

          {/* Play / Pause — white circle */}
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: '#000', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .1s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          {/* Next */}
          <IcoBtn onClick={next} title="Next" size={20}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </IcoBtn>

          {/* Repeat */}
          <div style={{ position: 'relative' }}>
            <IcoBtn active={repeatMode !== 'none'} onClick={toggleRepeat} title="Repeat" size={18}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            </IcoBtn>
            {repeatMode === 'one' && (
              <span style={{ position: 'absolute', top: 1, right: 1, fontSize: 7, lineHeight: '10px', color: '#fff', fontWeight: 700, background: '#f00', borderRadius: '50%', width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            )}
          </div>
        </div>

        {/* Progress bar with timestamps */}
        <ProgressBar />
      </div>

      {/* ── Right: lyrics · queue · volume ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: 'clamp(150px, 22%, 280px)', justifyContent: 'flex-end', padding: '0 16px', flexShrink: 0 }}>
        {/* Lyrics */}
        <IcoBtn onClick={() => setExpanded(true)} title="Lyrics" size={18}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        </IcoBtn>

        {/* Queue */}
        <IcoBtn onClick={() => {}} title="Queue" size={18}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </IcoBtn>

        {/* Volume icon */}
        <IcoBtn onClick={() => {}} title="Volume" size={18}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        </IcoBtn>

        {/* Volume slider */}
        <input
          type="range" min={0} max={100} value={Math.round(volume * 100)}
          onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
          style={{ width: 80, accentColor: '#fff', flexShrink: 0 }}
        />
      </div>
    </div>
  )
}

function IcoBtn({
  onClick, children, title, active, size = 18,
}: {
  onClick?: () => void
  children: React.ReactNode
  title?: string
  active?: boolean
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent', border: 0, padding: 6, borderRadius: '50%',
        color: active ? '#fff' : 'rgba(255,255,255,.65)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color .15s, background .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,.65)'; e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
