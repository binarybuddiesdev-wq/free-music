'use client'
import Image from 'next/image'
import { useState } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useLibraryStore } from '@/stores/library.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { Song } from '@/types/music'

interface SongCardProps {
  song: Song
  queue: Song[]
  index: number
}

export function SongCard({ song, queue, index }: SongCardProps) {
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const liked = useLibraryStore((s) => Boolean(s.likedSongs[song.id]))
  const [hovered, setHovered] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)

  const isCurrent = currentSong?.id === song.id

  return (
    <>
      <button
        className="tcard"
        style={{
          width: 160, flexShrink: 0, scrollSnapAlign: 'start',
          display: 'flex', flexDirection: 'column',
          padding: 8, borderRadius: 8, cursor: 'pointer',
          transition: 'background .15s',
          background: hovered ? 'var(--panel-bg)' : 'transparent',
          border: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }) }}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            setCtx({ x: r.left + r.width / 2, y: r.bottom })
          }
        }}
        onClick={() => playSong(song, queue, index)}
        title={song.title}
      >
        <div style={{ width: 160, height: 160, borderRadius: 8, overflow: 'hidden', background: 'var(--panel-bg)', flexShrink: 0, position: 'relative', transition: 'transform .15s', transform: hovered ? 'scale(1.03)' : 'scale(1)' }}>
          {song.image ? (
            <Image
              src={song.image}
              alt={song.title}
              fill
              sizes="160px"
              style={{ objectFit: 'cover', display: 'block' }}
              unoptimized
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎵</div>
          )}

          {/* Play button — bottom right on hover */}
          <span
            role="presentation"
            style={{
              position: 'absolute', right: 8, bottom: 8,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(30,30,30,.9)', color: '#fff',
              fontSize: 14, cursor: 'pointer',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(8px)',
              transition: '.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,.5)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,30,30,.9)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {isCurrent && isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <div style={{ width: 0, height: 0, borderLeft: '12px solid currentColor', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 2 }} />
            )}
          </span>

          {/* Now playing indicator */}
          {isCurrent && !hovered && (
            <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
                {[4, 8, 6].map((h, i) => (
                  <div key={i} style={{
                    width: 3, height: isPlaying ? h + 4 : 4,
                    background: '#ff0000', borderRadius: 1,
                    transition: 'height .3s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Liked indicator */}
          {liked && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <svg viewBox="0 0 24 24" fill="#ff0000" width="14" height="14">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{ height: 48, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            fontSize: 14, fontWeight: isCurrent ? 600 : 500,
            color: isCurrent ? '#ff0000' : 'var(--text-primary)', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {song.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {song.artist}
          </div>
        </div>
      </button>

      {ctx && <ContextMenu song={song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </>
  )
}
