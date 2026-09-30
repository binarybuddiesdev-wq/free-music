export interface PreprocessedQuery {
  original: string
  cleaned: string
  entity: string
  coreWords: string[]
}

/**
 * Normalizes user queries by fixing common mobile & phonetic typos,
 * and extracts the core entity (song name, movie name, or artist name)
 * by isolating generic intent descriptors (e.g. "movie songs", "songs", "jukebox").
 */
export function preprocessQuery(rawQuery: string): PreprocessedQuery {
  if (!rawQuery) {
    return { original: '', cleaned: '', entity: '', coreWords: [] }
  }

  let q = rawQuery.trim()

  // 1. Common typos & phonetic corrections
  // "move" -> "movie" (common mobile typo for movie songs)
  q = q.replace(/\b(move|mvoie|moive|moove|mve)\b/gi, 'movie')

  // "songes", "songz", "sogns" -> "songs"
  q = q.replace(/\b(songes|songz|sogns|sngs)\b/gi, 'songs')

  // Indian Languages
  q = q.replace(/\btelgu\b/gi, 'telugu')
  q = q.replace(/\btamli\b/gi, 'tamil')
  q = q.replace(/\bhind\b/gi, 'hindi')
  q = q.replace(/\bkannad\b/gi, 'kannada')
  q = q.replace(/\bpunjab\b/gi, 'punjabi')

  // Media descriptors
  q = q.replace(/\b(vedio|viedo)\b/gi, 'video')
  q = q.replace(/\b(autio|adio)\b/gi, 'audio')
  q = q.replace(/\bjukbox\b/gi, 'jukebox')
  q = q.replace(/\b(lyric|lyrcs)\b/gi, 'lyrics')

  // Normalize spaces
  q = q.replace(/\s+/g, ' ').trim()

  // 2. Extract core entity (strip intent descriptors)
  const intentPattern =
    /\b(movie\s+songs?|songs?|audio|mp3|all\s+songs?|jukebox|soundtrack|tracks?|video|full\s+song|hits?|hit\s+songs?|all|full|official|video\s+song|album\s+songs?|theme\s+song|remix|dj|downloads?|free|online|high\s+quality|320kbps|128kbps|kbps)\b/gi
  const stripped = q.replace(intentPattern, ' ').replace(/\s+/g, ' ').trim()

  const entity = stripped.length >= 2 ? stripped : q
  const coreWords = entity
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2)

  return {
    original: rawQuery.trim(),
    cleaned: q,
    entity,
    coreWords,
  }
}

const DISCOVERY_WORDS = new Set([
  'hit', 'hits', 'popular', 'trending', 'chart', 'charts',
  'new', 'latest', 'fresh', 'top', 'best', 'classic', 'classics',
  'old', 'retro', 'throwback', '90s', '80s', '2000s', '2024', '2025', '2026',
  'mass', 'melody', 'love', 'romantic', 'romance', 'sad', 'heartbreak',
  'party', 'dance', 'club', 'dj', 'remix', 'folk', 'traditional',
  'devotional', 'bhajan', 'qawwali', 'ghazal', 'chill', 'workout', 'motivation',
  'happy', 'upbeat', 'relaxing', 'emotional', 'lofi', 'beats',
  'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'punjabi', 'marathi',
  'bengali', 'gujarati', 'odia', 'assamese', 'urdu', 'bhojpuri', 'english',
  'song', 'songs', 'music', 'audio', 'track', 'tracks', 'video', 'movie', 'film',
  'cinema', 'all', 'jukebox', 'full'
])

export function isDiscoveryQuery(words: string[]): boolean {
  if (!words || words.length === 0) return true
  return words.every((w) => DISCOVERY_WORDS.has(w.toLowerCase()))
}


/**
 * Calls YouTube complete suggestion service for query correction & intent enrichment.
 * YouTube's search engine understands obscure typos and user intent.
 */
export async function getYouTubeSuggestion(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(3500),
      }
    )
    if (!res.ok) return null
    const text = await res.text()
    // Format: window.google.ac.h(["query",[["sug1",0],...],{"o":"..."}])
    const match = text.match(/\["(.*?)",\[(.*?)\]/)
    if (match && match[2]) {
      const items = [...match[2].matchAll(/\["(.*?)",/g)].map((m) => m[1])
      if (items.length > 0) return items[0]
    }
    return null
  } catch {
    return null
  }
}

/**
 * Calculates a relevance score for a search result against user's core query terms.
 */
export function calculateRelevance(
  item: {
    title?: string
    name?: string
    subtitle?: string
    artist?: string
    album?: string
    more_info?: {
      album?: string
      primary_artists?: string
      artistMap?: { primary_artists?: Array<{ name: string }> }
    }
  },
  queryWords: string[]
): number {
  if (!queryWords || queryWords.length === 0) return 1

  const title = (item.title || item.name || '').toLowerCase()
  const subtitle = (item.subtitle || '').toLowerCase()
  const album = (item.album || item.more_info?.album || '').toLowerCase()
  const artist = (
    item.artist ||
    item.more_info?.primary_artists ||
    (Array.isArray(item.more_info?.artistMap?.primary_artists)
      ? item.more_info.artistMap.primary_artists.map((a) => a.name).join(' ')
      : '') ||
    ''
  ).toLowerCase()

  const combined = `${title} ${subtitle} ${album} ${artist}`

  let score = 0
  for (const word of queryWords) {
    if (combined.includes(word)) {
      score += 1
      // Extra weight for matching in the title or album name
      if (title.includes(word) || album.includes(word)) {
        score += 2
      }
    }
  }
  return score
}
