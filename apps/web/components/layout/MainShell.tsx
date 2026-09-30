'use client'
import { QueueDrawer } from '@/components/player/QueueDrawer'

export function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="main-shell"
      className="main-shell"
      style={{
        paddingTop: 56,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {children}
      <QueueDrawer />
    </div>
  )
}
