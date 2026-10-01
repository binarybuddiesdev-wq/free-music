'use client'
import Image from 'next/image'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLibraryStore } from '@/stores/library.store'
import { usePlayerStore } from '@/stores/player.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration, truncate, onEnterSpace, fisherYates, sizedImage } from '@/lib/utils'
import {
  getAllOfflineSongs,
  removeOfflineSong,
  clearAllOfflineSongs,
  getOfflineStorageEstimate,
  formatBytes,
  type OfflineSongRecord,
} from '@/lib/offline-storage'
import { showToast } from '@/components/ui/Toast'
import type { Song, Playlist } from '@/types/music'

type Tab = 'liked' | 'history' | 'playlists' | 'downloads'

function SongRow({ song, queue, index, onContextMenu }: { song: Song; queue: Song[]; index: number; onContextMenu: (e: React.MouseEvent, song: Song) => void }) {
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isCurrent = currentSong?.id === song.id

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isCurrent ? 'var(--panel-bg)' : 'transparent',
        transition: 'background .1s',
      }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--panel-bg)' }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
      onClick={() => playSong(song, queue, index)}
      onKeyDown={(e) => onEnterSpace(e, () => playSong(song, queue, index))}
      onContextMenu={(e) => onContextMenu(e, song)}
    >
      <div style={{ width: 36, textAlign: 'right', color: isCurrent ? '#ff0000' : 'var(--text-tertiary)', fontSize: 12, fontWeight: isCurrent ? 700 : 400 }}>
        {isCurrent && isPlaying ? (
          <svg viewBox="0 0 24 24" fill="#ff0000" width="16" height="16" style={{ marginLeft: 'auto' }}>
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        ) : index + 1}
      </div>
      <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 3, overflow: 'hidden', background: 'var(--panel-bg)', flexShrink: 0 }}>
        {song.image && <Image src={sizedImage(song.image, 150)} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: isCurrent ? '#ff0000' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncate(song.title, 50)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatDuration(song.duration)}</div>
    </div>
  )
}

function PlaylistView({ playlist, onBack }: { playlist: Playlist; onBack: () => void }) {
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)
  const playSong = usePlayerStore((s) => s.playSong)
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{playlist.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{playlist.songs.length} songs</div>
        </div>
        <div style={{ flex: 1 }} />
        {playlist.songs.length > 0 && (
          <>
            <button
              onClick={() => playSong(playlist.songs[0], playlist.songs, 0)}
              style={{ background: '#ff0000', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z" /></svg>
              Play all
            </button>
            <button
              onClick={() => {
                const shuffled = fisherYates(playlist.songs)
                playSong(shuffled[0], shuffled, 0)
              }}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              Shuffle
            </button>
          </>
        )}
        <button
          onClick={() => { deletePlaylist(playlist.id); onBack() }}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 20, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>

      {playlist.songs.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          <div>No songs yet. Right-click any song to add it here.</div>
        </div>
      ) : (
        playlist.songs.map((song, i) => (
          <div key={`${song.id}-${i}`} style={{ position: 'relative' }}>
            <SongRow
              song={song}
              queue={playlist.songs}
              index={i}
              onContextMenu={(e, s) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, song: s }) }}
            />
            <button
              onClick={() => removeFromPlaylist(playlist.id, song.id)}
              title="Remove from playlist"
              style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, opacity: 0.6, transition: 'opacity .1s' }}
              className="remove-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        ))
      )}

      {ctx && (
        <ContextMenu
          song={ctx.song}
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  )
}

