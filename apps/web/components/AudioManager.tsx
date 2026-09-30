'use client'
import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'
import { useSettingsStore, applyTheme, applyFontSize, EQ_PRESETS } from '@/stores/settings.store'
import { getAudioQualityUrl } from '@/lib/utils'
import { getOfflineSong } from '@/lib/offline-storage'
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
  const preloadBlobUrlRef = useRef<string | null>(null)
  const isFetchingRecommendationsRef = useRef(false)
  const lastFetchedSongIdRef = useRef<string | null>(null)
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasDowngradedForTrackRef = useRef(false)
  const prewarmedTrackIdRef = useRef<string | null>(null)
  const currentSongRef = useRef<Song | null>(null)

  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const setAudioRef = usePlayerStore((s) => s.setAudioRef)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setIsLoading = usePlayerStore((s) => s.setIsLoading)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const toggleMute = usePlayerStore((s) => s.toggleMute)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const seek = usePlayerStore((s) => s.seek)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const repeatMode = useQueueStore((s) => s.repeatMode)
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle)
  const toggleRepeat = useQueueStore((s) => s.toggleRepeat)

  const theme = useSettingsStore((s) => s.theme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const audioQuality = useSettingsStore((s) => s.audioQuality)
  const autoplay = useSettingsStore((s) => s.autoplay)
  const crossfade = useSettingsStore((s) => s.crossfade)
  const gapless = useSettingsStore((s) => s.gapless)
  const sleepTimerEnd = useSettingsStore((s) => s.sleepTimerEnd)
  const setSleepTimer = useSettingsStore((s) => s.setSleepTimer)
  const eqEnabled = useSettingsStore((s) => s.eqEnabled)
  const eqPreset = useSettingsStore((s) => s.eqPreset)
  const eqCustom = useSettingsStore((s) => s.eqCustom)

  const audioContextRef = useRef<AudioContext | null>(null)
  const eqFiltersRef = useRef<BiquadFilterNode[]>([])
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

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
      if (preloadBlobUrlRef.current) URL.revokeObjectURL(preloadBlobUrlRef.current)
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
      prewarmedTrackIdRef.current = null
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
  }, [currentSong, audioQuality])

  // 4. Handle sleep timer countdown
  useEffect(() => {
    if (!sleepTimerEnd) return
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimerEnd) {
        togglePlay()
        setSleepTimer(0)
        showToast('Sleep timer ended. Playback paused.')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [sleepTimerEnd, togglePlay, setSleepTimer])

  // 5. Gapless Preloading: preload the next track in queue (offline blob or CDN)
  const queue = useQueueStore((s) => s.queue)
  const qIndex = useQueueStore((s) => s.qIndex)
  const shuffleOn = useQueueStore((s) => s.shuffleOn)
  const shuffledQueue = useQueueStore((s) => s.shuffledQueue)

  useEffect(() => {
    if (!gapless || !isPlaying) return
    const activeQueue = shuffleOn ? shuffledQueue : queue
    const nextIndex = qIndex + 1
    if (nextIndex < activeQueue.length) {
      const nextSong = activeQueue[nextIndex]
      let isSubscribed = true

      getOfflineSong(nextSong.id).then((offlineRecord) => {
        if (!isSubscribed || !preloadRef.current) return
        let nextUrl = ''
        if (offlineRecord?.blob) {
          if (preloadBlobUrlRef.current) {
            URL.revokeObjectURL(preloadBlobUrlRef.current)
          }
          preloadBlobUrlRef.current = URL.createObjectURL(offlineRecord.blob)
          nextUrl = preloadBlobUrlRef.current
        } else {
          nextUrl = getAudioQualityUrl(nextSong.downloadUrl, audioQuality)
        }
        if (preloadRef.current.src !== nextUrl) {
          preloadRef.current.src = nextUrl
        }
      })

      return () => {
        isSubscribed = false
      }
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

  // 7. Setup Equalizer (safe opt-in when eqEnabled is true)
  const setupEqualizer = useCallback(() => {
    const el = audioRef.current
    if (!el || !eqEnabled || typeof window === 'undefined') return

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
  }, [eqEnabled])

  // Update EQ gains whenever EQ settings change
  useEffect(() => {
    if (eqEnabled) {
      setupEqualizer()
    } else {
      const el = audioRef.current
      if (el && !sourceNodeRef.current) {
        el.removeAttribute('crossorigin')
      }
    }
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
      const res = await fetch(
        `/api/search?recommendSongId=${encodeURIComponent(seedSong.id)}&artist=${encodeURIComponent(seedSong.artist)}&lang=${encodeURIComponent(seedSong.language || 'telugu')}`
      )
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

  // 8. Audio element event listeners
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => {
      setProgress(el.currentTime)

      // Autoplay prefetch when approaching end of queue
      const activeQueue = shuffleOn ? shuffledQueue : queue
      if (
        autoplay &&
        currentSong &&
        qIndex >= activeQueue.length - 1 &&
        el.duration > 15 &&
        el.currentTime >= el.duration - 12
      ) {
        prefetchRecommendations(currentSong)
      }

      // Next-track audio pre-warming 5 seconds before song completion
      if (el.duration > 10 && el.currentTime >= el.duration - 5) {
        const nextIdx = qIndex + 1
        if (nextIdx < activeQueue.length) {
          const nextSong = activeQueue[nextIdx]
          if (nextSong && prewarmedTrackIdRef.current !== nextSong.id) {
            prewarmedTrackIdRef.current = nextSong.id
            if (preloadRef.current && preloadRef.current.src) {
              preloadRef.current.load()
            }
          }
        }
      }

      // Crossfade near end of song
      if (
        crossfade > 0 &&
        el.duration > crossfade + 2 &&
        el.currentTime >= el.duration - crossfade &&
        !isFadingRef.current
      ) {
        isFadingRef.current = true
        fadeVolume(0, crossfade, () => {
          next()
          if (audioRef.current) audioRef.current.volume = 0
          isFadingRef.current = false
          fadeVolume(volume, Math.min(2, crossfade / 2))
        })
      }
    }

    const clearBufferingTimer = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current)
        bufferingTimerRef.current = null
      }
    }

    const onDuration = () => setDuration(el.duration)
    const onWaiting = () => {
      setIsLoading(true)
      // CDN Bitrate Adaptive Recovery: if buffering stalls > 4 seconds on slow connections
      if (
        !bufferingTimerRef.current &&
        !hasDowngradedForTrackRef.current &&
        currentSong &&
        !currentBlobUrlRef.current &&
        audioQuality === 'high'
      ) {
        bufferingTimerRef.current = setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused) {
            hasDowngradedForTrackRef.current = true
            const curTime = audioRef.current.currentTime
            const adaptedUrl = getAudioQualityUrl(currentSong.downloadUrl, 'normal')
            if (adaptedUrl && audioRef.current.src !== adaptedUrl) {
              audioRef.current.src = adaptedUrl
              audioRef.current.currentTime = curTime
              audioRef.current.play().catch(() => {})
              showToast('Slow connection detected — adapted audio quality for smooth playback')
            }
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
      setIsLoading(false)
      setIsPlaying(true)
    }
    const onPause = () => setIsPlaying(false)
    const onCanPlay = () => {
      clearBufferingTimer()
      setIsLoading(false)
    }
    const onError = () => {
      setIsLoading(false)
      consecutiveErrorsRef.current += 1
      if (consecutiveErrorsRef.current >= 3) {
        setIsPlaying(false)
        showToast('Playback stopped: Multiple tracks failed to load. Please check your connection.')
        return
      }
      if (currentSong) {
        showToast(`Failed to play "${currentSong.title}". Skipping to next track.`)
        if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = setTimeout(() => next(), 1000)
      }
    }
    const onEnded = async () => {
      if (repeatMode === 'one') {
        el.currentTime = 0
        el.play().catch(() => {})
        return
      }

      const activeQueue = shuffleOn ? shuffledQueue : queue
      const isAtEnd = qIndex >= activeQueue.length - 1

      if (isAtEnd && repeatMode === 'none' && autoplay && currentSong) {
        setIsLoading(true)
        try {
          const res = await fetch(
            `/api/search?recommendSongId=${encodeURIComponent(currentSong.id)}&artist=${encodeURIComponent(currentSong.artist)}&lang=${encodeURIComponent(currentSong.language || 'telugu')}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data?.songs && Array.isArray(data.songs) && data.songs.length > 0) {
              useQueueStore.getState().appendSongs(data.songs)
              setIsLoading(false)
              next()
              return
            }
          }
        } catch {
          // Fallback to normal next
        } finally {
          setIsLoading(false)
        }
      }

      next()
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('pause', onPause)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)
    el.addEventListener('ended', onEnded)

    return () => {
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current)
        skipTimeoutRef.current = null
      }
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
      el.removeEventListener('ended', onEnded)
    }
  }, [
    repeatMode,
    next,
    setProgress,
    setDuration,
    setIsPlaying,
    setIsLoading,
    currentSong,
    crossfade,
    volume,
    fadeVolume,
    autoplay,
    queue,
    qIndex,
    shuffleOn,
    shuffledQueue,
    prefetchRecommendations,
    audioQuality,
  ])

  // 9. MediaSession API
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

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', () => togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => togglePlay())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime)
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const offset = details.seekOffset || 10
      seek(Math.min(duration, progress + offset))
    })
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const offset = details.seekOffset || 10
      seek(Math.max(0, progress - offset))
    })

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
      }
    }
  }, [currentSong, isPlaying, duration, progress, togglePlay, prev, next, seek])

  // 10. Global Keyboard Shortcuts
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

      if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePlay()
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault()
        const cur = audioRef.current?.currentTime ?? progress
        seek(Math.max(0, cur - 10))
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault()
        const cur = audioRef.current?.currentTime ?? progress
        seek(Math.min(duration, cur + 10))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const cur = audioRef.current?.currentTime ?? progress
        seek(Math.max(0, cur - 5))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const cur = audioRef.current?.currentTime ?? progress
        seek(Math.min(duration, cur + 5))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.05))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.05))
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        toggleMute()
      } else if (e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        next()
      } else if (e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        prev()
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        toggleShuffle()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        toggleRepeat()
      } else if (e.key === 'Escape') {
        if (usePlayerStore.getState().isExpanded) {
          e.preventDefault()
          usePlayerStore.getState().setExpanded(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, seek, setVolume, toggleMute, next, prev, toggleShuffle, toggleRepeat, progress, duration, volume])

  return (
    <>
      <audio ref={audioRef} id="ytm-audio" preload="metadata" crossOrigin="anonymous" className="hidden" />
      <audio ref={preloadRef} id="ytm-preload-audio" preload="auto" crossOrigin="anonymous" className="hidden" />
    </>
  )
}