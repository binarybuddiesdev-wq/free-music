import { create } from "zustand";

export type Tier = "high" | "medium" | "low";

export type Phase = "preloader" | "experience";

export const SECTION_COUNT = 7;

export const SECTIONS = [
  { id: "hero", label: "Genesis", eyebrow: "01 — IGNITION", title: "Where light begins", body: "Two hundred thousand particles remember a word. Scroll to set them free." },
  { id: "warp", label: "Warp", eyebrow: "02 — VELOCITY", title: "Faster than silence", body: "The journey starts as a streak. Let go and fall forward." },
  { id: "nebula", label: "Nebula", eyebrow: "03 — DRIFT", title: "A sea of dying stars", body: "Domain-warped noise breathes in violet and ember. Embers rise where light was born." },
  { id: "celestia", label: "Sol System", eyebrow: "04 — FREE FLIGHT", title: "Take the helm", body: "This is Sol, rendered live. Drag to orbit, scroll to zoom, right-drag to pan. Click any world for its dossier." },
  { id: "singularity", label: "Singularity", eyebrow: "05 — EVENT HORIZON", title: "The hungry dark", body: "A disk of fire spirals into nothing. The photon ring is the last thing that escapes." },
  { id: "field", label: "The Field", eyebrow: "06 — PLAYGROUND", title: "Gravity is yours", body: "Grab a rock. Throw it. Watch the field scatter and settle." },
  { id: "outro", label: "Constellation", eyebrow: "07 — RETURN", title: "Every journey maps the sky", body: "The particles settle into a constellation. This one was yours." },
] as const;

type AetherState = {
  phase: Phase;
  section: number;
  tier: Tier;
  startedAt: number;
  setPhase: (p: Phase) => void;
  setSection: (i: number) => void;
};

export const useAether = create<AetherState>((set) => ({
  phase: "preloader",
  section: 0,
  tier: "high",
  startedAt: 0,
  setPhase: (phase) => set({ phase }),
  setSection: (section) => set({ section }),
}));

export function pickTier(): Tier {
  if (typeof navigator === "undefined") return "medium";
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || (mem !== undefined && mem <= 4) || cores <= 4) return "low";
  if ((navigator.hardwareConcurrency ?? 4) >= 8) return "high";
  return "medium";
}

export const TIER_SETTINGS: Record<Tier, { dpr: [number, number]; heroParticles: number; warpStreaks: number; nebulaLayers: number; asteroids: number; bloom: boolean; ca: boolean }> = {
  high: { dpr: [1, 2], heroParticles: 100000, warpStreaks: 6000, nebulaLayers: 3, asteroids: 26, bloom: true, ca: true },
  medium: { dpr: [1, 1.5], heroParticles: 45000, warpStreaks: 3500, nebulaLayers: 3, asteroids: 18, bloom: true, ca: false },
  low: { dpr: [0.75, 1], heroParticles: 18000, warpStreaks: 1800, nebulaLayers: 2, asteroids: 12, bloom: false, ca: false },
};
