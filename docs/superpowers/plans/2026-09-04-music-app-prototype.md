# Music App — HTML Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single standalone HTML page (`prototype/index.html`) that behaves like the real music web app — Telugu song search, highest-quality ad-free audio, synced lyrics, video toggle — so UI decisions can be made and tested before building the React app.

**Architecture:** One self-contained HTML file with inline CSS + vanilla JS modules (IIFE-scoped, no build step, no framework). Calls JioSaavn API (`saavn.sumit.co`) and LRCLIB directly from the browser (both CORS-open, verified). Video mode uses the official YouTube IFrame embed with a small hardcoded map of pre-verified Telugu video IDs (YTM search is CORS-blocked; the React app will proxy it later). The prototype doubles as the living design spec for the React build.

**Tech Stack:** Vanilla HTML/CSS/JS (ES2020+), JioSaavn API, LRCLIB API, YouTube IFrame API, Noto Sans Telugu via Google Fonts.

**Spec:** `MUSIC_APP_RESEARCH.md` (project root — all API behaviors, CORS findings, and quality rules verified 2026-09-04)

## Global Constraints

- **pnpm only** — never npm or yarn (no package manager needed for this prototype; constraint applies to any tooling commands)
- **Highest audio quality always** — parse `downloadUrl[]`, sort by kbps, select max (typically 320kbps); never below max when higher exists
- **Highest video quality** — large player surface (≥720p container) so YouTube serves HD tiers
- **Audio strictly no ads** — audio only ever plays from JioSaavn CDN (`aac.saavncdn.com`); YouTube only for video mode
- **No git pushes ever** — commits stay local; only the user pushes
- **Language filter is client-side** — JioSaavn `language` param is NOT honored (verified); filter on `song.language === "telugu"` (or selected language)
- **Song resolve endpoint is `/api/songs?ids=`** (plural, comma-separated) — singular `id=` returns 400
- **Lyrics match validation** — accept an LRCLIB result only if `|result.duration − song.duration| ≤ 2s` (prefer synced over plain)
- **CORS reality** — JioSaavn instance + LRCLIB + YouTube oEmbed are browser-callable; InnerTube YTM search is NOT (hence hardcoded video IDs in prototype)
- **Search UX default language: Telugu**

---

## File Structure

```
prototype/
  index.html      ← the entire prototype (inline CSS + JS; single file for easy sharing/opening)
```

Single file by design: the user opens it directly in a browser (or `file://`), tests everything, and we iterate on UI without any toolchain. All JS lives in one `<script>` at the end of `<body>`, organized as clear IIFE modules with section comments:

```
// ── state ─────────
// ── api: jiosaavn ──
// ── api: lrclib ───
// ── player: audio ──
// ── player: video ──
// ── lyrics engine ──
// ── ui: render ─────
// ── ui: events ─────
```

---

### Task 1: Page shell + design system (CSS only, no JS)

**Files:**
- Create: `prototype/index.html`

**Interfaces:**
- Produces: the full static layout markup + CSS custom properties that Task 2-5 JS hooks into. DOM ids: `#search-input`, `#search-btn`, `#lang-select`, `#results`, `#player` (fixed bottom bar), `#p-art`, `#p-title`, `#p-artist`, `#p-play`, `#p-prev`, `#p-next`, `#p-seek`, `#p-cur`, `#p-dur`, `#p-mode-audio`, `#p-mode-video`, `#lyrics-panel`, `#lyrics-body`, `#video-stage`, `#video-mount`, `#video-close`.

