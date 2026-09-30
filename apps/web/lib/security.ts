/**
 * Security validation and input sanitization utilities.
 * Protects against XSS, Path Traversal, ReDoS, and Malicious Injections.
 */

// Recognized and supported catalog languages
export const ALLOWED_LANGUAGES = [
  'telugu',
  'hindi',
  'tamil',
  'kannada',
  'malayalam',
  'punjabi',
  'english',
  'marathi',
  'bengali',
  'gujarati',
  'bhojpuri',
] as const

export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number]

export const ALLOWED_SEARCH_TYPES = ['songs', 'albums', 'artists', 'playlists'] as const
export type AllowedSearchType = (typeof ALLOWED_SEARCH_TYPES)[number]

/**
 * Sanitizes generic string inputs (e.g. search query, song title, artist name).
 * - Strips null bytes (\0)
 * - Strips control characters (ASCII 0-31 except tab/newline)
 * - Strips potential HTML script/tag injections
 * - Truncates to maxLength to prevent ReDoS / memory exhaustion
 */
export function sanitizeString(val: unknown, maxLength = 200): string {
  if (typeof val !== 'string') return ''

  // 1. Remove null bytes and non-printable control characters
  let clean = val.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 2. Strip potential HTML injection tags & script markers
  clean = clean.replace(/<[^>]*>?/gm, '')
  clean = clean.replace(/javascript\s*:/gi, '')
  clean = clean.replace(/data\s*:[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '')
  clean = clean.replace(/data\s*:\s*text\/[a-z]+/gi, '')

  // 3. Trim and cap length
  clean = clean.trim()
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength).trim()
  }

  return clean
}

/**
 * Sanitizes entity IDs (albumId, artistId, playlistId, songId).
 * Enforces alphanumeric characters, hyphens, underscores, and dots.
 * Explicitly rejects directory traversal (..) and invalid punctuation.
 */
export function sanitizeSafeId(val: unknown, maxLength = 64): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed || trimmed.length > maxLength) return null

  // Reject path traversal attempts
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null
  }

  // Allow only alphanumeric, underscores, hyphens, dots
  const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-\.]+$/
  if (!SAFE_ID_REGEX.test(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * Validates language against the allowlist. Defaults to 'telugu'.
 */
export function sanitizeLanguage(val: unknown): AllowedLanguage {
  if (typeof val !== 'string') return 'telugu'
  const normalized = val.trim().toLowerCase()
  return (ALLOWED_LANGUAGES as readonly string[]).includes(normalized)
    ? (normalized as AllowedLanguage)
    : 'telugu'
}

/**
 * Validates search category type. Defaults to 'songs'.
 */
export function sanitizeSearchType(val: unknown): AllowedSearchType {
  if (typeof val !== 'string') return 'songs'
  const normalized = val.trim().toLowerCase()
  return (ALLOWED_SEARCH_TYPES as readonly string[]).includes(normalized)
    ? (normalized as AllowedSearchType)
    : 'songs'
}

/**
 * Sanitizes and bounds pagination pages (1 to 50).
 */
export function sanitizePage(val: unknown): number {
  if (typeof val === 'number') {
    if (isNaN(val) || val < 1) return 1
    return Math.min(Math.floor(val), 50)
  }
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10)
    if (isNaN(parsed) || parsed < 1) return 1
    return Math.min(parsed, 50)
  }
  return 1
}

/**
 * Sanitizes audio duration in seconds (1 to 7200s / 2 hours).
 */
export function sanitizeDuration(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined
  const num = typeof val === 'number' ? val : parseFloat(String(val))
  if (isNaN(num) || !Number.isFinite(num) || num <= 0) return undefined
  // Bound duration between 1s and 7200s
  return Math.min(Math.max(num, 1), 7200)
}
