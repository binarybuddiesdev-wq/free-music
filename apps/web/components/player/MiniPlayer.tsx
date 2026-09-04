'use client'
import Image from 'next/image'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { ProgressBar } from './ProgressBar'
import { VolumeSlider } from './VolumeSlider'
import { LikeButton } from './LikeButton'
import { truncate } from '@/lib/utils'

export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setExpanded = usePlayerStore((s) => s.setExpanded)
  const mode = usePlayerStore((s) => s.mode)
  const setMode = usePlayerStore((s) => s.setMode)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)

  if (!currentSong) {
    return (
      <div style={{
        height: 'var(--player-height)',
        background: 'var(--player-bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 13,
      }}>
        Select a song to play
      </div>
    )
  }

  return (
    <div
      style={{
        height: 'var(--player-height)',
        background: 'var(--player-bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        position: 'relative',
      }}
    >
      {/* Left: song info */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        style={{ width: 280, padding: '0 16px', flexShrink: 0 }}
        onClick={() => setExpanded(true)}
      >
        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          {currentSong.image && (
            <Image src={currentSong.image} alt={currentSong.title} fill sizes="48px" style={{ objectFit: 'cover' }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="marquee-container" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden' }}>
            <span className="marquee-text">{currentSong.title}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncate(currentSong.artist, 30)}
          </div>
        </div>
        <LikeButton size={18} />
      </div>

      {/* Center: controls + progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 24px' }}>
        <div className="flex items-center gap-4">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: shuffleOn ? 'var(--accent)' : 'var(--text-secondary)', padding: 4 }}
            className="hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          {/* Prev */}
          <button
            onClick={prev}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
            className="hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          {/* Next */}
          <button
            onClick={next}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
            className="hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeatMode !== 'none' ? 'var(--accent)' : 'var(--text-secondary)', padding: 4, position: 'relative' }}
            className="hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === 'one' && (
              <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 8, color: 'var(--accent)', fontWeight: 700 }}>1</span>
            )}
          </button>
        </div>
        <ProgressBar />
      </div>

      {/* Right: volume + audio/video + expand */}
      <div className="flex items-center gap-2" style={{ width: 240, padding: '0 16px', justifyContent: 'flex-end', flexShrink: 0 }}>
        <VolumeSlider />

        {/* Audio/Video toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            overflow: 'hidden',
            fontSize: 11,
          }}
        >
          <button
            onClick={() => setMode('audio')}
            style={{
              padding: '4px 10px',
              background: mode === 'audio' ? 'var(--bg-active)' : 'transparent',
              color: mode === 'audio' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: mode === 'audio' ? 600 : 400,
            }}
          >
            ♪
          </button>
          <button
            onClick={() => setMode('video')}
            style={{
              padding: '4px 10px',
              background: mode === 'video' ? 'var(--bg-active)' : 'transparent',
              color: mode === 'video' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: mode === 'video' ? 600 : 400,
            }}
          >
            ▶
          </button>
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          className="hover:text-[var(--text-primary)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
