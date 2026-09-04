import { NextRequest, NextResponse } from 'next/server'
import { getSong } from '@/lib/saavn'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const song = await getSong(id)
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ song })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
