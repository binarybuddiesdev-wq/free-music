'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal root application error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0f0f0f',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 16,
            padding: 32,
            maxWidth: 440,
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>
            Playback Shell Interrupted
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#aaa', lineHeight: 1.5 }}>
            A critical error occurred. Please reload to re-initialize the audio engine and player controls.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 24px',
              borderRadius: 24,
              background: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