function LibraryContent() {
  const searchParams = useSearchParams()
  const urlTab = (searchParams.get('tab') as Tab) || 'liked'
  const urlPlaylistId = searchParams.get('id')

  const [tab, setTab] = useState<Tab>(urlTab)
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(urlPlaylistId)
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)

  useEffect(() => {
    setTab(urlTab)
    setActivePlaylistId(urlPlaylistId)
  }, [urlTab, urlPlaylistId])

  const likedSongs = useLibraryStore((s) => s.likedSongs)
  const history = useLibraryStore((s) => s.history)
  const playlists = useLibraryStore((s) => s.playlists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const playSong = usePlayerStore((s) => s.playSong)

  const [displayHistory, setDisplayHistory] = useState<Song[]>([])
  const historyInitializedRef = useRef(false)

  // Keep history list stable while viewing the tab so played tracks don't jump to #1
  useEffect(() => {
    if (tab === 'history') {
      if (!historyInitializedRef.current || history.length === 0) {
        setDisplayHistory(history)
        historyInitializedRef.current = true
      }
    } else {
      historyInitializedRef.current = false
    }
  }, [tab, history])

  const liked = Object.values(likedSongs)
  const [downloads, setDownloads] = useState<OfflineSongRecord[]>([])
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number; count: number }>({ usage: 0, quota: 0, count: 0 })

  const refreshDownloads = async () => {
    const list = await getAllOfflineSongs()
    setDownloads(list)
    const est = await getOfflineStorageEstimate()
    setStorageEstimate(est)
  }

  useEffect(() => {
    refreshDownloads()
    window.addEventListener('offline-songs-updated', refreshDownloads)
    return () => {
      window.removeEventListener('offline-songs-updated', refreshDownloads)
    }
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'liked', label: 'Liked Songs' },
    { id: 'history', label: 'History' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'downloads', label: `Downloads${downloads.length > 0 ? ` (${downloads.length})` : ''}` },
  ]

  const handleContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY, song })
  }

  if (tab === 'playlists' && activePlaylistId && playlists[activePlaylistId]) {
    return (
      <PlaylistView
        playlist={playlists[activePlaylistId]}
        onBack={() => setActivePlaylistId(null)}
      />
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Library</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setActivePlaylistId(null) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 16px',
              fontSize: 14,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? '2px solid var(--text-primary)' : '2px solid transparent',
              transition: 'color .12s',
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
            <div style={{ textAlign: 'center', marginTop: 64, color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="56" height="56" style={{ marginBottom: 16 }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <div style={{ fontSize: 15 }}>Songs you like will appear here</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Click the heart icon on any song to save it</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => playSong(liked[0], liked, 0)}
                  style={{ background: '#ff0000', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z" /></svg>
                  Play all
                </button>
                <button
                  onClick={() => {
                    const shuffled = fisherYates(liked)
                    playSong(shuffled[0], shuffled, 0)
                  }}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                  Shuffle
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{liked.length} songs</span>
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
          {displayHistory.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 64, color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="56" height="56" style={{ marginBottom: 16 }}>
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
              <div style={{ fontSize: 15 }}>Your listening history will appear here</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{displayHistory.length} songs</span>
                <button
                  onClick={() => playSong(displayHistory[0], displayHistory, 0)}
                  style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>
                  Play recent
                </button>
              </div>
              {displayHistory.map((song, i) => (
                <SongRow key={song.id} song={song} queue={displayHistory} index={i} onContextMenu={handleContextMenu} />
              ))}
            </>
          )}
        </>
      )}

      {/* Playlists */}
      {tab === 'playlists' && (
        <>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                const name = prompt('Playlist name:')
                if (name?.trim()) createPlaylist(name.trim())
              }}
              style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              New playlist
            </button>
          </div>

          {Object.keys(playlists).length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="56" height="56" style={{ marginBottom: 16 }}>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              <div style={{ fontSize: 15 }}>No playlists yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Right-click any song to save it to a playlist</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {Object.values(playlists).map((pl) => (
                <div
                  key={pl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActivePlaylistId(pl.id)}
                  onKeyDown={(e) => onEnterSpace(e, () => setActivePlaylistId(pl.id))}
                  style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', background: 'var(--panel-bg)', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
                >
                  <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#1a6a3a,#2ecc71)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pl.songs[0]?.image ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <Image src={pl.songs[0].image} alt={pl.name} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="rgba(255,255,255,.5)" width="40" height="40"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{pl.songs.length} songs</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Downloads */}
      {tab === 'downloads' && (
        <>
          {downloads.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 64, color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="56" height="56" style={{ marginBottom: 16 }}>
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
              </svg>
              <div style={{ fontSize: 15 }}>No offline songs yet</div>
              <div style={{ fontSize: 13, marginTop: 6, maxWidth: 360, margin: '6px auto 0', lineHeight: 1.5 }}>
                Right-click any track and choose &quot;Download for offline&quot; to listen without an internet connection.
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => {
                      const queueSongs: Song[] = downloads.map((d) => ({
                        id: d.id,
                        title: d.title,
                        artist: d.artist,
                        album: d.album || '',
                        duration: d.duration,
                        image: d.image || '',
                        downloadUrl: d.downloadUrl || '',
                        language: d.language || '',
                        year: d.year,
                      }))
                      playSong(queueSongs[0], queueSongs, 0)
                    }}
                    style={{
                      background: '#ff0000',
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
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z" /></svg>
                    Play all
                  </button>
                  <button
                    onClick={() => {
                      const queueSongs: Song[] = downloads.map((d) => ({
                        id: d.id,
                        title: d.title,
                        artist: d.artist,
                        album: d.album || '',
                        duration: d.duration,
                        image: d.image || '',
                        downloadUrl: d.downloadUrl || '',
                        language: d.language || '',
                        year: d.year,
                      }))
                      const shuffled = fisherYates(queueSongs)
                      playSong(shuffled[0], shuffled, 0)
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 20,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                    Shuffle
                  </button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {downloads.length} {downloads.length === 1 ? 'song' : 'songs'} • {formatBytes(storageEstimate.usage)} used
                  </span>
                </div>

                <button
                  onClick={async () => {
                    if (confirm('Delete all downloaded songs from offline storage?')) {
                      await clearAllOfflineSongs()
                      await refreshDownloads()
                      showToast('All downloaded songs cleared')
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4e45')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Clear all
                </button>
              </div>

              {downloads.map((item, i) => {
                const song: Song = {
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  album: item.album || '',
                  duration: item.duration,
                  image: item.image || '',
                  downloadUrl: item.downloadUrl || '',
                  language: item.language || '',
                  year: item.year,
                }
                const queueSongs: Song[] = downloads.map((d) => ({
                  id: d.id,
                  title: d.title,
                  artist: d.artist,
                  album: d.album || '',
                  duration: d.duration,
                  image: d.image || '',
                  downloadUrl: d.downloadUrl || '',
                  language: d.language || '',
                  year: d.year,
                }))

                return (
                  <div key={item.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SongRow
                        song={song}
                        queue={queueSongs}
                        index={i}
                        onContextMenu={handleContextMenu}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--panel-bg)', padding: '2px 8px', borderRadius: 10 }}>
                        {formatBytes(item.fileSize)}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await removeOfflineSong(item.id)
                          await refreshDownloads()
                          showToast(`Removed "${item.title}" from downloads`)
                        }}
                        title="Remove from downloads"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4e45')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}

      {ctx && (
        <ContextMenu song={ctx.song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />
      )}
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  )
}
