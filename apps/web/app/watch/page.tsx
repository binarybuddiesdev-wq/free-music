'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (e: { target: { seekTo: (t: number, b: boolean) => void; playVideo: () => void } }) => void
            onStateChange?: (e: { data: number }) => void
          }
        }
      ) => {
        seekTo: (t: number, b: boolean) => void
        playVideo: () => void
        pauseVideo: () => void
        getCurrentTime: () => number
        destroy: () => void
      }
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

function WatchContent() {
  const searchParams = useSearchParams()
  const videoIdParam = searchParams.get('v')
  const currentSong = usePlayerStore((s) => s.currentSong)
  const savedTime = usePlayerStore((s) => s.savedTimeForVideo)
  const setMode = usePlayerStore((s) => s.setMode)
  const playerRef = useRef<InstanceType<typeof window.YT.Player> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ytReady, setYtReady] = useState(false)

  // Fetch video ID if not in URL
  const { data: resolvedId } = useQuery<{ videoId: string | null }>({
    queryKey: ['video-id', currentSong?.id],
    queryFn: () => {
      if (!currentSong) return Promise.resolve({ videoId: null })
      return fetch(`/api/video-id?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`).then((r) => r.json())
    },
    enabled: !!currentSong && !videoIdParam,
    staleTime: Infinity,
  })

  const videoId = videoIdParam ?? resolvedId?.videoId

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) { setYtReady(true); return }
    window.onYouTubeIframeAPIReady = () => setYtReady(true)
    if (!document.querySelector('#yt-iframe-api')) {
      const s = document.createElement('script')
      s.id = 'yt-iframe-api'
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  }, [])

  // Initialize player
  useEffect(() => {
    if (!ytReady || !videoId || !containerRef.current) return

    playerRef.current?.destroy()

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1, fs: 1 },
      events: {
        onReady: (e) => {
          if (savedTime > 0) e.target.seekTo(savedTime, true)
          e.target.playVideo()
        },
      },
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [ytReady, videoId, savedTime])

  if (!currentSong && !videoIdParam) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-tertiary)' }}>
        No song selected. Play a song first.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Switch back to audio */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 854 }}>
        {currentSong && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{currentSong.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{currentSong.artist}</div>
          </div>
        )}
        <button
          onClick={() => setMode('audio')}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ♪ Switch to audio
        </button>
      </div>

      {/* YouTube player */}
      <div style={{ width: '100%', maxWidth: 854, aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        {videoId ? (
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', flexDirection: 'column', gap: 8 }}>
            <div>Loading video…</div>
            <div style={{ fontSize: 12 }}>Requires YouTube API key</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WatchPage() {
  return (
    <Suspense>
      <WatchContent />
    </Suspense>
  )
}
