import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainShell } from '@/components/layout/MainShell'
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
      <body>
        <Providers>
          <AudioManager />
          {/* Full-width fixed header (YTM style) */}
          <Suspense>
            <Header />
          </Suspense>
          {/* Fixed sidebar — starts below header */}
          <Sidebar />
          {/* Main content — offset left by sidebar, top by header */}
          <MainShell>
            <main style={{ flex: 1, padding: '12px 24px 32px', overflowX: 'hidden' }}>
              {children}
            </main>
          </MainShell>
          {/* Player only renders when a song is selected */}
          <MiniPlayer />
          <ExpandedPlayer />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
