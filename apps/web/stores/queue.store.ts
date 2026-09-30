'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Song } from '@/types/music'
import { fisherYates } from '@/lib/utils'

interface QueueState {
  queue: Song[]
  shuffledQueue: Song[]
  qIndex: number
  shuffleOn: boolean
  repeatMode: 'none' | 'one' | 'all'
  setQueue: (songs: Song[], startIndex: number, keepShuffle?: boolean) => void
  next: () => Song | null
  prev: () => Song | null
  toggleShuffle: () => void
  toggleRepeat: () => void
  jumpTo: (index: number) => void
  addToQueue: (song: Song) => void
  appendSongs: (songs: Song[]) => void
  currentSong: () => Song | null
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      shuffledQueue: [],
      qIndex: 0,
      shuffleOn: false,
      repeatMode: 'none',

      currentSong: () => {
        const { queue, shuffledQueue, shuffleOn, qIndex } = get()
        const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
        return active[qIndex] ?? null
      },

      setQueue: (songs, startIndex, keepShuffle = false) => {
        const currentShuffle = get().shuffleOn
        const shouldShuffle = keepShuffle && currentShuffle
        const shuffled = fisherYates(songs)
        if (shouldShuffle) {
          const selectedSong = songs[startIndex]
          const rest = shuffled.filter(s => s.id !== selectedSong?.id)
          const newShuffled = selectedSong ? [selectedSong, ...rest] : shuffled
          set({ queue: songs, shuffledQueue: newShuffled, qIndex: 0, shuffleOn: true })
        } else {
          set({ queue: songs, shuffledQueue: shuffled, qIndex: startIndex, shuffleOn: false })
        }
      },

      next: () => {
        const { queue, shuffledQueue, shuffleOn, qIndex, repeatMode } = get()
        const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
        if (repeatMode === 'one') return active[qIndex] ?? null
        const next = qIndex + 1
        if (next >= active.length) {
          if (repeatMode === 'all') {
            set({ qIndex: 0 })
            return active[0] ?? null
          }
          return null
        }
        set({ qIndex: next })
        return active[next]
      },

      prev: () => {
        const { queue, shuffledQueue, shuffleOn, qIndex } = get()
        const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
        const prev = Math.max(0, qIndex - 1)
        set({ qIndex: prev })
        return active[prev] ?? null
      },

      toggleShuffle: () => {
        const { shuffleOn, queue, shuffledQueue, qIndex } = get()
        const active = shuffleOn && shuffledQueue.length > 0 ? shuffledQueue : queue
        const currentSong = active[qIndex]
        if (!shuffleOn) {
          const rest = queue.filter(s => s.id !== currentSong?.id)
          const shuffledRest = fisherYates(rest)
          const newShuffled = currentSong ? [currentSong, ...shuffledRest] : fisherYates(queue)
          set({ shuffleOn: true, shuffledQueue: newShuffled, qIndex: 0 })
        } else {
          const newIndex = currentSong ? queue.findIndex(s => s.id === currentSong.id) : 0
          set({ shuffleOn: false, qIndex: Math.max(0, newIndex) })
        }
      },

      toggleRepeat: () => {
        set((s) => ({
          repeatMode: s.repeatMode === 'none' ? 'all' : s.repeatMode === 'all' ? 'one' : 'none',
        }))
      },

      jumpTo: (index) => set({ qIndex: index }),

      addToQueue: (song) => {
        set((s) => ({
          queue: [...s.queue, song],
          shuffledQueue: [...s.shuffledQueue, song],
        }))
      },

      appendSongs: (newSongs) => {
        if (!newSongs || newSongs.length === 0) return
        set((s) => {
          const existingIds = new Set(s.queue.map((item) => item.id))
          const unique = newSongs.filter((song) => !existingIds.has(song.id))
          if (unique.length === 0) return s
          return {
            queue: [...s.queue, ...unique],
            shuffledQueue: [...s.shuffledQueue, ...unique],
          }
        })
      },
    }),
    {
      name: 'ytm-queue',
      skipHydration: true,
      partialize: (s) => ({
        queue: s.queue,
        shuffledQueue: s.shuffledQueue,
        qIndex: s.qIndex,
        shuffleOn: s.shuffleOn,
        repeatMode: s.repeatMode,
      }),
    }
  )
)
