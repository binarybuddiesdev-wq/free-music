import { NextRequest, NextResponse } from 'next/server'
import { getLyrics } from '@/lib/lrclib'
import { sanitizeString, sanitizeDuration } from '@/lib/security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  // 1. Rate Limiting Protection (45 req/min per IP)
  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(`lyrics:${clientIp}`, 45, 60000)

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset),
  }

  const successHeaders = {
    ...rateLimitHeaders,
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
  }

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', retryAfter: rateLimit.reset },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.reset),
        },
      }
    )
  }

  // 2. Input Validation & Sanitization
  const { searchParams } = req.nextUrl
  const title = sanitizeString(searchParams.get('title'), 120)
  const artist = sanitizeString(searchParams.get('artist'), 100)
  const duration = sanitizeDuration(searchParams.get('duration'))

  if (!title) {
    return NextResponse.json({ lyrics: null }, { headers: successHeaders })
  }

  try {
    const lyrics = await getLyrics(title, artist, duration)
    return NextResponse.json({ lyrics }, { headers: successHeaders })
  } catch (err) {
    logger.error('Error handling /api/lyrics request', err, { title, artist, duration })
    return NextResponse.json({ lyrics: null }, { headers: successHeaders })
  }
}
