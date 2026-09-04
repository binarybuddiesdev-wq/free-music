'use client'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/stores/settings.store'
import { usePlayerStore } from '@/stores/player.store'
import { useLibraryStore } from '@/stores/library.store'
import type { Song } from '@/types/music'
import { formatDuration } from '@/lib/utils'

export function QuickPicksSection() {
  const language = useSettingsStore((s) => s.language)
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLiked = useLibraryStore((s) => s.isLiked)
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['section', 'quick-picks', language],
    queryFn: () => fetch(`/api/search?section=quick-picks&lang=${language}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const songs = (data?.songs ?? []).slice(0, 12)

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12, letterSpacing: '-.2px' }}>Quick picks</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '0', borderRadius: 8, overflow: 'hidden',
      }}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <QuickPickSkeleton key={i} />)
          : songs.map((song, i) => (
              <QuickPickRow
                key={song.id} song={song} songs={songs} index={i}
                isCurrent={currentSong?.id === song.id}
                isPlaying={isPlaying}
                liked={isLiked(song.id)}
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
  return (
    <div
      onClick={onPlay}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px',
        cursor: 'pointer', transition: 'background .12s', borderRadius: 4,
        background: isCurrent ? 'rgba(255,255,255,.08)' : 'transparent',
      }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? 'rgba(255,255,255,.08)' : 'transparent' }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#272727' }}>
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
          color: isCurrent ? '#ff0000' : '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
        }}>
          {song.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {song.artist}
        </div>
      </div>

      {/* Duration + like */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', minWidth: 32, textAlign: 'right' }}>
          {formatDuration(song.duration)}
        </span>
        <button
          onClick={onLike}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 0, color: liked ? '#ff0000' : 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}

function QuickPickSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px' }}>
      <div style={{ width: 46, height: 46, borderRadius: 4, background: '#272727', flexShrink: 0, animation: 'pulse-skel 1.4s infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, background: '#272727', borderRadius: 3, animation: 'pulse-skel 1.4s infinite', marginBottom: 6 }} />
        <div style={{ height: 12, background: '#272727', borderRadius: 3, animation: 'pulse-skel 1.4s infinite', width: '60%' }} />
      </div>
    </div>
  )
}
