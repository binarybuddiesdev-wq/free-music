const API_KEY = process.env.YOUTUBE_API_KEY

export async function getVideoId(title: string, artist: string): Promise<string | null> {
  if (!API_KEY) return null

  try {
    const q = encodeURIComponent(`${title} ${artist} official audio`)
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=${q}&key=${API_KEY}&maxResults=1`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.items?.[0]?.id?.videoId ?? null
  } catch {
    return null
  }
}
