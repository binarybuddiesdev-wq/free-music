'use client'
import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useSettingsStore, applyTheme, applyFontSize, EQ_PRESETS } from '@/stores/settings.store'
import { getAudioQualityUrl } from '@/lib/utils'
import { getOfflineSong } from '@/lib/offline-storage'
import { getActiveQueue } from '@/lib/queue-logic'
import { recommendationsUrl } from '@/lib/api-urls'
import { isSleepTimerDue } from '@/lib/settings-persist'
import { showToast } from '@/components/ui/Toast'
import type { Song } from '@/types/music'

let globalAnalyser: AnalyserNode | null = null

export function getAudioAnalyser(): AnalyserNode | null {
  return globalAnalyser
}

export function AudioManager() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const preloadRef = useRef<HTMLAudioElement>(null)
  const isFadingRef = useRef(false)
  const consecutiveErrorsRef = useRef(0)
  const currentBlobUrlRef = useRef<string | null>(null)
  const isFetchingRecommendationsRef = useRef(false)
  const lastFetchedSongIdRef = useRef<string | null>(null)
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasDowngradedForTrackRef = useRef(false)
  const currentSongRef = useRef<Song | null>(null)

  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const setAudioRef = usePlayerStore((s) => s.setAudioRef)

  const theme = useSettingsStore((s) => s.theme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const audioQuality = useSettingsStore((s) => s.audioQuality)
  const gapless = useSettingsStore((s) => s.gapless)
  const sleepTimerEnd = useSettingsStore((s) => s.sleepTimerEnd)
  const setSleepTimer = useSettingsStore((s) => s.setSleepTimer)
  const eqEnabled = useSettingsStore((s) => s.eqEnabled)
  const eqPreset = useSettingsStore((s) => s.eqPreset)
  const eqCustom = useSettingsStore((s) => s.eqCustom)

  const audioContextRef = useRef<AudioContext | null>(null)
  const eqFiltersRef = useRef<BiquadFilterNode[]>([])
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Shared by the <audio> error handler and tracks that have no playable URL at all
  const skipUnplayableTrack = useCallback((title: string) => {
    const player = usePlayerStore.getState()
    player.setIsLoading(false)
    consecutiveErrorsRef.current += 1
    if (consecutiveErrorsRef.current >= 3) {
      player.setIsPlaying(false)
      showToast('Playback stopped: Multiple tracks failed to load. Please check your connection.')
      return
    }
    showToast(`Failed to play "${title}". Skipping to next track.`)
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current)
    skipTimeoutRef.current = setTimeout(() => usePlayerStore.getState().next(), 1000)
  }, [])

  // 1. Initialize Theme & Font Size
  useEffect(() => {
    applyTheme(theme)
    applyFontSize(fontSize)

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const handleThemeChange = () => applyTheme('system')
      media.addEventListener('change', handleThemeChange)
      return () => media.removeEventListener('change', handleThemeChange)
    }
  }, [theme, fontSize])

  // 2. Register audio element with store on mount & cleanup blob URLs on unmount
  useEffect(() => {
    setAudioRef(audioRef as React.RefObject<HTMLAudioElement | null>)
    return () => {
      if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current)
    }
  }, [setAudioRef])

  // 3a. Dedicated Volume & Mute Sync (never reloads audio source or recreates blob URLs)
  useEffect(() => {
    const el = audioRef.current
    if (el) {
      el.volume = volume
      el.muted = muted
    }
  }, [volume, muted])

  // 3b. Dedicated Play/Pause Sync
  useEffect(() => {
    const el = audioRef.current
    if (!el || !el.src) return
    if (isPlaying) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [isPlaying])

  // 3c. Set audio source (IndexedDB offline blob priority, fallback to CDN quality url)
  useEffect(() => {
    const el = audioRef.current
    if (!el || !currentSong) return

    let isSubscribed = true
    const isSameSong = currentSongRef.current?.id === currentSong.id

    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current)
      skipTimeoutRef.current = null
    }
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current)
      bufferingTimerRef.current = null
    }
    if (!isSameSong) {
      hasDowngradedForTrackRef.current = false
    }

    const updateAudioSource = async () => {
      // If exact same song is already playing from an offline blob, no need to reload
      if (isSameSong && currentBlobUrlRef.current) {
        return
      }

      const offlineRecord = await getOfflineSong(currentSong.id)
      if (!isSubscribed) return

      let targetUrl = ''
      if (offlineRecord?.blob) {
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current)
        }
        currentBlobUrlRef.current = URL.createObjectURL(offlineRecord.blob)
        targetUrl = currentBlobUrlRef.current
      } else {
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current)
          currentBlobUrlRef.current = null
        }
        targetUrl = getAudioQualityUrl(currentSong.downloadUrl, audioQuality)
      }

      // Decryption failed / no media URL: never leave the spinner running forever
      if (!targetUrl) {
        currentSongRef.current = currentSong
        skipUnplayableTrack(currentSong.title)
        return
      }

      if (targetUrl && (!isSameSong || el.src !== targetUrl)) {
        const curTime = isSameSong ? el.currentTime : 0
        const storeState = usePlayerStore.getState()
        el.src = targetUrl
        el.volume = storeState.volume
        el.muted = storeState.muted
        el.currentTime = curTime
        if (storeState.isPlaying) {
          el.play().catch(() => {})
        }
      } else if (usePlayerStore.getState().isPlaying && el.paused) {
        el.play().catch(() => {})
      }

      currentSongRef.current = currentSong
    }

    updateAudioSource()

    return () => {
      isSubscribed = false
    }
  }, [currentSong, audioQuality, skipUnplayableTrack])

  // 4. Handle sleep timer countdown — always PAUSES (never toggles, which could start playback)
  useEffect(() => {
    if (!sleepTimerEnd) return
    const interval = setInterval(() => {
      if (isSleepTimerDue(sleepTimerEnd, Date.now())) {
        usePlayerStore.getState().pause()
        setSleepTimer(0)
        showToast('Sleep timer ended. Playback paused.')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [sleepTimerEnd, setSleepTimer])

  // 5. Gapless preloading: warm up the next CDN track's metadata only.
  // (preload="metadata" — the old preload="auto" + load() downloaded every next track twice)
  const queue = useQueueStore((s) => s.queue)
  const qIndex = useQueueStore((s) => s.qIndex)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)

  useEffect(() => {
    const preload = preloadRef.current
    if (!gapless || !isPlaying || !preload) return
    const nextSong = getActiveQueue({ queue, shuffledQueue, qIndex, shuffleOn })[qIndex + 1]
    if (!nextSong) return

    let isSubscribed = true
    getOfflineSong(nextSong.id).then((offlineRecord) => {
      // Downloaded tracks play from IndexedDB — nothing to warm up over the network
      if (!isSubscribed || offlineRecord?.blob) return
      const nextUrl = getAudioQualityUrl(nextSong.downloadUrl, audioQuality)
      if (nextUrl && preload.src !== nextUrl) preload.src = nextUrl
    })

    return () => {
      isSubscribed = false
    }
  }, [gapless, isPlaying, queue, qIndex, shuffleOn, shuffledQueue, audioQuality])

  // 6. Volume fade helper for smooth crossfade
  const fadeVolume = useCallback((targetVol: number, durationSec: number, onEnd?: () => void) => {
    const el = audioRef.current
    if (!el || durationSec <= 0) {
      if (el) el.volume = targetVol
      onEnd?.()
      return
    }
    const startVol = el.volume
    const startTime = performance.now()
    const durationMs = durationSec * 1000

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs)
      const cur = startVol + (targetVol - startVol) * progress
      if (el) el.volume = Math.max(0, Math.min(1, cur))
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        onEnd?.()
      }
    }
    requestAnimationFrame(step)
  }, [])

  // 7. Audio graph: source -> EQ filters -> analyser -> output. Always built so the visualizer
  // follows the real audio; with EQ off every filter gain is 0, so the sound is unchanged.
  const setupEqualizer = useCallback(() => {
    const el = audioRef.current
    if (!el || typeof window === 'undefined') return

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      if (!audioContextRef.current) {
        const ctx = new AudioContextClass()
        audioContextRef.current = ctx

        const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
        const filters = EQ_FREQUENCIES.map((freq) => {
          const f = ctx.createBiquadFilter()
          f.type = 'peaking'
          f.frequency.value = freq
          f.Q.value = 1
          f.gain.value = 0
          return f
        })
        eqFiltersRef.current = filters

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.8
        globalAnalyser = analyser

        if (!sourceNodeRef.current) {
          try {
            el.crossOrigin = 'anonymous'
            const src = ctx.createMediaElementSource(el)
            sourceNodeRef.current = src
            let lastNode: AudioNode = src
            filters.forEach((filter) => {
              lastNode.connect(filter)
              lastNode = filter
            })
            lastNode.connect(analyser)
            analyser.connect(ctx.destination)
          } catch {
            // If CORS fails, revert crossOrigin so native playback remains audible
            el.removeAttribute('crossorigin')
            sourceNodeRef.current = null
            globalAnalyser = null
          }
        }
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {})
      }
    } catch {
      // Browser Web Audio fallback
    }
  }, [])

  // Update EQ gains whenever EQ settings change
  useEffect(() => {
    setupEqualizer()
    const filters = eqFiltersRef.current
    if (!filters.length) return
    const presetGains = eqPreset === 'custom' ? eqCustom : (EQ_PRESETS[eqPreset] ?? eqCustom)
    const gains = eqEnabled && eqPreset !== 'flat' ? presetGains : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    filters.forEach((filter, i) => {
      filter.gain.value = gains[i] ?? 0
    })
  }, [eqEnabled, eqPreset, eqCustom, setupEqualizer])

  // 7b. Mobile & Browser Web Audio Context Unlock on User Interaction
  useEffect(() => {
    const unlockAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {})
      }
    }

    window.addEventListener('pointerdown', unlockAudioContext, { passive: true })
    window.addEventListener('touchstart', unlockAudioContext, { passive: true })
    window.addEventListener('keydown', unlockAudioContext, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudioContext)
      window.removeEventListener('touchstart', unlockAudioContext)
      window.removeEventListener('keydown', unlockAudioContext)
    }
  }, [])

  // 7c. Autoplay prefetch recommendations callback
  const prefetchRecommendations = useCallback(async (seedSong: Song) => {
    if (isFetchingRecommendationsRef.current || lastFetchedSongIdRef.current === seedSong.id) {
      return
    }
    isFetchingRecommendationsRef.current = true
    lastFetchedSongIdRef.current = seedSong.id
    try {
      const res = await fetch(recommendationsUrl(seedSong))
      if (res.ok) {
        const data = await res.json()
        if (data?.songs && Array.isArray(data.songs) && data.songs.length > 0) {
          useQueueStore.getState().appendSongs(data.songs)
        }
      }
    } catch {
      // Ignore background recommendation errors
    } finally {
      isFetchingRecommendationsRef.current = false
    }
  }, [])

  // 8. Audio element event listeners — attached ONCE; every handler reads the latest
  // state via getState(), so volume/queue changes no longer detach and re-attach them.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const clearBufferingTimer = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current)
        bufferingTimerRef.current = null
      }
    }

    const onTimeUpdate = () => {
      const player = usePlayerStore.getState()
      player.setProgress(el.currentTime)

      const { autoplay, crossfade } = useSettingsStore.getState()
      const queueState = useQueueStore.getState()
      const song = player.currentSong

      // Autoplay: prefetch recommendations when approaching the end of the queue
      if (
        autoplay &&
        song &&
        queueState.qIndex >= getActiveQueue(queueState).length - 1 &&
        el.duration > 15 &&
        el.currentTime >= el.duration - 12
      ) {
        prefetchRecommendations(song)
      }

      // Crossfade near the end of the song
      if (
        crossfade > 0 &&
        queueState.repeatMode !== 'one' &&
        el.duration > crossfade + 2 &&
        el.currentTime >= el.duration - crossfade &&
        !isFadingRef.current
      ) {
        isFadingRef.current = true
        fadeVolume(0, crossfade, () => {
          usePlayerStore.getState().next()
          if (audioRef.current) audioRef.current.volume = 0
          isFadingRef.current = false
          fadeVolume(usePlayerStore.getState().volume, Math.min(2, crossfade / 2))
        })
      }
    }

    const onDuration = () => usePlayerStore.getState().setDuration(el.duration)

    const onWaiting = () => {
      const player = usePlayerStore.getState()
      player.setIsLoading(true)
      const song = player.currentSong
      // CDN bitrate adaptive recovery: if buffering stalls > 4 s on a slow connection
      if (
        !bufferingTimerRef.current &&
        !hasDowngradedForTrackRef.current &&
        song &&
        !currentBlobUrlRef.current &&
        useSettingsStore.getState().audioQuality === 'high'
      ) {
        bufferingTimerRef.current = setTimeout(() => {
          bufferingTimerRef.current = null
          const audio = audioRef.current
          if (!audio || audio.paused || usePlayerStore.getState().currentSong?.id !== song.id) return
          hasDowngradedForTrackRef.current = true
          const curTime = audio.currentTime
          const adaptedUrl = getAudioQualityUrl(song.downloadUrl, 'normal')
          if (adaptedUrl && audio.src !== adaptedUrl) {
            audio.src = adaptedUrl
            audio.currentTime = curTime
            audio.play().catch(() => {})
            showToast('Slow connection detected — adapted audio quality for smooth playback')
          }
        }, 4000)
      }
    }

    const onPlaying = () => {
      clearBufferingTimer()
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = null
      }
      consecutiveErrorsRef.current = 0
      const player = usePlayerStore.getState()
      player.setIsLoading(false)
      player.setIsPlaying(true)
    }

    const onPause = () => usePlayerStore.getState().setIsPlaying(false)

    // Playback started without a click (hardware media key, restored session): the Web Audio
    // graph would stay suspended and the track would play silently
    const onPlay = () => {
      const ctx = audioContextRef.current
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    }

    const onCanPlay = () => {
      clearBufferingTimer()
      usePlayerStore.getState().setIsLoading(false)
    }

    const onError = () => {
      const song = usePlayerStore.getState().currentSong
      if (song) skipUnplayableTrack(song.title)
      else usePlayerStore.getState().setIsLoading(false)
    }

    const onEnded = async () => {
      const queueState = useQueueStore.getState()
      if (queueState.repeatMode === 'one') {
        el.currentTime = 0
        el.play().catch(() => {})
        return
      }

      const isAtEnd = queueState.qIndex >= getActiveQueue(queueState).length - 1
      const song = usePlayerStore.getState().currentSong
      if (isAtEnd && queueState.repeatMode === 'none' && useSettingsStore.getState().autoplay && song) {
        usePlayerStore.getState().setIsLoading(true)
        try {
          const res = await fetch(recommendationsUrl(song))
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data?.songs) && data.songs.length > 0) {
              useQueueStore.getState().appendSongs(data.songs)
            }
          }
        } catch {
          // Fall through to a normal next()
        } finally {
          usePlayerStore.getState().setIsLoading(false)
        }
      }

      usePlayerStore.getState().next()
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('pause', onPause)
    el.addEventListener('play', onPlay)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)
    el.addEventListener('ended', onEnded)

    return () => {
      clearBufferingTimer()
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = null
      }
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
      el.removeEventListener('ended', onEnded)
    }
  }, [fadeVolume, prefetchRecommendations, skipUnplayableTrack])

  // 9a. MediaSession metadata — only when the track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'YouTube Music',
      artwork: currentSong.image
        ? [
            { src: currentSong.image, sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.image, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    })
  }, [currentSong])

  // 9b. MediaSession playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // 9c. MediaSession action handlers — registered once, read the latest state on demand
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const player = () => usePlayerStore.getState()
    const currentTime = () => audioRef.current?.currentTime ?? player().progress
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { if (!player().isPlaying) player().togglePlay() }],
      ['pause', () => player().pause()],
      ['previoustrack', () => player().prev()],
      ['nexttrack', () => player().next()],
      ['seekto', (d) => { if (d.seekTime !== undefined) player().seek(d.seekTime) }],
      ['seekforward', (d) => player().seek(Math.min(player().duration, currentTime() + (d.seekOffset || 10)))],
      ['seekbackward', (d) => player().seek(Math.max(0, currentTime() - (d.seekOffset || 10)))],
    ]
    for (const [action, handler] of handlers) {
      try { ms.setActionHandler(action, handler) } catch { /* action unsupported by this browser */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { ms.setActionHandler(action, null) } catch { /* ignore */ }
      }
    }
  }, [])

  // 10. Global keyboard shortcuts — registered once; reads the latest state per key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.getAttribute?.('role') === 'button' ||
          target.isContentEditable)
      ) {
        return
      }

      const player = usePlayerStore.getState()
      const queueStore = useQueueStore.getState()
      const cur = audioRef.current?.currentTime ?? player.progress
      const key = e.key.toLowerCase()

      if (e.code === 'Space' || key === 'k') {
        e.preventDefault()
        player.togglePlay()
      } else if (key === 'j') {
        e.preventDefault()
        player.seek(Math.max(0, cur - 10))
      } else if (key === 'l') {
        e.preventDefault()
        player.seek(Math.min(player.duration, cur + 10))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        player.seek(Math.max(0, cur - 5))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        player.seek(Math.min(player.duration, cur + 5))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        player.setVolume(Math.min(1, player.volume + 0.05))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        player.setVolume(Math.max(0, player.volume - 0.05))
      } else if (key === 'm') {
        e.preventDefault()
        player.toggleMute()
      } else if (e.shiftKey && key === 'n') {
        e.preventDefault()
        player.next()
      } else if (e.shiftKey && key === 'p') {
        e.preventDefault()
        player.prev()
      } else if (key === 's') {
        e.preventDefault()
        queueStore.toggleShuffle()
      } else if (key === 'r') {
        e.preventDefault()
        queueStore.toggleRepeat()
      } else if (e.key === 'Escape' && player.isExpanded) {
        e.preventDefault()
        player.setExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <audio ref={audioRef} id="ytm-audio" preload="metadata" crossOrigin="anonymous" className="hidden" />
      <audio ref={preloadRef} id="ytm-preload-audio" preload="metadata" crossOrigin="anonymous" className="hidden" />
    </>
  )
}