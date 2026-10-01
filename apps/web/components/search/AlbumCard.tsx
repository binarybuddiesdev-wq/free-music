'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'
import { showToast } from '@/components/ui/Toast'
import { onEnterSpace } from '@/lib/utils'
import { albumQuery } from '@/lib/detail-queries'
import type { Album, Song } from '@/types/music'

interface AlbumCardProps {
  album: Album
}

export function AlbumCard({ album }: AlbumCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const playSong = usePlayerStore((s) => s.playSong)
  const [hovered, setHovered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCardClick = () => {
    router.push(`/album/${album.id}`)
  }

  const handlePlayAlbum = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const data = await queryClient.fetchQuery(albumQuery(album.id))
      const songs: Song[] = data.songs || []
      if (songs.length > 0) {
        playSong(songs[0], songs, 0)
        showToast(`Playing album "${album.title}"`)
      } else {
        showToast(`No playable tracks found for "${album.title}"`)
      }
    } catch {
      showToast(`Failed to load album tracks`)
    } finally {
      setLoading(false)
    }
  }

  const metaText = [
    'Album',
    album.artist,
    album.songCount ? `${album.songCount} track${album.songCount > 1 ? 's' : ''}` : null,
    album.year,
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
      title={`Open album: ${album.title}`}
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
        {album.image ? (
          <Image
            src={album.image}
            alt={album.title}
            fill
            sizes="170px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
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
            onClick={handlePlayAlbum}
            title={`Play ${album.title}`}
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
          {album.title}
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
          {metaText}
        </div>
      </div>
    </div>
  )
}
