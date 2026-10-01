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

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environments'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      // Another tab upgraded the DB: close ours so the upgrade isn't blocked, reopen lazily
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
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
    store.put(record)

    // Resolve on commit, not on the request: a full disk raises QuotaExceededError at commit time,
    // after put() has already "succeeded"
    tx.oncomplete = () => {
      notifyUpdated()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Saving the download was aborted'))
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
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getKey(id)
      req.onsuccess = () => resolve(req.result !== undefined)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function countOfflineSongs(): Promise<number> {
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(0)
    })
  } catch {
    return 0
  }
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

/** Pass the list you already loaded to avoid reading every record a second time. */
export async function getOfflineStorageEstimate(
  knownSongs?: OfflineSongRecord[]
): Promise<{ usage: number; quota: number; count: number }> {
  try {
    let usage = 0
    let quota = 0
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate()
      usage = est.usage || 0
      quota = est.quota || 0
    }
    // Only read all records when we must sum sizes ourselves
    const songs = knownSongs ?? (usage > 0 ? null : await getAllOfflineSongs())
    const count = songs ? songs.length : await countOfflineSongs()
    const songsBytes = songs ? songs.reduce((sum, s) => sum + (s.fileSize || s.blob?.size || 0), 0) : 0
    return { usage: usage > 0 ? usage : songsBytes, quota, count }
  } catch {
    return { usage: 0, quota: 0, count: 0 }
  }
}
