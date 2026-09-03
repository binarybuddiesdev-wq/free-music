import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "../../hooks/useScrollTimeline";

const FLASH_CENTER = 4.85 / 7;

export function FlashOverlay() {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ camera }) => {
    if (!mat.current || !mesh.current) return;
    mesh.current.position.copy(camera.position);
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.translateZ(-1.5);

    const d = Math.abs(scrollState.damped - FLASH_CENTER);
    const intensity = Math.max(0, 1 - d * 90);
    mat.current.opacity = intensity * 0.85;
  });

  return (
    <mesh ref={mesh} renderOrder={999} frustumCulled={false}>
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial ref={mat} color="#fff" transparent opacity={0} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
