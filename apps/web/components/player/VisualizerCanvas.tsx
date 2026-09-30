'use client'
import { useEffect, useRef } from 'react'
import { getAudioAnalyser } from '@/components/AudioManager'

interface VisualizerCanvasProps {
  isPlaying: boolean
  barCount?: number
  height?: number
}

export function VisualizerCanvas({ isPlaying, barCount = 32, height = 48 }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animIdRef = useRef<number | null>(null)
  const smoothedHeightsRef = useRef<number[]>(new Array(barCount).fill(2))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let isMounted = true
    const smoothed = smoothedHeightsRef.current

    const render = (time: number) => {
      if (!isMounted) return

      const width = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, width, h)

      const analyser = getAudioAnalyser()
      let freqData: Uint8Array | null = null

      if (analyser && isPlaying) {
        try {
          const bufferLength = analyser.frequencyBinCount
          const data = new Uint8Array(bufferLength)
          analyser.getByteFrequencyData(data)
          freqData = data
        } catch {
          freqData = null
        }
      }

      const totalBars = barCount
      const gap = 3
      const barWidth = Math.max(2, (width - (totalBars - 1) * gap) / totalBars)

      for (let i = 0; i < totalBars; i++) {
        let targetHeight = 2

        if (isPlaying) {
          if (freqData && freqData.length > 0) {
            // Sample frequency bin across log spectrum
            const binIndex = Math.min(
              freqData.length - 1,
              Math.floor(Math.pow(i / totalBars, 1.2) * (freqData.length * 0.75))
            )
            const rawVal = freqData[binIndex] || 0
            targetHeight = Math.max(3, (rawVal / 255) * (h - 4))
          } else {
            // Simulated harmonic rhythm when analyser is unavailable
            const wave1 = Math.sin(time * 0.004 + i * 0.35)
            const wave2 = Math.cos(time * 0.007 + i * 0.2)
            const combined = (wave1 + wave2 + 2) / 4
            targetHeight = Math.max(3, combined * (h - 6))
          }
        } else {
          // Idle flat line when paused
          targetHeight = 2
        }

        // Smooth easing towards target
        smoothed[i] += (targetHeight - smoothed[i]) * 0.25
        const barH = smoothed[i]
        const x = i * (barWidth + gap)
        const y = h - barH

        // Modern red glowing gradient matching YouTube Music
        const gradient = ctx.createLinearGradient(0, y, 0, h)
        gradient.addColorStop(0, '#ff4e45')
        gradient.addColorStop(1, '#ff0000')

        ctx.fillStyle = gradient
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0])
        } else {
          ctx.rect(x, y, barWidth, barH)
        }
        ctx.fill()
      }

      animIdRef.current = requestAnimationFrame(render)
    }

    animIdRef.current = requestAnimationFrame(render)

    return () => {
      isMounted = false
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current)
      }
    }
  }, [isPlaying, barCount, height])

  return (
    <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        style={{ width: '100%', maxWidth: 360, height, display: 'block' }}
      />
    </div>
  )
}
