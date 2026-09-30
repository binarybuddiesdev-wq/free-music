'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { showToast } from '@/components/ui/Toast'
import { onEnterSpace } from '@/lib/utils'
import type { SearchPlaylist, Song } from '@/types/music'

interface PlaylistCardProps {
  playlist: SearchPlaylist
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const router = useRouter()
  const playSong = usePlayerStore((s) => s.playSong)
  const [hovered, setHovered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCardClick = () => {
    router.push(`/playlist/${playlist.id}`)
  }

  const handlePlayPlaylist = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?playlistId=${playlist.id}`)
      const data = await res.json()
      const songs: Song[] = data.songs || data.results || []
      if (songs.length > 0) {
        playSong(songs[0], songs, 0)
        showToast(`Playing playlist "${playlist.title}"`)
      } else {
        showToast(`No playable tracks found in "${playlist.title}"`)
      }
    } catch {
      showToast(`Failed to load playlist tracks`)
    } finally {
      setLoading(false)
    }
  }

  const sub = [
    'Playlist',
    playlist.owner,
    playlist.songCount ? `${playlist.songCount} song${playlist.songCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' • ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => onEnterSpace(e, handleCardClick)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 170,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        userSelect: 'none',
        padding: 8,
        borderRadius: 8,
        transition: 'background .15s ease',
        background: hovered ? 'var(--panel-bg)' : 'transparent',
      }}
      title={`Open playlist: ${playlist.title}`}
    >
      {/* Artwork container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        {playlist.image ? (
          <Image
            src={playlist.image}
            alt={playlist.title}
            fill
            sizes="170px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
          </div>
        )}

        {/* Hover / Loading Play Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered || loading ? 1 : 0,
            transition: 'opacity .18s ease',
          }}
        >
          <button
            onClick={handlePlayPlaylist}
            title={`Play ${playlist.title}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#ff0000',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginLeft: 2 }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {playlist.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  )
}