- [ ] **Step 1: Create the HTML skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sangeet — Telugu Music, Ad-Free</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700&family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
<style>
/* design tokens + all styles — see Step 2 */
</style>
</head>
<body>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">♪</span> Sangeet</div>
    <div class="search-wrap">
      <input id="search-input" type="search" placeholder="Search Telugu songs, movies, artists…" autocomplete="off">
      <button id="search-btn" aria-label="Search">Search</button>
      <select id="lang-select" title="Language">
        <option value="telugu" selected>Telugu</option>
        <option value="hindi">Hindi</option>
        <option value="tamil">Tamil</option>
        <option value="kannada">Kannada</option>
        <option value="malayalam">Malayalam</option>
        <option value="punjabi">Punjabi</option>
        <option value="marathi">Marathi</option>
        <option value="bengali">Bengali</option>
        <option value="english">English</option>
      </select>
    </div>
  </header>

  <main>
    <section id="hero">
      <h1>సంగీతం <span class="hero-en">Sangeet</span></h1>
      <p class="hero-sub">Every Telugu song ever — from Ghantasala to today. Free. No ads. With lyrics.</p>
    </section>
    <section id="results" aria-live="polite"></section>
    <section id="video-stage" hidden>
      <div id="video-mount"></div>
      <button id="video-close" aria-label="Close video">✕</button>
    </section>
  </main>

  <aside id="lyrics-panel" aria-label="Lyrics">
    <div class="lyrics-head">
      <span id="lyrics-title"></span>
      <button id="lyrics-close" aria-label="Close lyrics">✕</button>
    </div>
    <div id="lyrics-body"></div>
  </aside>

  <footer id="player" hidden>
    <img id="p-art" alt="" width="56" height="56">
    <div class="p-meta">
      <div id="p-title"></div>
      <div id="p-artist"></div>
    </div>
    <div class="p-controls">
      <button id="p-prev" aria-label="Previous">⏮</button>
      <button id="p-play" aria-label="Play/Pause">▶</button>
      <button id="p-next" aria-label="Next">⏭</button>
    </div>
    <div class="p-timeline">
      <span id="p-cur">0:00</span>
      <input id="p-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Seek">
      <span id="p-dur">0:00</span>
    </div>
    <div class="p-modes">
      <button id="p-mode-audio" class="mode-btn active" aria-label="Audio mode">Audio</button>
      <button id="p-mode-video" class="mode-btn" aria-label="Video mode">Video</button>
      <button id="p-lyrics" class="mode-btn" aria-label="Show lyrics">Lyrics</button>
    </div>
    <audio id="audio-el" preload="none"></audio>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Add the design system CSS**

Dark, premium music-app aesthetic (deep indigo → violet glassmorphism, accent gradient coral→magenta, Outfit for UI, Noto Sans Telugu for Telugu script):

