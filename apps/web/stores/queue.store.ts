'use client'
import { create } from 'zustand'
import type { Song } from '@/types/music'
import { fisherYates } from '@/lib/utils'

interface QueueState {
  queue: Song[]
  shuffledQueue: Song[]
  qIndex: number
  shuffleOn: boolean
  repeatMode: 'none' | 'one' | 'all'
  setQueue: (songs: Song[], startIndex: number) => void
  next: () => Song | null
  prev: () => Song | null
  toggleShuffle: () => void
  toggleRepeat: () => void
  jumpTo: (index: number) => void
  addToQueue: (song: Song) => void
  currentSong: () => Song | null
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  shuffledQueue: [],
  qIndex: 0,
  shuffleOn: false,
  repeatMode: 'none',

  currentSong: () => {
    const { queue, shuffledQueue, shuffleOn, qIndex } = get()
    const active = shuffleOn ? shuffledQueue : queue
    return active[qIndex] ?? null
  },

  setQueue: (songs, startIndex) => {
    const shuffled = fisherYates(songs)
    set({ queue: songs, shuffledQueue: shuffled, qIndex: startIndex, shuffleOn: false })
  },

  next: () => {
    const { queue, shuffledQueue, shuffleOn, qIndex, repeatMode } = get()
    const active = shuffleOn ? shuffledQueue : queue
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
    const active = shuffleOn ? shuffledQueue : queue
    const prev = Math.max(0, qIndex - 1)
    set({ qIndex: prev })
    return active[prev] ?? null
  },

  toggleShuffle: () => {
    const { shuffleOn, queue, qIndex } = get()
    if (!shuffleOn) {
      const shuffled = fisherYates(queue)
      set({ shuffleOn: true, shuffledQueue: shuffled, qIndex: 0 })
    } else {
      set({ shuffleOn: false, qIndex })
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
}))
