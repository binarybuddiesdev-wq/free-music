'use client'
import Image from 'next/image'
import { useQueueStore } from '@/stores/queue.store'
import { usePlayerStore } from '@/stores/player.store'
import { truncate } from '@/lib/utils'

export function QueuePanel() {
  const queue = useQueueStore((s) => s.queue)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const qIndex = useQueueStore((s) => s.qIndex)
  const jumpTo = useQueueStore((s) => s.jumpTo)
  const playSong = usePlayerStore((s) => s.playSong)
  const currentSong = usePlayerStore((s) => s.currentSong)

  const active = shuffleOn ? shuffledQueue : queue

  if (!active.length) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        Queue is empty
      </div>
    )
  }

  return (
    <div className="thin-scrollbar overflow-y-auto h-full">
      <div className="px-4 py-3" style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Queue
      </div>
      {active.map((song, i) => {
        const isCurrent = i === qIndex
        return (
          <div
            key={`${song.id}-${i}`}
            onClick={() => {
              jumpTo(i)
              playSong(song, active, i)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              background: isCurrent ? 'var(--bg-hover)' : 'transparent',
              cursor: 'pointer',
              borderLeft: isCurrent ? '3px solid var(--accent)' : '3px solid transparent',
            }}
            className="hover:bg-[var(--bg-hover)]"
          >
            <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
              {song.image && (
                <Image src={song.image} alt={song.title} fill sizes="40px" style={{ objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: isCurrent ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {truncate(song.title, 35)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {song.artist}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
