'use client'
import Image from 'next/image'
import { useState } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useUIStore } from '@/stores/ui.store'
import { formatDuration } from '@/lib/utils'

type Tab = 'UP NEXT' | 'LYRICS' | 'COMMENTS' | 'RELATED'
const TABS: Tab[] = ['UP NEXT', 'LYRICS', 'COMMENTS', 'RELATED']

export function ExpandedPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const [tab, setTab] = useState<Tab>('UP NEXT')

  const sidebarW = sidebarCollapsed ? 72 : 240

  if (!isExpanded || !currentSong) return null

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        left: sidebarW,
        top: 56,
        right: 0,
        bottom: 67,   // sits above the mini player (3px bar + 64px main)
        zIndex: 35,
        background: '#0d0d0d',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT: large album art ── */}
      <div style={{
        flex: '1 1 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 40px',
        minWidth: 0,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          aspectRatio: '1',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#1a1a1a',
          boxShadow: '0 24px 64px rgba(0,0,0,.7)',
          position: 'relative',
        }}>
          {currentSong.image && (
            <Image
              src={currentSong.image}
              alt={currentSong.title}
              fill
              sizes="480px"
              style={{ objectFit: 'cover' }}
              priority
              unoptimized
            />
          )}
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ width: 1, background: 'rgba(255,255,255,.1)', flexShrink: 0, alignSelf: 'stretch' }} />

      {/* ── RIGHT: tabs + panel ── */}
      <div style={{
        width: 380,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d0d',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                borderBottom: t === tab ? '2px solid #fff' : '2px solid transparent',
                padding: '14px 4px',
                fontSize: 12,
                fontWeight: t === tab ? 600 : 400,
                color: t === tab ? '#fff' : 'rgba(255,255,255,.5)',
                cursor: 'pointer',
                letterSpacing: .5,
                transition: 'color .12s',
                whiteSpace: 'nowrap',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {tab === 'UP NEXT' && <UpNextPanel />}
          {tab === 'LYRICS' && <PlaceholderPanel label="Lyrics" msg="No lyrics available for this song" />}
          {tab === 'COMMENTS' && <PlaceholderPanel label="Comments" msg="Comments are not available" />}
          {tab === 'RELATED' && <PlaceholderPanel label="Related" msg="No related content available" />}
        </div>
      </div>
    </div>
  )
}

/* ─── UP NEXT queue panel ─── */
function UpNextPanel() {
  const queue = useQueueStore((s) => s.queue)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const qIndex = useQueueStore((s) => s.qIndex)
  const jumpTo = useQueueStore((s) => s.jumpTo)
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)

  const active = shuffleOn ? shuffledQueue : queue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* "Playing from" header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 2 }}>Playing from</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Queue</div>
        </div>
        <button style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
          Save
        </button>
      </div>

      {/* Queue list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Queue is empty</div>
        ) : (
          active.map((song, i) => {
            const isCurrent = song.id === currentSong?.id && i === qIndex
            return (
              <div
                key={`${song.id}-${i}`}
                onClick={() => { jumpTo(i); playSong(song, active, i) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  background: isCurrent ? 'rgba(255,255,255,.07)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Thumbnail or speaker icon for current */}
                <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isCurrent ? (
                    <svg viewBox="0 0 24 24" fill="rgba(255,255,255,.9)" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                  ) : (
                    song.image && <Image src={song.image} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />
                  )}
                </div>
                {/* Title + artist */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: isCurrent ? '#fff' : 'rgba(255,255,255,.85)', fontWeight: isCurrent ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {song.artist}
                  </div>
                </div>
                {/* Duration */}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(song.duration)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function PlaceholderPanel({ label, msg }: { label: string; msg: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,.35)', padding: 24 }}>
      <span style={{ fontSize: 13 }}>{msg}</span>
    </div>
  )
}
