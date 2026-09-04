import { NextRequest, NextResponse } from 'next/server'
import { getLyrics } from '@/lib/lrclib'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') ?? ''
  const artist = searchParams.get('artist') ?? ''
  const duration = searchParams.get('duration')

  try {
    const lyrics = await getLyrics(title, artist, duration ? parseFloat(duration) : undefined)
    return NextResponse.json({ lyrics })
  } catch {
    return NextResponse.json({ lyrics: null })
  }
}
