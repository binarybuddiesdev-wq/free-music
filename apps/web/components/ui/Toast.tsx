'use client'
import { useEffect, useState } from 'react'

interface ToastState {
  message: string
  id: number
}

let showToastFn: ((msg: string) => void) | null = null

export function showToast(message: string) {
  showToastFn?.(message)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  useEffect(() => {
    showToastFn = (message) => {
      const id = Date.now()
      setToasts((t) => [...t, { message, id }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
    }
    return () => { showToastFn = null }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        alignItems: 'center',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '10px 20px',
            borderRadius: 24,
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
