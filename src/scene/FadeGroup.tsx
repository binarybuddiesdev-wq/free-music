import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sectionOpacity } from "./fades";

/**
 * Mounts children, fades them in/out with scroll by toggling visibility,
 * gently scaling from `zoom` as they enter/leave. Avoids per-material
 * opacity hacking — sections are spatially separated along the camera path.
 */
export function FadeGroup({ index, children, zoom = 0.15 }: { index: number; children: ReactNode; zoom?: number }) {
  const group = useRef<THREE.Group>(null);
  const shown = useRef(false);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const op = sectionOpacity(index);
    const shouldShow = op > 0.001;
    if (shouldShow !== shown.current) {
      shown.current = shouldShow;
      g.visible = shouldShow;
    }
    const s = 1 - (1 - op) * zoom;
    g.scale.setScalar(s);
  });

  return (
    <group ref={group} visible={false}>
      {children}
    </group>
  );
}
