# YouTube Music Clone — Design Spec

**Date:** 2026-09-04  
**Status:** Approved  
**Deploy target:** Vercel  
**Package manager:** pnpm only

---

## Goal

Build a full YouTube Music clone web app with:
- Zero-cost audio streaming (no audio ads)
- Video playback via YouTube IFrame (YouTube ads acceptable)
- UI that matches YouTube Music exactly
- All languages supported globally (Telugu default)
- Local-only state now, architected for future auth/database

---

## Section 1: Tech Stack & Project Structure

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | File-based routing, API routes for proxying, RSC for initial data |
| Language | TypeScript (strict) | Mandatory |
| Styling | Tailwind CSS v4 | YTM-exact dark theme, utility-first |
| State | Zustand v5 + persist middleware | Lightweight, no boilerplate, localStorage persistence |
| Data fetching | TanStack Query v5 | Caching, language-key invalidation, background refetch |
| Package manager | pnpm | Mandatory |
| Deployment | Vercel | Initial target |

### Project Structure

```
ytm-clone/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── layout.tsx              ← RootLayout: providers, audio singleton
│       │   ├── page.tsx                ← Home
│       │   ├── explore/page.tsx
│       │   ├── library/page.tsx
│       │   ├── search/page.tsx
│       │   ├── watch/page.tsx
│       │   └── api/
│       │       ├── search/route.ts     ← proxies JioSaavn
│       │       ├── songs/[id]/route.ts ← single song lookup
│       │       └── lyrics/route.ts     ← proxies LRCLib
│       ├── components/
│       │   ├── layout/                 ← Sidebar, Topbar, MiniPlayer, ExpandedPlayer
│       │   ├── player/                 ← ProgressBar, VolumeSlider, LikeButton, LyricsPanel, QueuePanel
│       │   ├── home/                   ← SectionRow, SongCard, MoodChip
│       │   └── ui/                     ← ContextMenu, SkeletonCard, Toast
│       ├── stores/
│       │   ├── player.store.ts
│       │   ├── queue.store.ts
│       │   ├── library.store.ts
│       │   └── settings.store.ts
│       ├── lib/
│       │   ├── saavn.ts                ← JioSaavn API client
│       │   ├── lrclib.ts               ← LRCLib lyrics client
│       │   ├── youtube.ts              ← YouTube Data API v3 video ID lookup
│       │   ├── languages.ts            ← all supported languages list
│       │   └── utils.ts
│       └── types/
│           └── music.ts                ← Song, Playlist, LyricLine types
├── package.json
└── pnpm-workspace.yaml
```

---

## Section 2: API Layer

### JioSaavn (audio source)

- **Base URL:** `https://saavn.sumit.co/api` (env var `JIOSAAVN_BASE_URL` — swappable to self-hosted)
- **No API key required**
- **All calls proxied through Next.js API routes** — browser never contacts JioSaavn directly (CORS fix)
- Key endpoints used:
  - `GET /search/songs?query=<q>&limit=40&page=<n>&lang=<lang>` — search + language filter
  - `GET /songs/<id>` — single song details
- Response normalized to internal `Song` type via `normalize()` in `lib/saavn.ts`
- `bestUrl(song)` picks highest kbps from `downloadUrl[]` array

### LRCLib (lyrics)

- **Base URL:** `https://lrclib.net/api`
- **No API key required**
- Three-attempt waterfall: `track_name + artist_name` → `track_name only` → `artist_name only`
- Returns synced LRC (with timestamps) or plain text fallback
- Cached by TanStack Query — fetched in background after song starts

### YouTube IFrame API (video playback)

- Client-side only, loaded lazily on first video mode entry
- Shows YouTube ads — acceptable per requirements
- Used for `/watch` route full-screen playback

### YouTube Data API v3 (video ID resolution)

- **Quota:** 10,000 units/day free
- Replaces prototype's hardcoded video ID map
- Query: `q=<song_title> <artist_name> official` → take first result's `videoId`
- Called from `lib/youtube.ts`, result cached in TanStack Query (never re-fetched for same song)
- Requires `YOUTUBE_API_KEY` env var

### Environment Variables

```env
JIOSAAVN_BASE_URL=https://saavn.sumit.co/api
YOUTUBE_API_KEY=<your_key>
```

---

## Section 3: State Management

### Stores

