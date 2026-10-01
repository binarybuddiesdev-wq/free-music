import type { Metadata, Viewport } from 'next'
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://music.local'),
  title: {
    default: 'Free Music — YouTube Music Web & PWA Clone',
    template: '%s | Free Music',
  },
  description: 'Stream millions of high-quality ad-free songs, real-time karaoke lyrics, music videos, and offline downloads.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Music',
  },
  openGraph: {
    title: 'Free Music — YouTube Music Web & PWA Clone',
    description: 'Stream millions of high-quality ad-free songs with synced lyrics and offline downloads.',
    siteName: 'Free Music',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Music — YouTube Music Web & PWA Clone',
    description: 'Stream millions of high-quality ad-free songs with synced lyrics and offline downloads.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* DNS Preconnect & Resource Hints for Ultra-Fast Audio & Asset Delivery */}
        <link rel="preconnect" href="https://aac.saavncdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://c.saavncdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://lrclib.net" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('ytm-settings');
                  var s = raw ? JSON.parse(raw) : null;
                  var theme = s && s.state && s.state.theme ? s.state.theme : 'dark';
                  if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.setAttribute('data-theme', theme);
                  var fs = s && s.state && s.state.fontSize ? s.state.fontSize : 'medium';
                  document.documentElement.dataset.fontSize = fs;
                  document.documentElement.setAttribute('data-font-size', fs);
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonts load at runtime to avoid a build-time network dependency. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
