import type { Song } from '@/types/music'

const BASE = process.env.JIOSAAVN_BASE_URL ?? 'https://saavn.sumit.co/api'

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
function pickImage(images: any[]): string {
  if (!images?.length) return ''
  const sizeMap: Record<string, number> = { '50x50': 50, '150x150': 150, '500x500': 500 }
  const best = images.reduce((a, b) => {
    const sa = sizeMap[a.quality] || parseInt(a.quality) || 0
    const sb = sizeMap[b.quality] || parseInt(b.quality) || 0
    return sb > sa ? b : a
  }, images[0])
  return best?.url || images[images.length - 1]?.url || images[0]?.url || ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): Song {
  const artistArr: Array<{ name: string } | string> = raw.artists?.primary ?? []
  const artist = artistArr.map((a) => {
    if (typeof a === 'object' && a !== null) return (a as { name: string }).name || ''
    if (typeof a === 'string') { const m = a.match(/name=([^;]+)/); return m ? m[1].trim() : '' }
    return ''
  }).filter(Boolean).join(', ') || 'Unknown'

  return {
    id: raw.id,
    title: raw.name ?? raw.title ?? 'Unknown',
    artist,
    album: raw.album?.name ?? '',
    duration: raw.duration ?? 0,
    image: pickImage(raw.image ?? []),
    downloadUrl: bestUrl(raw),
    language: (raw.language ?? '').toLowerCase(),
    year: raw.year?.toString(),
  }
}

