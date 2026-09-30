export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || !Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const totalSecs = Math.floor(seconds)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function parseLrc(lrc: string): Array<{ time: number; text: string }> {
  const lines = lrc.split('\n')
  const result: Array<{ time: number; text: string }> = []
  const timeRe = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    const matches = [...line.matchAll(timeRe)]
    if (!matches.length) continue
    const text = line.replace(timeRe, '').trim()
    for (const m of matches) {
      const min = parseInt(m[1])
      const sec = parseInt(m[2])
      const ms = parseInt(m[3].padEnd(3, '0'))
      result.push({ time: min * 60 + sec + ms / 1000, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

/** Role/tabIndex helper so divs with onClick respond to Enter/Space like native buttons. */
export function onEnterSpace(e: React.KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

export type AudioQuality = 'low' | 'normal' | 'high'

export function getAudioQualityUrl(url: string, quality: AudioQuality): string {
  if (!url || typeof url !== 'string' || !url.trim()) return ''
  const targetSuffix = quality === 'low' ? '_48.mp4' : quality === 'normal' ? '_160.mp4' : '_320.mp4'
  return url.replace(/_(48|96|160|320)\.mp4/g, targetSuffix)
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
