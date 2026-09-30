'use client'
import Image from 'next/image'
import { useState, useEffect, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { usePlayerStore } from '@/stores/player.store'
import { useLibraryStore } from '@/stores/library.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { sessionPage } from '@/lib/session'
import { fetchSectionSongs } from '@/lib/home-feed'
import { SeenSongsContext } from './SeenSongsContext'
import type { Song } from '@/types/music'
import { formatDuration, onEnterSpace } from '@/lib/utils'

export function QuickPicksSection({ languageOverride }: { languageOverride?: string }) {
  const storeLanguage = useSettingsStore((s) => s.language)
  const language = languageOverride ?? storeLanguage
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const likedSongs = useLibraryStore((s) => s.likedSongs)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const seenIds = useContext(SeenSongsContext)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])

  const page = sessionPage(`section:quick-picks:${language}`)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', 'quick-picks', language, page],
    queryFn: () => fetchSectionSongs('quick-picks', language, page),
  })

  useEffect(() => {
    if (!data?.songs) return
    const seen = seenIds?.current ?? new Set<string>()
    const fresh = data.songs.filter((s) => !seen.has(s.id)).slice(0, 20)
    fresh.forEach((s) => seen.add(s.id))
    setFilteredSongs(fresh)
    return () => {
      fresh.forEach((s) => seen.delete(s.id))
    }
  }, [data, seenIds])

  const songs = filteredSongs

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-.2px' }}>Quick picks</h2>
      <div className="qp-grid">
        {isLoading
          ? Array.from({ length: 20 }).map((_, i) => <QuickPickSkeleton key={i} />)
          : songs.map((song, i) => (
              <QuickPickRow
                key={song.id} song={song} songs={songs} index={i}
                isCurrent={currentSong?.id === song.id}
                isPlaying={isPlaying}
                liked={Boolean(likedSongs[song.id])}
                onPlay={() => playSong(song, songs, i)}
                onLike={() => toggleLike(song)}
              />
            ))}

      </div>
    </section>
  )
}

function QuickPickRow({ song, isCurrent, isPlaying, liked, onPlay, onLike }: {
  song: Song; songs: Song[]; index: number;
  isCurrent: boolean; isPlaying: boolean; liked: boolean;
  onPlay: () => void; onLike: () => void;
}) {
  const [hovered, setHovered] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onPlay}
        onKeyDown={(e) => onEnterSpace(e, onPlay)}
        onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px',
          cursor: 'pointer', transition: 'background .12s', borderRadius: 4,
          background: isCurrent ? 'var(--panel-bg)' : hovered ? 'var(--panel-bg)' : 'transparent',
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--panel-bg)' }}>
          {song.image && (
            <Image src={song.image} alt={song.title} fill sizes="46px" style={{ objectFit: 'cover' }} unoptimized />
          )}
          {isCurrent && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPlaying
                ? <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                    {[4, 8, 6, 10, 4].map((h, i) => (
                      <div key={i} style={{ width: 2, height: h, background: '#ff0000', borderRadius: 1 }} />
                    ))}
                  </div>
                : <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16"><path d="M8 5v14l11-7z" /></svg>
              }
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: isCurrent ? '#ff0000' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
          }}>
            {song.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
            {song.artist}
          </div>
        </div>

        {/* Duration + like + more */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
            {formatDuration(song.duration)}
          </span>
          <button
            onClick={onLike}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 0, color: liked ? '#ff0000' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}
          >
            {liked ? '♥' : '♡'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY }) }}
            style={{
              width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 0,
              color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            }}
            title="More options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {ctx && <ContextMenu song={song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </>
  )
}

function QuickPickSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px' }}>
      <div style={{ width: 46, height: 46, borderRadius: 4, background: 'var(--panel-bg)', flexShrink: 0, animation: 'pulse-skel 1.4s infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, background: 'var(--panel-bg)', borderRadius: 3, animation: 'pulse-skel 1.4s infinite', marginBottom: 6 }} />
        <div style={{ height: 12, background: 'var(--panel-bg)', borderRadius: 3, animation: 'pulse-skel 1.4s infinite', width: '60%' }} />
      </div>
    </div>
  )
}
