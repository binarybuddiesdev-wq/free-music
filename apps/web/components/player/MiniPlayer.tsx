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
  const mode = usePlayerStore((s) => s.mode)
  const setMode = usePlayerStore((s) => s.setMode)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const isLiked = useLibraryStore((s) => s.isLiked)

  const liked = currentSong ? isLiked(currentSong.id) : false

  // Don't render at all until a song is selected (YTM behavior)
  if (!currentSong) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
      height: 56, display: 'flex', alignItems: 'center',
      background: '#000', borderTop: '1px solid rgba(255,255,255,.1)',
      padding: '0 16px', gap: 12,
    }}>
      {/* Left: art + info + like */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '30%', minWidth: 180, maxWidth: 300 }}>
        <div style={{ width: 40, height: 40, borderRadius: 4, background: '#272727', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {currentSong?.image && (
            <Image src={currentSong.image} alt={currentSong.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => currentSong && setExpanded(true)}>
          <div style={{ fontSize: 14, fontWeight: 400, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentSong?.title ?? 'Select a song'}
          </div>
          {currentSong && (
            <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
              {truncate(currentSong.artist, 28)}
            </div>
          )}
        </div>
        {currentSong && (
          <button
            onClick={() => toggleLike(currentSong)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 0, color: liked ? '#ff0000' : '#aaa', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color .15s' }}
          >
            {liked ? '♥' : '♡'}
          </button>
        )}
      </div>

      {/* Center: controls + progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Shuffle */}
          <Btn active={shuffleOn} onClick={toggleShuffle} title="Shuffle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
          </Btn>
          {/* Prev */}
          <Btn onClick={prev} title="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
          </Btn>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!currentSong}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: currentSong ? '#fff' : '#555',
              color: '#000', border: 0, cursor: currentSong ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
            }}
          >
            {isPlaying
              ? <div style={{ display: 'flex', gap: 3 }}><div style={{ width: 3, height: 12, background: '#000', borderRadius: 1 }}/><div style={{ width: 3, height: 12, background: '#000', borderRadius: 1 }}/></div>
              : <div style={{ width: 0, height: 0, borderLeft: '10px solid #000', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
            }
          </button>
          {/* Next */}
          <Btn onClick={next} title="Next">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </Btn>
          {/* Repeat */}
          <div style={{ position: 'relative' }}>
            <Btn active={repeatMode !== 'none'} onClick={toggleRepeat} title="Repeat">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
            </Btn>
            {repeatMode === 'one' && <span style={{ position: 'absolute', top: -2, right: -2, fontSize: 8, color: '#ff0000', fontWeight: 700 }}>1</span>}
          </div>
        </div>
        <ProgressBar />
      </div>

      {/* Right: video toggle + volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '30%', justifyContent: 'flex-end', minWidth: 140, maxWidth: 220 }}>
        {/* Video mode */}
        <button
          onClick={() => setMode(mode === 'video' ? 'audio' : 'video')}
          title={mode === 'video' ? 'Switch to audio' : 'Switch to video'}
          style={{ width: 32, height: 32, borderRadius: '50%', background: mode === 'video' ? 'rgba(255,255,255,.15)' : 'transparent', border: 0, color: mode === 'video' ? '#fff' : '#aaa', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}
        >
          ▷
        </button>
        {/* Lyrics toggle */}
        <button
          onClick={() => currentSong && setExpanded(true)}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 0, color: '#aaa', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}
        >
          ≡
        </button>
        {/* Volume */}
        <input
          type="range" min={0} max={100} value={Math.round(volume * 100)}
          onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
          style={{ width: 72 }}
        />
      </div>
    </div>
  )
}

function Btn({ onClick, children, title, active }: { onClick?: () => void; children: React.ReactNode; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent', border: 0, color: active ? '#fff' : '#aaa',
        cursor: 'pointer', fontSize: 16, padding: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = active ? '#fff' : '#aaa')}
    >
      {children}
    </button>
  )
}