export async function searchSongs(
  query: string,
  language: string,
  page = 1,
  limit = 40
): Promise<Song[]> {
  // No language param in URL — same as prototype. Filter by song.language after.
  const params = new URLSearchParams({
    query,
    page: String(page),
    limit: String(limit),
  })
  const res = await fetch(`${BASE}/search/songs?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const json = await res.json()
  const results: unknown[] = json?.data?.results ?? []
  const all = results.map(normalize)
  // Filter by language if we have enough results; otherwise return all
  const filtered = all.filter((s) => s.language === language.toLowerCase())
  return filtered.length >= 5 ? filtered : all
}

export async function getSong(id: string): Promise<Song | null> {
  const res = await fetch(`${BASE}/songs/${id}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const json = await res.json()
  const data = json?.data?.[0] ?? json?.data
  if (!data) return null
  return normalize(data)
}

// Matches prototype's SECTION_QUERIES exactly
const SECTION_QUERIES: Record<string, Record<string, string>> = {
  'listen-again': { telugu: 'telugu', hindi: 'hindi', tamil: 'tamil', kannada: 'kannada', malayalam: 'malayalam', punjabi: 'punjabi', marathi: 'marathi', bengali: 'bengali', gujarati: 'gujarati', odia: 'odia', assamese: 'assamese', urdu: 'urdu', bhojpuri: 'bhojpuri', english: 'english' },
  'quick-picks':  { telugu: 'telugu hits 2026', hindi: 'hindi hits 2026', tamil: 'tamil hits 2026', kannada: 'kannada hits 2026', malayalam: 'malayalam hits 2026', punjabi: 'punjabi hits 2026', marathi: 'marathi hits 2026', bengali: 'bengali hits 2026', gujarati: 'gujarati hits 2026', odia: 'odia hits 2026', assamese: 'assamese hits 2026', urdu: 'urdu hits 2026', bhojpuri: 'bhojpuri hits 2026', english: 'english hits 2026' },
  'new-releases': { telugu: 'telugu 2026', hindi: 'hindi 2026', tamil: 'tamil 2026', kannada: 'kannada 2026', malayalam: 'malayalam 2026', punjabi: 'punjabi 2026', marathi: 'marathi 2026', bengali: 'bengali 2026', gujarati: 'gujarati 2026', odia: 'odia 2026', assamese: 'assamese 2026', urdu: 'urdu 2026', bhojpuri: 'bhojpuri 2026', english: 'new english 2026' },
  'trending':     { telugu: 'telugu top', hindi: 'hindi top', tamil: 'tamil top', kannada: 'kannada top', malayalam: 'malayalam top', punjabi: 'punjabi top', marathi: 'marathi top', bengali: 'bengali top', gujarati: 'gujarati top', odia: 'odia top', assamese: 'assamese popular', urdu: 'urdu popular', bhojpuri: 'bhojpuri top', english: 'english top' },
  'top-charts':   { telugu: 'telugu chart', hindi: 'hindi chart', tamil: 'tamil chart', kannada: 'kannada chart', malayalam: 'malayalam chart', punjabi: 'punjabi chart', marathi: 'marathi chart', bengali: 'bengali chart', gujarati: 'gujarati chart', odia: 'odia chart', assamese: 'assamese chart', urdu: 'urdu chart', bhojpuri: 'bhojpuri chart', english: 'global chart' },
  'classics':     { telugu: 'ghantasala spb ilaiyaraaja telugu', hindi: 'mukesh lata mangeshkar', tamil: 'msv ilaiyaraaja tamil', kannada: 'dr rajkumar kannada', malayalam: 'k j yesudas malayalam', punjabi: 'old punjabi classics', marathi: 'lata mangeshkar marathi', bengali: 'hemanta mukhopadhyay', gujarati: 'hemant kumar gujarati', odia: 'akshaya mohanty', assamese: 'bhupen hazarika', urdu: 'nusrat fateh ali khan', bhojpuri: 'bhojpuri classics', english: 'classic english' },
  'mass-hits':    { telugu: 'telugu mass', hindi: 'hindi party', tamil: 'tamil mass', kannada: 'kannada mass', malayalam: 'malayalam hit', punjabi: 'punjabi bhangra', marathi: 'marathi mass', bengali: 'bengali mass', gujarati: 'gujarati garba', odia: 'odia mass', assamese: 'assamese dance', urdu: 'urdu qawwali', bhojpuri: 'bhojpuri mass', english: 'english party' },
  'romance':      { telugu: 'telugu love melody', hindi: 'hindi romantic', tamil: 'tamil melody', kannada: 'kannada love', malayalam: 'malayalam melody', punjabi: 'punjabi love', marathi: 'marathi romantic', bengali: 'bengali romantic', gujarati: 'gujarati romantic', odia: 'odia romantic', assamese: 'assamese romantic', urdu: 'urdu romantic ghazal', bhojpuri: 'bhojpuri romantic', english: 'english love songs' },
  'throwback':    { telugu: 'telugu old hits 90s', hindi: 'bollywood 90s hits', tamil: 'tamil old hits 90s', kannada: 'kannada old hits', malayalam: 'malayalam old hits', punjabi: 'old punjabi hits', marathi: 'marathi old hits', bengali: 'bengali old hits', gujarati: 'gujarati old hits', odia: 'odia old hits', assamese: 'assamese old songs', urdu: 'urdu old songs', bhojpuri: 'bhojpuri old hits', english: '90s hits' },
  'fresh-hits':   { telugu: 'telugu new song 2026', hindi: 'hindi new song 2026', tamil: 'tamil new song 2026', kannada: 'kannada new song 2026', malayalam: 'malayalam new song 2026', punjabi: 'punjabi new song 2026', marathi: 'marathi new song 2026', bengali: 'bengali new song 2026', gujarati: 'gujarati new song 2026', odia: 'odia new song 2026', assamese: 'assamese new song 2026', urdu: 'urdu new song 2026', bhojpuri: 'bhojpuri new song 2026', english: 'new song 2026' },
  'devotional':   { telugu: 'telugu devotional', hindi: 'hindi bhajan', tamil: 'tamil devotional', kannada: 'kannada devotional', malayalam: 'malayalam devotional', punjabi: 'punjabi devotional', marathi: 'marathi bhajan', bengali: 'bengali devotional', gujarati: 'gujarati bhajan', odia: 'odia devotional', assamese: 'assamese borgeet', urdu: 'urdu naat', bhojpuri: 'bhojpuri bhajan', english: 'english gospel' },
  'sad-songs':    { telugu: 'telugu sad', hindi: 'hindi sad', tamil: 'tamil sad', kannada: 'kannada sad', malayalam: 'malayalam sad', punjabi: 'punjabi sad', marathi: 'marathi sad', bengali: 'bengali sad', gujarati: 'gujarati sad', odia: 'odia sad', assamese: 'assamese sad', urdu: 'urdu sad ghazal', bhojpuri: 'bhojpuri sad', english: 'english sad' },
}

function getQuery(sectionId: string, language: string): string {
  const section = SECTION_QUERIES[sectionId]
  if (!section) return language
  return section[language] ?? section['hindi'] ?? language
}

export async function getSectionSongs(sectionId: string, language: string): Promise<Song[]> {
  const query = getQuery(sectionId, language)
  return searchSongs(query, language)
}
