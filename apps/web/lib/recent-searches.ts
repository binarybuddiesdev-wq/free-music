const STORAGE_KEY = 'ytm_recent_searches'
const MAX_RECENT_SEARCHES = 8

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return []
  const clean = term.trim()
  if (!clean) return getRecentSearches()

  try {
    const current = getRecentSearches()
    const filtered = current.filter((t) => t.toLowerCase() !== clean.toLowerCase())
    const updated = [clean, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const current = getRecentSearches()
    const updated = current.filter((t) => t.toLowerCase() !== term.trim().toLowerCase())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
