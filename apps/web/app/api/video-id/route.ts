import { NextRequest, NextResponse } from 'next/server'
import { getVideoId } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') ?? ''
  const artist = searchParams.get('artist') ?? ''

  try {
    const videoId = await getVideoId(title, artist)
    return NextResponse.json({ videoId })
  } catch {
    return NextResponse.json({ videoId: null })
  }
}
