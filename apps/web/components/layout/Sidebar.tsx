'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
]

export function Sidebar() {
  const pathname = usePathname()
  const { language, setLanguage } = useSettingsStore()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const likedSongs = useLibraryStore((s) => s.likedSongs)
  const history = useLibraryStore((s) => s.history)

  const likedCount = Object.keys(likedSongs).length
  const playerHeight = currentSong ? 56 : 0

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 56,
      bottom: playerHeight,
      width: collapsed ? 72 : 220,
      background: '#030303',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: 'width .2s, bottom .2s',
      flexShrink: 0,
    }}>
      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px 0' : '10px 24px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.75)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                transition: 'background .12s',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Playlists */}
      {!collapsed && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '8px 0' }} />
          <SidebarPlaylist
            label="Liked songs"
            sub="Auto playlist"
            gradient="linear-gradient(135deg,#5e2e8e,#b937f2)"
            icon="♥"
            count={likedCount}
            href="/library"
          />
          <SidebarPlaylist
            label="Recently played"
            sub="Auto playlist"
            gradient="linear-gradient(135deg,#1a4a8a,#4a7fc4)"
            icon="↻"
            count={history.length}
            href="/library"
          />
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Language selector */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '7px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,.15)',
              background: 'transparent', color: 'rgba(255,255,255,.65)',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
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
                <option key={l.value} value={l.value}>{l.label} — {l.english}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </aside>
  )
}

function SidebarPlaylist({ label, sub, gradient, icon, count, href }: {
  label: string; sub: string; gradient: string; icon: string; count?: number; href: string
}) {
  return (
    <Link
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', textDecoration: 'none', transition: 'background .12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 40, height: 40, borderRadius: 4, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>{sub}{count ? ` · ${count}` : ''}</div>
      </div>
    </Link>
  )
}
