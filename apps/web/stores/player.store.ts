'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dedupLocalStorage } from '@/lib/dedup-storage'
import { toggleMuteState, setVolumeState } from '@/lib/player-logic'
import type { Song } from '@/types/music'
import { useQueueStore } from './queue.store'
import { useLibraryStore } from './library.store'

interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  isLoading: boolean
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
  /** Play an item that is already in the queue (Up Next / queue drawer). Does NOT rebuild or reshuffle the queue. */
  playQueueIndex: (index: number) => void
  togglePlay: () => void
  pause: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setMode: (mode: 'audio' | 'video') => void
  switchToAudio: () => void
  setProgress: (p: number) => void
  setDuration: (d: number) => void
  setExpanded: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setIsPlaying: (v: boolean) => void
  next: () => void
  prev: () => void
  startTrack: (song: Song) => void
  setSavedTimeForVideo: (t: number) => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      isLoading: false,
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
        const { audioRef, currentSong } = get()
        useQueueStore.getState().setQueue(queue, startIndex, true)
        useLibraryStore.getState().addToHistory(song)
        if (currentSong?.id === song.id && audioRef?.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
        set({ currentSong: { ...song }, isPlaying: true, isLoading: true, progress: 0, mode: 'audio' })
      },

      playQueueIndex: (index) => {
        const song = useQueueStore.getState().jumpTo(index)
        if (!song) return
        const { audioRef, currentSong } = get()
        const isSame = currentSong?.id === song.id
        useLibraryStore.getState().addToHistory(song)
        if (isSame && audioRef?.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
        set({ currentSong: { ...song }, isPlaying: true, isLoading: !isSame, progress: 0, mode: 'audio' })
      },

      togglePlay: () => {
        const { audioRef, isPlaying, mode } = get()
        // In video mode the audio element is intentionally paused; "play" means go back to audio
        if (mode === 'video') {
          get().switchToAudio()
          return
        }
        if (!audioRef?.current) return
        if (isPlaying) {
          audioRef.current.pause()
          set({ isPlaying: false })
        } else {
          audioRef.current.play().catch(() => {})
          set({ isPlaying: true })
        }
      },

      pause: () => {
        get().audioRef?.current?.pause()
        set({ isPlaying: false })
      },

      seek: (seconds) => {
        const { audioRef } = get()
        if (audioRef?.current) audioRef.current.currentTime = seconds
        set({ progress: seconds })
      },

      setVolume: (v) => {
        const next = setVolumeState(v)
        const el = get().audioRef?.current
        if (el) {
          el.volume = next.volume
          el.muted = next.muted
        }
        set(next)
      },

      toggleMute: () => {
        const { muted, volume } = get()
        const next = toggleMuteState({ muted, volume })
        const el = get().audioRef?.current
        if (el) {
          el.muted = next.muted
          el.volume = next.volume
        }
        set(next)
      },

      setMode: (mode) => set({ mode }),
      switchToAudio: () => {
        const { audioRef, savedTimeForVideo } = get()
        set({ mode: 'audio', savedTimeForVideo: 0, isPlaying: true })
        if (audioRef?.current) {
          if (savedTimeForVideo > 0) {
            try { audioRef.current.currentTime = savedTimeForVideo } catch { /* src may not be ready */ }
          }
          audioRef.current.play().catch(() => {})
        }
      },
      setProgress: (p) => set({ progress: p }),
      setDuration: (d) => set({ duration: d }),
      setExpanded: (v) => set({ isExpanded: v }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setSavedTimeForVideo: (t) => set({ savedTimeForVideo: t }),

      next: () => {
        const song = useQueueStore.getState().next()
        if (!song) return
        get().startTrack(song)
      },

      prev: () => {
        const { audioRef, progress } = get()
        if (progress > 3 && audioRef?.current) {
          audioRef.current.currentTime = 0
          set({ progress: 0 })
          return
        }
        const song = useQueueStore.getState().prev()
        if (!song) return
        get().startTrack(song)
      },

      // Shared by next/prev. When the queue lands on the song that is already loaded (first track,
      // single-song queue) the audio source does not change, so restart it by hand and do not
      // raise the loading flag: no canplay/playing event would ever clear it.
      startTrack: (song) => {
        const { audioRef, currentSong } = get()
        const isSame = currentSong?.id === song.id
        useLibraryStore.getState().addToHistory(song)
        if (isSame && audioRef?.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
        set({ currentSong: { ...song }, progress: 0, isPlaying: true, isLoading: !isSame, mode: 'audio' })
      },
    }),
    {
      name: 'ytm-player',
      storage: createJSONStorage(() => dedupLocalStorage),
      skipHydration: true,
      partialize: (s) => ({
        currentSong: s.currentSong,
        volume: s.volume,
        muted: s.muted,
        mode: s.mode,
      }),
    }
  )
)
