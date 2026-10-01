'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration, onEnterSpace, fisherYates } from '@/lib/utils'
import { albumQuery } from '@/lib/detail-queries'
import type { Album, Song } from '@/types/music'

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({ ...albumQuery(id ?? ''), enabled: !!id })

  const songs = data?.songs ?? []
  const firstSong = songs[0]
  const album = data?.album
  const albumTitle = album?.title || firstSong?.album || 'Album'
  const albumArtist = album?.artist || firstSong?.artist || 'Various Artists'
  const albumImage = album?.image || firstSong?.image || ''
  const albumYear = album?.year || firstSong?.year

  const handlePlayAll = (startIndex = 0) => {
    if (songs.length === 0) return
    playSong(songs[startIndex], songs, startIndex)
  }

  const handleShuffle = () => {
    if (songs.length === 0) return
    const shuffled = fisherYates(songs)
    playSong(shuffled[0], shuffled, 0)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '8px 0',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span>Back</span>
      </button>

      {isLoading ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 24 }}>
          <div style={{ width: 220, height: 220, borderRadius: 12, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 28, width: '40%', background: 'var(--panel-bg)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 16, width: '25%', background: 'var(--panel-bg)', borderRadius: 4, marginBottom: 20 }} />
            <div style={{ height: 40, width: 140, background: 'var(--panel-bg)', borderRadius: 20 }} />
          </div>
        </div>
      ) : isError || songs.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 18, marginBottom: 12 }}>Album not found or failed to load.</div>
          <button
            onClick={() => refetch()}
            style={{
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '8px 24px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap' }}>
            <div
              style={{
                position: 'relative',
                width: 220,
                height: 220,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--bg-elevated)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              {albumImage && (
                <Image src={albumImage} alt={albumTitle} fill sizes="220px" style={{ objectFit: 'cover' }} unoptimized />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Album
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 8 }}>
                {albumTitle}
              </h1>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                <span>{albumArtist}</span>
                {albumYear && <span> • {albumYear}</span>}
                <span> • {songs.length} song{songs.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={() => handlePlayAll(0)}
                  style={{
                    background: '#ff0000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 24,
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(255,0,0,0.3)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Play</span>
                </button>

                <button
                  onClick={handleShuffle}
                  style={{
                    background: 'var(--panel-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Song list */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {songs.map((song, i) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePlayAll(i)}
                  onKeyDown={(e) => onEnterSpace(e, () => handlePlayAll(i))}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCtx({ x: e.clientX, y: e.clientY, song })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isCurrent ? 'var(--panel-bg)' : 'transparent',
                    transition: 'background .12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'var(--panel-bg)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ width: 28, textAlign: 'center', fontSize: 13, color: isCurrent ? '#ff0000' : 'var(--text-tertiary)', fontWeight: isCurrent ? 700 : 400 }}>
                    {isCurrent && isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="#ff0000" width="16" height="16">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? '#ff0000' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {song.artist}
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {formatDuration(song.duration)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {ctx && <ContextMenu song={ctx.song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </div>
  )
}
