'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/stores/ui.store'
import { useSettingsStore } from '@/stores/settings.store'
import { usePlayerStore } from '@/stores/player.store'
import type { Song } from '@/types/music'
import { formatDuration } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/recent-searches'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const language = useSettingsStore((s) => s.language)
  const playSong = usePlayerStore((s) => s.playSong)
  const setExpanded = usePlayerStore((s) => s.setExpanded)

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      showToast('Music app installed successfully!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      showToast('To install, use the Install option in your browser menu.')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      showToast('Installing Music app…')
    }
    setDeferredPrompt(null)
  }

  const { data, isLoading } = useQuery<{ songs: Song[] }>({
    queryKey: ['search-suggestions', debouncedQuery, language],
    queryFn: async ({ signal }) => {
      if (!debouncedQuery) return { songs: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&lang=${language}&suggest=1`, { signal })
      return res.json()
    },
    enabled: isOpen && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
  })

  const suggestions = data?.songs?.slice(0, 5) ?? []

  // Reset keyboard highlight when the dropdown opens or results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [isOpen, debouncedQuery, suggestions.length])

  // Keep the highlighted suggestion visible while navigating with arrows
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    const el = document.getElementById(`search-sug-${activeIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])

  const handleSuggestionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = suggestions.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setActiveIndex((i) => (total === 0 ? -1 : Math.min(i + 1, total - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(-1)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(total - 1)
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault()
        handleSelectSong(suggestions[activeIndex], activeIndex)
      } else {
        e.preventDefault()
        submit(e.currentTarget.value)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const submit = (customQuery?: string) => {
    const q = (typeof customQuery === 'string' ? customQuery : query).trim()
    if (q) {
      const updated = addRecentSearch(q)
      setRecentSearches(updated)
      setIsOpen(false)
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  const handleSelectSong = (song: Song, index: number) => {
    if (query.trim()) {
      const updated = addRecentSearch(query.trim())
      setRecentSearches(updated)
    }
    setIsOpen(false)
    playSong(song, suggestions, index)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 16px 0 0',
      transition: 'background-color .2s ease, border-color .2s ease',
    }}>
      {/* Left: hamburger + logo */}
      <div className="hd-left" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: 16, gap: 12 }}>
        {/* Hamburger */}
        <button
          onClick={toggleSidebar}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'transparent',
            border: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Menu"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        {/* YouTube Music logo */}
        <Link href="/" onClick={() => setExpanded(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <rect width="28" height="20" rx="5" fill="#FF0000"/>
            <path d="M11 14V6l8 4-8 4z" fill="white"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.2px', fontFamily: 'Roboto, sans-serif' }}>
            Music
          </span>
        </Link>
      </div>

      {/* Center: back/fwd + search */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 640, margin: '0 auto' }}>
        {/* Back / forward */}
        <button
          className="hd-navbtn"
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        </button>
        <button
          className="hd-navbtn"
          onClick={() => router.forward()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
        </button>

        {/* Search */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} action="javascript:void(0);">
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => {
                setIsOpen(true)
              }}
              onKeyDown={handleSuggestionKeyDown}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="search-sug-list"
              aria-activedescendant={isOpen && activeIndex >= 0 ? `search-sug-${activeIndex}` : undefined}
              autoComplete="off"
              placeholder="Search songs, albums, artists"
              style={{
                width: '100%', padding: '8px 16px 8px 40px', borderRadius: 24,
                border: '1px solid var(--border)',
                background: 'var(--panel-bg)', color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'Roboto, sans-serif', outline: 'none',
              }}
              onFocusCapture={e => { e.target.style.borderColor = '#ff0000'; e.target.style.background = 'var(--bg-elevated)' }}
              onBlurCapture={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--panel-bg)' }}
            />
          </form>

          {/* Autocomplete & Recent Searches Dropdown */}
          {isOpen && (
            <div
              id="search-sug-list"
              role="listbox"
              aria-label="Search suggestions"
              className="fade-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 16px 36px rgba(0,0,0,.35)',
                overflow: 'hidden',
                zIndex: 100,
                padding: '6px 0',
              }}
            >
              {debouncedQuery.length >= 2 ? (
                <>
                  {/* Query search row */}
                  <div
                    id="search-sug--1"
                    role="option"
                    aria-selected={activeIndex === -1}
                    onClick={() => submit()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      borderBottom: suggestions.length > 0 ? '1px solid var(--border)' : 'none',
                      background: activeIndex === -1 ? 'var(--panel-bg)' : 'transparent',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={() => setActiveIndex(-1)}
                  >
                    <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <span style={{ flex: 1 }}>Search for <strong style={{ color: 'var(--text-primary)' }}>&quot;{debouncedQuery}&quot;</strong></span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Press Enter</span>
                  </div>

                  {isLoading && suggestions.length === 0 && (
                    <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      Searching suggestions…
                    </div>
                  )}

                  {suggestions.map((song, i) => (
                    <div
                      key={song.id}
                      id={`search-sug-${i}`}
                      role="option"
                      aria-selected={activeIndex === i}
                      onClick={() => handleSelectSong(song, i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        background: activeIndex === i ? 'var(--panel-bg)' : 'transparent',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--panel-bg)' }}>
                        {song.image && <Image src={song.image} alt={song.title} fill sizes="36px" style={{ objectFit: 'cover' }} unoptimized />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {song.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                          Song • {song.artist}{song.album ? ` • ${song.album}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {formatDuration(song.duration)}
                      </span>
                    </div>
                  ))}
                </>
              ) : recentSearches.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 6px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearRecentSearches()
                        setRecentSearches([])
                      }}
                      style={{
                        background: 'transparent',
                        border: 0,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4e45')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      Clear all
                    </button>
                  </div>

                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => submit(term)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 16px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        transition: 'background .1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <svg viewBox="0 0 24 24" fill="var(--text-tertiary)" width="16" height="16" style={{ flexShrink: 0 }}>
                          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {term}
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Remove from history"
                        onClick={(e) => {
                          e.stopPropagation()
                          const updated = removeRecentSearch(term)
                          setRecentSearches(updated)
                        }}
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: 16 }}>
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            title={deferredPrompt ? "Install Music App" : "Install App"}
            style={{
              background: deferredPrompt ? 'var(--panel-bg)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '6px 14px',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = deferredPrompt ? 'var(--panel-bg)' : 'transparent')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            <span>Install</span>
          </button>
        )}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c4dff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}>
          Y
        </div>
      </div>
    </header>
  )
}
