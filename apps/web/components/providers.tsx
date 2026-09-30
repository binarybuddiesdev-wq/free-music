'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useLibraryStore } from '@/stores/library.store'
import { useSettingsStore, applyTheme, applyFontSize } from '@/stores/settings.store'
import { useUIStore } from '@/stores/ui.store'
import { useQueueStore } from '@/stores/queue.store'
import { usePlayerStore } from '@/stores/player.store'
import { showToast } from '@/components/ui/Toast'

function StoreHydrator() {
  useEffect(() => {
    useLibraryStore.persist.rehydrate()
    const res = useSettingsStore.persist.rehydrate()
    if (res && typeof (res as Promise<void>).then === 'function') {
      (res as Promise<void>).then(() => {
        const { theme, fontSize } = useSettingsStore.getState()
        applyTheme(theme)
        applyFontSize(fontSize)
      })
    } else {
      const { theme, fontSize } = useSettingsStore.getState()
      applyTheme(theme)
      applyFontSize(fontSize)
    }
    useUIStore.persist.rehydrate()
    useQueueStore.persist.rehydrate()
    usePlayerStore.persist.rehydrate()

    // 1. Network status notifications
    const handleOnline = () => {
      showToast('Back online — streaming enabled')
    }
    const handleOffline = () => {
      showToast('You are offline — playing downloaded songs')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 2. Service Worker registration with update prompt
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showToast('New version available — reload to update')
                  }
                })
              }
            })
          })
          .catch(() => {})
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes cache validity
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false, // Prevents battery and network drain on tab switch
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <StoreHydrator />
      {children}
    </QueryClientProvider>
  )
}
