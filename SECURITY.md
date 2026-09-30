# Security Policy & Architecture

## Supported Versions

The following versions of Free Music are currently actively maintained with security patches:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

---

## Production Security Architecture

Free Music is built according to **OWASP Top 10** guidelines and defense-in-depth security principles.

### 1. HTTP Security Headers
Configured globally in [`next.config.ts`](file:///C:/teja/coding/free-music/apps/web/next.config.ts) across all application routes and assets:

- **Content-Security-Policy (CSP)**:
  - `default-src 'self'`
  - Restricts executable scripts strictly to `'self'`, authorized YouTube IFrame APIs (`https://www.youtube.com`, `https://s.ytimg.com`).
  - Restricts media sources strictly to `'self'`, `blob:`, `data:`, and verified CDN endpoints (`*.saavncdn.com`, `*.googlevideo.com`, `*.youtube.com`).
  - Restricts network connections (`connect-src`) to internal APIs, JioSaavn endpoints, LRCLIB (`https://lrclib.net`), and YouTube suggestions.
  - Enforces `frame-ancestors 'self'` to block cross-origin framing and UI redressing.
  - Blocks plugins with `object-src 'none'` and restricts base URLs with `base-uri 'self'`.
- **X-Frame-Options: SAMEORIGIN**:
  - Completely mitigates **Clickjacking** by disallowing external sites from embedding the web player inside invisible `<iframe>` overlays.
- **X-Content-Type-Options: nosniff**:
  - Prevents MIME type sniffing, stopping browsers from executing non-script assets (e.g. images, audio) as HTML/JavaScript.
- **Referrer-Policy: strict-origin-when-cross-origin**:
  - Prevents sensitive URL query parameters, routes, or search terms from leaking in HTTP `Referer` headers to third parties.
- **Strict-Transport-Security (HSTS)**:
  - `max-age=63072000; includeSubDomains; preload` enforces HTTPS and prevents SSL stripping or Man-in-the-Middle (MitM) attacks.
- **Permissions-Policy**:
  - Explicitly denies unauthorized access to device sensors and hardware: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`.
- **X-Permitted-Cross-Domain-Policies: none**:
  - Disallows Adobe Flash or PDF cross-domain document loading.

---

### 2. API Rate Limiting & Denial-of-Service (DoS) Protection
Implemented via [`apps/web/lib/rate-limiter.ts`](file:///C:/teja/coding/free-music/apps/web/lib/rate-limiter.ts):

- **Sliding-Window Rate Limiting**:
  - `/api/search`: 60 requests per minute per IP address.
  - `/api/lyrics`: 45 requests per minute per IP address.
  - `/api/video-id`: 45 requests per minute per IP address.
- **Automated Response Headers**:
  - Transmits standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
  - Upon exceeding thresholds, responds with HTTP `429 Too Many Requests` and a dynamic `Retry-After` header.
- **Memory Protection**:
  - Automatic sliding-window garbage collection cleans expired IP buckets every 5 minutes to prevent heap exhaustion.

---

### 3. Input Sanitization & Injection Defense
Implemented via [`apps/web/lib/security.ts`](file:///C:/teja/coding/free-music/apps/web/lib/security.ts):

- **XSS & Code Injection Neutralization**:
  - Strips null bytes (`\0`), control characters (ASCII 0–31), script tags (`<script>`), and pseudo-protocol URIs (`javascript:`, `data:text/html`).
- **Path Traversal & Command Injection**:
  - IDs (`albumId`, `artistId`, `playlistId`, `recommendSongId`) are strictly validated against `^[a-zA-Z0-9_\-\.]+$` and bounded to 64 characters. Any attempt containing `..`, `/`, or `\` is discarded.
- **ReDoS & Buffer Boundary Protection**:
  - Query parameters are truncated to safe bounds (max 150 characters) before any regular expression or NLP tokenization occurs.
- **Allowlist Parameter Enforcement**:
  - Search languages are validated against an allowlist of 11 recognized languages.
  - Search categories (`type`) are strictly constrained to `['songs', 'albums', 'artists', 'playlists']`.
  - Pagination `page` is clamped between 1 and 50 to prevent integer overflow or deep scraping attacks.

---

### 4. Client-Side Security & Data Isolation
- **IndexedDB Security**: Downloaded audio blobs are stored locally in the origin's isolated IndexedDB (`free_music_db`). Blobs are converted to temporary in-memory URLs (`URL.createObjectURL(blob)`) that cannot be read cross-origin.
- **State Recovery**: All `localStorage` deserialization is wrapped with exception handlers and validated against schema defaults to prevent application crashes from corrupted or injected client storage.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please DO NOT open a public GitHub issue. Instead, report it privately via GitHub Private Vulnerability Reporting or contact the maintainers directly.

Please include:
- A detailed description of the vulnerability and attack vector.
- Steps to reproduce or proof-of-concept payload.
- Potential impact on end-users or upstream services.

We will investigate within 24 hours and issue a coordinated fix.
