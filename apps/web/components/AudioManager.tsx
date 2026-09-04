'use client'
import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/player.store'
import { useQueueStore } from '@/stores/queue.store'

export function AudioManager() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const setAudioRef = usePlayerStore((s) => s.setAudioRef)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setIsPlaying = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const repeatMode = useQueueStore((s) => s.repeatMode)

  useEffect(() => {
    setAudioRef(audioRef as React.RefObject<HTMLAudioElement | null>)
  }, [setAudioRef])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => setProgress(el.currentTime)
    const onDuration = () => setDuration(el.duration)
    const onEnded = () => {
      if (repeatMode === 'one') {
        el.currentTime = 0
        el.play().catch(() => {})
      } else {
        next()
      }
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('ended', onEnded)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('ended', onEnded)
    }
  }, [repeatMode, next, setProgress, setDuration, setIsPlaying])

  return <audio ref={audioRef} id="ytm-audio" preload="none" className="hidden" />
}
