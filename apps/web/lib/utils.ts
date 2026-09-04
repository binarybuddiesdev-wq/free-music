export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function clamp(value: number, min: number, max: number): number {
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
