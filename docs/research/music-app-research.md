# Music App — Research Findings & Architecture Decisions

> Status: Verified research (all API tests run live on 2026-09-04)
> Goal: A free, ad-free music web app — Telugu-first (old classics → latest releases), multi-language selectable, with synced lyrics and audio/video toggle.

---

## 1. Product Requirements (as decided)

| Requirement | Decision |
|---|---|
| Audio | **Strictly no ads** — JioSaavn API + Echo-Music approach (YouTube Music via youtubei.js) |
| Video | Songs that have official videos → toggle audio ↔ video in the player |
| Lyrics | **Mandatory** — synced (time-stamped) lyrics, karaoke-style display |
| Languages | Telugu primary; user can switch to any available language (Hindi, Tamil, Kannada, Malayalam, etc.) |
| Song freshness | Must find songs minutes after release |
| Catalog depth | Very old songs (Ghantasala era) → today's latest |
| Cost | Free of cost, no account needed |
| UI | Stunning, custom-built |
| **Audio quality** | **Highest available, always** — pick 320kbps tier from JioSaavn `downloadUrl[]` (fallback to best available if 320 absent); never stream below the max tier when a higher one exists |
| **Video quality** | **Highest available** — YouTube embed auto-serves the maximum quality for the player size; render video mode in a large player surface so HD streams engage |
| **Package manager** | **pnpm only** — never npm or yarn, for every command (install, run, build, deploy tooling) |

---

## 2. Audio Sources (both used, both ad-free)

### 2.1 Primary: JioSaavn API (unofficial)

- **Repo:** https://github.com/sumitkolhe/jiosaavn-api (MIT license, 490★, 577 commits, actively maintained)
- **Docs:** https://saavn.dev/docs
- **Live instance tested:** `https://saavn.sumit.co` (official domain `saavn.dev` DNS currently failing; instance deployment is trivial on Vercel/Cloudflare Workers — free)
- **What it provides:** search (songs/albums/playlists/artists), song details, download URLs at 12kbps–320kbps, lyrics, artist images, play counts
- **Why it's ad-free:** we stream the raw CDN audio file directly (`https://aac.saavncdn.com/...mp4`). Ads are injected by official apps' players, not the audio files themselves.

**Verified live tests (2026-09-04):**

| Test | Result |
|---|---|
| Telugu catalog size | **30,849+ Telugu songs** via search |
| Stream quality | 320kbps AAC, `audio/mp4`, HTTP 200, 7.33 MB for a 3-min song |
| Old songs | "Kala Sivunte Kaladu" (Ghantasala-era classic, 2023 trap remix found), "Hai Hai" (SPB, 2000), "Abbanee" (Ilaiyaraaja, **1990**) — old catalog confirmed |
| Latest songs | "Yeshanagula (The Paradise)" (2026, Anirudh, 1M+ plays), "Yaalalo Yaalalo (Irumudi)" (2026, 1.4M plays) |
| 2024 blockbusters | Devara, Pushpa — found instantly |
| Freshness | Live proxy to JioSaavn's search backend (no caching) — new songs appear the moment labels upload them (typically at the announced release moment) |

**Key endpoints (tested):**

```
GET /api/search/songs?query=<query>&limit=<n>&page=<n>
GET /api/songs?ids=<id>[,<id>...]  → full details + downloadUrl[] (quality-tiered)  [NOTE: param is `ids`, plural, comma-separated — `id` singular returns 400]
GET /api/search/albums, /api/albums?id=...
GET /api/search/artists, /api/artists?id=...
GET /api/songs/{id}/lyrics             → plain lyrics when available
```

**Language filtering (verified):** the `language` query param is **NOT honored** by search — `query=love&language=telugu` returned Hindi/Punjabi songs too. Correct approach: fetch results then **client-side filter on `song.language`** (the field is present and reliable: `"telugu"`). Search terms in Telugu language context (e.g. "telugu hits") help but never replace the filter.

**Highest-quality selection rule (mandatory):** `downloadUrl[]` arrives as an array like `[{quality:"12kbps"},…,{quality:"320kbps"}]`. Always select the top tier present — typically `320kbps` — falling back down only when absent. Sort by parsed kbps, take max. Same rule applies when resolving a song by ID at play time (fresh URL fetch, since CDN URLs are per-request).

