import * as THREE from "three";
import { scrollState } from "../hooks/useScrollTimeline";

export const SECTIONS_TOTAL = 7;

/** Smoothstep fade in/out around section i. 1 at center, 0 beyond edges. */
export function sectionOpacity(i: number): number {
  const p = scrollState.damped * SECTIONS_TOTAL;
  const center = i + 0.5;
  const d = Math.abs(p - center);
  if (d <= 0.55) return 1;
  if (d >= 1.05) return 0;
  const t = (d - 0.55) / 0.5;
  return 1 - t * t * (3 - 2 * t);
}

/** DOM copy opacity uses a slightly tighter window so text swaps feel snappy. */
export function copyOpacity(i: number): number {
  const p = scrollState.damped * SECTIONS_TOTAL;
  const center = i + 0.5;
  const d = Math.abs(p - center);
  if (d <= 0.35) return 1;
  if (d >= 0.62) return 0;
  const t = (d - 0.35) / 0.27;
  return 1 - t * t * (3 - 2 * t);
}

export const lerp = THREE.MathUtils.lerp;
