'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings.store'
import { LANGUAGES } from '@/lib/languages'

const NAV = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: '/explore',
    label: 'Explore',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    href: '/library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { language, setLanguage } = useSettingsStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      style={{
        width: collapsed ? 72 : 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      {/* Header: hamburger + logo */}
      <div className="flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-1 select-none">
            <svg viewBox="0 0 90 20" fill="currentColor" className="h-4 text-[var(--text-primary)]">
              <text x="0" y="16" fontSize="18" fontWeight="700" fontFamily="sans-serif">Music</text>
            </svg>
          </Link>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-2 mt-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: collapsed ? '10px 16px' : '10px 16px',
                borderRadius: 6,
                background: active ? 'var(--bg-active)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              className="hover:bg-[var(--bg-hover)]"
            >
              <span className="shrink-0">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language selector */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <label className="text-xs text-[var(--text-tertiary)] mb-1 block uppercase tracking-wider">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              width: '100%',
              cursor: 'pointer',
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} — {l.english}
              </option>
            ))}
          </select>
        </div>
      )}
    </aside>
  )
}
