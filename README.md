# Free Music — YouTube Music Web & PWA Clone

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)

A high-performance, ad-free music streaming Progressive Web Application (PWA) built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Zustand**. Designed with the authentic YouTube Music interface, real-time audio frequency visualizer, instant song radio, time-synchronized karaoke lyrics, intelligent typo-tolerant search, and offline IndexedDB downloads.

---

## Key Features

- **High-Fidelity Audio Streaming**: Direct JioSaavn CDN streaming up to 320 kbps with DES URL decryption.
- **Web Audio Analyser & Visualizer**: Real-time 64-band audio frequency visualizer canvas rendering responsive waveforms.
- **Instant Song Radio**: One-click radio launcher generating endless continuous recommended queues from any track.
- **Synchronized Karaoke Lyrics**: Real-time synced lyrics with autoscroll, click-to-seek, and interactive `[-0.5s]` / `[+0.5s]` timing offset controls.
- **Intelligent Search Engine**: Multi-stage phonetic typo correction (`"move"` $\rightarrow$ `"movie"`), entity extraction, category filtering (Songs, Albums, Artists, Playlists), and YouTube suggest fallback.
- **Offline Storage & Downloads**: IndexedDB audio blob storage (`free_music_db`) for 100% offline playback with zero bandwidth consumption.
- **Continuous Auto-Play & Background Prefetching**: Seamless gapless queue extension starting 12 seconds prior to track completion.
- **Interactive Drag-and-Drop Queue**: Reorder upcoming songs smoothly via `@dnd-kit`, shuffle, and repeat modes.
- **Full PWA Support**: Installable on Android, iOS, Windows, and macOS with service worker caching and HTTP 206 range-request scrubbing.
- **Dynamic Mood Filters**: Explore songs categorized by vibe (*Energize, Relax, Focus, Party, Romance, Workout*).
- **Responsive Theming**: Authentic dark/light system theming implemented with semantic CSS variables.

For an exhaustive feature breakdown, visit [`features.md`](file:///C:/teja/coding/free-music/features.md).

---

## Documentation & AI System Guides

This repository is built and maintained with AI agent workflows. We provide comprehensive documentation for both human engineers and AI assistants:

| Document | Description |
|---|---|
| **[`features.md`](file:///C:/teja/coding/free-music/features.md)** | Exhaustive breakdown of all app features, keyboard shortcuts, and UI interactions. |
| **[`ARCHITECTURE.md`](file:///C:/teja/coding/free-music/ARCHITECTURE.md)** | System architecture, Web Audio pipeline, data flow diagrams, and Zustand state models. |
| **[`GEMINI.md`](file:///C:/teja/coding/free-music/GEMINI.md)** | Architectural invariants and verification commands for Gemini / Antigravity agents. |
| **[`AGENTS.md`](file:///C:/teja/coding/free-music/AGENTS.md)** | Universal developer and AI agent guide detailing codebase conventions and pitfalls. |
| **[`CLAUDE.md`](file:///C:/teja/coding/free-music/CLAUDE.md)** | Execution instructions and constraints for Claude Code assistants. |
| **[`.cursorrules`](file:///C:/teja/coding/free-music/.cursorrules)** | Rule configuration for Cursor and Windsurf AI editors. |
| **[`.github/copilot-instructions.md`](file:///C:/teja/coding/free-music/.github/copilot-instructions.md)** | Dedicated context and invariant instructions for GitHub Copilot. |
| **[`docs/`](file:///C:/teja/coding/free-music/docs/README.md)** | Technical design specifications (`specs/`) and implementation plans (`plans/`). |
| **[`CONTRIBUTING.md`](file:///C:/teja/coding/free-music/CONTRIBUTING.md)** | Contribution standards, development setup, and pull request checklist. |
| **[`SECURITY.md`](file:///C:/teja/coding/free-music/SECURITY.md)** | Security reporting policy and vulnerability disclosure procedures. |
| **[`LICENSE`](file:///C:/teja/coding/free-music/LICENSE)** | Open-source MIT License. |

---

## Quick Start

### Prerequisites
- Node.js 20+ or 24+
- `pnpm` 9+

### Installation & Development
```bash
# 1. Install dependencies
pnpm install

# 2. Start local development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to start listening.

---

## Verification & Quality Assurance

All pull requests and code modifications must pass automated verification:

```bash
# Run unit test suite (Node.js native test runner)
pnpm --filter web test

# Run ESLint validation
pnpm --filter web lint

# Build production bundle (Next.js App Router + PWA Service Worker)
pnpm --filter web build
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
