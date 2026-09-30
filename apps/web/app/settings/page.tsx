'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSettingsStore, EQ_PRESETS, type Theme, type AudioQuality, type EQPreset } from '@/stores/settings.store'
import { usePlayerStore } from '@/stores/player.store'
import { useLibraryStore } from '@/stores/library.store'
import { showToast } from '@/components/ui/Toast'

const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{title}</h2>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>{children}</div>
    </section>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function ThemeSelector() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const options: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ]

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none',
      }}
    >
      {options.map((o) => (
        <option
          key={o.value}
          value={o.value}
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          {o.label}
        </option>
      ))}
    </select>
  )
}

function FontSizeSelector() {
  const fontSize = useSettingsStore((s) => s.fontSize)
  const setFontSize = useSettingsStore((s) => s.setFontSize)

  return (
    <select
      value={fontSize}
      onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none',
      }}
    >
      <option value="small" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Small (14px)</option>
      <option value="medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Medium (16px - Default)</option>
      <option value="large" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Large (18px)</option>
    </select>
  )
}

function AudioQualitySelector() {
  const audioQuality = useSettingsStore((s) => s.audioQuality)
  const setAudioQuality = useSettingsStore((s) => s.setAudioQuality)

  return (
    <select
      value={audioQuality}
      onChange={(e) => setAudioQuality(e.target.value as AudioQuality)}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none',
      }}
    >
      <option value="low" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Low (48 kbps - Data Saver)</option>
      <option value="normal" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Normal (160 kbps - Standard)</option>
      <option value="high" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>High (320 kbps - Studio Quality)</option>
    </select>
  )
}

function SliderRow({ value, min, max, step, onChange, unit = '' }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#ff0000', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}{unit}</span>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? '#ff0000' : 'rgba(128,128,128,.3)',
        cursor: 'pointer', position: 'relative', transition: 'background .15s',
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        transition: 'left .15s',
      }} />
    </button>
  )
}

function SleepTimerSelector() {
  const sleepTimer = useSettingsStore((s) => s.sleepTimer)
  const sleepTimerEnd = useSettingsStore((s) => s.sleepTimerEnd)
  const setSleepTimer = useSettingsStore((s) => s.setSleepTimer)

  const [remainingMin, setRemainingMin] = useState<number | null>(null)

  useEffect(() => {
    if (!sleepTimerEnd) {
      setRemainingMin(null)
      return
    }
    const update = () => {
      const msLeft = sleepTimerEnd - Date.now()
      if (msLeft <= 0) {
        setRemainingMin(null)
      } else {
        setRemainingMin(Math.ceil(msLeft / 60000))
      }
    }
    update()
    const interval = setInterval(update, 5000)
    return () => clearInterval(interval)
  }, [sleepTimerEnd])

  const options = [0, 15, 30, 45, 60, 90, 120]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {options.map((min) => (
          <button
            key={min}
            onClick={() => setSleepTimer(min)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: sleepTimer === min ? '#ff0000' : 'var(--panel-bg)',
              border: '1px solid', borderColor: sleepTimer === min ? '#ff0000' : 'var(--border)',
              color: sleepTimer === min ? '#fff' : 'var(--text-primary)', transition: 'all .15s',
            }}
          >
            {min === 0 ? 'Off' : `${min}m`}
          </button>
        ))}
      </div>
      {remainingMin !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ff4d4d', fontWeight: 500 }}>
          <span>Active: Pausing in ~{remainingMin} min</span>
          <button
            onClick={() => setSleepTimer(0)}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 12,
              padding: '2px 8px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function EQPresetSelector() {
  const eqPreset = useSettingsStore((s) => s.eqPreset)
  const setEqPreset = useSettingsStore((s) => s.setEqPreset)
  const eqEnabled = useSettingsStore((s) => s.eqEnabled)

  const presets: { value: EQPreset; label: string }[] = [
    { value: 'flat', label: 'Flat' },
    { value: 'bass', label: 'Bass Boost' },
    { value: 'vocal', label: 'Vocal' },
    { value: 'rock', label: 'Rock' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => setEqPreset(p.value)}
          disabled={!eqEnabled}
          style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: eqEnabled ? 'pointer' : 'not-allowed',
            opacity: eqEnabled ? 1 : 0.5,
            background: eqPreset === p.value ? '#ff0000' : 'var(--panel-bg)',
            border: '1px solid', borderColor: eqPreset === p.value ? '#ff0000' : 'var(--border)',
            color: eqPreset === p.value ? '#fff' : 'var(--text-primary)', transition: 'all .15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function EqualizerBands() {
  const eqEnabled = useSettingsStore((s) => s.eqEnabled)
  const eqCustom = useSettingsStore((s) => s.eqCustom)
  const setEqCustom = useSettingsStore((s) => s.setEqCustom)
  const eqPreset = useSettingsStore((s) => s.eqPreset)

  const [localBands, setLocalBands] = useState(eqCustom)

  useEffect(() => {
    setLocalBands(eqCustom)
  }, [eqCustom, eqPreset])

  const handleChange = (index: number, value: number) => {
    const newBands = [...localBands]
    newBands[index] = value
    setLocalBands(newBands)
    setEqCustom(newBands)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 180, padding: '16px 8px', overflowX: 'auto' }}>
      {EQ_FREQUENCIES.map((freq, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 40 }}>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={localBands[i] ?? 0}
            onChange={(e) => handleChange(i, parseInt(e.target.value))}
            disabled={!eqEnabled || eqPreset !== 'custom'}
            style={{
              writingMode: 'vertical-rl' as React.CSSProperties['writingMode'], WebkitAppearance: 'slider-vertical', width: 20, height: 140,
              accentColor: '#ff0000', cursor: eqEnabled && eqPreset === 'custom' ? 'pointer' : 'not-allowed',
              opacity: eqEnabled && eqPreset === 'custom' ? 1 : 0.4,
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{freq >= 1000 ? `${freq / 1000}k` : freq}Hz</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: (localBands[i] ?? 0) > 0 ? '#ff0000' : (localBands[i] ?? 0) < 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
            {(localBands[i] ?? 0) > 0 ? '+' : ''}{localBands[i] ?? 0}dB
          </span>
        </div>
      ))}
    </div>
  )
}