```ts
// player.store.ts
interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  mode: 'audio' | 'video'
  volume: number
  progress: number
  duration: number
  audioRef: RefObject<HTMLAudioElement> | null
  playSong: (song: Song, queue: Song[]) => void
  togglePlay: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setMode: (mode: 'audio' | 'video') => void
}

// queue.store.ts
interface QueueState {
  queue: Song[]
  qIndex: number
  shuffleOn: boolean
  repeatOn: boolean
  setQueue: (songs: Song[], startIndex: number) => void
  next: () => void
  prev: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  jumpTo: (index: number) => void
}

// library.store.ts — persisted to localStorage via Zustand persist middleware
interface LibraryState {
  likedSongs: Record<string, Song>
  history: Song[]           // max 200, most recent first
  playlists: Record<string, Playlist>
  toggleLike: (song: Song) => void
  isLiked: (id: string) => boolean
  addToHistory: (song: Song) => void
  createPlaylist: (name: string) => string
  addToPlaylist: (playlistId: string, song: Song) => void
}

// settings.store.ts — persisted
interface SettingsState {
  language: string          // any language code — open string, not a fixed union
  setLanguage: (lang: string) => void
}
```

### Language List

All languages in `lib/languages.ts` as a static array:

```ts
export const LANGUAGES = [
  { value: 'telugu',    label: 'తెలుగు',   english: 'Telugu' },
  { value: 'hindi',     label: 'हिन्दी',    english: 'Hindi' },
  { value: 'tamil',     label: 'தமிழ்',    english: 'Tamil' },
  { value: 'kannada',   label: 'ಕನ್ನಡ',    english: 'Kannada' },
  { value: 'malayalam', label: 'മലയാളം',   english: 'Malayalam' },
  { value: 'punjabi',   label: 'ਪੰਜਾਬੀ',   english: 'Punjabi' },
  { value: 'marathi',   label: 'मराठी',    english: 'Marathi' },
  { value: 'bengali',   label: 'বাংলা',    english: 'Bengali' },
  { value: 'gujarati',  label: 'ગુજરાતી',  english: 'Gujarati' },
  { value: 'odia',      label: 'ଓଡ଼ିଆ',    english: 'Odia' },
  { value: 'assamese',  label: 'অসমীয়া',  english: 'Assamese' },
  { value: 'urdu',      label: 'اردو',     english: 'Urdu' },
  { value: 'bhojpuri',  label: 'भोजपुरी',  english: 'Bhojpuri' },
  { value: 'english',   label: 'English',  english: 'English' },
]
// Default: 'telugu'
// Adding a new language = one line here, no code changes elsewhere
```

Language is part of every TanStack Query key. Changing language invalidates all home section queries and triggers refetch.

### StorageAdapter Pattern (future-proof)

```ts
interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}
```

`LocalStorageAdapter` ships now. `SupabaseAdapter` can replace it later for user accounts without touching any component code.

---

## Section 4: Pages & Routing

| Route | YTM Equivalent | Content |
|---|---|---|
| `/` | Home | Language-aware carousels: Listen again, New releases, Top charts, Moods & moments |
| `/explore` | Explore | Genre/mood grid, trending by language |
| `/search` | Search | Empty state with search prompt |
| `/search?q=<query>` | Search results | Songs, albums, artists tabs |
| `/watch?v=<videoId>` | Watch (video mode) | YouTube IFrame full-screen |
| `/library` | Library | Liked Songs, History, Your playlists |
| `/playlist/liked` | Liked Songs playlist | Ordered liked songs, playable as queue |

### Layout Hierarchy

```
app/layout.tsx        ← RootLayout: providers, audio singleton, Sidebar, Topbar, MiniPlayer
  ├── app/page.tsx
  ├── app/search/page.tsx
  ├── app/explore/page.tsx
  ├── app/library/page.tsx
  └── app/watch/page.tsx
```

### Key Routing Behaviors

- Sidebar stays mounted across all routes — no flash/unmount on navigation
- MiniPlayer stays mounted — queue survives navigation
- `/watch` is the expanded video view (not a modal — an actual route)
- Search uses `useSearchParams()` as a client component, debounced 300ms before TanStack Query fires

---

## Section 5: Player Architecture

### Three Visual States

```
MiniPlayer (72px, always visible)
  → click expand chevron → ExpandedPlayer overlay (slides up)
  → click video icon → mode = 'video', navigate to /watch
```

### Audio Pipeline

```
playSong(song, queue) called
  → audioRef.current.src = bestUrl(song)   ← highest kbps MP3
  → audioRef.current.play()
  → addToHistory(song)
  → background: fetch videoId via YouTube Data API v3 (TanStack Query, cached)
  → background: fetch lyrics via LRCLib (TanStack Query, cached, non-blocking)
```

Single `<audio>` element in RootLayout, ref stored in player store. Never unmounted — song change = `.src` swap.

### Audio ↔ Video Switching

- **Audio → Video:** `audioRef.pause()`, save `currentTime`, navigate `/watch?v=<videoId>`, YouTube IFrame `seekTo(savedTime)`
- **Video → Audio:** destroy IFrame, `audioRef.currentTime = savedTime`, `audioRef.play()`

### Queue & Playback Modes

