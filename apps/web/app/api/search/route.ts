import { NextRequest, NextResponse } from 'next/server'
import { searchSongs, getSectionSongs } from '@/lib/saavn'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const lang = searchParams.get('lang') ?? 'telugu'
  const section = searchParams.get('section')
  const page = parseInt(searchParams.get('page') ?? '1')

  try {
    const songs = section
      ? await getSectionSongs(section, lang)
      : await searchSongs(q, lang, page)
    return NextResponse.json({ songs })
  } catch {
    return NextResponse.json({ songs: [] }, { status: 200 })
  }
}
