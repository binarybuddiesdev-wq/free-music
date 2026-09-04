'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LANGUAGE } from '@/lib/languages'

interface SettingsState {
  language: string
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),
    }),
    { name: 'ytm-settings' }
  )
)
