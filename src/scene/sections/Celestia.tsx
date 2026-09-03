import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SolarSystem, SYSTEM_POS } from "./SolarSystem";
import { planetInfoBus } from "../../ui/PlanetCard";
import { useAether } from "../../store";
import { scrollState } from "../../hooks/useScrollTimeline";

/**
 * Free-flight solar system section. When active (section 3, per user control),
 * the journey camera is disabled and OrbitControls give full drag-orbit,
 * wheel-zoom, and right-drag pan. An exit zone (scroll far enough) or the
 * "Resume journey" button returns control to the journey.
 */
export function Celestia() {
  const section = useAether((s) => s.section);
  const setSection = useAether((s) => s.setSection);
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const active = section === 3;
  const wasActive = useRef(false);
  const target = useRef(new THREE.Vector3(...SYSTEM_POS));

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (active && !wasActive.current) {
      wasActive.current = true;
    } else if (!active && wasActive.current) {
      wasActive.current = false;
      planetInfoBus.set(null);
    }
  });

  useEffect(() => {
    camera.userData.orbit = active;
    if (active && controls.current) {
      camera.position.set(
        SYSTEM_POS[0] + 26,
        SYSTEM_POS[1] + 12,
        SYSTEM_POS[2] + 30
      );
      controls.current.target.copy(target.current);
      controls.current.update();
    }
  }, [active, camera]);

  return (
    <group>
      <SolarSystem onInfo={(cfg) => planetInfoBus.set(cfg)} />
      {active && (
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.3}
          maxDistance={140}
          enablePan
          panSpeed={0.9}
          rotateSpeed={0.55}
          zoomSpeed={1.0}
          target={target.current}
        />
      )}
    </group>
  );
}
