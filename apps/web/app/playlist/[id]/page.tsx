'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useLibraryStore } from '@/stores/library.store'
import { usePlayerStore } from '@/stores/player.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration, truncate, onEnterSpace, fisherYates } from '@/lib/utils'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Song, Playlist } from '@/types/music'

function SortablePlaylistItem({
  song,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onRemove,
  onContextMenu,
}: {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  onPlay: () => void
  onRemove: () => void
  onContextMenu: (e: React.MouseEvent, song: Song) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? 'var(--panel-bg)' : 'transparent' }}
        onClick={onPlay}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay() } }}
        onContextMenu={e => onContextMenu(e, song)}
      >
        <button
          {...attributes}
          style={{
            width: 28, height: 28, borderRadius: 4, border: 'none', background: 'var(--panel-bg)',
            color: 'var(--text-primary)', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0,
          }}
          aria-label="Drag to reorder"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6v2l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5v-3h-3v-3z"/>
          </svg>
        </button>

        <div style={{ width: 36, textAlign: 'right', color: isCurrent ? '#ff0000' : 'var(--text-tertiary)', fontSize: 12, fontWeight: isCurrent ? 700 : 400 }}>
          {isCurrent && isPlaying ? (
            <svg viewBox="0 0 24 24" fill="#ff0000" width="16" height="16" style={{ marginLeft: 'auto' }}>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          ) : index + 1}
        </div>

        <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 3, overflow: 'hidden', background: 'var(--panel-bg)', flexShrink: 0 }}>
          {song.image && <Image src={song.image} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: isCurrent ? '#ff0000' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatDuration(song.duration)}</div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s, color .15s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff0000' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
          title="Remove from playlist"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
    </div>
  )
}

function PlaylistContent() {
  const router = useRouter()
  const params = useParams()
  const playlistId = params.id as string

  const playlists = useLibraryStore((s) => s.playlists)
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)
  const updatePlaylistName = useLibraryStore((s) => s.updatePlaylistName)
  const updatePlaylistSongs = useLibraryStore((s) => s.updatePlaylistSongs)
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist)
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const playlist = playlists[playlistId]

  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(playlist?.name ?? '')
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)

  const handleDragEnd = (event: DragEndEvent) => {
    if (!playlist) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = playlist.songs.findIndex(s => s.id === active.id)
    const newIndex = playlist.songs.findIndex(s => s.id === over.id)

    const newSongs = arrayMove(playlist.songs, oldIndex, newIndex)
    updatePlaylistSongs(playlistId, newSongs)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleSaveName = () => {
    if (!playlist) return
    if (editName.trim() && editName !== playlist.name) {
      updatePlaylistName(playlistId, editName.trim())
    }
    setEditingName(false)
  }

  const { data: publicData, isLoading: publicLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['public-playlist', playlistId],
    queryFn: async () => {
      const res = await fetch(`/api/search?playlistId=${playlistId}`)
      return res.json()
    },
    enabled: !playlist && !!playlistId,
    staleTime: 5 * 60 * 1000,
  })

  if (!playlist) {
    if (publicLoading) {
      return (
        <div style={{ padding: 40, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 140, height: 140, borderRadius: 8, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite' }} />
          <div>
            <div style={{ height: 28, width: 200, background: 'var(--panel-bg)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 14, width: 100, background: 'var(--panel-bg)', borderRadius: 4 }} />
          </div>
        </div>
      )
    }

    const publicSongs = publicData?.songs ?? []
    if (publicSongs.length > 0) {
      const first = publicSongs[0]
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.back()}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', marginTop: 4 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <div style={{ width: 140, height: 140, borderRadius: 8, overflow: 'hidden', background: 'var(--panel-bg)', flexShrink: 0, position: 'relative' }}>
              {first?.image && <Image src={first.image} alt="Playlist" fill sizes="140px" style={{ objectFit: 'cover' }} unoptimized />}
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Playlist</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{first?.album || 'Featured Playlist'}</h1>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{publicSongs.length} songs</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={() => playSong(publicSongs[0], publicSongs, 0)}
                  style={{
                    background: '#ff0000', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 22px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z" /></svg>
                  Play all
                </button>
                <button
                  onClick={() => {
                    const shuffled = fisherYates(publicSongs)
                    playSong(shuffled[0], shuffled, 0)
                  }}
                  style={{
                    background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                  Shuffle
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {publicSongs.map((song, i) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => playSong(song, publicSongs, i)}
                  onKeyDown={(e) => onEnterSpace(e, () => playSong(song, publicSongs, i))}
                  onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, song }) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '8px 12px',
                    borderRadius: 6, cursor: 'pointer', background: isCurrent ? 'var(--panel-bg)' : 'transparent',
                    transition: 'background .12s ease',
                  }}
                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'var(--panel-bg)' }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 24, textAlign: 'center', fontSize: 12, color: isCurrent ? '#ff0000' : 'var(--text-tertiary)' }}>{i + 1}</div>
                  <div style={{ width: 38, height: 38, borderRadius: 3, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--panel-bg)' }}>
                    {song.image && <Image src={song.image} alt={song.title} fill sizes="38px" style={{ objectFit: 'cover' }} unoptimized />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: isCurrent ? '#ff0000' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatDuration(song.duration)}</div>
                </div>
              )
            })}
          </div>
          {ctx && <ContextMenu song={ctx.song} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
        </div>
      )
    }

    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{ fontSize: 16 }}>Playlist not found</div>
        <button onClick={() => router.back()} style={{ marginTop: 16, padding: '8px 16px', background: '#ff0000', border: 'none', borderRadius: 20, color: '#fff', cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', marginTop: 4 }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>

        <div style={{ width: 120, height: 120, borderRadius: 8, overflow: 'hidden', background: 'var(--panel-bg)', flexShrink: 0, position: 'relative' }}>
          {playlist.songs.length > 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 0 }}>
              {playlist.songs.slice(0, 4).map((song, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {song.image && <Image src={song.image} alt={song.title} fill sizes="60px" style={{ objectFit: 'cover' }} unoptimized />}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          {editingName ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4,
                padding: '8px 12px', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, width: '100%', outline: 'none',
              }}
            />
          ) : (
            <h1
              onDoubleClick={() => setEditingName(true)}
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', letterSpacing: '-.2px', marginBottom: 8 }}
            >
              {playlist.name}
            </h1>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                  Shuffle
                </button>
              </>
            )}
            <button
              onClick={() => { deletePlaylist(playlistId); router.back() }}
              style={{ background: 'transparent', color: '#ff0000', border: '1px solid rgba(255,0,0,.5)', borderRadius: 20, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {playlist.songs.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          <div>No songs yet.</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Right-click any song to add it here.</div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={playlist.songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ overflowY: 'auto' }}>
              {playlist.songs.map((song, i) => (
                <SortablePlaylistItem
                  key={song.id}
                  song={song}
                  index={i}
                  isCurrent={currentSong?.id === song.id}
                  isPlaying={isPlaying && currentSong?.id === song.id}
                  onPlay={() => playSong(song, playlist.songs, i)}
                  onRemove={() => removeFromPlaylist(playlistId, song.id)}
                  onContextMenu={(e, s) => setCtx({ x: e.clientX, y: e.clientY, song: s })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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

export default function PlaylistPage() {
  return (
    <div style={{ padding: '12px 24px 32px', overflowX: 'hidden' }}>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
        <PlaylistContent />
      </Suspense>
    </div>
  )
}