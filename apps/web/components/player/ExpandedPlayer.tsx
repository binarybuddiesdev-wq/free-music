'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/ui.store'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useSettingsStore } from '@/stores/settings.store'
import { formatDuration, onEnterSpace, sizedImage } from '@/lib/utils'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import { VisualizerCanvas } from '@/components/player/VisualizerCanvas'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { showToast } from '@/components/ui/Toast'
import { recommendationsUrl } from '@/lib/api-urls'
import type { Song } from '@/types/music'

type Tab = 'UP NEXT' | 'LYRICS' | 'RELATED'
const TABS: Tab[] = ['UP NEXT', 'LYRICS', 'RELATED']

export function ExpandedPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleQueue = useUIStore((s) => s.toggleQueue)
  const mode = usePlayerStore((s) => s.mode)
  const setMode = usePlayerStore((s) => s.setMode)
  const switchToAudio = usePlayerStore((s) => s.switchToAudio)
  const audioRef = usePlayerStore((s) => s.audioRef)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setSavedTimeForVideo = usePlayerStore((s) => s.setSavedTimeForVideo)
  const [tab, setTab] = useState<Tab>('UP NEXT')
  const [videoStartAt, setVideoStartAt] = useState(0)

  const { data: videoData } = useQuery<{ videoId: string | null }>({
    queryKey: ['video-id', currentSong?.id],
    queryFn: () => {
      if (!currentSong) return Promise.resolve({ videoId: null })
      return fetch(`/api/video-id?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`).then((r) => r.json())
    },
    enabled: !!currentSong,
    staleTime: Infinity,
  })
  const videoId = videoData?.videoId

  const handleToggleMode = (targetMode: 'audio' | 'video') => {
    if (targetMode === 'video') {
      if (!videoId) {
        showToast('Official video is currently not available for this track')
        return
      }
      if (audioRef?.current) audioRef.current.pause()
      setSavedTimeForVideo(usePlayerStore.getState().progress)
      setVideoStartAt(usePlayerStore.getState().progress)
      setMode('video')
    } else {
      switchToAudio()
    }
  }

  if (!isExpanded || !currentSong) return null

  return (
    <div
      className={`fade-in ${sidebarCollapsed ? 'expanded-player ep-collapsed' : 'expanded-player'}`}
      style={{
        position: 'fixed',
        top: 56,
        right: 0,
        bottom: 67,   // sits above the mini player (3px bar + 64px main)
        zIndex: 35,
        background: 'var(--bg-base)',
      }}
    >
      {/* ── LEFT: blurred bg + album art ── */}
      <div className="ep-left" style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Blurred album art background — eliminates the void */}
        {currentSong.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSong.image}
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(72px) saturate(1.8)',
                transform: 'scale(1.4)',
                opacity: 0.45,
                pointerEvents: 'none',
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(8,8,8,.55) 0%, rgba(8,8,8,.7) 100%)',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Album art / video surface */}
        <div className="ep-inner" style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          gap: 16,
        }}>
          {/* Song / Video Switcher Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,.1)',
            borderRadius: 20,
            padding: 3,
            gap: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,.4)',
          }}>
            <button
              onClick={() => handleToggleMode('audio')}
              aria-label="Switch to audio mode"
              style={{
                padding: '5px 16px',
                borderRadius: 16,
                border: 0,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: mode === 'audio' ? '#fff' : 'transparent',
                color: mode === 'audio' ? '#000' : 'rgba(255,255,255,.7)',
                transition: 'all .15s',
              }}
            >
              Song
            </button>
            <button
              onClick={() => handleToggleMode('video')}
              aria-label="Switch to video mode"
              style={{
                padding: '5px 16px',
                borderRadius: 16,
                border: 0,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: mode === 'video' ? '#fff' : 'transparent',
                color: mode === 'video' ? '#000' : 'rgba(255,255,255,.7)',
                transition: 'all .15s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              Video
            </button>
          </div>

          {mode === 'video' && videoId ? (
            <div className="ep-art-v" style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#000',
              boxShadow: '0 28px 80px rgba(0,0,0,.9)',
              position: 'relative',
              flexShrink: 0,
            }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&start=${Math.floor(videoStartAt)}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          ) : (
            <div className="ep-art" style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 6,
              overflow: 'hidden',
              background: '#1a1a1a',
              boxShadow: '0 28px 80px rgba(0,0,0,.9)',
              position: 'relative',
              flexShrink: 0,
            }}>
              {currentSong.image && (
                <Image
                  src={currentSong.image}
                  alt={currentSong.title}
                  fill
                  sizes="440px"
                  style={{ objectFit: 'cover' }}
                  priority
                  unoptimized
                />
              )}
            </div>
          )}

          {/* Song info below art */}
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{
              fontSize: 19,
              fontWeight: 700,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 4,
              textShadow: '0 1px 8px rgba(0,0,0,.6)',
            }}>
              {currentSong.title}
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,.6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 4px rgba(0,0,0,.6)',
            }}>
              {currentSong.artist}
              {currentSong.album ? ` • ${currentSong.album}` : ''}
              {currentSong.year ? ` • ${currentSong.year}` : ''}
            </div>

            {/* Audio Waveform Visualizer */}
            <div style={{ marginTop: 12, width: '100%' }}>
              <VisualizerCanvas isPlaying={isPlaying && mode === 'audio'} height={28} />
            </div>
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="ep-divider" style={{ background: 'var(--border)' }} />

      {/* ── RIGHT: tabs + panel ── */}
      <div className="ep-right" style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
      }}>
        {/* Tab bar */}
        <div className="ep-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, paddingLeft: 8 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 0,
                borderBottom: t === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                padding: '15px 14px 13px',
                fontSize: 13,
                fontWeight: t === tab ? 600 : 400,
                color: t === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                letterSpacing: .3,
                transition: 'color .12s',
                whiteSpace: 'nowrap',
              }}
            >
              {t}
            </button>
          ))}
          <button
            onClick={toggleQueue}
            style={{
              marginLeft: 'auto',
              padding: '0 16px',
              background: 'transparent',
              border: 0,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: '100%',
              borderBottom: '2px solid transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Open queue"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
            <span style={{ display: 'none' }}>Queue</span>
          </button>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {tab === 'UP NEXT' && <UpNextPanel />}
          {tab === 'LYRICS' && <LyricsPanel />}
          {tab === 'RELATED' && <RelatedPanel />}
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
  const playQueueIndex = usePlayerStore((s) => s.playQueueIndex)
  const currentSong = usePlayerStore((s) => s.currentSong)

  const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* "Playing from" header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 2 }}>Playing from</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Queue</div>
        </div>
        {currentSong && (
          <button
            onClick={async () => {
              showToast(`Starting radio for "${currentSong.title}"…`)
              try {
                const res = await fetch(recommendationsUrl(currentSong))
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                const recs: Song[] = Array.isArray(data?.songs) ? data.songs : []
                const radioQueue = [currentSong, ...recs.filter((s) => s.id !== currentSong.id)]
                // Replace what plays next; keep the current song playing where it is
                useQueueStore.getState().setQueue(radioQueue, 0, true)
                showToast(`Radio playing • ${radioQueue.length} tracks queued`)
              } catch {
                showToast('Failed to load radio recommendations')
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              borderRadius: 16,
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--panel-bg)')}
            title="Start an endless radio station seeded from this track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.41 3.11 7.24.39.37 1.01.37 1.4-.01.38-.38.39-1 .01-1.39C4.94 16.27 4 14.25 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.25-.94 4.27-2.52 5.84-.38.39-.37 1.01.01 1.39.39.38 1.01.38 1.4.01C20.8 17.41 22 14.85 22 12c0-5.52-4.48-10-10-10zm0 4c-3.31 0-6 2.69-6 6 0 1.77.77 3.36 2 4.46.39.36 1.02.34 1.39-.05.36-.39.34-1.02-.05-1.39-1.01-.84-1.34-2.18-1.34-3.02 0-2.21 1.79-4 4-4s4 1.79 4 4c0 .84-.33 2.18-1.34 3.02-.39.37-.41 1-.05 1.39.37.39 1 .41 1.39.05 1.23-1.1 2-2.69 2-4.46 0-3.31-2.69-6-6-6zm0 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            Start radio
          </button>
        )}
      </div>

      {/* Queue list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Queue is empty</div>
        ) : (
          active.map((song, i) => {
            const isCurrent = i === qIndex
            return (
              <div
                key={`${song.id}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => playQueueIndex(i)}
                onKeyDown={(e) => onEnterSpace(e, () => playQueueIndex(i))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  background: isCurrent ? 'var(--panel-bg)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--panel-bg)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? 'var(--panel-bg)' : 'transparent' }}
              >
                {/* Thumbnail or speaker icon for current */}
                <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isCurrent ? (
                    <svg viewBox="0 0 24 24" fill="var(--text-primary)" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                  ) : (
                    song.image && <Image src={sizedImage(song.image, 150)} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />
                  )}
                </div>
                {/* Title + artist */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: isCurrent ? '#ff0000' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {song.artist}
                  </div>
                </div>
                {/* Duration */}
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
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

function RelatedPanel() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const playSong = usePlayerStore((s) => s.playSong)
  const addToQueue = useQueueStore((s) => s.addToQueue)
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)

  const primaryArtist = currentSong?.artist?.split(',')[0]?.trim() || ''

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['related-songs', currentSong?.id, primaryArtist, currentSong?.language],
    queryFn: async () => {
      if (!currentSong) return { songs: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(primaryArtist + ' ' + (currentSong.language || ''))}&lang=${currentSong.language || 'telugu'}`)
      return res.json()
    },
    enabled: !!currentSong && !!primaryArtist,
    staleTime: 5 * 60 * 1000,
  })

  const relatedSongs = (data?.songs ?? []).filter((s) => s.id !== currentSong?.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 2 }}>You might like</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>More from {primaryArtist}</div>
        </div>
        {relatedSongs.length > 0 && (
          <button
            onClick={() => playSong(relatedSongs[0], relatedSongs, 0)}
            style={{
              background: '#ff0000',
              border: 0,
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>
            Play all
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 3, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: '65%', background: 'var(--panel-bg)', borderRadius: 3, marginBottom: 6, animation: 'pulse-skel 1.4s infinite' }} />
                  <div style={{ height: 10, width: '40%', background: 'var(--panel-bg)', borderRadius: 3, animation: 'pulse-skel 1.4s infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : relatedSongs.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No related tracks found
          </div>
        ) : (
          relatedSongs.map((song, i) => (
            <div
              key={song.id}
              role="button"
              tabIndex={0}
              onClick={() => playSong(song, relatedSongs, i)}
              onKeyDown={(e) => onEnterSpace(e, () => playSong(song, relatedSongs, i))}
              onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, song }) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--panel-bg)' }}>
                {song.image && <Image src={sizedImage(song.image, 150)} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                  {song.artist}{song.album ? ` • ${song.album}` : ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); addToQueue(song) }}
                title="Add to queue"
                style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(song.duration)}
              </span>
            </div>
          ))
        )}
      </div>

      {ctx && <ContextMenu song={ctx.song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </div>
  )
}
