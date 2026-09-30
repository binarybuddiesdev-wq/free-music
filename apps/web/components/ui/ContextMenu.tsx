'use client'
import { useEffect, useRef, useState } from 'react'
import { useLibraryStore } from '@/stores/library.store'
import { useQueueStore } from '@/stores/queue.store'
import { usePlayerStore } from '@/stores/player.store'
import { useSettingsStore } from '@/stores/settings.store'
import { saveOfflineSong, removeOfflineSong, isSongDownloaded } from '@/lib/offline-storage'
import { showToast } from '@/components/ui/Toast'
import type { Song } from '@/types/music'

interface ContextMenuProps {
  song: Song
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ song, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const liked = useLibraryStore((s) => Boolean(s.likedSongs[song.id]))
  const addToQueue = useQueueStore((s) => s.addToQueue)
  const playlists = useLibraryStore((s) => s.playlists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist)
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    isSongDownloaded(song.id).then(setDownloaded)
  }, [song.id])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const plList = Object.values(playlists)

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    if (buttons.length === 0) return
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    first?.focus()
  }, [])

  const handleSaveToNew = () => {
    const name = newName.trim() || 'My playlist'
    const id = createPlaylist(name)
    addToPlaylist(id, song)
    onClose()
  }

  const clampedX = typeof window !== 'undefined' ? Math.max(8, Math.min(x, window.innerWidth - 250)) : x
  const clampedY = typeof window !== 'undefined' ? Math.max(8, Math.min(y, window.innerHeight - 260)) : y

  if (showPlaylistPicker) {
    return (
      <div
        ref={ref}
        className="fade-in"
        onKeyDown={handleMenuKeyDown}
        style={{
          position: 'fixed',
          top: clampedY,
          left: clampedX,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          zIndex: 200,
          minWidth: 220,
          maxWidth: 280,
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '10px 14px 6px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: .8 }}>
          Save to playlist
        </div>

        {plList.map((pl) => (
          <button
            key={pl.id}
            onClick={() => { addToPlaylist(pl.id, song); onClose() }}
            style={menuItemStyle}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pl.songs.length}</span>
          </button>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        {creatingNew ? (
          <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveToNew() }}
              placeholder="Playlist name"
              style={{
                flex: 1,
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '6px 8px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSaveToNew}
              style={{ background: '#ff0000', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingNew(true)}
            style={menuItemStyle}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            New playlist
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="fade-in"
      onKeyDown={handleMenuKeyDown}
      style={{
        position: 'fixed',
        top: clampedY,
        left: clampedX,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        zIndex: 200,
        minWidth: 210,
        boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        overflow: 'hidden',
      }}
    >
      <MenuItem
        icon={<HeartIcon filled={liked} />}
        label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        onClick={() => { toggleLike(song); onClose() }}
      />
      <MenuItem
        icon={<QueueIcon />}
        label="Add to queue"
        onClick={() => {
          const added = addToQueue(song)
          showToast(added ? 'Added to queue' : 'Already in queue')
          onClose()
        }}
      />
      <MenuItem
        icon={<RadioIcon />}
        label="Start radio"
        onClick={async () => {
          onClose()
          showToast(`Starting radio for "${song.title}"…`)
          try {
            const res = await fetch(
              `/api/search?recommendSongId=${encodeURIComponent(song.id)}&artist=${encodeURIComponent(song.artist)}&lang=${encodeURIComponent(song.language || 'telugu')}`
            )
            const data = await res.json()
            const recs: Song[] = Array.isArray(data?.songs) ? data.songs : []
            const uniqueRecs = recs.filter((s) => s.id !== song.id)
            const radioQueue = [song, ...uniqueRecs]
            useSettingsStore.getState().setAutoplay(true)
            usePlayerStore.getState().playSong(song, radioQueue, 0)
            showToast(`Radio playing • ${radioQueue.length} tracks queued`)
          } catch {
            usePlayerStore.getState().playSong(song, [song], 0)
            showToast(`Playing "${song.title}"`)
          }
        }}
      />
      <MenuItem
        icon={<DownloadIcon downloaded={downloaded} />}
        label={downloaded ? 'Remove download' : 'Download for offline'}
        onClick={async () => {
          if (downloaded) {
            try {
              await removeOfflineSong(song.id)
              setDownloaded(false)
              showToast(`Removed "${song.title}" from downloads`)
            } catch {
              showToast('Failed to remove download')
            }
            onClose()
          } else {
            showToast(`Downloading "${song.title}"…`)
            onClose()
            try {
              await saveOfflineSong(song)
              showToast(`Downloaded "${song.title}" for offline playback`)
            } catch {
              showToast(`Failed to download "${song.title}"`)
            }
          }
        }}
      />
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <MenuItem
        icon={<PlaylistIcon />}
        label="Save to playlist"
        onClick={() => setShowPlaylistPicker(true)}
        hasArrow
      />
    </div>
  )
}

function MenuItem({ icon, label, onClick, hasArrow }: { icon: React.ReactNode; label: string; onClick: () => void; hasArrow?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={menuItemStyle}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {hasArrow && <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="14" height="14"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>}
    </button>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '9px 14px',
  color: 'var(--text-primary)',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background .1s',
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? '#ff0000' : 'none'} stroke={filled ? '#ff0000' : 'var(--text-secondary)'} strokeWidth={2} width="16" height="16">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function DownloadIcon({ downloaded }: { downloaded: boolean }) {
  if (downloaded) {
    return (
      <svg viewBox="0 0 24 24" fill="#ff0000" width="16" height="16">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  )
}

function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
      <path d="M4 6h16v2H4zm4 5h12v2H8zm5 5h7v2h-7z"/>
    </svg>
  )
}

function PlaylistIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>
    </svg>
  )
}

function RadioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.41 3.11 7.24.39.37 1.01.37 1.4-.01.38-.38.39-1 .01-1.39C4.94 16.27 4 14.25 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.25-.94 4.27-2.52 5.84-.38.39-.37 1.01.01 1.39.39.38 1.01.38 1.4.01C20.8 17.41 22 14.85 22 12c0-5.52-4.48-10-10-10zm0 4c-3.31 0-6 2.69-6 6 0 1.77.77 3.36 2 4.46.39.36 1.02.34 1.39-.05.36-.39.34-1.02-.05-1.39-1.01-.84-1.34-2.18-1.34-3.02 0-2.21 1.79-4 4-4s4 1.79 4 4c0 .84-.33 2.18-1.34 3.02-.39.37-.41 1-.05 1.39.37.39 1 .41 1.39.05 1.23-1.1 2-2.69 2-4.46 0-3.31-2.69-6-6-6zm0 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  )
}