**Song object shape (verified):** id, name, year, duration, label, playCount, language (`"telugu"`), album{…}, artists.primary[]{…}, image[] (50x50→500x500), downloadUrl[{quality, url}].

### 2.2 Secondary: YouTube Music via youtubei.js (the "Echo-Music" approach)

- **Library:** https://github.com/LuanRT/YouTube.js — npm package `youtubei.js` (MIT, 5.3k★, 1,688 commits, maintained, works in Node + browsers)
- Echo-Music (Android) hand-rolled this same InnerTube protocol in Kotlin; `youtubei.js` is the equivalent, battle-tested web implementation.
- **Role in our app:**
  1. **Fallback audio** for songs not yet on JioSaavn (YouTube typically gets uploads first → fastest availability for brand-new releases)
  2. **Video discovery** — find the official video for each song
  3. Rich metadata (chips, related songs, radio/mix queues) if we want them later

**Verified live tests (2026-09-04):**

| Test | Result |
|---|---|
| YTM search (InnerTube `WEB_REMIX` client) | ✅ Works — "Pushpa 2 The Rule - Telugu" by Devi Sri Prasad + 16 video IDs returned |
| Raw stream extraction via InnerTube player endpoint | ❌ 400 Bad Request (Google tightened it — old public client configs rejected) |
| Public Piped instances | ❌ All dead/blocked (525/500/403) |
| Public Invidious instances | ❌ 403/timeout — Google blocks them |

**Conclusion:** use youtubei.js for **search + metadata** (verified working). For YouTube-side playback, use the **official YouTube embed player** (see §4) — do NOT depend on raw stream extraction or third-party proxy instances; they are unreliable and get blocked.

**Ads policy for audio:** JioSaavn streams = zero ads, guaranteed. YouTube-side audio, if ever used as fallback, must go through the embed player — which can carry YouTube's own ads on some videos. → **Rule: audio playback defaults to JioSaavn; YouTube audio only as metadata/video source. This keeps audio strictly ad-free.**

---

## 3. Lyrics (mandatory feature)

### 3.1 Primary: LRCLIB

- **API:** https://lrclib.net — free, public, no key required
- **Repo:** https://github.com/tranxuanthang/lrc-lib (used by Echo-Music too)

**Verified live test (2026-09-04):**
- Query "Pushpa Pushpa Devi Sri Prasad" → 20 results, first match: **"Pushpa Pushpa" — Nakash Aziz, Deepak Blue, Devi Sri Prasad & Viveka**, with BOTH `syncedLyrics` (LRC format, `[00:01.09]...` timestamps) and `plainLyrics` — **Telugu script synced lyrics confirmed working.**

**Endpoint:**
```
GET https://lrclib.net/api/search?track_name=<name>&artist_name=<artist>
GET https://lrclib.net/api/search?q=<free text>     (verified)
→ [{ trackName, artistName, albumName, duration, syncedLyrics, plainLyrics, ... }]
```

**Matching strategy:** search by track name + artist; validate duration within ±2s of the JioSaavn song duration to avoid wrong matches. Fall back progressively (track+artist → track only → q= free text → plain lyrics only → no lyrics state).

### 3.2 Fallback providers (in order)

1. **JioSaavn's own lyrics** (`/api/songs/{id}/lyrics`) — plain text only, good Telugu coverage; usable when LRC sync isn't needed
2. **Kugou lyrics API** (used by Echo-Music) — large Asian catalog, has timed lines; free
3. Graceful "lyrics unavailable" state

**Display:** karaoke-style — LRC parsed into `[timestamp, line]` pairs, current line highlighted/animated in sync with `audio.currentTime`, Telugu font rendering required (Noto Sans Telugu).

---

## 4. Video (audio ↔ video toggle)

