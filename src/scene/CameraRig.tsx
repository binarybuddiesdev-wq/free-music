import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { scrollState } from "../hooks/useScrollTimeline";
import { useAether } from "../store";

const WAYPOINTS: [number, number, number][] = [
  [0, 0, 14],
  [0, 0.5, 30],
  [-6, 1, 46],
  [-24, 0.5, 68],
  [-40, 0, 86],
  [-54, -2, 104],
  [-60, -3, 122],
  [-60, -4, 138],
];

const LOOK_TARGETS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 40],
  [-4, 0, 55],
  [-24, 0.5, 68],
  [-40, 0, 86],
  [-54, 0, 104],
  [-60, 0, 124],
  [-60, -2, 142],
];

export function CameraRig() {
  const pos = useRef(new THREE.Vector3(0, 0, 14));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const tmp = useRef(new THREE.Vector3());
  const tmp2 = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w)), false, "centripetal", 0.5),
    []
  );
  const lookCurve = useMemo(
    () => new THREE.CatmullRomCurve3(LOOK_TARGETS.map((w) => new THREE.Vector3(...w)), false, "centripetal", 0.5),
    []
  );

  useFrame(({ pointer }) => {
    const section = useAether.getState().section;
    const controls = (camera as unknown as { userData?: { orbit?: boolean } }).userData;
    const orbitActive = !!controls?.orbit;

    // Free-flight section owns the camera — rig stands down
    if (section === 3 && orbitActive) return;

    const p = scrollState.damped;
    curve.getPoint(p, tmp.current);
    lookCurve.getPoint(p, tmp2.current);

    tmp.current.x += pointer.x * 0.6;
    tmp.current.y += pointer.y * 0.6;

    pos.current.lerp(tmp.current, 0.045);
    look.current.lerp(tmp2.current, 0.06);

    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}
