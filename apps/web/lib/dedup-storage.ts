/**
 * Zustand's persist middleware calls storage.setItem after *every* state change,
 * even when the partialized slice is unchanged (e.g. progress ticks ~4x/second).
 * This wrapper remembers the last string written per key and skips identical writes.
 *
 * Pure module: no runtime imports (unit-tested with node --test).
 */
export interface StringStorage {
  getItem: (name: string) => string | null
  setItem: (name: string, value: string) => void
  removeItem: (name: string) => void
}

export function createDedupStorage(getStorage: () => StringStorage | undefined): StringStorage {
  const lastWritten = new Map<string, string>()

  return {
    getItem: (name) => {
      const value = getStorage()?.getItem(name) ?? null
      if (value !== null) lastWritten.set(name, value)
      return value
    },
    setItem: (name, value) => {
      if (lastWritten.get(name) === value) return
      const storage = getStorage()
      if (!storage) return
      storage.setItem(name, value)
      // Only remember the value once it was actually written (a quota error must be retried)
      lastWritten.set(name, value)
    },
    removeItem: (name) => {
      lastWritten.delete(name)
      getStorage()?.removeItem(name)
    },
  }
}

export const dedupLocalStorage = createDedupStorage(() =>
  typeof window !== 'undefined' ? window.localStorage : undefined
)