function LyricsFontSizeSelector() {
  const lyricsFontSize = useSettingsStore((s) => s.lyricsFontSize)
  const setLyricsFontSize = useSettingsStore((s) => s.setLyricsFontSize)

  return (
    <SliderRow value={lyricsFontSize} min={12} max={24} step={1} onChange={setLyricsFontSize} unit="px" />
  )
}

function DataActions() {
  const playlists = useLibraryStore((s) => s.playlists)
  const history = useLibraryStore((s) => s.history)
  const likedSongs = useLibraryStore((s) => s.likedSongs)

  const exportData = () => {
    try {
      const data = { playlists, history, likedSongs, timestamp: Date.now() }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `music-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Library exported successfully!')
    } catch {
      showToast('Failed to export library')
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          throw new Error('Invalid JSON structure')
        }

        const validPlaylists: Record<string, any> = {}
        if (data.playlists && typeof data.playlists === 'object' && !Array.isArray(data.playlists)) {
          for (const [key, pl] of Object.entries(data.playlists)) {
            if (pl && typeof pl === 'object' && Array.isArray((pl as any).songs)) {
              validPlaylists[key] = pl
            }
          }
        }

        const validLikedSongs: Record<string, any> = {}
        if (data.likedSongs && typeof data.likedSongs === 'object' && !Array.isArray(data.likedSongs)) {
          for (const [key, song] of Object.entries(data.likedSongs)) {
            if (song && typeof song === 'object' && (song as any).id) {
              validLikedSongs[key] = song
            }
          }
        }

        const validHistory = Array.isArray(data.history)
          ? data.history.filter((s: any) => s && typeof s === 'object' && s.id)
          : []

        useLibraryStore.setState({
          playlists: validPlaylists,
          history: validHistory,
          likedSongs: validLikedSongs,
        })
        const plCount = Object.keys(validPlaylists).length
        const likedCount = Object.keys(validLikedSongs).length
        showToast(`Library imported (${plCount} playlists, ${likedCount} liked songs)`)
      } catch {
        showToast('Invalid backup file format')
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
    reader.readAsText(file)
  }

  const clearData = () => {
    if (confirm('Are you sure you want to clear your library, playlists, and history? This cannot be undone.')) {
      useLibraryStore.setState({ playlists: {}, history: [], likedSongs: {} })
      showToast('Library cleared')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={exportData}
        style={{ textAlign: 'left', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '12px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span>Export library (playlists, history, liked songs)</span>
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </button>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        style={{ textAlign: 'left', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '12px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span>Import library from backup file</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff0000', fontWeight: 600 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5z"/></svg>
          <span>Choose file</span>
        </div>
      </div>

      <button
        onClick={clearData}
        style={{ textAlign: 'left', background: 'transparent', border: '1px solid rgba(255,0,0,.3)', color: '#ff0000', borderRadius: 8, padding: '12px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,0,.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span>Clear all library data</span>
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    </div>
  )
}

function AboutSection() {
  return (
    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
      <div><strong style={{ color: 'var(--text-primary)' }}>Music</strong> — YouTube Music Web</div>
      <div>Version 1.0.0</div>
      <div style={{ marginTop: 12 }}>Built with Next.js 15, React 19, Zustand, TanStack Query</div>
      <div style={{ marginTop: 4 }}>Full audio streaming & catalog powered by JioSaavn</div>
    </div>
  )
}

function SettingsContent() {
  const eqEnabled = useSettingsStore((s) => s.eqEnabled)
  const setEqEnabled = useSettingsStore((s) => s.setEqEnabled)
  const autoplay = useSettingsStore((s) => s.autoplay)
  const setAutoplay = useSettingsStore((s) => s.setAutoplay)
  const crossfade = useSettingsStore((s) => s.crossfade)
  const setCrossfade = useSettingsStore((s) => s.setCrossfade)
  const gapless = useSettingsStore((s) => s.gapless)
  const setGapless = useSettingsStore((s) => s.setGapless)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.5px', marginBottom: 32 }}>Settings</h1>

      <Section title="Appearance">
        <SettingRow label="Theme" description="Choose color scheme (Dark, Light, or follow System)">
          <ThemeSelector />
        </SettingRow>
        <SettingRow label="Font size" description="Adjust UI text scale">
          <FontSizeSelector />
        </SettingRow>
      </Section>

      <Section title="Playback">
        <SettingRow label="Audio quality" description="Streaming bitrate (affects data usage and sound clarity)">
          <AudioQualitySelector />
        </SettingRow>
        <SettingRow label="Autoplay" description="Continuously play similar songs when the queue reaches the end">
          <Toggle checked={autoplay} onChange={setAutoplay} />
        </SettingRow>
        <SettingRow label="Crossfade" description="Smooth volume transition between songs (seconds)">
          <SliderRow
            value={crossfade}
            min={0}
            max={12}
            step={1}
            onChange={setCrossfade}
            unit="s"
          />
        </SettingRow>
        <SettingRow label="Gapless playback" description="Preload next track for zero buffer pause between songs">
          <Toggle checked={gapless} onChange={setGapless} />
        </SettingRow>
        <SettingRow label="Sleep timer" description="Automatically pause music playback after a set time">
          <SleepTimerSelector />
        </SettingRow>
      </Section>

      <Section title="Equalizer">
        <SettingRow label="Enable equalizer" description="10-band graphic frequency equalizer">
          <Toggle checked={eqEnabled} onChange={setEqEnabled} />
        </SettingRow>
        {eqEnabled && (
          <>
            <SettingRow label="Presets" description="Tuned EQ audio profiles">
              <EQPresetSelector />
            </SettingRow>
            <SettingRow label="Custom bands" description="Adjust individual frequencies from 31Hz to 16kHz">
              <EqualizerBands />
            </SettingRow>
          </>
        )}
      </Section>

      <Section title="Lyrics">
        <SettingRow label="Font size" description="Lyrics text size in the player panel">
          <LyricsFontSizeSelector />
        </SettingRow>
      </Section>

      <Section title="Data">
        <DataActions />
      </Section>

      <Section title="About">
        <AboutSection />
      </Section>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div style={{ padding: '12px 24px 32px', overflowX: 'hidden' }}>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading…</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}