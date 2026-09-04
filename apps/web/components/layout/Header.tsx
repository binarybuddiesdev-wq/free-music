'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/ui.store'

export function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#030303',
      borderBottom: '1px solid rgba(255,255,255,.06)',
      padding: '0 16px 0 0',
    }}>
      {/* Left: hamburger + logo */}
      <div style={{ display: 'flex', alignItems: 'center', width: 220, flexShrink: 0, paddingLeft: 16, gap: 12, transition: 'width .2s' }}>
        {/* Hamburger */}
        <button
          onClick={toggleSidebar}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'transparent',
            border: 0, color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Menu"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        {/* YouTube Music logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <rect width="28" height="20" rx="5" fill="#FF0000"/>
            <path d="M11 14V6l8 4-8 4z" fill="white"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-.2px', fontFamily: 'Roboto, sans-serif' }}>
            Music
          </span>
        </Link>
      </div>

      {/* Center: back/fwd + search */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 640, margin: '0 auto' }}>
        {/* Back / forward */}
        <button
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 0, color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        </button>
        <button
          onClick={() => router.forward()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 0, color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
        </button>

        {/* Search */}
        <form onSubmit={submit} style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.5)', display: 'flex', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, albums, artists"
            style={{
              width: '100%', padding: '8px 16px 8px 40px', borderRadius: 24,
              border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.08)', color: '#fff',
              fontSize: 14, fontFamily: 'Roboto, sans-serif', outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,.3)'; e.target.style.background = 'rgba(255,255,255,.12)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.12)'; e.target.style.background = 'rgba(255,255,255,.08)' }}
          />
        </form>
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingLeft: 16 }}>
        <IconBtn title="Cast">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" /></svg>
        </IconBtn>
        <IconBtn title="Notifications">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
        </IconBtn>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c4dff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}>
          Y
        </div>
      </div>
    </header>
  )
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 0, color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
