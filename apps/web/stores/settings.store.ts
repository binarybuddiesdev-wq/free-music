'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dedupLocalStorage } from '@/lib/dedup-storage'
import { DEFAULT_LANGUAGE } from '@/lib/languages'
import { partializeSettings, mergeSettings } from '@/lib/settings-persist'

export type Theme = 'dark' | 'light' | 'system'
export type AudioQuality = 'low' | 'normal' | 'high'
export type EQPreset = 'flat' | 'bass' | 'vocal' | 'rock' | 'electronic' | 'custom'

export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const resolved =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.dataset.theme = resolved
  if (document.body) {
    document.body.setAttribute('data-theme', resolved)
    document.body.dataset.theme = resolved
  }
}

export function applyFontSize(size: 'small' | 'medium' | 'large') {
  if (typeof window === 'undefined') return
  document.documentElement.setAttribute('data-font-size', size)
  document.documentElement.dataset.fontSize = size
}

interface SettingsState {
  language: string
  setLanguage: (lang: string) => void

  // Appearance
  theme: Theme
  setTheme: (t: Theme) => void
  fontSize: 'small' | 'medium' | 'large'
  setFontSize: (s: 'small' | 'medium' | 'large') => void

  // Playback
  audioQuality: AudioQuality
  setAudioQuality: (q: AudioQuality) => void
  autoplay: boolean
  setAutoplay: (enabled: boolean) => void
  crossfade: number
  setCrossfade: (v: number) => void
  gapless: boolean
  setGapless: (v: boolean) => void
  sleepTimer: number
  sleepTimerEnd: number | null
  setSleepTimer: (v: number) => void

  // Equalizer
  eqEnabled: boolean
  setEqEnabled: (v: boolean) => void
  eqPreset: EQPreset
  setEqPreset: (p: EQPreset) => void
  eqCustom: number[]
  setEqCustom: (bands: number[]) => void

  // Player
  showVisualizer: boolean
  setShowVisualizer: (v: boolean) => void

  // Lyrics
  lyricsFontSize: number
  setLyricsFontSize: (v: number) => void
  lyricsOffset: number
  setLyricsOffset: (v: number) => void
}

export const EQ_PRESETS: Record<EQPreset, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 4, 2, 0, 0, -2, -4, -6, -8, -10],
  vocal: [-4, -2, 0, 2, 4, 6, 4, 2, 0, -2],
  rock: [4, 2, 0, -2, -4, 0, 2, 4, 6, 8],
  electronic: [2, 4, 6, 4, 0, -2, -4, 2, 4, 6],
  custom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),

      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      fontSize: 'medium',
      setFontSize: (fontSize) => {
        set({ fontSize })
        applyFontSize(fontSize)
      },

      audioQuality: 'high',
      setAudioQuality: (audioQuality) => set({ audioQuality }),

      autoplay: true,
      setAutoplay: (autoplay) => set({ autoplay }),

      crossfade: 0,
      setCrossfade: (crossfade) => set({ crossfade }),

      gapless: true,
      setGapless: (gapless) => set({ gapless }),

      sleepTimer: 0,
      sleepTimerEnd: null,
      setSleepTimer: (sleepTimer) => {
        const sleepTimerEnd = sleepTimer > 0 ? Date.now() + sleepTimer * 60 * 1000 : null
        set({ sleepTimer, sleepTimerEnd })
      },

      showVisualizer: false,
      setShowVisualizer: (showVisualizer) => set({ showVisualizer }),

      eqEnabled: false,
      setEqEnabled: (eqEnabled) => {
        set({ eqEnabled })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eq-toggle', { detail: eqEnabled }))
        }
      },

      eqPreset: 'flat',
      setEqPreset: (eqPreset) => {
        // Picking "Custom" keeps the user's bands; every other preset becomes the new starting point
        set(eqPreset === 'custom' ? { eqPreset } : { eqPreset, eqCustom: EQ_PRESETS[eqPreset] })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eq-preset-change', { detail: get().eqCustom }))
        }
      },

      eqCustom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      setEqCustom: (eqCustom) => {
        set({ eqCustom, eqPreset: 'custom' })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eq-custom-change', { detail: eqCustom }))
        }
      },

      lyricsFontSize: 17,
      setLyricsFontSize: (lyricsFontSize) => set({ lyricsFontSize }),
      lyricsOffset: 0,
      setLyricsOffset: (lyricsOffset) => set({ lyricsOffset }),
    }),
    {
      name: 'ytm-settings',
      storage: createJSONStorage(() => dedupLocalStorage),
      skipHydration: true,
      partialize: (s) => partializeSettings(s),
      merge: (persisted, current) => mergeSettings(persisted, current),
    }
  )
)
