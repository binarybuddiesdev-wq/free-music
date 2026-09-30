# Specification: Production Readiness, Speed Optimization & System Resilience

## Overview
Transform the Free Music application into an enterprise-grade, high-performance streaming platform by implementing edge caching, bundle tree-shaking, DNS preconnects, query deduplication, error boundaries, route transition skeletons, health probes, SEO sitemaps/robots, OpenGraph metadata, and network state awareness.

---

## 1. Speed & Network Optimizations

### 1.1 HTTP Edge Cache Headers
- In `/api/search`, `/api/lyrics`, `/api/video-id`:
  - Attach `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` to valid responses.
  - Rate-limited responses (`429`) remain un-cached (`Cache-Control: no-store`).

### 1.2 Resource Hints (DNS Preconnect & Prefetch)
- In `apps/web/app/layout.tsx`:
  - Add `<link rel="preconnect" href="https://aac.saavncdn.com" crossOrigin="anonymous" />`
  - Add `<link rel="preconnect" href="https://c.saavncdn.com" crossOrigin="anonymous" />`
  - Add `<link rel="dns-prefetch" href="https://lrclib.net" />`

### 1.3 TanStack Query Efficiency
- In `apps/web/components/providers.tsx`:
  - Set `refetchOnWindowFocus: false` to eliminate redundant queries when users switch tabs.
  - Set `staleTime: 5 * 60 * 1000` (5 minutes).

### 1.4 Next.js Package Tree-Shaking
- In `apps/web/next.config.ts`:
  - Enable `experimental: { optimizePackageImports: ['lucide-react', '@dnd-kit/core', '@dnd-kit/sortable'] }` to eliminate barrel file parsing costs.

---

## 2. Production-Grade Resilience & Infrastructure

### 2.1 Global Error Boundary (`app/error.tsx` & `app/global-error.tsx`)
- Capture unexpected React runtime exceptions.
- Present a YouTube Music styled dark panel with error description and a "Try again" button that calls `reset()`.

### 2.2 Route Transition Skeleton (`app/loading.tsx`)
- Display an animated shimmering skeleton carousel while Next.js App Router chunks and server components resolve.

### 2.3 Health Check & Telemetry API (`app/api/health/route.ts`)
- Returns `status: "healthy"`, `timestamp: ISO string`, `uptime: process.uptime()`, `version: "0.1.0"`.

### 2.4 SEO & Social Metadata
- `app/robots.ts`: Allows crawler indexing on public routes (`/`, `/search`, `/explore`, `/library`), disallows `/api/`.
- `app/sitemap.ts`: Generates dynamic canonical URLs with priority and change frequencies.
- `app/layout.tsx`: Adds rich OpenGraph (`og:title`, `og:description`, `og:image`, `og:type`) and Twitter Card metadata.

### 2.5 Network Reconnection & Offline Toast
- In `apps/web/components/providers.tsx`:
  - Listen to `window.addEventListener('online')` and `window.addEventListener('offline')`.
  - Trigger toast notifications: *"You are offline — playing downloaded songs"* and *"Back online"*.
