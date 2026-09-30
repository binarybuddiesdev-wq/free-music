import type { Song } from '@/types/music'
import { getAudioQualityUrl, formatBytes } from './utils'
export { formatBytes }

const DB_NAME = 'free_music_db'
const DB_VERSION = 1
const STORE_NAME = 'downloaded_songs'

export interface OfflineSongRecord {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  image?: string
  language?: string
  year?: string
  downloadUrl?: string
  blob: Blob
  downloadedAt: number
  fileSize: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in browser environments'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function notifyUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-songs-updated'))
  }
}

export async function saveOfflineSong(song: Song): Promise<void> {
  let quality: any = 'high'
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('ytm-settings') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.audioQuality) quality = parsed.state.audioQuality
    }
  } catch {}

  const audioUrl = getAudioQualityUrl(song.downloadUrl, quality)

  if (!audioUrl) {
    throw new Error('Song does not have a valid streaming URL')
  }

  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Failed to download audio data: HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const fileSize = blob.size

  const record: OfflineSongRecord = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    image: song.image,
    language: song.language,
    year: song.year,
    downloadUrl: song.downloadUrl,
    blob,
    downloadedAt: Date.now(),
    fileSize,
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record)

    req.onsuccess = () => {
      notifyUpdated()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function removeOfflineSong(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)

    req.onsuccess = () => {
      notifyUpdated()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflineSong(id: string): Promise<OfflineSongRecord | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)

      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function isSongDownloaded(id: string): Promise<boolean> {
  const record = await getOfflineSong(id)
  return !!record
}

export async function getAllOfflineSongs(): Promise<OfflineSongRecord[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        const list: OfflineSongRecord[] = req.result || []
        // Sort descending by downloadedAt
        list.sort((a, b) => b.downloadedAt - a.downloadedAt)
        resolve(list)
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function clearAllOfflineSongs(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.clear()

    req.onsuccess = () => {
      notifyUpdated()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflineStorageEstimate(): Promise<{ usage: number; quota: number; count: number }> {
  try {
    let usage = 0
    let quota = 0
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate()
      usage = est.usage || 0
      quota = est.quota || 0
    }
    const songs = await getAllOfflineSongs()
    const songsBytes = songs.reduce((sum, s) => sum + (s.fileSize || s.blob?.size || 0), 0)

    return {
      usage: usage > 0 ? usage : songsBytes,
      quota,
      count: songs.length,
    }
  } catch {
    return { usage: 0, quota: 0, count: 0 }
  }
}
