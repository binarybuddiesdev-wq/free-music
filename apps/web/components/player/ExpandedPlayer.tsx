'use client'
import Image from 'next/image'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { ProgressBar } from './ProgressBar'
import { VolumeSlider } from './VolumeSlider'
import { LikeButton } from './LikeButton'
import { LyricsPanel } from './LyricsPanel'
import { QueuePanel } from './QueuePanel'
import { useState } from 'react'

type Tab = 'lyrics' | 'queue'

export function ExpandedPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setExpanded = usePlayerStore((s) => s.setExpanded)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)
  const [tab, setTab] = useState<Tab>('lyrics')

  if (!isExpanded || !currentSong) return null

  return (
    <div
      className="slide-up"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'linear-gradient(to bottom, #1a0a0a 0%, var(--bg-base) 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', gap: 12 }}>
        <button
          onClick={() => setExpanded(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          className="hover:text-[var(--text-primary)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </button>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>Now playing</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 32, padding: '0 48px', overflow: 'hidden' }}>
        {/* Left: art + controls */}
        <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ width: 280, height: 280, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            {currentSong.image && (
              <Image src={currentSong.image} alt={currentSong.title} width={280} height={280} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            )}
          </div>

          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{currentSong.title}</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{currentSong.artist}</div>
          </div>

          <div className="flex items-center gap-4" style={{ marginBottom: 8 }}>
            <LikeButton size={24} />
          </div>

          <div className="flex items-center gap-5" style={{ width: '100%', justifyContent: 'center' }}>
            <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: shuffleOn ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
            </button>
            <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button
              onClick={togglePlay}
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--text-primary)', border: 'none', cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
            <button onClick={toggleRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeatMode !== 'none' ? 'var(--accent)' : 'var(--text-secondary)', position: 'relative' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
              {repeatMode === 'one' && <span style={{ position: 'absolute', top: -2, right: -2, fontSize: 8, color: 'var(--accent)', fontWeight: 700 }}>1</span>}
            </button>
          </div>

          <ProgressBar />
          <VolumeSlider />
        </div>

        {/* Right: lyrics/queue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
            {(['lyrics', 'queue'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === 'lyrics' ? <LyricsPanel /> : <QueuePanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
