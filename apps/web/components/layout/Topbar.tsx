'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export function Topbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

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
    <header
      style={{
        height: 56,
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Search bar */}
      <form onSubmit={submit} className="flex-1 flex items-center max-w-xl">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            overflow: 'hidden',
            flex: 1,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              padding: '8px 16px',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--bg-hover)',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              padding: '8px 16px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            className="hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Account avatar placeholder */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Y
      </div>
    </header>
  )
}
