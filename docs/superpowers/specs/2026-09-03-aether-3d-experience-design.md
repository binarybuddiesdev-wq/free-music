# AETHER — Design Spec

**Date:** 2026-09-03
**Status:** Approved by user (approach A, full autonomy, ThreeUI-level quality bar)
**Theme:** Cosmic (procedural, zero downloaded 3D assets)

## 1. Purpose

A pure-experience cinematic 3D website: one continuous camera journey through a
living universe, driven by scroll. Not a product site — the site *is* the
experience. Quality bar: ThreeUI (MengTo) / Awwwards-tier — custom GLSL
everywhere, shader buttons, loader choreography, glass UI, film-grade
postprocessing.

## 2. Stack

| Concern | Choice |
|---|---|
| Build | Vite 7, React 19, TypeScript |
| 3D | three + @react-three/fiber v9 + @react-three/drei |
| Physics | @react-three/rapier |
| Post | @react-three/postprocessing (Bloom, ChromaticAberration, Vignette, Noise) |
| Animation | gsap (ScrollTrigger) + @gsap/shards for headings |
| State | zustand |
| Styling | plain CSS (custom properties, glass, grain) — no framework needed |

No external 3D models/textures/fonts-files; everything procedural (GLSL) or
system/Google-hosted fonts. Zero network asset dependencies beyond package
installs.

## 3. Experience — 8 beats, one scroll timeline

Total scroll length: ~10 viewport-heights (`scrollHeight = 800vh`).

| # | Beat | Scene visuals | Interaction |
|---|---|---|---|
| 0 | **Preloader** | Uplink-style: % counter, calibration log lines, iris-open reveal into hero | none (auto) |
| 1 | **Hero** | ~200k particles morph from noise-cloud into "AETHER" wordmark (sampled from canvas text), FBM nebula backdrop, cursor parallax | mouse parallax; scroll begins journey |
| 2 | **Warp** | Hyperspace streaks (stretched points along z), speed ramps with scroll velocity, chromatic aberration scales with velocity | scroll |
| 3 | **Nebula** | Layered FBM volumetric planes, god-rays from off-screen sun, drifting ember particles | mouse influences fog density via parallax |
| 4 | **Celestia** | Procedural ringed planet: FBM band shader, fresnel atmosphere, moon orbiting, star sparkles | drag to rotate planet (inertia) |
| 5 | **Singularity** | Black hole: animated accretion disk shader (doppler color shift), photon ring (bloom), lensing hint; passing through → white flash | scroll-through flash; slight cursor tilt |
| 6 | **The Field** | ~40 instanced asteroids in Rapier physics; grab & throw; impact → particle burst + bloom pulse | drag asteroids with pointer |
| 7 | **Outro** | Points link into constellation lines forming AETHER glyph, credits, "Replay" CTA | CTA scrolls back to top |

DOM overlay per beat: eyebrow label (e.g. "01 — IGNITION"), staggered-char
heading (Shards), short body copy, progress rail on right edge.

## 4. Architecture

```
src/
  App.tsx                 — composition root: Loader gate → Experience
  store.ts                — zustand: progress, sectionIndex, quality tier, phase
  hooks/useScrollTimeline.ts — GSAP ScrollTrigger → normalized 0..1 + section idx
  scene/Experience.tsx    — Canvas, camera rig, section mount switch, postprocessing
  scene/CameraRig.tsx      — Catmull-Rom path + lookAt targets per section, damped
  scene/sections/         — one folder per beat, lazy-mounted when in view:
    HeroMorph.tsx  WarpTunnel.tsx  NebulaField.tsx  Celestia.tsx
    Singularity.tsx  AsteroidField.tsx  ConstellationOutro.tsx
  scene/fx/               — shared GLSL: fbm.glsl, starfield, embers, flash overlay
  ui/                     — Preloader.tsx, Dock.tsx, ProgressRail.tsx,
                            ShaderButton.tsx, SectionCopy.tsx
  styles/                 — global.css (tokens, glass, grain, typography)
```

- **Scroll model:** single ScrollTrigger scrub mapping scrollY → `progress`
  [0,1]; `sectionIndex = floor(progress * 8)`. Camera reads `progress` from a
  ref (no React re-render per frame). Sections mount when their index is
  within ±1 of active (z-index-free; everything positioned along the path).
- **Camera:** CatmullRomCurve3 through 8 waypoints; position =
  curve(progress), lookAt = per-section target, both damped (maframe).
- **Quality tiers:** high (DPR≤2, 200k particles, all effects), medium (DPR≤1.5,
  80k, no god-rays), low (DPR 1, 30k, no bloom, static-ish warp). Chosen at
  boot via deviceMemory/GPU heuristic + PerformanceMonitor degradation.

## 5. Key techniques (all custom GLSL)

- **Wordmark morph:** draw "AETHER" to offscreen 2D canvas, sample filled
  pixels → target positions attribute; particles lerp with cubic ease +
  per-particle noise offset in vertex shader.
- **FBM nebula:** 5-octave simplex FBM in fragment shader, two color ramps
  (deep violet → teal → ember), domain-warped, on 3 parallax planes.
- **Warp:** BufferGeometry points stretched via `gl_PointSize` + trails in
  vertex shader (z-velocity → elongated alpha falloff).
- **Planet:** FBM banded noise + fresnel rim; ring = torus w/ alpha-noise
  annulus; atmosphere = backside sphere w/ additive fresnel.
- **Black hole:** disk shader w/ rotational shear + doppler hue shift;
  event-horizon = pure black sphere; photon ring = thin emissive torus
  boosted by Bloom; background lensing faked with radial UV distortion.
- **Shader button:** rounded-rect SDF + hover progress uniform → glow sweep +
  border light. Glass dock: backdrop-filter blur, saturate.
- **Grain:** full-screen Noise effect at low opacity + CSS vignette.

## 6. Error handling

- WebGL2 unavailable → static poster + message (no crash).
- WebGL context lost → window listener → attempt restore → else poster.
- Rapier WASM fail → Field falls back to non-physics float animation.
- Resize / orientation change → renderer + ScrollTrigger.refresh().

## 7. Performance budget

- 60fps on mid-range laptop GPU at medium tier; ≥45fps low tier.
- Initial JS < 900KB gz (three ~600KB dominates; acceptable for experience site).
- No frame-time React renders: scroll/pointer state in refs/zustand transient.

## 8. Testing & verification

- `tsc --noEmit` clean; `vite build` clean.
- Manual runtime check: `npm run dev` → server responds, no console errors on
  load (checked via curl + build artifacts; headless visual check if available).
- Per-section mount/unmount verified via code review + build.

## 9. Out of scope (v1)

Audio, i18n, mobile touch-throw tuning beyond basics, analytics, SEO copy.
