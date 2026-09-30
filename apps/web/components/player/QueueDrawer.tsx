'use client'
import { useState, useEffect, useRef } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueueStore } from '@/stores/queue.store'
import { useUIStore } from '@/stores/ui.store'
import { usePlayerStore } from '@/stores/player.store'
import { useSettingsStore } from '@/stores/settings.store'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types/music'
import Image from 'next/image'

function SortableQueueItem({
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
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s, color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff0000'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          title="Remove from queue"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
    </div>
  )
}

export function QueueDrawer() {
  const queue = useQueueStore((s) => s.queue)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)
  const qIndex = useQueueStore((s) => s.qIndex)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setQueue = useQueueStore((s) => s.setQueue)
  const autoplay = useSettingsStore((s) => s.autoplay)
  const setAutoplay = useSettingsStore((s) => s.setAutoplay)
  const queueOpen = useUIStore((s) => s.queueOpen)
  const setQueueOpen = useUIStore((s) => s.setQueueOpen)
  const [ctx, setCtx] = useState<{ x: number; y: number; song: Song } | null>(null)
  const [mounted, setMounted] = useState(false)

  const activeQueue = shuffleOn ? shuffledQueue : queue
  const activeIndex = shuffleOn
    ? activeQueue.findIndex(s => s.id === queue[qIndex]?.id)
    : qIndex

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activeQueue.findIndex(s => s.id === active.id)
    const newIndex = activeQueue.findIndex(s => s.id === over.id)

    const newActiveQueue = arrayMove(activeQueue, oldIndex, newIndex)

    if (shuffleOn) {
      const newShuffledQueue = arrayMove(shuffledQueue, oldIndex, newIndex)
      const newQueue = [...queue]
      newActiveQueue.forEach((song, i) => {
        const origIdx = queue.findIndex(s => s.id === song.id)
        if (origIdx >= 0) newQueue[origIdx] = song
      })
      setQueue(newQueue, qIndex)
    } else {
      setQueue(newActiveQueue, newIndex)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !queueOpen) return null

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        top: 56,
        right: 0,
        bottom: 67,
        width: 420,
        maxWidth: '100vw',
        zIndex: 36,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-24px 0 48px rgba(0,0,0,.3)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '.3px' }}>
          Up Next ({activeQueue.length})
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeQueue.length > 0 && (
            <button
              onClick={() => { setQueue([], 0) }}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setQueueOpen(false)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            aria-label="Close queue"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>

      {/* Autoplay Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--panel-bg)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ color: autoplay ? '#ff0000' : 'var(--text-tertiary)' }}>
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Autoplay similar songs</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{autoplay ? 'Playing infinitely' : 'Stops when queue ends'}</div>
          </div>
        </div>
        <button
          onClick={() => setAutoplay(!autoplay)}
          style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            border: 'none',
            background: autoplay ? '#ff0000' : 'rgba(128,128,128,.35)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background .15s',
            flexShrink: 0,
          }}
          aria-pressed={autoplay}
          title={autoplay ? 'Disable autoplay' : 'Enable autoplay'}
        >
          <span style={{
            position: 'absolute',
            top: 2,
            left: autoplay ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            transition: 'left .15s',
          }} />
        </button>
      </div>

      {activeQueue.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: 12, padding: '0 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎵</div>
          <div style={{ fontSize: 14 }}>Queue is empty</div>
          <div style={{ fontSize: 12 }}>Play something to fill it up</div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeQueue.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 80px', scrollbarWidth: 'none' }}>
              {activeQueue.map((song, i) => (
                <SortableQueueItem
                  key={song.id}
                  song={song}
                  index={i}
                  isCurrent={i === activeIndex}
                  isPlaying={isPlaying && i === activeIndex}
                  onPlay={() => playSong(song, activeQueue, i)}
                  onRemove={() => {
                    const newQueue = activeQueue.filter(s => s.id !== song.id)
                    const newIndex = Math.min(i, newQueue.length - 1)
                    if (shuffleOn) {
                      const newShuffled = shuffledQueue.filter(s => s.id !== song.id)
                      const newOriginal = [...queue].filter(s => s.id !== song.id)
                      setQueue(newOriginal, newIndex)
                    } else {
                      setQueue(newQueue, newIndex)
                    }
                  }}
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