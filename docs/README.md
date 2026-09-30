# Documentation Directory (`docs/`)

Welcome to the internal engineering documentation directory for the **Free Music (YouTube Music Clone)** project.

This directory houses technical specifications, architectural designs, step-by-step implementation plans, initial API research findings, and retrospective audits generated through AI-assisted workflows and engineering best practices.

---

## Directory Organization

```
docs/
├── README.md                          # Directory index & overview (this document)
├── architecture/                      # System architecture, C4 diagrams, and topology
│   ├── architecture.md                # End-to-end architecture guide & data flows
│   └── codebase-evaluation-and-roadmap.md # Honest evaluation, score breakdown & future roadmap
├── features/                          # Feature index and catalog
│   └── features.md                    # Complete feature inventory & state matrix
├── research/                          # Foundational API discovery & verification research
│   └── music-app-research.md          # JioSaavn API analysis, CORS verification & prototype findings
└── superpowers/                       # Structured feature specifications and plans
    ├── specs/                         # Product requirements & design specs
    │   ├── 2026-09-04-ytm-clone-design.md
    │   ├── 2026-09-20-youtube-music-features-design.md
    │   ├── 2026-09-21-continuous-autoplay-offline-downloads-recent-searches.md
    │   ├── 2026-09-21-pwa-full-offline-design.md
    │   ├── 2026-09-21-search-filters-design.md
    │   └── 2026-09-27-visualizer-radio-lyrics.md
    └── plans/                         # Step-by-step implementation & verification plans
        ├── 2026-09-04-music-app-prototype.md
        ├── 2026-09-20-codebase-issue-fixes.md
        ├── 2026-09-20-pwa-and-search-filters.md
        ├── 2026-09-21-continuous-autoplay-offline-downloads-recent-searches.md
        └── 2026-09-27-visualizer-radio-lyrics.md
```

---

## Research & Exploration (`docs/research/`)

- **[`music-app-research.md`](file:///C:/teja/coding/free-music/docs/research/music-app-research.md)**: Original live verification and API benchmarking performed on 2026-09-04, documenting:
  - JioSaavn unofficial API endpoints and live streaming behaviors.
  - 320 kbps AAC stream quality validation and zero-ad raw CDN routing.
  - Client-side language filtering invariants.
  - LRCLIB time-synced lyrics integration and fuzzy matching rules.
  - YouTube IFrame video embedding and CORS limitations.

---

## Specifications (`docs/superpowers/specs/`)

Every major feature begins with an exhaustive design specification document outlining:
1. **User Stories & Requirements**: Pain points and user expectations.
2. **Architecture & State Machines**: Zustand store modifications, data contracts, and persistence rules.
3. **Data Flow**: Sequence diagrams and external API interactions (JioSaavn, LRCLIB, YouTube).
4. **Verification Protocol**: Automated unit test cases, visual checks, and edge case coverage.

### Key Specifications:
- **[`2026-09-27-visualizer-radio-lyrics.md`](file:///C:/teja/coding/free-music/docs/superpowers/specs/2026-09-27-visualizer-radio-lyrics.md)**: Real-time 64-band Web Audio Analyser visualizer, one-click continuous song radio, and interactive lyrics sync offset toolbar.
- **[`2026-09-21-continuous-autoplay-offline-downloads-recent-searches.md`](file:///C:/teja/coding/free-music/docs/superpowers/specs/2026-09-21-continuous-autoplay-offline-downloads-recent-searches.md)**: Zero-gap continuous queue prefetching, IndexedDB audio blob storage, and recent search history.
- **[`2026-09-21-pwa-full-offline-design.md`](file:///C:/teja/coding/free-music/docs/superpowers/specs/2026-09-21-pwa-full-offline-design.md)**: Service worker configuration, Workbox range requests for audio scrubbing, and offline fallback shell.
- **[`2026-09-21-search-filters-design.md`](file:///C:/teja/coding/free-music/docs/superpowers/specs/2026-09-21-search-filters-design.md)**: Typo tolerance, phonetic normalizer, multi-stage fallback, and category filtering (Songs, Albums, Artists, Playlists).

---

## Implementation Plans (`docs/superpowers/plans/`)

Implementation plans break down specifications into granular, testable tasks following Test-Driven Development (TDD):
1. **Phase 1: Foundation & State**: Stores, utilities, and test suites.
2. **Phase 2: Core Components & Logic**: UI components, styling, and event hooks.
3. **Phase 3: Integration & Edge Cases**: Lifecycle synchronization and cross-browser handling.
4. **Phase 4: Automated Verification**: `pnpm test`, `pnpm lint`, and production build validation.

---

## Related Global Documentation

- **[`features.md`](file:///C:/teja/coding/free-music/features.md)**: Comprehensive user-facing catalog of all features in the app.
- **[`ARCHITECTURE.md`](file:///C:/teja/coding/free-music/ARCHITECTURE.md)**: Monorepo architecture, Web Audio graph, PWA caching strategies, and Zustand state flow.
- **[`AGENTS.md`](file:///C:/teja/coding/free-music/AGENTS.md)**: System guide and invariants for all AI models (Gemini, Claude, Cursor, Copilot).
- **[`GEMINI.md`](file:///C:/teja/coding/free-music/GEMINI.md)**: Specific prompt guidelines and execution patterns for Gemini / Antigravity agents.
- **[`CLAUDE.md`](file:///C:/teja/coding/free-music/CLAUDE.md)**: Guidelines for Anthropic Claude Code assistants.
- **[`CONTRIBUTING.md`](file:///C:/teja/coding/free-music/CONTRIBUTING.md)**: Code contribution standards and pull request workflows.