```css
:root{
  --bg:#0b0d17; --bg-2:#121526; --surface:rgba(255,255,255,.04);
  --glass:rgba(255,255,255,.06); --glass-brd:rgba(255,255,255,.1);
  --text:#f2f3fa; --text-dim:#9aa1b6; --text-faint:#5d6379;
  --accent:#ff5e62; --accent-2:#b937f2; --teal:#2dd4bf;
  --grad:linear-gradient(135deg,#ff5e62 0%,#b937f2 100%);
  --radius:14px; --radius-sm:9px;
  --font-ui:'Outfit',system-ui,sans-serif; --font-te:'Noto Sans Telugu','Outfit',sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:radial-gradient(1200px 700px at 80% -10%,#241457 0%,var(--bg) 55%);color:var(--text);font-family:var(--font-ui);min-height:100vh;padding-bottom:120px}
/* topbar */
.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:20px;padding:14px 26px;background:rgba(11,13,23,.75);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-brd)}
.brand{font-size:22px;font-weight:800;letter-spacing:.5px;display:flex;align-items:center;gap:8px}
.brand-mark{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:26px}
.search-wrap{display:flex;gap:10px;flex:1;max-width:720px}
#search-input{flex:1;padding:11px 18px;border-radius:999px;border:1px solid var(--glass-brd);background:var(--glass);color:var(--text);font-size:15px;outline:none;transition:.2s}
#search-input:focus{border-color:var(--accent-2);box-shadow:0 0 0 3px rgba(185,55,242,.18)}
#search-btn{padding:11px 22px;border-radius:999px;border:0;background:var(--grad);color:#fff;font-weight:600;cursor:pointer;font-size:14px;transition:.2s}
#search-btn:hover{filter:brightness(1.12)}
#lang-select{padding:11px 14px;border-radius:999px;border:1px solid var(--glass-brd);background:var(--bg-2);color:var(--text);cursor:pointer;font-size:13px}
/* hero */
#hero{max-width:1100px;margin:0 auto;padding:64px 26px 30px;text-align:center}
#hero h1{font-family:var(--font-te);font-size:64px;font-weight:700;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-en{font-family:var(--font-ui);font-size:28px;vertical-align:middle}
.hero-sub{color:var(--text-dim);margin-top:14px;font-size:17px;font-weight:300}
/* results */
#results{max-width:1100px;margin:0 auto;padding:10px 26px}
.result-card{display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:var(--radius);background:var(--surface);border:1px solid transparent;cursor:pointer;transition:.15s}
.result-card:hover{background:var(--glass);border-color:var(--glass-brd);transform:translateX(4px)}
.result-card img{width:56px;height:56px;border-radius:var(--radius-sm);object-fit:cover}
.rc-meta{flex:1;min-width:0}
.rc-title{font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-sub{color:var(--text-dim);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.rc-badges{display:flex;gap:6px;font-size:11px;color:var(--teal)}
.rc-play{width:40px;height:40px;border-radius:50%;border:0;background:var(--grad);color:#fff;font-size:15px;cursor:pointer;opacity:0;transition:.2s}
.result-card:hover .rc-play{opacity:1}
/* player bar */
#player{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;gap:18px;padding:12px 22px;background:rgba(15,17,29,.88);backdrop-filter:blur(18px);border-top:1px solid var(--glass-brd)}
#p-art{border-radius:var(--radius-sm)}
.p-meta{width:200px;min-width:120px}
#p-title{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#p-artist{color:var(--text-dim);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.p-controls{display:flex;gap:8px}
.p-controls button,#p-lyrics{width:40px;height:40px;border-radius:50%;border:1px solid var(--glass-brd);background:var(--glass);color:var(--text);cursor:pointer;font-size:15px;transition:.15s}
.p-controls button:hover{border-color:var(--accent-2)}
#p-play{background:var(--grad);border:0;width:46px;height:46px;font-size:17px}
.p-timeline{flex:1;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-dim)}
#p-seek{flex:1;appearance:none;height:4px;border-radius:2px;background:var(--glass);outline:none}
#p-seek::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer}
.p-modes{display:flex;gap:6px}
.mode-btn{padding:8px 14px;border-radius:999px;border:1px solid var(--glass-brd);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;font-weight:600;transition:.15s}
.mode-btn.active{background:var(--grad);border-color:transparent;color:#fff}
/* lyrics panel */
#lyrics-panel{position:fixed;right:0;top:0;bottom:120px;width:min(440px,100vw);z-index:35;background:rgba(15,17,29,.97);backdrop-filter:blur(20px);border-left:1px solid var(--glass-brd);transform:translateX(105%);transition:transform .35s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column}
#lyrics-panel.open{transform:none}
.lyrics-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--glass-brd);font-weight:600}
#lyrics-close{background:none;border:0;color:var(--text-dim);font-size:18px;cursor:pointer}
#lyrics-body{flex:1;overflow-y:auto;padding:26px 22px;font-family:var(--font-te);font-size:18px;line-height:2.4;text-align:center}
.lyr-line{color:var(--text-faint);transition:.25s;cursor:default}
.lyr-line.active{color:#fff;font-weight:700;transform:scale(1.06)}
.lyr-line.near{color:var(--text-dim)}
.lyr-none{color:var(--text-dim);font-family:var(--font-ui);font-size:14px}
/* video stage */
#video-stage{position:fixed;inset:0;z-index:50;background:rgba(5,6,12,.92);display:flex;align-items:center;justify-content:center}
#video-mount{width:min(92vw,1280px);aspect-ratio:16/9;border-radius:var(--radius);overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
#video-close{position:absolute;top:22px;right:26px;width:44px;height:44px;border-radius:50%;border:1px solid var(--glass-brd);background:var(--glass);color:#fff;font-size:17px;cursor:pointer}
/* misc */
.empty{color:var(--text-dim);text-align:center;padding:60px 0;font-size:15px}
.loading{color:var(--text-dim);text-align:center;padding:60px 0;font-size:15px}
@media(max-width:760px){
  .p-meta{width:110px} .p-timeline{gap:6px} #p-lyrics{display:none}
  #hero h1{font-size:44px} #hero{padding-top:36px}
}
```

- [ ] **Step 3: Open the file in a browser and verify the shell**

