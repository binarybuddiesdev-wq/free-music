'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutEffect } from 'react'
import { useUIStore } from '@/stores/ui.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useLibraryStore } from '@/stores/library.store'
import { usePlayerStore } from '@/stores/player.store'
import { LANGUAGES } from '@/lib/languages'

const NAV = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: '/explore',
    label: 'Explore',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
  {
    href: '/library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.54-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.51.24-1.04.56-1.54.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.07.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.54.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.51-.24 1.04-.56 1.54-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { language, setLanguage } = useSettingsStore()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const likedSongs = useLibraryStore((s) => s.likedSongs)
  const history = useLibraryStore((s) => s.history)
  const playlists = useLibraryStore((s) => s.playlists)

  const likedCount = Object.keys(likedSongs).length
  const playerHeight = currentSong ? 67 : 0

  // Start with the drawer closed on mobile
  useLayoutEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches && !collapsed) {
      setSidebarCollapsed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closeOnMobile = () => {
    if (window.matchMedia('(max-width: 767px)').matches) setSidebarCollapsed(true)
  }

  return (
    <>
    <aside
      className={collapsed ? 'sidebar-shell sidebar-collapsed' : 'sidebar-shell'}
      style={{
        position: 'fixed',
        left: 0,
        top: 56,
        bottom: playerHeight,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 42,
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        transition: 'background-color .2s ease, border-color .2s ease',
      }}>
      {/* Main nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', gap: 2 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={closeOnMobile}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                height: 40,
                /* pill shape on active, full-width hover */
                margin: collapsed ? '0 8px' : '0 12px',
                padding: collapsed ? '0 12px' : '0 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 20,
                background: active ? 'var(--panel-bg)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                transition: 'background .12s, color .12s',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--panel-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />

      {/* Playlists */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0', gap: 2 }}>
          {/* New playlist button */}
          <button
            onClick={() => {
              const name = prompt('Playlist name:')
              if (name?.trim()) {
                const { createPlaylist } = useLibraryStore.getState()
                createPlaylist(name.trim())
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              height: 44, padding: '0 12px', margin: '0 12px',
              borderRadius: 4, background: 'none', border: 'none',
              color: 'var(--text-secondary)', fontSize: 13,
              cursor: 'pointer', transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            <span>New playlist</span>
          </button>

          <SidebarPlaylist
            label="Liked songs"
            sub="Auto playlist"
            gradient="linear-gradient(135deg,#4b0082,#b337f2)"
            icon={
              <svg viewBox="0 0 24 24" fill="#fff" width="14" height="14"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            }
            count={likedCount}
            href="/library?tab=liked"
            onClick={closeOnMobile}
          />
          <SidebarPlaylist
            label="Recently played"
            sub="Auto playlist"
            gradient="linear-gradient(135deg,#1a4a8a,#4a7fc4)"
            icon={
              <svg viewBox="0 0 24 24" fill="#fff" width="14" height="14"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
            }
            count={history.length}
            href="/library?tab=history"
            onClick={closeOnMobile}
          />

          {/* User playlists */}
          {Object.values(playlists).map((pl) => (
            <SidebarPlaylist
              key={pl.id}
              label={pl.name}
              sub={`${pl.songs.length} song${pl.songs.length !== 1 ? 's' : ''}`}
              gradient="linear-gradient(135deg,#1a6a3a,#2ecc71)"
              icon={
                <svg viewBox="0 0 24 24" fill="#fff" width="14" height="14"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              }
              href={`/library?tab=playlists&id=${pl.id}`}
              onClick={closeOnMobile}
            />
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Language selector */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '7px 10px', borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--panel-bg)', color: 'var(--text-secondary)',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {LANGUAGES.find(l => l.value === language)?.label ?? language}
                </span>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
            >
              {LANGUAGES.map((l) => (
                <option
                  key={l.value}
                  value={l.value}
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  {l.label} — {l.english}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </aside>
    {!collapsed && (
      <div
        className="sidebar-scrim"
        aria-hidden="true"
        onClick={() => setSidebarCollapsed(true)}
      />
    )}
    </>
  )
}

function SidebarPlaylist({
  label, sub, gradient, icon, count, href, onClick,
}: {
  label: string; sub: string; gradient: string; icon: React.ReactNode; count?: number; href: string; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 12px', margin: '0 12px', borderRadius: 4, textDecoration: 'none', transition: 'background .12s', flexShrink: 0 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 40, height: 40, borderRadius: 4, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}{count ? ` · ${count}` : ''}</div>
      </div>
    </Link>
  )
}
