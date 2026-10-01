'use client'
import { createContext } from 'react'
import type { SongSet } from '@/lib/song-dedup'
import type { Song } from '@/types/music'

export interface SeenSongs {
  /** Songs already shown by the sections above/besides, so one recording appears once per page. */
  seen: React.MutableRefObject<SongSet>
  /** "Listen again" songs. They win over every other section no matter which one loaded first. */
  reserved: Song[]
}

export const SeenSongsContext = createContext<SeenSongs | null>(null)