- **Mechanism:** official **YouTube IFrame embed player** for the song's video ID (found via youtubei.js YTM search at playback time)
- **Toggle UX:** player bar has an Audio/Video switch; switching preserves playback position (seek the embed to `audio.currentTime` on switch, and vice versa)
- **Why embed only:** raw stream extraction (InnerTube player / Piped / Invidious) is unreliable — verified blocked/dead today; the official embed always works and is legally the "player" surface YouTube provides
- **Highest quality (mandatory):** use the IFrame API with `playsinline` and a large player surface (≥720p container). The embed auto-negotiates the highest quality YouTube serves for the player size + connection; container size directly unlocks HD tiers, so video mode renders big, never as a tiny corner widget.
- **Honest caveat:** YouTube may show its own ads on some embedded videos — that's YouTube's embed behavior, outside our control. Audio mode remains 100% ad-free always.
- Old Telugu songs: YouTube coverage of vintage Telugu film songs is excellent (massive classic uploads), so video availability is rarely a problem

---

## 5. CORS / Browser-Callability (critical for the prototype)

All tested with `Origin: http://localhost:5173` (2026-09-04):

| API | CORS | Browser-callable? |
|---|---|---|
| JioSaavn instance (`saavn.sumit.co`) | `Access-Control-Allow-Origin: *` | ✅ Yes — search, song resolve, streams all direct |
| JioSaavn CDN (`aac.saavncdn.com`) | media element, CORS not required for `<audio>` playback | ✅ Yes |
| LRCLIB (`lrclib.net`) | `Access-Control-Allow-Origin: *` | ✅ Yes — lyrics fetch direct from browser |
| YouTube Music InnerTube search | **403 on preflight** | ❌ No — must be proxied server-side or handled at build time |
| YouTube oEmbed (`youtube.com/oembed`) | `Access-Control-Allow-Origin: <origin>` (reflects requesting origin) | ✅ Yes — browser can fetch video **title/thumbnail** for a known video ID |

**Consequence for the standalone HTML prototype:** JioSaavn search + playback and LRCLIB lyrics work fully browser-side with zero backend. YouTube video IDs cannot be fetched from the browser directly — the prototype's video toggle will use a small, curated set of pre-verified Telugu video IDs (hardcoded) so video mode + position-sync can be designed and tested without a proxy. The React app will later proxy YTM search server-side (or self-hosted JioSaavn API instance doubles as the proxy).

---

## 6. Multi-language support

- JioSaavn song objects carry `language` (`telugu`, `hindi`, `tamil`, …) — filterable/searchable
- Language switcher in UI: Telugu (default) + all JioSaavn languages; home/charts re-query per language
- youtubei.js YTM search is language-agnostic — works for any Indian language
- LRCLIB is also language-agnostic (verified with Telugu)

---

## 7. Echo-Music — what we can and can't use

| Item | Usable? | Notes |
|---|---|---|
| Kotlin/Android code | ❌ | Native app modules; also **GPL-3.0** — we cannot copy code into our project |
| InnerTube strategy | ✅ | Reimplemented via MIT-licensed `youtubei.js` |
| LRCLIB integration | ✅ | Direct API, verified |
| Kugou provider | ✅ | Free API, fallback lyrics |
| Feature ideas | ✅ | Ideas aren't copyrightable — build our own: Listen Together (WebRTC/WebSocket sync), smart queue, crossfade, Spotify playlist import, share links (odesli/song.link style), sleep timer, data-saver quality tiers |
| Ad-free streaming claim | ✅ (their model) | Confirms approach is viable and long-lived (875★, active) |

---

## 8. Final Source Matrix

| Need | Source | Verified | Ads | Cost |
|---|---|---|---|---|
| Telugu audio (old→new) | JioSaavn API 320kbps CDN streams | ✅ 2026-09-04 | **None** | Free |
| New-release coverage / fallback | youtubei.js (YTM) search + metadata | ✅ 2026-09-04 | None (metadata) | Free |
| Video playback | YouTube official embed | ✅ (embeds always work) | Possible YT ads on some videos | Free |
| Synced lyrics | LRCLIB | ✅ 2026-09-04 (Telugu synced LRC) | None | Free |
| Lyrics fallbacks | JioSaavn lyrics API, Kugou | API exists | None | Free |
| Languages | JioSaavn `language` field + filters | ✅ | — | Free |

**Runtime pattern:**

