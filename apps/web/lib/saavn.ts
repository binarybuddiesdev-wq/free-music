import CryptoJS from 'crypto-js'
import type { Song } from '@/types/music'

// Official JioSaavn API — no external mirror needed
const BASE = 'https://www.jiosaavn.com/api.php'
const DES_KEY = CryptoJS.enc.Utf8.parse('38346591')

function decryptMediaUrl(encrypted: string): string {
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) } as CryptoJS.lib.CipherParams,
      DES_KEY,
      { mode: CryptoJS.mode.ECB }
    )
    const url = decrypted.toString(CryptoJS.enc.Utf8)
    // Upgrade from 96kbps to 320kbps
    return url.replace(/_96\.mp4/g, '_320.mp4')
  } catch {
    return ''
  }
}

function hiResImage(url: string): string {
  return url.replace(/-(50x50|150x150|500x500)(\.\w+)$/, '-500x500$2')
}

function decodeHtml(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): Song {
  const artists: Array<{ name: string }> = raw.more_info?.artistMap?.primary_artists ?? []
  const artist = artists.map((a) => a.name).filter(Boolean).join(', ') || raw.subtitle?.split(' - ')[0] || 'Unknown'
  const encrypted = raw.more_info?.encrypted_media_url ?? ''
  return {
    id: String(raw.id),
    title: decodeHtml(raw.title ?? 'Unknown'),
    artist: decodeHtml(artist),
    album: raw.more_info?.album ?? '',
    duration: Number(raw.more_info?.duration ?? 0),
    image: hiResImage(raw.image ?? ''),
    downloadUrl: decryptMediaUrl(encrypted),
    language: (raw.language ?? '').toLowerCase(),
    year: raw.year?.toString(),
  }
}

async function jiosaavnSearch(query: string, n = 40, p = 1): Promise<Song[]> {
  const params = new URLSearchParams({
    __call: 'search.getResults',
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    q: query,
    n: String(n),
    p: String(p),
  })
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return []
  const json = await res.json()
  const results: unknown[] = json?.results ?? []
  return results.filter((r: unknown) => (r as Record<string, unknown>).type === 'song').map(normalize)
}

function dedup(songs: Song[]): Song[] {
  const seen = new Set<string>()
  return songs.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true })
}

export async function searchSongs(query: string, language: string, page = 1): Promise<Song[]> {
  const all = dedup(await jiosaavnSearch(query, 40, page))
  const filtered = all.filter((s) => s.language === language.toLowerCase())
  return filtered.length >= 5 ? filtered : all
}

