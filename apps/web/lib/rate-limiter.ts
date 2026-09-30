import type { NextRequest } from 'next/server'

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Periodically clean up stale records every 5 minutes to prevent memory leaks
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 50_000 // Upper bound for memory safety under million-user traffic

function cleanupStaleRecords(now: number, maxWindowMs: number) {
  const isOverCapacity = rateLimitMap.size >= MAX_ENTRIES
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && !isOverCapacity) return
  lastCleanup = now

  for (const [key, record] of rateLimitMap.entries()) {
    const validTimestamps = record.timestamps.filter((ts) => now - ts < maxWindowMs)
    if (validTimestamps.length === 0) {
      rateLimitMap.delete(key)
    } else {
      record.timestamps = validTimestamps
    }
  }

  // If still over capacity under extreme DDoS or million-user spikes, prune oldest entries
  if (rateLimitMap.size >= MAX_ENTRIES) {
    const keysToDelete = Array.from(rateLimitMap.keys()).slice(0, 10_000)
    for (const k of keysToDelete) {
      rateLimitMap.delete(k)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Seconds until reset
}

/**
 * Sliding window rate limiter.
 *
 * @param key Unique identifier (e.g. client IP + route identifier)
 * @param limit Maximum allowed requests within the time window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 min)
 */
export function checkRateLimit(key: string, limit = 60, windowMs = 60000): RateLimitResult {
  const now = Date.now()
  cleanupStaleRecords(now, windowMs)

  let record = rateLimitMap.get(key)
  if (!record) {
    record = { timestamps: [] }
    rateLimitMap.set(key, record)
  }

  // Filter out timestamps outside the sliding window
  const windowStart = now - windowMs
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0]
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now)
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(resetMs / 1000),
    }
  }

  // Record this request
  record.timestamps.push(now)
  const remaining = Math.max(0, limit - record.timestamps.length)
  const oldestTimestamp = record.timestamps[0]
  const resetMs = Math.max(0, oldestTimestamp + windowMs - now)

  return {
    success: true,
    limit,
    remaining,
    reset: Math.ceil(resetMs / 1000),
  }
}

/**
 * Extracts client IP securely from NextRequest headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // The first IP in x-forwarded-for is the original client IP
    const clientIp = forwardedFor.split(',')[0].trim()
    if (clientIp) return clientIp
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return '127.0.0.1'
}

/**
 * Clears the in-memory rate limit map (useful for test isolation).
 */
export function resetRateLimiter(): void {
  rateLimitMap.clear()
}
