/** Client fetch for home sections. Pure module: type-only imports (unit-tested with node --test). */
import type { Song } from '../types/music'

export async function fetchSectionSongs(
  sectionId: string,
  language: string,
  page: number,
  fetchImpl: typeof fetch = fetch
): Promise<{ songs: Song[] }> {
  const load = async (p: number) => {
    const res = await fetchImpl(`/api/search?section=${encodeURIComponent(sectionId)}&lang=${encodeURIComponent(language)}&page=${p}`)
    if (!res.ok) throw new Error(`Section ${sectionId} failed: HTTP ${res.status}`)
    const json = (await res.json()) as { songs?: Song[] }
    return { songs: Array.isArray(json.songs) ? json.songs : [] }
  }

  const first = await load(page)
  // Smaller catalogs (e.g. Assamese, Odia) often have nothing on deep pages
  if (first.songs.length === 0 && page !== 1) return load(1)
  return first
}