export async function getSong(id: string): Promise<Song | null> {
  try {
    const params = new URLSearchParams({
      __call: 'song.getDetails',
      _format: 'json',
      _marker: '0',
      api_version: '4',
      ctx: 'web6dot0',
      pids: id,
    })
    const res = await fetch(`${BASE}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const data = json?.[id]
    if (!data) return null
    return normalize(data)
  } catch {
    return null
  }
}

const SECTION_QUERIES: Record<string, Record<string, string>> = {
  'listen-again': { telugu: 'telugu popular', hindi: 'hindi popular', tamil: 'tamil popular', kannada: 'kannada popular', malayalam: 'malayalam popular', punjabi: 'punjabi popular', marathi: 'marathi popular', bengali: 'bengali popular', gujarati: 'gujarati popular', odia: 'odia popular', assamese: 'assamese popular', urdu: 'urdu popular', bhojpuri: 'bhojpuri popular', english: 'english popular' },
  'quick-picks':  { telugu: 'telugu hits 2025', hindi: 'hindi hits 2025', tamil: 'tamil hits 2025', kannada: 'kannada hits 2025', malayalam: 'malayalam hits 2025', punjabi: 'punjabi hits 2025', marathi: 'marathi hits 2025', bengali: 'bengali hits 2025', gujarati: 'gujarati hits 2025', odia: 'odia hits 2025', assamese: 'assamese hits', urdu: 'urdu hits', bhojpuri: 'bhojpuri hits', english: 'english hits 2025' },
  'new-releases': { telugu: 'new telugu 2025', hindi: 'new hindi 2025', tamil: 'new tamil 2025', kannada: 'new kannada 2025', malayalam: 'new malayalam 2025', punjabi: 'new punjabi 2025', marathi: 'new marathi 2025', bengali: 'new bengali 2025', gujarati: 'new gujarati 2025', odia: 'new odia 2025', assamese: 'new assamese', urdu: 'new urdu', bhojpuri: 'new bhojpuri', english: 'new english 2025' },
  'trending':     { telugu: 'telugu trending', hindi: 'hindi trending', tamil: 'tamil trending', kannada: 'kannada trending', malayalam: 'malayalam trending', punjabi: 'punjabi trending', marathi: 'marathi trending', bengali: 'bengali trending', gujarati: 'gujarati trending', odia: 'odia trending', assamese: 'assamese trending', urdu: 'urdu trending', bhojpuri: 'bhojpuri trending', english: 'english trending' },
  'top-charts':   { telugu: 'telugu chart', hindi: 'hindi chart', tamil: 'tamil chart', kannada: 'kannada chart', malayalam: 'malayalam chart', punjabi: 'punjabi chart', marathi: 'marathi chart', bengali: 'bengali chart', gujarati: 'gujarati chart', odia: 'odia chart', assamese: 'assamese chart', urdu: 'urdu chart', bhojpuri: 'bhojpuri chart', english: 'global chart' },
  'classics':     { telugu: 'ghantasala spb telugu classic', hindi: 'mukesh lata classic hindi', tamil: 'ilaiyaraaja classic', kannada: 'rajkumar classic kannada', malayalam: 'yesudas classic', punjabi: 'punjabi classic', marathi: 'lata classic marathi', bengali: 'hemanta classic', gujarati: 'classic gujarati', odia: 'classic odia', assamese: 'bhupen hazarika', urdu: 'nusrat classic', bhojpuri: 'classic bhojpuri', english: 'classic rock' },
  'mass-hits':    { telugu: 'telugu mass', hindi: 'hindi party', tamil: 'tamil mass', kannada: 'kannada mass', malayalam: 'malayalam hit', punjabi: 'punjabi bhangra', marathi: 'marathi mass', bengali: 'bengali dance', gujarati: 'gujarati garba', odia: 'odia mass', assamese: 'assamese dance', urdu: 'urdu qawwali', bhojpuri: 'bhojpuri mass', english: 'english party hits' },
  'romance':      { telugu: 'telugu love melody', hindi: 'hindi romantic', tamil: 'tamil melody love', kannada: 'kannada love', malayalam: 'malayalam melody', punjabi: 'punjabi love', marathi: 'marathi romantic', bengali: 'bengali romantic', gujarati: 'gujarati romantic', odia: 'odia romantic', assamese: 'assamese romantic', urdu: 'urdu romantic ghazal', bhojpuri: 'bhojpuri romantic', english: 'english love songs' },
  'throwback':    { telugu: 'telugu 90s classic', hindi: 'bollywood 90s retro', tamil: 'tamil 90s classic', kannada: 'kannada old hits', malayalam: 'malayalam old hits', punjabi: 'punjabi old hits', marathi: 'marathi old hits', bengali: 'bengali old hits', gujarati: 'gujarati old hits', odia: 'odia old hits', assamese: 'assamese old songs', urdu: 'urdu old songs', bhojpuri: 'bhojpuri old hits', english: '90s hits' },
  'fresh-hits':   { telugu: 'latest telugu song', hindi: 'latest hindi song', tamil: 'latest tamil song', kannada: 'latest kannada song', malayalam: 'latest malayalam song', punjabi: 'latest punjabi song', marathi: 'latest marathi song', bengali: 'latest bengali song', gujarati: 'latest gujarati song', odia: 'latest odia', assamese: 'latest assamese', urdu: 'latest urdu', bhojpuri: 'latest bhojpuri', english: 'latest english song' },
  'devotional':   { telugu: 'telugu devotional songs', hindi: 'hindi bhajan', tamil: 'tamil devotional', kannada: 'kannada devotional', malayalam: 'malayalam devotional', punjabi: 'punjabi devotional', marathi: 'marathi bhajan', bengali: 'bengali devotional', gujarati: 'gujarati bhajan', odia: 'odia devotional', assamese: 'assamese borgeet', urdu: 'urdu naat qawwali', bhojpuri: 'bhojpuri bhajan', english: 'gospel songs' },
  'sad-songs':    { telugu: 'telugu sad songs', hindi: 'hindi sad songs', tamil: 'tamil sad melody', kannada: 'kannada sad songs', malayalam: 'malayalam sad songs', punjabi: 'punjabi sad songs', marathi: 'marathi sad songs', bengali: 'bengali sad songs', gujarati: 'gujarati sad', odia: 'odia sad', assamese: 'assamese sad', urdu: 'urdu sad ghazal', bhojpuri: 'bhojpuri sad', english: 'english sad songs' },
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
