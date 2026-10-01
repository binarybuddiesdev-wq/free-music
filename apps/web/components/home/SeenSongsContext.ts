'use client'
import { createContext } from 'react'
import type { SongSet } from '@/lib/song-dedup'

export const SeenSongsContext = createContext<React.MutableRefObject<SongSet> | null>(null)