```
Search (song name)
  ├─ JioSaavn search → song object (id, 320kbps URL, art, metadata, language)
  ├─ youtubei.js YTM search → videoId (for video toggle + fallback discovery)
  └─ LRCLIB search → synced LRC (validated by duration match)

Play:
  ├─ Audio mode → <audio> element → JioSaavn CDN stream (ad-free, guaranteed)
  ├─ Video mode → YouTube embed @ same timestamp
  └─ Lyrics → karaoke scroll synced to audio.currentTime
```

---

## 9. Risks & Caveats

1. **Unofficial APIs** — JioSaavn API and youtubei.js are unofficial. Fine for personal/learning use; public scale carries takedown/block risk. Mitigation: self-host the JioSaavn API instance (free on Vercel) so we're not dependent on someone else's deployment.
2. **saavn.dev DNS currently broken** — use `saavn.sumit.co` (verified) or self-host.
3. **InnerTube player endpoint blocked** — don't build on raw YouTube stream extraction; embed player is the stable path.
4. **YouTube ads in video mode** — unavoidable on some embeds; audio mode is the ad-free guarantee.
5. **Lyrics matching** — needs duration-validation logic to avoid wrong-song lyrics.
6. **Licensing** — we never host audio; we act as a client UI to public services (same legal stance Echo-Music documents).

---

## 10. Suggested Tech Stack (for the build phase)

- Vite + React 19 + TypeScript (same comfortable stack as before)
- **pnpm only** — no npm, no yarn, anywhere in the workflow
- Zustand for player/queue state; module singletons for per-frame data
- youtubei.js (client-side YTM search), direct fetch to JioSaavn instance
- YouTube IFrame API for video mode
- Noto Sans Telugu for lyric rendering; Framer Motion (or CSS) for UI polish
- Optional backend later: self-hosted JioSaavn API instance on Vercel free tier

---

## 11. Verification Log

| # | Date | Test | Result |
|---|---|---|---|
| 1 | 2026-09-04 | JioSaavn API search "telugu" | 200 OK, 30,849 results, language=telugu |
| 2 | 2026-09-04 | JioSaavn 320kbps stream HEAD request | 200 OK, audio/mp4, 7.33 MB |
| 3 | 2026-09-04 | Old songs (Ghantasala/SPB/Ilaiyaraaja 1990) | All found |
| 4 | 2026-09-04 | Latest 2026 Telugu releases | Found (The Paradise, Irumudi) |
| 5 | 2026-09-04 | InnerTube YTM search (WEB_REMIX) | Works — 16 video IDs, correct Telugu result |
| 6 | 2026-09-04 | InnerTube player endpoint (ANDROID/IOS/WEB clients) | 400 Bad Request — rejected |
| 7 | 2026-09-04 | Piped public instances ×3 | 525 / 500 / 403 — dead or blocked |
| 8 | 2026-09-04 | Invidious public instances ×4 | 403 / empty / timeout — dead |
| 9 | 2026-09-04 | LRCLIB search "Pushpa Pushpa" | Synced Telugu LRC lyrics returned |
| 10 | 2026-09-04 | Echo-Music repo review | GPL-3.0, Kotlin; services reusable, code not |
| 11 | 2026-09-04 | CORS preflight — JioSaavn instance | `Access-Control-Allow-Origin: *` — browser OK |
| 12 | 2026-09-04 | CORS preflight — LRCLIB | `Access-Control-Allow-Origin: *` — browser OK |
| 13 | 2026-09-04 | CORS preflight — YTM InnerTube search | 403 Forbidden — needs server-side proxy |
| 14 | 2026-09-04 | JioSaavn `language` query param on search | NOT honored — filter client-side on `song.language` field instead |
| 15 | 2026-09-04 | JioSaavn `GET /api/songs?ids=` (plural) | ✅ Works (singular `id=` returns 400) |
| 16 | 2026-09-04 | Search results carry full `downloadUrl[]` (12–320kbps) | ✅ — no extra resolve call needed at play time |
| 17 | 2026-09-04 | CORS — YouTube oEmbed | ✅ Reflects origin — video titles/thumbnails fetchable browser-side |
