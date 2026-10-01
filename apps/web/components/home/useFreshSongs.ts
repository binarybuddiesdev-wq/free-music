'use client'
import { useContext, useEffect, useMemo, useState } from 'react'
import { createSongSet, isSameSong, takeFresh } from '@/lib/song-dedup'
import { SeenSongsContext } from './SeenSongsContext'
import type { Song } from '@/types/music'

/**
 * The songs of `source` not yet shown elsewhere on the page.
 * `pending` is true until `source` has been filtered, so callers can keep their skeleton up
 * instead of flashing an empty section for the one render between "loaded" and "filtered".
 */
export function useFreshSongs(source: Song[] | undefined, limit = Infinity): { songs: Song[]; pending: boolean } {
  const ctx = useContext(SeenSongsContext)
  const seenRef = ctx?.seen
  const reserved = ctx?.reserved
  const [state, setState] = useState<{ source: Song[]; fresh: Song[] } | null>(null)

  useEffect(() => {
    if (!source) return
    const seen = seenRef?.current ?? createSongSet()
    const fresh = takeFresh(source, seen, limit)
    setState({ source, fresh })
    // Clean up on unmount so Strict Mode double-invoke stays correct
    return () => fresh.forEach((s) => seen.delete(s))
  }, [source, seenRef, limit])

  const songs = useMemo(() => {
    const fresh = state?.fresh ?? []
    return reserved && reserved.length > 0 ? fresh.filter((s) => !reserved.some((r) => isSameSong(r, s))) : fresh
  }, [state, reserved])

  return { songs, pending: !!source && state?.source !== source }
}
