'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '@/stores/player.store'
import type { LyricLine } from '@/types/music'

export function LyricsPanel() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const progress = usePlayerStore((s) => s.progress)
  const [activeLine, setActiveLine] = useState(-1)
  const activeRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['lyrics', currentSong?.id],
    queryFn: async () => {
      if (!currentSong) return null
      const params = new URLSearchParams({
        title: currentSong.title,
        artist: currentSong.artist,
        duration: String(currentSong.duration),
      })
      const res = await fetch(`/api/lyrics?${params}`)
      const json = await res.json()
      return json.lyrics as { lines: LyricLine[]; plain: string; synced: boolean } | null
    },
    enabled: !!currentSong,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!data?.synced || !data.lines.length) return
    let idx = -1
    for (let i = 0; i < data.lines.length; i++) {
      if (data.lines[i].time <= progress) idx = i
      else break
    }
    setActiveLine(idx)
  }, [progress, data])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        Play a song to see lyrics
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        Loading lyrics…
      </div>
    )
  }

  if (!data.lines.length && !data.plain) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        No lyrics available
      </div>
    )
  }

  if (!data.synced) {
    return (
      <div
        className="thin-scrollbar overflow-y-auto h-full px-4"
        style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}
      >
        {data.plain}
      </div>
    )
  }

  return (
    <div className="thin-scrollbar overflow-y-auto h-full px-4 py-8">
      {data.lines.map((line, i) => (
        <div
          key={i}
          ref={i === activeLine ? activeRef : undefined}
          style={{
            fontSize: i === activeLine ? 18 : 15,
            fontWeight: i === activeLine ? 700 : 400,
            color: i === activeLine ? 'var(--text-primary)' : 'var(--text-tertiary)',
            lineHeight: 1.7,
            transition: 'all 0.3s',
            padding: '4px 0',
            cursor: 'pointer',
          }}
          onClick={() => {
            const { seek } = usePlayerStore.getState()
            seek(line.time)
          }}
        >
          {line.text || ' '}
        </div>
      ))}
    </div>
  )
}