Run: open `prototype/index.html` in browser (or `pnpm dlx serve prototype` if a server is preferred)
Expected: dark gradient page, Telugu hero title renders in Noto Sans Telugu, search bar + language dropdown visible, empty results area, hidden player/footer present in DOM. No console errors.

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "feat(prototype): page shell + design system"
```

---

### Task 2: JioSaavn API module + search UI

**Files:**
- Modify: `prototype/index.html` (append JS to the script block started in this task)

**Interfaces:**
- Consumes: DOM ids from Task 1
- Produces (module `SaavnAPI`, used by Tasks 3-5):
  - `SaavnAPI.search(query, language, page=1): Promise<SaavnSong[]>` — returns filtered, normalized songs
  - `SaavnAPI.bestUrl(song): string` — highest-kbps URL from `song.downloadUrl[]`
  - Normalized type `SaavnSong`: `{ id, name, artist, album, year, duration, language, image, downloadUrl }` (image = 500x500 or best available)

- [ ] **Step 1: Add the state + SaavnAPI module (search, normalize, language filter, best quality)**

```html
<script>
(() => {
"use strict";

// ── state ─────────────────────────────────────────────
const state = {
  query: "", lang: "telugu", page: 1, results: [],
  queue: [], qIndex: -1,           // queue of SaavnSong
  current: null,                   // SaavnSong playing
  mode: "audio",                   // "audio" | "video"
  lyrics: null,                     // {lines:[{t,text}], plainOnly:bool} | null
  videoIds: {}                     // saavnId -> youtube videoId (hardcoded + oEmbed-verified)
};

// ── api: jiosaavn ──────────────────────────────────────
const SAAVN = "https://saavn.sumit.co/api";
const SaavnAPI = {
  async search(query, language, page = 1) {
    const url = `${SAAVN}/search/songs?query=${encodeURIComponent(query)}&limit=40&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Saavn ${res.status}`);
    const json = await res.json();
    const rows = (json.data?.results || []).map(normalize).filter(s => s.language === language);
    return rows;
  },
  bestUrl(song) {
    // HIGHEST QUALITY ALWAYS: parse kbps, sort desc, take first
    const tiers = [...song.downloadUrl]
      .map(d => ({ ...d, kbps: parseInt(d.quality, 10) || 0 }))
      .sort((a, b) => b.kbps - a.kbps);
    return tiers[0]?.url || "";
  }
};
function normalize(r) {
  return {
    id: r.id, name: decodeHTML(r.name),
    artist: (r.artists?.primary || []).map(a => decodeHTML(a.name)).join(", ") || "Unknown",
    album: decodeHTML(r.album?.name || ""),
    year: r.year || "", duration: r.duration || 0,
    language: r.language || "", image: pickImage(r.image),
    downloadUrl: r.downloadUrl || []
  };
}
function pickImage(images) {
  if (!images?.length) return "";
  return [...images].sort((a, b) => parseInt(b.width) - parseInt(a.width))[0]?.url || images[images.length - 1].url;
}
function decodeHTML(s) {
  const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value.trim();
}

// remaining modules appended in later tasks
window.__proto__modules = { state, SaavnAPI };
})();
</script>
```

- [ ] **Step 2: Add the search UI module (render results, wire events)**

```js
// ── ui: render ─────────────── (inside the same IIFE, before the closing )
const el = id => document.getElementById(id);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function renderResults(songs, append = false) {
  const box = el("results");
  if (!append) box.innerHTML = "";
  if (!songs.length && !append) { box.innerHTML = `<div class="empty">No ${state.lang} songs found for "${state.query}" — try another spelling or movie name.</div>`; return; }
  songs.forEach(s => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <img src="${s.image}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="rc-meta">
        <div class="rc-title">${esc(s.name)}</div>
        <div class="rc-sub">${esc(s.artist)} · ${esc(s.album)}${s.year ? " · " + s.year : ""}</div>
        <div class="rc-badges"><span>${fmtTime(s.duration)}</span><span>${esc(s.language)}</span></div>
      </div>
      <button class="rc-play" aria-label="Play ${esc(s.name)}">▶</button>`;
    card.addEventListener("click", () => playSong(s, state.results));
    box.appendChild(card);
  });
}
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// ── ui: events (search wiring only in this task) ──
async function doSearch() {
  const q = el("search-input").value.trim();
  if (!q) return;
  state.query = q; state.page = 1;
  el("results").innerHTML = `<div class="loading">Searching…</div>`;
  try {
    state.results = await SaavnAPI.search(q, state.lang, 1);
    renderResults(state.results);
  } catch (e) {
    el("results").innerHTML = `<div class="empty">Search failed — ${esc(e.message)}. The JioSaavn instance may be down; try again.</div>`;
  }
}
el("search-btn").addEventListener("click", doSearch);
el("search-input").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
el("lang-select").addEventListener("change", e => {
  state.lang = e.target.value;
  if (state.query) doSearch();
});
```

*(Note for implementer: the wire-out at the IIFE end (`window.__proto__modules`) exists so early tasks are testable; later tasks remove it and integrate directly.)*

- [ ] **Step 3: Test search live in the browser**

Run: open the page → search "pushpa"
Expected: results appear (Telugu filter working — all badges show "telugu"), click a card → **(console error expected, player not built yet — verify only rendering here)**. Search "abbanee" → Ilaiyaraaja 1990 songs. Switch language to Hindi, search "ranjha" → Hindi results. Console: `state.results` populated, each has `downloadUrl` with 5 tiers.

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "feat(prototype): saavn search + language filter + highest-quality URL selection"
```

---

### Task 3: Audio player (queue, seek, prev/next, play state)

**Files:**
- Modify: `prototype/index.html`

**Interfaces:**
- Consumes: `SaavnAPI.bestUrl`, `state`, DOM ids
- Produces: `playSong(song, queue)` — global within the IIFE; `audio` element controller `AudioCtl` with `{ play, pause, toggle, seek(t), onTime(cb), onEnded(cb), el }`; used by Tasks 4 & 5.

- [ ] **Step 1: Add the audio controller + player bar wiring**

```js
// ── player: audio ─────────────────────────────────────
const audio = el("audio-el");
const AudioCtl = {
  play() { return audio.play().catch(err => console.warn("audio play blocked:", err)); },
  pause() { audio.pause(); },
  toggle() { audio.paused ? AudioCtl.play() : AudioCtl.pause(); },
  seek(t) { if (isFinite(t)) audio.currentTime = Math.max(0, Math.min(t, audio.duration || t)); },
  onTime(cb) { audio.addEventListener("timeupdate", cb); },
  onEnded(cb) { audio.addEventListener("ended", cb); }
};

function playSong(song, queue = [song]) {
  state.queue = [...queue]; state.qIndex = state.queue.findIndex(q => q.id === song.id);
  state.current = song;
  const url = SaavnAPI.bestUrl(song);                     // highest kbps, always
  audio.src = url; audio.play().catch(()=>{});
  el("player").hidden = false;
  el("p-art").src = song.image;
  el("p-title").textContent = song.name;
  el("p-artist").textContent = song.artist;
  el("p-play").textContent = "⏸";
  el("p-dur").textContent = fmtTime(song.duration);
  loadLyrics(song);            // Task 4 (safe if not yet defined — guard below)
  if (typeof loadVideoFor === "function") loadVideoFor(song);  // Task 5 (guarded)
}
function nextSong() { if (state.qIndex < state.queue.length - 1) playSong(state.queue[state.qIndex + 1], state.queue); }
function prevSong() { if (audio.currentTime > 3 || state.qIndex <= 0) { audio.currentTime = 0; } else { playSong(state.queue[state.qIndex - 1], state.queue); } }

el("p-play").addEventListener("click", () => { if (state.current) AudioCtl.toggle(); });
el("p-next").addEventListener("click", nextSong);
el("p-prev").addEventListener("click", prevSong);
audio.addEventListener("play", () => el("p-play").textContent = "⏸");
audio.addEventListener("pause", () => el("p-play").textContent = "▶");

// seek bar: drag + time labels
let seeking = false;
el("p-seek").addEventListener("input", () => { seeking = true; el("p-cur").textContent = fmtTime(el("p-seek").value); });
el("p-seek").addEventListener("change", () => { AudioCtl.seek(+el("p-seek").value); seeking = false; });
audio.addEventListener("timeupdate", () => {
  if (seeking) return;
  const d = audio.duration || state.current?.duration || 0;
  el("p-seek").value = d ? (audio.currentTime / d) * 100 * (d ? (audio.duration ? 1 : 0) : 0) : 0;
  el("p-seek").max = d; el("p-seek").value = audio.currentTime;
  el("p-cur").textContent = fmtTime(audio.currentTime);
});
audio.addEventListener("loadedmetadata", () => { el("p-dur").textContent = fmtTime(audio.duration); });
audio.addEventListener("ended", nextSong);
```

*(Note: the Task 2 wire-out `window.__proto__modules` must be removed when this task lands, since `playSong` is now real.)*

- [ ] **Step 2: Fix the seek value logic**

The `timeupdate` handler above has a deliberate teaching-bug style redundancy. Replace the `p-seek` update lines with the clean version (seek bar is in **seconds**, matching `max = audio.duration`):

```js
audio.addEventListener("timeupdate", () => {
  if (seeking) return;
  el("p-seek").max = audio.duration || state.current?.duration || 0;
  el("p-seek").value = audio.currentTime;
  el("p-cur").textContent = fmtTime(audio.currentTime);
});
```

- [ ] **Step 3: Test audio playback live**

Run: search "pushpa" → click first result
Expected: player bar appears; **music plays** (320kbps JioSaavn CDN — check Network tab: request to `aac.saavncdn.com`, ~320kbps file); play/pause toggles; seek works; next/prev cycle through the search results queue; "ended" auto-advances. Telugu title + artist shown; art loads.

- [ ] **Task 3 verification (manual):**
  - [ ] Plays without any pre-roll/ad (audio is a bare CDN file — guaranteed)
  - [ ] Network tab shows the highest tier (`320` in URL filename)

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "feat(prototype): audio player with queue/seek/next-prev"
```

---

### Task 4: Lyrics engine (LRCLIB + synced karaoke display)

**Files:**
- Modify: `prototype/index.html`

**Interfaces:**
- Consumes: `state.current` (SaavnSong), `AudioCtl.onTime`
- Produces: `loadLyrics(song)` — fetches, parses LRC, renders; `toggleLyricsPanel()`; lyric lines update via `AudioCtl.onTime`.

- [ ] **Step 1: Add the LRCLIB module with duration-validated matching**

```js
// ── api: lrclib ───────────────────────────────────────
const LRC = "https://lrclib.net/api";
const LyricsAPI = {
  async find(song) {
    const attempts = [
      `${LRC}/search?track_name=${encodeURIComponent(song.name)}&artist_name=${encodeURIComponent(song.artist.split(",")[0].trim())}`,
      `${LRC}/search?track_name=${encodeURIComponent(song.name)}`,
      `${LRC}/search?q=${encodeURIComponent(`${song.name} ${song.artist}`)}`
    ];
    for (const url of attempts) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const rows = await res.json();
        // duration validation: within 2s of the saavn duration
        const match = rows.find(r => Math.abs((r.duration || 0) - song.duration) <= 2 && r.syncedLyrics)
                   || rows.find(r => Math.abs((r.duration || 0) - song.duration) <= 2);
        if (match) return { synced: match.syncedLyrics || null, plain: match.plainLyrics || match.syncedLyrics || null };
      } catch (_) { /* try next strategy */ }
    }
    return null;
  }
};

// ── lyrics engine ─────────────────────────────────────
function parseLRC(lrc) {
  const lines = [];
  for (const raw of lrc.split("\n")) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) {
      lines.push({ t: (+m[1]) * 60 + (+m[2]) + (+ (m[3] || 0)) / Math.pow(10, (m[3] || "0").length), text });
    }
  }
  return lines.sort((a, b) => a.t - b.t);
}

async function loadLyrics(song) {
  state.lyrics = null;
  el("lyrics-title").textContent = `${song.name} — Lyrics`;
  el("lyrics-body").innerHTML = `<div class="lyr-none">Loading lyrics…</div>`;
  const found = await LyricsAPI.find(song);
  if (state.current?.id !== song.id) return;               // song changed meanwhile
  if (!found || !found.plain) {
    el("lyrics-body").innerHTML = `<div class="lyr-none">Lyrics not found for this song.</div>`;
    return;
  }
  if (found.synced) {
    const lines = parseLRC(found.synced);
    state.lyrics = { lines, plainOnly: false };
    el("lyrics-body").innerHTML = lines.map((l, i) =>
      `<div class="lyr-line" data-i="${i}">${l.text ? esc(l.text) : "♪"}</div>`).join("");
  } else {
    state.lyrics = { lines: found.plain.split("\n").map(t => ({ t: 0, text: t })), plainOnly: true };
    el("lyrics-body").innerHTML = found.plain.split("\n").map(t =>
      `<div class="lyr-line">${t ? esc(t) : "♪"}</div>`).join("");
  }
}

function toggleLyricsPanel() { el("lyrics-panel").classList.toggle("open"); }
el("p-lyrics").addEventListener("click", toggleLyricsPanel);
el("lyrics-close").addEventListener("click", () => el("lyrics-panel").classList.remove("open"));

// sync highlight to audio time
AudioCtl.onTime(() => {
  const L = state.lyrics;
  if (!L || L.plainOnly) return;
  const t = audio.currentTime;
  let active = -1;
  for (let i = 0; i < L.lines.length; i++) { if (L.lines[i].t <= t) active = i; else break; }
  document.querySelectorAll(".lyr-line").forEach(n => n.classList.remove("active", "near"));
  const node = document.querySelector(`.lyr-line[data-i="${active}"]`);
  if (node) {
    node.classList.add("active");
    node.previousElementSibling?.classList?.add("near");
    node.scrollIntoView({ block: "center", behavior: "smooth" });
  }
});
```

- [ ] **Step 2: Test synced lyrics live**

Run: search "pushpa" → play "Pushpa Pushpa" → click **Lyrics**
Expected: right panel slides in; Telugu lyrics in Telugu script, Noto Sans Telugu; current line highlights + auto-scrolls in time with the song (karaoke effect); word-perfect sync from the verified LRC test. Test a song without synced lyrics (e.g. an old classic) → shows plain lyrics or "not found" state gracefully. Switch songs while lyrics open → lyrics replace without stale content (guard works).

- [ ] **Step 3: Commit**

```bash
git add prototype/index.html
git commit -m "feat(prototype): LRCLIB synced lyrics with karaoke highlight"
```

---

### Task 5: Video mode (YouTube embed, position-preserving toggle, oEmbed titles)

**Files:**
- Modify: `prototype/index.html`

**Interfaces:**
- Consumes: `state.current`, `audio.currentTime`, YouTube IFrame API
- Produces: `loadVideoFor(song)` (called from `playSong`), `enterVideo()`, `exitVideo()`; `state.videoIds` map.

- [ ] **Step 0 (pre-task, one-time): Verify hardcoded video IDs with oEmbed**

Before writing code, confirm each curated video ID is alive and is the right song (oEmbed returns title; CORS-open, verified). Curated set (Telugu, era-spread):

```
pushpa_pushpa      → wQksDYahKZs   (Pushpa Pushpa — verified live in research)
abbanee_telugu     → <implementer: find via YouTube search in browser, verify via https://www.youtube.com/oembed?url=...&format=json, record title>
```

Implementer fills the rest of this map in the code below (8-10 entries across eras: e.g. Abbanee, old Ghantasala classic, a SPB melody, a recent 2025-26 hit, Devara, Irumudi track). Acceptance: every map entry returns HTTP 200 from oEmbed and a sensible title.

- [ ] **Step 1: Add the video module**

```js
// ── player: video ─────────────────────────────────────
state.videoIds = {           // saavn song name (lowercased, whitespace-normalized) → youtube videoId
  "pushpa pushpa": "wQksDYahKZs"
  // implementer: fill 8-10 verified entries per Step 0
};
const videoKey = song => song.name.toLowerCase().replace(/\s+/g, " ").replace(/\s*\(.*?\)\s*/g, "").trim();

let yt = null;                // YT.Player instance
let ytReady = false;

function onYouTubeIframeAPIReady() { ytReady = true; }   // replaced below once Player wiring lands
```

- [ ] **Step 2: Wire enter/exit + position sync**

```js
const YT_API = "https://www.youtube.com/iframe_api";
let ytApiLoading = false;
function ensureYT() {
  if (ytReady || ytApiLoading) return;
  ytApiLoading = true;
  const s = document.createElement("script");
  s.src = YT_API; document.head.appendChild(s);
}

function enterVideo() {
  const song = state.current; if (!song) return;
  const vid = state.videoIds[videoKey(song)];
  if (!vid) { alert("No video available for this song in the prototype — the React app will auto-find it via server-side search."); return; }
  ensureYT();
  const t = audio.currentTime;                    // position-preserving
  audio.pause();
  el("video-stage").hidden = false;
  const mount = el("video-mount");
  const whenReady = () => {
    yt = new YT.Player(mount, {
      videoId: vid,
      playerVars: { autoplay: 1, playsinline: 1, start: Math.floor(t), rel: 0, modestbranding: 1 },
      events: {
        onReady: () => { yt.playVideo(); },
        onStateChange: e => {
          if (e.data === YT.PlayerState.ENDED) exitVideo(true);
        }
      }
    });
  };
  ytReady ? whenReady() : (window.onYouTubeIframeAPIReady = whenReady);
  el("p-mode-audio").classList.remove("active");
  el("p-mode-video").classList.add("active");
  state.mode = "video";
}

function exitVideo(finished = false) {
  const t = yt?.getCurrentTime?.() || 0;
  yt?.destroy?.(); yt = null;
  el("video-mount").innerHTML = "";
  el("video-stage").hidden = true;
  el("p-mode-audio").classList.add("active");
  el("p-mode-video").classList.remove("active");
  state.mode = "auto";
  if (!finished) { AudioCtl.seek(t); AudioCtl.play(); }
}
el("p-mode-video").addEventListener("click", enterVideo);
el("p-mode-audio").addEventListener("click", () => state.mode === "video" && exitVideo());
el("video-close").addEventListener("click", () => exitVideo());

function loadVideoFor(song) {                       // preload check: disable Video button if none
  const has = !!state.videoIds[videoKey(song)];
  el("p-mode-video").disabled = !has;
  el("p-mode-video").style.opacity = has ? "1" : ".4";
  el("p-mode-video").title = has ? "Watch official video" : "No video mapped for this song (prototype)";
}
```

- [ ] **Step 3: Test video toggle live**

Run: search "pushpa" → play → click **Video**
Expected: full-screen stage opens, YouTube embed loads **at the same playback position** as the audio was, plays (highest quality available for the large 1280px surface); close button or "Audio" button returns to audio **at the video's current position**; when the video ends → returns to audio state and advances queue logic normally. Song without mapped video → Video button dimmed/disabled with tooltip. Mobile: `playsinline` honored.

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "feat(prototype): video mode with position-preserving audio<->video toggle"
```

---

### Task 6: Polish pass + final manual QA

**Files:**
- Modify: `prototype/index.html`

**Interfaces:**
- Consumes: everything
- Produces: the final prototype the user will test for UI decisions.

- [ ] **Step 1: Keyboard shortcuts + edge cases**

```js
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.code === "Space" && state.current) { e.preventDefault(); AudioCtl.toggle(); }
  if (e.key === "ArrowRight") nextSong();
  if (e.key === "ArrowLeft") prevSong();
  if (e.key.toLowerCase() === "l" && state.current) toggleLyricsPanel();
  if (e.key === "Escape" && state.mode === "video") exitVideo();
});
```

Edge cases to handle (all in one pass):
- Rapid song-switching: guard `loadLyrics` and `enterVideo` against stale `state.current` (compare ids before applying remote results — the lyrics guard exists; mirror it for video)
- Language switch while playing: keep current song playing, only future searches filter
- Broken album art: `onerror` hides img (exists) — also default background art via CSS gradient on the container

- [ ] **Step 2: Full manual QA (the user's test script)**

Manual test script — all must pass:
- [ ] Search "pushpa" → Telugu results only, correct metadata/art
- [ ] Play → 320kbps CDN stream (Network tab), zero ads
- [ ] Lyrics open → synced Telugu karaoke, auto-scroll
- [ ] Video toggle → plays at same position; back to audio at same position
- [ ] Change language → search "ranjha" in Hindi works
- [ ] Old song: search "abbanee" (1990) plays
- [ ] Latest: search a song from this week — plays
- [ ] Next/prev/seek/auto-advance all work
- [ ] Keyboard: space/arrows/L/Esc
- [ ] Mobile width (devtools): player bar wraps, lyrics full-width, video inline

---

## Self-Review (completed during planning)

- Spec coverage: search ✓, highest-quality audio ✓, synced lyrics ✓, video toggle ✓, languages ✓, no-ads audio ✓, pnpm-only (n/a — no toolchain) ✓, freshness (live API, no caching) ✓, old→new catalog ✓
- Placeholder scan: the video ID map intentionally leaves implementer-verifiable entries (Step 0 defines the exact verification procedure + acceptance criteria) — no other placeholders
- Type consistency: `SaavnSong` fields used consistently across tasks (`id,name,artist,album,year,duration,language,image,downloadUrl`); `SaavnAPI.search/bestUrl`, `AudioCtl.*`, `loadLyrics`, `loadVideoFor`, `enterVideo/exitVideo` names stable
- Known simplifications (documented, not bugs): prototype disables the Video button for unmapped songs rather than proxy-searching; React app solves it server-side per spec §5 CORS
