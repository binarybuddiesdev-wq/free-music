import type { Song } from '@/types/music'

const BASE = process.env.JIOSAAVN_BASE_URL ?? 'https://saavn.dev/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bestUrl(song: any): string {
  const urls: Array<{ quality: string; url: string }> = song.downloadUrl ?? []
  const sorted = [...urls].sort((a, b) => {
    const qa = parseInt(a.quality) || 0
    const qb = parseInt(b.quality) || 0
    return qb - qa
  })
  return sorted[0]?.url ?? ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): Song {
  const imageArr: Array<{ quality: string; url: string }> = raw.image ?? []
  const image =
    imageArr.find((i) => i.quality === '500x500')?.url ??
    imageArr[imageArr.length - 1]?.url ??
    ''

  const artistArr: Array<{ name: string }> = raw.artists?.primary ?? []
  const artist = artistArr.map((a) => a.name).join(', ') || raw.primaryArtists || 'Unknown'

  return {
    id: raw.id,
    title: raw.name ?? raw.title ?? 'Unknown',
    artist,
    album: raw.album?.name ?? '',
    duration: raw.duration ?? 0,
    image,
    downloadUrl: bestUrl(raw),
    language: raw.language ?? '',
    year: raw.year?.toString(),
  }
}

export async function searchSongs(
  query: string,
  language: string,
  page = 1,
  limit = 40
): Promise<Song[]> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    limit: String(limit),
    language,
  })
  const res = await fetch(`${BASE}/search/songs?${params}`, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const json = await res.json()
  const results: unknown[] = json?.data?.results ?? []
  return results.map(normalize)
}

export async function getSong(id: string): Promise<Song | null> {
  const res = await fetch(`${BASE}/songs/${id}`, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const json = await res.json()
  const data = json?.data?.[0] ?? json?.data
  if (!data) return null
  return normalize(data)
}

export const SECTION_QUERIES: Record<string, Record<string, string>> = {
  'listen-again': {
    telugu: 'Telugu hits 2024',
    hindi: 'Hindi hits 2024',
    tamil: 'Tamil hits 2024',
    kannada: 'Kannada hits 2024',
    malayalam: 'Malayalam hits 2024',
    punjabi: 'Punjabi hits 2024',
    marathi: 'Marathi hits 2024',
    bengali: 'Bengali hits 2024',
    gujarati: 'Gujarati hits 2024',
    odia: 'Odia hits 2024',
    assamese: 'Assamese hits',
    urdu: 'Urdu songs 2024',
    bhojpuri: 'Bhojpuri hits 2024',
    english: 'English pop hits 2024',
  },
  'new-releases': {
    telugu: 'New Telugu songs 2025',
    hindi: 'New Hindi songs 2025',
    tamil: 'New Tamil songs 2025',
    kannada: 'New Kannada songs 2025',
    malayalam: 'New Malayalam songs 2025',
    punjabi: 'New Punjabi songs 2025',
    marathi: 'New Marathi songs 2025',
    bengali: 'New Bengali songs 2025',
    gujarati: 'New Gujarati songs 2025',
    odia: 'New Odia songs 2025',
    assamese: 'New Assamese songs 2025',
    urdu: 'New Urdu songs 2025',
    bhojpuri: 'New Bhojpuri songs 2025',
    english: 'New English songs 2025',
  },
  'top-charts': {
    telugu: 'Telugu top chart songs',
    hindi: 'Hindi top chart songs',
    tamil: 'Tamil top chart songs',
    kannada: 'Kannada top chart',
    malayalam: 'Malayalam top chart',
    punjabi: 'Punjabi top chart',
    marathi: 'Marathi top chart',
    bengali: 'Bengali top chart',
    gujarati: 'Gujarati top chart',
    odia: 'Odia top songs',
    assamese: 'Assamese popular songs',
    urdu: 'Urdu top songs',
    bhojpuri: 'Bhojpuri top chart',
    english: 'Global top chart 2024',
  },
  'moods-moments': {
    telugu: 'Telugu romantic songs',
    hindi: 'Hindi romantic songs',
    tamil: 'Tamil romantic songs',
    kannada: 'Kannada romantic songs',
    malayalam: 'Malayalam romantic songs',
    punjabi: 'Punjabi party songs',
    marathi: 'Marathi romantic songs',
    bengali: 'Bengali romantic songs',
    gujarati: 'Gujarati garba songs',
    odia: 'Odia romantic songs',
    assamese: 'Assamese romantic songs',
    urdu: 'Urdu ghazal songs',
    bhojpuri: 'Bhojpuri romantic songs',
    english: 'Chill English songs',
  },
}

function getQuery(sectionId: string, language: string): string {
  const section = SECTION_QUERIES[sectionId]
  if (!section) return `${language} songs`
  return section[language] ?? section['hindi'] ?? `${language} songs`
}

export async function getSectionSongs(sectionId: string, language: string): Promise<Song[]> {
  const query = getQuery(sectionId, language)
  return searchSongs(query, language)
}
