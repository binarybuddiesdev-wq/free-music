import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/layout/Sidebar'
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
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <AudioManager />
          <div
            style={{
              display: 'flex',
              height: '100vh',
              flexDirection: 'column',
            }}
          >
            {/* App body: sidebar + main */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <Sidebar />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <Suspense>
                  <Topbar />
                </Suspense>
                <main
                  className="thin-scrollbar"
                  style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}
                >
                  {children}
                </main>
              </div>
            </div>
            {/* Player bar always at bottom */}
            <MiniPlayer />
          </div>
          <ExpandedPlayer />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
