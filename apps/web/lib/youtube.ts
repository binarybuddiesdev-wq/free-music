const API_KEY = process.env.YOUTUBE_API_KEY

export async function getVideoId(title: string, artist: string): Promise<string | null> {
  const cleanTitle = title.replace(/\(.*?\)/g, '').trim() || title
  const primaryArtist = artist.split(',')[0].trim() || artist
  const query = `${cleanTitle} ${primaryArtist} official video`

  // 1. If YOUTUBE_API_KEY is set in .env.local, use official YouTube Data API v3
  if (API_KEY) {
    try {
      const q = encodeURIComponent(query)
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=${q}&key=${API_KEY}&maxResults=1`,
        { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) }
      )
      if (res.ok) {
        const json = await res.json()
        const videoId = json?.items?.[0]?.id?.videoId
        if (videoId) return videoId
      }
    } catch {
      // Fall through to zero-config fallback
    }
  }

  // 2. Zero-config fallback: resolves YouTube video ID without requiring any API key
  try {
    const q = encodeURIComponent(query)
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
