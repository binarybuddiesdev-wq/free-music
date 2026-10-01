'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dedupLocalStorage } from '@/lib/dedup-storage'
import type { Song } from '@/types/music'
import { fisherYates } from '@/lib/utils'
import { dedupSongs, isSameSong } from '@/lib/song-dedup'
import {
  getActiveQueue,
  jumpToIndex,
  moveInQueue,
  removeFromQueue,
  appendUnique,
  nextQueueIndex,
} from '@/lib/queue-logic'

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
  /** Point the queue at an index of the ACTIVE list; returns that song or null if out of range. */
  jumpTo: (index: number) => Song | null
  /** Reorder within the ACTIVE list, keeping the playing song current. */
  moveItem: (from: number, to: number) => void
  /** Remove an item of the ACTIVE list (never the playing one). */
  removeAt: (index: number) => void
  /** Append one song; returns false if it was already in the queue. */
  addToQueue: (song: Song) => boolean
  /** `allowRecordingCopies`: when every song is a copy of a queued recording, still append them rather than stall. */
  appendSongs: (songs: Song[], allowRecordingCopies?: boolean) => void
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
        const s = get()
        return getActiveQueue(s)[s.qIndex] ?? null
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
        const s = get()
        const active = getActiveQueue(s)
        const next = nextQueueIndex(s.qIndex, active.length, s.repeatMode)
        if (next === null) return null
        set({ qIndex: next })
        return active[next]
      },

      prev: () => {
        const s = get()
        const prev = Math.max(0, s.qIndex - 1)
        set({ qIndex: prev })
        return getActiveQueue(s)[prev] ?? null
      },

      toggleShuffle: () => {
        const s = get()
        const currentSong = getActiveQueue(s)[s.qIndex]
        if (!s.shuffleOn) {
          const rest = s.queue.filter((x) => x.id !== currentSong?.id)
          const newShuffled = currentSong ? [currentSong, ...fisherYates(rest)] : fisherYates(s.queue)
          set({ shuffleOn: true, shuffledQueue: newShuffled, qIndex: 0 })
        } else {
          const newIndex = currentSong ? s.queue.findIndex((x) => x.id === currentSong.id) : 0
          set({ shuffleOn: false, qIndex: Math.max(0, newIndex) })
        }
      },

      toggleRepeat: () => {
        set((s) => ({
          repeatMode: s.repeatMode === 'none' ? 'all' : s.repeatMode === 'all' ? 'one' : 'none',
        }))
      },

      jumpTo: (index) => {
        const s = get()
        const next = jumpToIndex(s, index)
        if (next === s) return null
        set({ qIndex: next.qIndex })
        return getActiveQueue(next)[next.qIndex] ?? null
      },

      moveItem: (from, to) => set((s) => moveInQueue(s, from, to)),

      removeAt: (index) => set((s) => removeFromQueue(s, index)),

      addToQueue: (song) => {
        if (get().queue.some((x) => x.id === song.id)) return false
        set((s) => appendUnique(s, [song]))
        return true
      },

      appendSongs: (newSongs, allowRecordingCopies = false) => {
        if (!newSongs || newSongs.length === 0) return
        // Autoplay/radio batches: the same recording is listed under several ids, so skip copies
        // of songs already queued (appendUnique still guards exact ids)
        set((s) => {
          const unique = dedupSongs(newSongs)
          const fresh = unique.filter((n) => !s.queue.some((q) => isSameSong(q, n)))
          // Never leave the end of the queue empty: a repeated recording beats silence
          return appendUnique(s, fresh.length === 0 && allowRecordingCopies ? unique : fresh)
        })
      },
    }),
    {
      name: 'ytm-queue',
      storage: createJSONStorage(() => dedupLocalStorage),
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
