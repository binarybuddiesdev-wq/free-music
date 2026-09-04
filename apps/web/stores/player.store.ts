'use client'
import { create } from 'zustand'
import type { Song } from '@/types/music'
import { useQueueStore } from './queue.store'
import { useLibraryStore } from './library.store'

interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  mode: 'audio' | 'video'
  volume: number
  muted: boolean
  progress: number
  duration: number
  audioRef: React.RefObject<HTMLAudioElement | null> | null
  isExpanded: boolean
  savedTimeForVideo: number
  setAudioRef: (ref: React.RefObject<HTMLAudioElement | null>) => void
  playSong: (song: Song, queue: Song[], startIndex?: number) => void
  togglePlay: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setMode: (mode: 'audio' | 'video') => void
  setProgress: (p: number) => void
  setDuration: (d: number) => void
  setExpanded: (v: boolean) => void
  next: () => void
  prev: () => void
  setSavedTimeForVideo: (t: number) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  mode: 'audio',
  volume: 1,
  muted: false,
  progress: 0,
  duration: 0,
  audioRef: null,
  isExpanded: false,
  savedTimeForVideo: 0,

  setAudioRef: (ref) => set({ audioRef: ref }),

  playSong: (song, queue, startIndex = 0) => {
    const { audioRef } = get()
    useQueueStore.getState().setQueue(queue, startIndex)
    useLibraryStore.getState().addToHistory(song)
    set({ currentSong: song, isPlaying: true, progress: 0, mode: 'audio' })

    if (audioRef?.current) {
      audioRef.current.src = song.downloadUrl
      audioRef.current.volume = get().volume
      audioRef.current.muted = get().muted
      audioRef.current.play().catch(() => {})
    }
  },

  togglePlay: () => {
    const { audioRef, isPlaying } = get()
    if (!audioRef?.current) return
    if (isPlaying) {
      audioRef.current.pause()
      set({ isPlaying: false })
    } else {
      audioRef.current.play().catch(() => {})
      set({ isPlaying: true })
    }
  },

  seek: (seconds) => {
    const { audioRef } = get()
    if (audioRef?.current) audioRef.current.currentTime = seconds
    set({ progress: seconds })
  },

  setVolume: (v) => {
    const { audioRef } = get()
    if (audioRef?.current) audioRef.current.volume = v
    set({ volume: v, muted: v === 0 })
  },

  toggleMute: () => {
    const { audioRef, muted, volume } = get()
    const next = !muted
    if (audioRef?.current) audioRef.current.muted = next
    set({ muted: next, volume: next ? 0 : volume || 0.8 })
  },

  setMode: (mode) => set({ mode }),
  setProgress: (p) => set({ progress: p }),
  setDuration: (d) => set({ duration: d }),
  setExpanded: (v) => set({ isExpanded: v }),
  setSavedTimeForVideo: (t) => set({ savedTimeForVideo: t }),

  next: () => {
    const { audioRef } = get()
    const song = useQueueStore.getState().next()
    if (!song) return
    useLibraryStore.getState().addToHistory(song)
    set({ currentSong: song, progress: 0 })
    if (audioRef?.current) {
      audioRef.current.src = song.downloadUrl
      audioRef.current.play().catch(() => {})
    }
  },

  prev: () => {
    const { audioRef, progress } = get()
    if (progress > 3 && audioRef?.current) {
      audioRef.current.currentTime = 0
      return
    }
    const song = useQueueStore.getState().prev()
    if (!song) return
    set({ currentSong: song, progress: 0 })
    if (audioRef?.current) {
      audioRef.current.src = song.downloadUrl
      audioRef.current.play().catch(() => {})
    }
  },
}))