- **Normal:** increment `qIndex`, play `queue[qIndex]`
- **Shuffle:** Fisher-Yates on queue copy at toggle time, `qIndex` resets to 0
- **Repeat one:** `audioRef.current.currentTime = 0; audioRef.current.play()`
- **Auto-advance:** `audio.addEventListener('ended', () => queue.next())`

### Lyrics Sync

- LRC parsed to `{ time: number; text: string }[]`
- `requestAnimationFrame` loop reads `audioRef.current.currentTime`
- Active line found by binary search, scrolled into view
- Falls back to plain text if no synced lyrics

---

## Section 6: UI Components

All matching YouTube Music exactly. UI fidelity is the top priority.

### Layout Components (`components/layout/`)

| Component | Description |
|---|---|
| `Sidebar` | 220px, Music wordmark + hamburger, nav links (Home/Explore/Library), language selector, collapse toggle |
| `Topbar` | Search bar (navigates to `/search?q=`), account avatar placeholder, theme toggle |
| `MiniPlayer` | 72px bottom bar: thumbnail, title/artist marquee, controls (prev/play/next), progress scrubber, volume, like button, audio/video toggle, expand chevron |
| `ExpandedPlayer` | Full overlay: large album art, song info, controls, lyrics panel (left), queue panel (right) |

### Home Components (`components/home/`)

| Component | Description |
|---|---|
| `SectionRow` | Section label + "See all" + horizontally scrollable carousel |
| `SongCard` | 160px wide, 2:3 poster art, title, artist, hover play button overlay |
| `MoodChip` | Pill button for mood/genre quick filter |

### Player Components (`components/player/`)

| Component | Description |
|---|---|
| `ProgressBar` | Click-to-seek, hover tooltip with timestamp |
| `VolumeSlider` | Mute toggle + range input |
| `LikeButton` | Heart icon, reads/writes library store, optimistic toggle |
| `AudioVideoToggle` | The ♪ / ▶ switcher pill matching YTM's style exactly |
| `LyricsPanel` | Scrolling synced lyrics, active line highlighted and centered |
| `QueuePanel` | List of upcoming songs, click to jump |

### UI Primitives (`components/ui/`)

| Component | Description |
|---|---|
| `ContextMenu` | Right-click on any song: Add to queue, Add to playlist, Like, Share |
| `SkeletonCard` | Loading placeholder matching SongCard dimensions |
| `Toast` | Bottom-right notifications (song liked, added to playlist) |

### Responsive Behavior

- Sidebar: full 220px on ≥1024px, icon-only on 768–1023px, hidden on mobile
- MiniPlayer always visible on all screen sizes
- Carousels: horizontal scroll with hidden scrollbar + keyboard arrow support
- Active nav link: `usePathname()` — no extra state needed

---

## Section 7: Data Flow

### Language Change

```
User picks language in Sidebar
  → settings.store.setLanguage('telugu')
  → All TanStack Query keys that include language are invalidated
  → Home carousels refetch: GET /api/search?q=<section_query>&lang=telugu
  → Next.js API route proxies to JioSaavn
  → SectionRows re-render with new Song[]
```

### Song Playback

```
User clicks SongCard
  → playSong(song, sectionSongs)
  → player.store: currentSong = song, isPlaying = true
  → queue.store: queue = sectionSongs, qIndex = card's index
  → audioRef.src = song.downloadUrl → audio plays immediately
  → library.store.addToHistory(song)
  → [background] fetch videoId (YouTube Data API v3, cached by song id)
  → [background] fetch lyrics (LRCLib, cached by song id)
```

### Search

```
User types in Topbar search
  → navigate /search?q=<term>
  → SearchPage debounces 300ms
  → TanStack Query: GET /api/search?q=<term>&lang=<language>
  → Results shown: Songs tab (default), Albums tab, Artists tab
  → Click any result → same playSong() flow
```

### Like / Unlike

```
User clicks LikeButton
  → library.store.toggleLike(song)    ← optimistic, no server call
  → Persisted to localStorage via Zustand persist
  → LikeButton and all instances reflecting this song update instantly
```

### Audio → Video Switch

```
User clicks AudioVideoToggle in MiniPlayer
  → player.store.setMode('video')
  → audioRef.pause(), save currentTime to store
  → navigate /watch?v=<videoId>
  → YouTube IFrame initializes, seekTo(savedTime)
  → Audio playback stopped
```

---

## Future-Proofing Notes

- `StorageAdapter` interface: swap `LocalStorageAdapter` for `SupabaseAdapter` when adding auth — no component changes
- `JIOSAAVN_BASE_URL` env var: point to self-hosted instance if the public API goes down
- `language: string` in settings: open type, not a union — new languages need only one line in `lib/languages.ts`
- YouTube IFrame loaded lazily: no impact on page load for users who never use video mode
- TanStack Query keys include language: switching language always fetches fresh content, no stale cache bugs
