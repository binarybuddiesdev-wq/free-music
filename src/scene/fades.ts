import * as THREE from "three";
import { scrollState } from "../hooks/useScrollTimeline";

export const SECTIONS_TOTAL = 7;

/**
 * Each section owns exactly its own scroll band (p*7 ∈ [i, i+1]).
 * Full opacity through the middle, quick ease at the band edges —
 * sections are spatially separated along the camera path, so the
 * camera's own travel provides the transition; no coexisting scenes.
 */
export function sectionOpacity(i: number): number {
  const p = scrollState.damped * SECTIONS_TOTAL;
  const d = Math.abs(p - (i + 0.5));
  if (d <= 0.35) return 1;
  if (d >= 0.5) return 0;
  const t = (d - 0.35) / 0.15;
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
