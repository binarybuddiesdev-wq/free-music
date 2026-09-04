'use client'
import { useEffect, useRef } from 'react'
import { useLibraryStore } from '@/stores/library.store'
import { useQueueStore } from '@/stores/queue.store'
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
  const isLiked = useLibraryStore((s) => s.isLiked)
  const addToQueue = useQueueStore((s) => s.addToQueue)
  const playlists = useLibraryStore((s) => s.playlists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist)

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

  const items = [
    {
      label: isLiked(song.id) ? 'Remove from Liked' : 'Save to Liked Songs',
      action: () => { toggleLike(song); onClose() },
    },
    {
      label: 'Add to queue',
      action: () => { addToQueue(song); onClose() },
    },
    {
      label: 'Save to playlist…',
      action: () => {
        const plList = Object.values(playlists)
        if (plList.length === 0) {
          const id = createPlaylist('My playlist')
          addToPlaylist(id, song)
        } else {
          addToPlaylist(plList[0].id, song)
        }
        onClose()
      },
    },
  ]

  return (
    <div
      ref={ref}
      className="fade-in"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        zIndex: 200,
        minWidth: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            padding: '10px 16px',
            color: 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
          className="hover:bg-[var(--bg-hover)]"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
