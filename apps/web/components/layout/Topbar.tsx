'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function Topbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
    else router.push('/search')
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 15,
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(15,15,15,.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '8px 16px 8px 16px',
      borderBottom: '1px solid rgba(255,255,255,.06)',
    }}>
      {/* Back / Forward nav buttons (YTM style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <NavBtn onClick={() => router.back()} title="Go back">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </NavBtn>
        <NavBtn onClick={() => router.forward()} title="Go forward">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
        </NavBtn>
      </div>

      {/* Search bar — centred, pill-shaped like YTM */}
      <form onSubmit={submit} style={{ flex: 1, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,.5)', pointerEvents: 'none', display: 'flex',
        }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, albums, artists"
          style={{
            width: '100%', padding: '9px 16px 9px 40px',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,.12)',
            background: 'rgba(255,255,255,.08)', color: '#fff',
            fontSize: 14, fontFamily: 'Roboto, sans-serif', outline: 'none',
            transition: 'border-color .15s, background .15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,.3)'; e.target.style.background = 'rgba(255,255,255,.12)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.12)'; e.target.style.background = 'rgba(255,255,255,.08)' }}
        />
      </form>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Cast icon */}
        <NavBtn title="Cast">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
          </svg>
        </NavBtn>
        {/* Notification bell */}
        <NavBtn title="Notifications">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </NavBtn>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#7c4dff', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 4,
        }}>
          Y
        </div>
      </div>
    </div>
  )
}

function NavBtn({ onClick, children, title }: { onClick?: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, borderRadius: '50%', background: 'transparent',
        border: 0, color: 'rgba(255,255,255,.7)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
