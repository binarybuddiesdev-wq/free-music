import CryptoJS from 'crypto-js'
import type { Song, Album, Artist, SearchPlaylist } from '@/types/music'
import { mergeRecommendations } from './recommendations'
import { fisherYates } from './utils'
import { dedupSongs } from './song-dedup'
import { preprocessQuery, getYouTubeSuggestion, calculateRelevance, isDiscoveryQuery } from './search-engine'

// Official JioSaavn API — no external mirror needed
const BASE = 'https://www.jiosaavn.com/api.php'
const DES_KEY = CryptoJS.enc.Utf8.parse('38346591')
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'

/** Single place for JioSaavn API calls (was copy-pasted 6 times). Returns null on HTTP errors. */
async function saavnCall<T>(call: string, params: Record<string, string>, revalidate: number): Promise<T | null> {
  const qs = new URLSearchParams({
    __call: call,
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    ...params,
  })
  const res = await fetch(`${BASE}?${qs}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return null
  return (await res.json()) as T
}

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

interface RawSong {
  id?: string | number
  title?: string
  subtitle?: string
  image?: string
  language?: string
  year?: string | number
  more_info?: {
    artistMap?: { primary_artists?: Array<{ name: string }> }
    album?: string
    duration?: string | number
    encrypted_media_url?: string
  }
}

function normalize(raw: RawSong): Song {
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
  const json = await saavnCall<{ results?: unknown[] }>('search.getResults', { q: query, n: String(n), p: String(p) }, 300)
  const results = json?.results ?? []
  return results
    .filter((r) => (r as Record<string, unknown>).type === 'song')
    .map((r) => normalize(r as RawSong))
}

export async function searchSongs(query: string, language: string, page = 1): Promise<Song[]> {
  const { cleaned, entity, coreWords } = preprocessQuery(query)

  // If this is a generic discovery/mood query (e.g. "telugu hits", "happy songs", "party songs")
  if (isDiscoveryQuery(coreWords)) {
    const all = dedupSongs(await jiosaavnSearch(cleaned, 40, page))
    const userLang = language.toLowerCase()
    const matching = all.filter((s) => s.language === userLang)
    const others = all.filter((s) => s.language !== userLang)
    return matching.length >= 10 ? matching : [...matching, ...others]
  }

  // 1+2. Primary and entity searches in parallel (was sequential: up to 24 s worst case)
  const needsEntitySearch = entity !== cleaned
  const [primaryRaw, entityRaw] = await Promise.all([
    jiosaavnSearch(cleaned, 40, page),
    needsEntitySearch ? jiosaavnSearch(entity, 40, page) : Promise.resolve([] as Song[]),
  ])
  let raw = primaryRaw
  let relevant = primaryRaw.filter((s) => calculateRelevance(s, coreWords) > 0)
  if (relevant.length < 2 && needsEntitySearch) {
    const entityRelevant = entityRaw.filter((s) => calculateRelevance(s, coreWords) > 0)
    if (entityRelevant.length > relevant.length) {
      raw = entityRaw
      relevant = entityRelevant
    }
  }

  // 3. YouTube suggestion fallback if still low relevance
  if (relevant.length < 2) {
    const suggestion = await getYouTubeSuggestion(query)
    if (
      suggestion &&
      suggestion.toLowerCase() !== query.toLowerCase() &&
      suggestion.toLowerCase() !== cleaned.toLowerCase()
    ) {
      const { cleaned: sugCleaned, entity: sugEntity, coreWords: sugWords } = preprocessQuery(suggestion)
      const sugRaw = await jiosaavnSearch(sugCleaned, 40, page)
      const sugRelevant = sugRaw.filter((s) => calculateRelevance(s, sugWords) > 0)
      if (sugRelevant.length > relevant.length) {
        raw = sugRaw
        relevant = sugRelevant
      }
    }
  }

  const pool = relevant.length > 0 ? relevant : raw
  const all = dedupSongs(pool)

  // Language prioritization: requested language first, then other languages
  const userLang = language.toLowerCase()
  const matchingLang = all.filter((s) => s.language === userLang)
  const otherLang = all.filter((s) => s.language !== userLang)

  return [...matchingLang, ...otherLang]
}

/** Typeahead: one upstream call, no relevance fallbacks, max 5 results. */
export async function suggestSongs(query: string, language: string): Promise<Song[]> {
  const { cleaned } = preprocessQuery(query)
  if (!cleaned) return []
  const songs = dedupSongs(await jiosaavnSearch(cleaned, 10, 1))
  const lang = language.toLowerCase()
  return [...songs.filter((s) => s.language === lang), ...songs.filter((s) => s.language !== lang)].slice(0, 5)
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
  'workout':      { telugu: 'telugu gym workout high energy mass', hindi: 'hindi gym workout motivation', tamil: 'tamil energetic workout', kannada: 'kannada energetic mass', malayalam: 'malayalam fast beats', punjabi: 'punjabi workout bhangra', marathi: 'marathi energetic', bengali: 'bengali dance', gujarati: 'gujarati garba fast', odia: 'odia energetic', assamese: 'assamese dance', urdu: 'urdu fast beats', bhojpuri: 'bhojpuri high energy', english: 'workout gym cardio beats' },
  'chill':        { telugu: 'telugu chill acoustic calm', hindi: 'hindi lofi acoustic calm', tamil: 'tamil acoustic melody', kannada: 'kannada acoustic melody', malayalam: 'malayalam chill acoustic', punjabi: 'punjabi acoustic slow', marathi: 'marathi acoustic', bengali: 'bengali acoustic', gujarati: 'gujarati acoustic', odia: 'odia acoustic', assamese: 'assamese acoustic', urdu: 'urdu slow ghazal', bhojpuri: 'bhojpuri soft melody', english: 'chill lofi acoustic relax' },
  'party':        { telugu: 'telugu party dance dj', hindi: 'bollywood party dance club', tamil: 'tamil party kuthu dance', kannada: 'kannada party dance', malayalam: 'malayalam party songs', punjabi: 'punjabi party dance club', marathi: 'marathi party dj', bengali: 'bengali party dance', gujarati: 'gujarati garba party', odia: 'odia party dance', assamese: 'assamese party dance', urdu: 'urdu party qawwali', bhojpuri: 'bhojpuri dj party', english: 'dance club party hits' },
}

function getQuery(sectionId: string, language: string): string {
  const section = SECTION_QUERIES[sectionId]
  if (!section) return language
  return section[language] ?? section['hindi'] ?? language
}

export async function getSectionSongs(sectionId: string, language: string, page = 1): Promise<Song[]> {
  const query = getQuery(sectionId, language)
  const all = dedupSongs(await jiosaavnSearch(query, 40, page))
  const userLang = language.toLowerCase()
  const matching = all.filter((s) => s.language === userLang)
  const others = all.filter((s) => s.language !== userLang)
  return matching.length >= 10 ? matching : [...matching, ...others]
}

interface RawAlbum {
  id?: string | number
  title?: string
  subtitle?: string
  image?: string
  year?: string | number
  language?: string
  more_info?: {
    song_count?: string | number
  }
}

interface RawArtist {
  id?: string | number
  name?: string
  title?: string
  image?: string
  role?: string
  follower_count?: string | number
  more_info?: {
    follower_count?: string | number
  }
}

interface RawPlaylist {
  id?: string | number
  title?: string
  subtitle?: string
  image?: string
  language?: string
  more_info?: {
    song_count?: string | number
    firstname?: string
  }
}

function normalizeAlbum(raw: RawAlbum): Album {
  return {
    id: String(raw.id),
    title: decodeHtml(raw.title ?? 'Unknown Album'),
    artist: decodeHtml(raw.subtitle ?? 'Various Artists'),
    year: raw.year ? String(raw.year) : undefined,
    image: hiResImage(raw.image ?? ''),
    songCount: Number(raw.more_info?.song_count ?? 0),
    language: raw.language ? String(raw.language).toLowerCase() : undefined,
  }
}

function normalizeArtist(raw: RawArtist): Artist {
  const followers = raw.follower_count ?? raw.more_info?.follower_count
  return {
    id: String(raw.id),
    name: decodeHtml(raw.name ?? raw.title ?? 'Unknown Artist'),
    image: hiResImage(raw.image ?? ''),
    role: raw.role ? decodeHtml(raw.role) : 'Artist',
    subscriberCount: followers ? Number(followers) : undefined,
  }
}

function normalizePlaylist(raw: RawPlaylist): SearchPlaylist {
  return {
    id: String(raw.id),
    title: decodeHtml(raw.title ?? 'Unknown Playlist'),
    owner: decodeHtml(raw.more_info?.firstname ?? raw.subtitle ?? 'JioSaavn'),
    image: hiResImage(raw.image ?? ''),
    songCount: Number(raw.more_info?.song_count ?? 0),
    language: raw.language ? String(raw.language).toLowerCase() : undefined,
  }
}

async function jiosaavnSearchType<T>(call: string, query: string, n = 30, p = 1): Promise<T[]> {
  const json = await saavnCall<{ results?: T[] }>(call, { q: query, n: String(n), p: String(p) }, 300)
  return json?.results ?? []
}

export async function searchAlbums(query: string, language?: string, page = 1): Promise<Album[]> {
  try {
    const { cleaned, entity, coreWords } = preprocessQuery(query)
    let results = (await jiosaavnSearchType<RawAlbum>('search.getAlbumResults', cleaned, 30, page)).map(normalizeAlbum)
    let relevant = results.filter((a) => calculateRelevance(a, coreWords) > 0)

    if (relevant.length < 2 && entity !== cleaned) {
      const entityResults = (await jiosaavnSearchType<RawAlbum>('search.getAlbumResults', entity, 30, page)).map(normalizeAlbum)
      const entityRelevant = entityResults.filter((a) => calculateRelevance(a, coreWords) > 0)
      if (entityRelevant.length > relevant.length) {
        results = entityResults
        relevant = entityRelevant
      }
    }

    const pool = relevant.length > 0 ? relevant : results
    if (language) {
      const targetLang = language.toLowerCase()
      const matching = pool.filter((a) => (a.language || '').toLowerCase() === targetLang)
      const others = pool.filter((a) => (a.language || '').toLowerCase() !== targetLang)
      return [...matching, ...others]
    }
    return pool
  } catch {
    return []
  }
}

export async function searchArtists(query: string, _language?: string, page = 1): Promise<Artist[]> {
  try {
    const { cleaned, entity, coreWords } = preprocessQuery(query)
    const target = entity || cleaned
    let results = (await jiosaavnSearchType<RawArtist>('search.getArtistResults', target, 30, page)).map(normalizeArtist)
    let relevant = results.filter((a) => calculateRelevance(a, coreWords) > 0)

    if (relevant.length === 0 && target !== cleaned) {
      const cleanResults = (await jiosaavnSearchType<RawArtist>('search.getArtistResults', cleaned, 30, page)).map(normalizeArtist)
      const cleanRelevant = cleanResults.filter((a) => calculateRelevance(a, coreWords) > 0)
      if (cleanRelevant.length > 0) {
        results = cleanResults
        relevant = cleanRelevant
      }
    }

    return relevant.length > 0 ? relevant : results
  } catch {
    return []
  }
}

export async function searchPlaylists(query: string, language?: string, page = 1): Promise<SearchPlaylist[]> {
  try {
    const { cleaned, entity, coreWords } = preprocessQuery(query)
    let results = (await jiosaavnSearchType<RawPlaylist>('search.getPlaylistResults', cleaned, 30, page)).map(normalizePlaylist)
    let relevant = results.filter((p) => calculateRelevance(p, coreWords) > 0)

    if (relevant.length < 2 && entity !== cleaned) {
      const entityResults = (await jiosaavnSearchType<RawPlaylist>('search.getPlaylistResults', entity, 30, page)).map(normalizePlaylist)
      const entityRelevant = entityResults.filter((p) => calculateRelevance(p, coreWords) > 0)
      if (entityRelevant.length > relevant.length) {
        results = entityResults
        relevant = entityRelevant
      }
    }

    const pool = relevant.length > 0 ? relevant : results
    if (language) {
      const targetLang = language.toLowerCase()
      const matching = pool.filter((p) => (p.language || '').toLowerCase() === targetLang)
      const others = pool.filter((p) => (p.language || '').toLowerCase() !== targetLang)
      return [...matching, ...others]
    }
    return pool
  } catch {
    return []
  }
}

export async function getAlbumDetails(albumId: string): Promise<{ album: Album | null; songs: Song[] }> {
  try {
    const json = await saavnCall<RawAlbum & { list?: RawSong[]; songs?: RawSong[] }>(
      'content.getAlbumDetails',
      { albumid: albumId },
      3600
    )
    if (!json) return { album: null, songs: [] }
    const songs = (json.songs ?? json.list ?? []).map(normalize)
    const album = json.title
      ? { ...normalizeAlbum(json), songCount: songs.length || Number(json.more_info?.song_count ?? 0) }
      : null
    return { album, songs }
  } catch {
    return { album: null, songs: [] }
  }
}

export async function getPlaylistSongs(playlistId: string): Promise<Song[]> {
  try {
    const json = await saavnCall<{ list?: RawSong[]; songs?: RawSong[] }>('playlist.getDetails', { listid: playlistId }, 3600)
    return (json?.songs ?? json?.list ?? []).map(normalize)
  } catch {
    return []
  }
}

interface RawArtistPage {
  artistId?: string
  id?: string
  name?: string
  title?: string
  image?: string
  follower_count?: string | number
  fans?: string | number
  role?: string
  topSongs?: RawSong[]
  songs?: RawSong[]
  topAlbums?: RawAlbum[]
  albums?: RawAlbum[]
}

export async function getArtistDetails(
  artistId: string
): Promise<{ artist: Artist; songs: Song[]; albums: Album[] } | null> {
  try {
    const json = await saavnCall<RawArtistPage>(
      'artist.getArtistPageDetails',
      { artistId, n_song: '30', n_album: '20' },
      3600
    )
    if (!json) return null
    const rawSongs = json.topSongs ?? json.songs ?? []
    const name = json.name || json.title
    if (!name && rawSongs.length === 0) return null
    return {
      artist: normalizeArtist({
        id: json.artistId || json.id || artistId,
        name,
        image: json.image,
        follower_count: json.follower_count || json.fans,
        role: json.role || 'Artist',
      }),
      songs: rawSongs.map(normalize),
      albums: (json.topAlbums ?? json.albums ?? []).map(normalizeAlbum),
    }
  } catch {
    return null
  }
}

const randomPageUpTo = (max: number) => Math.floor(Math.random() * max) + 1

export async function getSongRecommendations(
  songId: string,
  artist?: string,
  language = 'telugu'
): Promise<Song[]> {
  const primaryArtist = (artist || '').split(',')[0]?.trim() || ''
  // Random pages + alternating discovery sections keep long radio sessions from running dry
  const [artistResult, discoveryResult] = await Promise.allSettled([
    primaryArtist ? jiosaavnSearch(primaryArtist, 40, randomPageUpTo(2)) : Promise.resolve([] as Song[]),
    getSectionSongs(Math.random() < 0.5 ? 'trending' : 'quick-picks', language, randomPageUpTo(3)),
  ])
  return mergeRecommendations({
    seedId: songId,
    primaryArtist,
    artistSongs: artistResult.status === 'fulfilled' ? artistResult.value : [],
    discoverySongs: discoveryResult.status === 'fulfilled' ? discoveryResult.value : [],
    shuffle: fisherYates,
  })
}
