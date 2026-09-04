'use client'
import Image from 'next/image'
import { useState } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useLibraryStore } from '@/stores/library.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { Song } from '@/types/music'
import { truncate } from '@/lib/utils'

interface SongCardProps {
  song: Song
  queue: Song[]
  index: number
}

export function SongCard({ song, queue, index }: SongCardProps) {
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLiked = useLibraryStore((s) => s.isLiked)
  const [hovered, setHovered] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)

  const isCurrent = currentSong?.id === song.id
  const liked = isLiked(song.id)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        style={{ width: 160, flexShrink: 0, cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={handleContextMenu}
        onClick={() => playSong(song, queue, index)}
      >
        {/* Art */}
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 240,
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--bg-elevated)',
            marginBottom: 8,
          }}
        >
          {song.image && (
            <Image
              src={song.image}
              alt={song.title}
              fill
              sizes="160px"
              style={{ objectFit: 'cover', transition: 'transform 0.3s' }}
              className={hovered ? 'scale-105' : ''}
            />
          )}
          {/* Overlay on hover */}
          {hovered && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCurrent && isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          )}
          {/* Now playing indicator */}
          {isCurrent && !hovered && (
            <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      background: 'var(--accent)',
                      borderRadius: 1,
                      height: isPlaying ? `${8 + i * 4}px` : 6,
                      animation: isPlaying ? `bounce${i} 0.8s ease-in-out infinite alternate` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {liked && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-4 h-4">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncate(song.title, 20)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
          {truncate(song.artist, 22)}
        </div>
      </div>

      {ctx && (
        <ContextMenu song={song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />
      )}
    </>
  )
}
