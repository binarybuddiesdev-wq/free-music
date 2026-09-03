# AETHER

A cinematic, scroll-driven 3D experience — one continuous camera journey
through a living universe. Built to ThreeUI-level standards: fully custom
GLSL, zero downloaded 3D assets, everything procedural.

## Run

```
pnpm install
pnpm dev        # http://localhost:5173
```

## Build

```
pnpm build      # outputs dist/
pnpm preview    # serve the production build
```

## The journey (7 beats)

1. **Genesis** — 100k particles morph into the AETHER wordmark over an FBM nebula
2. **Warp** — hyperspace streak tunnel, chromatic aberration scales with scroll velocity
3. **Nebula** — domain-warped FBM volumetric layers + rising embers
4. **Celestia** — procedural ringed gas giant (FBM bands, fresnel atmosphere) — drag to spin it
5. **Singularity** — black hole: doppler-shifted accretion disk, photon ring, white-flash pass-through
6. **The Field** — Rapier physics playground: grab & throw asteroids
7. **Constellation** — particles settle into an "aether" glyph constellation with linking lines

## Tech

Vite · React 19 · TypeScript · three.js · @react-three/fiber v9 ·
@react-three/postprocessing (Bloom / ChromaticAberration / Vignette / Noise) ·
@react-three/rapier · zustand. Quality tiers (high/medium/low) auto-selected
from device heuristics; graceful fallbacks for missing WebGL and physics.

## Controls

Scroll to travel · mouse for parallax · drag the planet · grab & throw asteroids.
