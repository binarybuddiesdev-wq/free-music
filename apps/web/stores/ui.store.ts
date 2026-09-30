import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  queueOpen: boolean
  setQueueOpen: (v: boolean) => void
  toggleQueue: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      queueOpen: false,
      setQueueOpen: (v) => set({ queueOpen: v }),
      toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen })),
    }),
    { name: 'ytm-ui', skipHydration: true }
  )
)
