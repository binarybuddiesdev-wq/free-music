'use client'
import { useUIStore } from '@/stores/ui.store'

export function MainShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  return (
    <div
      id="main-shell"
      style={{
        marginLeft: collapsed ? 72 : 220,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left .2s',
      }}
    >
      {children}
    </div>
  )
}
