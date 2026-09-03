import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SolarSystem } from "./SolarSystem";
import { planetInfoBus } from "../../ui/PlanetCard";

export function Celestia() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ pointer }) => {
    if (group.current) {
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, pointer.y * 0.015, 0.04);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.x * 0.015, 0.04);
    }
  });

  return (
    <group ref={group}>
      <SolarSystem onInfo={(cfg) => planetInfoBus.set(cfg)} />
    </group>
  );
}
