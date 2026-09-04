import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainShell } from '@/components/layout/MainShell'
import { Topbar } from '@/components/layout/Topbar'
import { MiniPlayer } from '@/components/player/MiniPlayer'
import { ExpandedPlayer } from '@/components/player/ExpandedPlayer'
import { AudioManager } from '@/components/AudioManager'
import { ToastContainer } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Music',
  description: 'YouTube Music clone — stream millions of songs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ paddingBottom: 56 }}>
        <Providers>
          <AudioManager />
          {/* Fixed sidebar */}
          <Sidebar />
          {/* Main: offset by sidebar width (synced via UIStore) */}
          <MainShell>
            <Suspense>
              <Topbar />
            </Suspense>
            <main style={{ flex: 1, padding: '12px 24px 32px', overflowX: 'hidden' }}>
              {children}
            </main>
          </MainShell>
          {/* Fixed player at bottom */}
          <MiniPlayer />
          <ExpandedPlayer />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
