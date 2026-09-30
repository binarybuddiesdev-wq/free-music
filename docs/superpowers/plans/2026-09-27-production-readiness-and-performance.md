# Implementation Plan: Production Readiness & Performance Optimization

## Phase 1: Speed & Network Performance
- [ ] Add Edge Cache Headers (`Cache-Control`) in `/api/search`, `/api/lyrics`, and `/api/video-id`.
- [ ] Configure `optimizePackageImports` in `next.config.ts`.
- [ ] Add DNS preconnects for JioSaavn CDN and LRCLIB in `app/layout.tsx`.
- [ ] Optimize React Query settings (`refetchOnWindowFocus: false`) in `components/providers.tsx`.

## Phase 2: Fault Tolerance & User Feedback
- [ ] Create `apps/web/app/error.tsx` (styled error boundary with reset).
- [ ] Create `apps/web/app/global-error.tsx`.
- [ ] Create `apps/web/app/loading.tsx` (route transition skeleton).
- [ ] Add online/offline event listeners and service worker update prompts in `providers.tsx`.

## Phase 3: Infrastructure, SEO & Social Discovery
- [ ] Implement `apps/web/app/api/health/route.ts`.
- [ ] Implement `apps/web/app/robots.ts`.
- [ ] Implement `apps/web/app/sitemap.ts`.
- [ ] Add OpenGraph and Twitter Card metadata in `apps/web/app/layout.tsx`.

## Phase 4: Verification & Automated Code Review
- [ ] Create `apps/web/lib/production.test.mjs` unit test suite covering health API, sitemap, robots, and edge cache headers.
- [ ] Run `pnpm --filter web test`.
- [ ] Run `pnpm --filter web lint`.
- [ ] Run `pnpm --filter web build`.
- [ ] Perform automated code review across all changes.
