'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useLibraryStore } from '@/stores/library.store'
import { usePlayerStore } from '@/stores/player.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration, truncate } from '@/lib/utils'
import type { Song } from '@/types/music'

type Tab = 'liked' | 'history' | 'playlists'

function SongRow({ song, queue, index, onContextMenu }: { song: Song; queue: Song[]; index: number; onContextMenu: (e: React.MouseEvent, song: Song) => void }) {
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isCurrent = currentSong?.id === song.id

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isCurrent ? 'var(--bg-elevated)' : 'transparent',
      }}
      className="hover:bg-[var(--bg-hover)]"
      onClick={() => playSong(song, queue, index)}
      onContextMenu={(e) => onContextMenu(e, song)}
    >
      <div style={{ width: 36, textAlign: 'right', color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 12, fontWeight: isCurrent ? 700 : 400 }}>
        {isCurrent && isPlaying ? (
          <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-4 h-4 ml-auto">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        ) : index + 1}
      </div>
      <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
        {song.image && <Image src={song.image} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: isCurrent ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncate(song.title, 40)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatDuration(song.duration)}</div>
    </div>
  )
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('liked')
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)
  const likedSongs = useLibraryStore((s) => s.likedSongs)
  const history = useLibraryStore((s) => s.history)
  const playlists = useLibraryStore((s) => s.playlists)
  const playSong = usePlayerStore((s) => s.playSong)

  const liked = Object.values(likedSongs)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'liked', label: 'Liked Songs' },
    { id: 'history', label: 'History' },
    { id: 'playlists', label: 'Playlists' },
  ]

  const handleContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY, song })
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Library</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 16px',
              fontSize: 14,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? '2px solid var(--text-primary)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liked Songs */}
      {tab === 'liked' && (
        <>
          {liked.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>♥</div>
              <div>Songs you like will appear here</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => playSong(liked[0], liked, 0)}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z" /></svg>
                  Shuffle play
                </button>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{liked.length} songs</span>
              </div>
              {liked.map((song, i) => (
                <SongRow key={song.id} song={song} queue={liked} index={i} onContextMenu={handleContextMenu} />
              ))}
            </>
          )}
        </>
      )}

      {/* History */}
      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
              <div>Your listening history will appear here</div>
            </div>
          ) : (
            history.map((song, i) => (
              <SongRow key={`${song.id}-${i}`} song={song} queue={history} index={i} onContextMenu={handleContextMenu} />
            ))
          )}
        </>
      )}

      {/* Playlists */}
      {tab === 'playlists' && (
        <>
          {Object.keys(playlists).length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div>Right-click any song to add it to a playlist</div>
            </div>
          ) : (
            Object.values(playlists).map((pl) => (
              <div key={pl.id} style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                  {pl.name} <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>({pl.songs.length} songs)</span>
                </h2>
                {pl.songs.map((song, i) => (
                  <SongRow key={song.id} song={song} queue={pl.songs} index={i} onContextMenu={handleContextMenu} />
                ))}
              </div>
            ))
          )}
        </>
      )}

      {ctx && (
        <ContextMenu song={ctx.song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />
      )}
    </div>
  )
}
