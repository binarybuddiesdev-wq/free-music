---
name: ui-design-prototype
description: Use when designing or reviewing the Sangeet Music prototype UI — applies YTM/Spotify-grade design principles (8pt grid, density, hierarchy, proper sizing)
---

# UI Design Reference — Sangeet Music Prototype

## Design Foundations (installed)

**Design system used:**
- **Tailwind CSS v3 (Play CDN)** — utility-first CSS framework, loaded via `<script src="https://cdn.tailwindcss.com">`. Provides design tokens, spacing scale, color system, responsive utilities.
- **Custom CSS variables** — `--bg`, `--text`, `--grad`, etc. for brand colors.
- **8pt grid system** — all spacing values are multiples of 8 (8, 16, 24, 32, 40, 48).
- **Roboto** (UI font) + **Noto Sans Telugu** (script font).

**Reference patterns:** YouTube Music, Spotify, Apple Music.

## Hard Sizing Rules (the user was right — too big)

| Element | Width | Height | Notes |
|---|---|---|---|
| Sidebar | **220px** | full | Was 240px — too wide |
| Card (poster) | **160px** | 240px (3:2) | Was 200×300 — too big, reduced to 160×240 |
| Mood card | 90px circle | 90px | Tighter than before |
| Topbar | full | 56px | Was 64px |
| Player bar | full | 72px | Was 80px |
| Topbar avatar | 32px | 32px | Compact |

**Why these sizes:** match YTM/Spotify density — content should fill the viewport without scrolling endlessly to see a few cards.

## Layout Rules

1. **One language selector — in the sidebar only**, below user info. NEVER duplicate in the topbar.
2. **Sidebar contents (top to bottom):**
   - Hamburger + Music wordmark
   - Main nav: Home, Explore, Library, Upgrade
   - Language dropdown (compact, single source of truth)
   - "+ New playlist" button
   - Auto playlists: Liked songs, Recent
   - User playlists (Top Hits, Classics, Romantic, Mass Hits, Workout)
3. **Topbar contents:** just search (centered) + cast icon + avatar. Nothing else.
4. **Cards are clickable in their entirety** — no separate "more" button needed (whole card plays).
5. **Section header:** title left, "More" button right (decorative).

## Visual Hierarchy

- **Page bg:** `#0f0f0f` (YTM exact)
- **Card hover bg:** `#272727`
- **Title text:** `#fff`, 14-15px, weight 500
- **Subtitle text:** `#aaa`, 12-13px, weight 400
- **Subtle text:** `#717171`
- **Accent:** `#ff0000` (YouTube red) for play icon and active states
- **No gradients on card backgrounds** — let the album art be the color source

## Anti-Patterns to Avoid (learned from feedback)

- ❌ Don't put language chips in the topbar
- ❌ Don't make cards wider than 180px (feels oversized on laptops)
- ❌ Don't make sidebar wider than 240px
- ❌ Don't show the same song in multiple sections (global dedup by id + normalized name)
- ❌ Don't use a fixed-size avatar/icon — scale with sidebar collapse
- ❌ Don't use placeholder gradients where album art will appear — let art be visible
- ❌ Don't hide the play button until hover — YTM shows it on hover (this is OK, just match the pattern)

## What to Check Before Committing

- [ ] Cards ≤ 180px wide
- [ ] Sidebar ≤ 240px wide
- [ ] Language selector appears in EXACTLY ONE place (sidebar)
- [ ] No card content overflows on 1366×768 viewport
- [ ] All section carousels are scrollable, not page-scrollable
- [ ] Player bar fits on 1366px without wrapping
- [ ] Topbar is just search + cast + avatar
- [ ] Mood chips are decorative chips (not the language switcher)
