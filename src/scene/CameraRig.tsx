import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { scrollState } from "../hooks/useScrollTimeline";
import { useAether } from "../store";
import { NEBULA_POS } from "./sections/NebulaField";
import { SYSTEM_POS } from "./sections/SolarSystem";
import { SINGULARITY_POS } from "./sections/Singularity";

/* One waypoint per section boundary. The path passes BELOW the nebula,
   RISES to Sol System's altitude for free-flight, then dives to the hole. */
const WAYPOINTS: [number, number, number][] = [
  [0, 0, 14],        // hero
  [0, 0, 30],        // warp entry
  [2, -4, 44],       // warp exit / nebula approach
  [0, -6, 52],       // nebula (under the cloud layers)
  [-16, 22, 68],     // climb to Sol
  [-24, 30, 80],     // Sol System — handover point
  [-10, 12, 96],     // descend toward the hole
  [0, 0, 104],       // singularity approach
  [0, 0, 112],       // pass-through
  [0, 0, 124],       // field
  [0, 0, 136],       // outro
  [0, 0, 142],       // settle
];

const LOOK_TARGETS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 30],
  [1, 0, 48],
  [0, 2, 58],
  [-20, 25, 76],
  [-24, 30, 80],
  [-6, 5, 98],
  [0, 0, 108],
  [0, 0, 118],
  [0, 0, 126],
  [0, 0, 136],
  [0, 0, 140],
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

  void NEBULA_POS;
  void SINGULARITY_POS;
  void SYSTEM_POS;

  useFrame(({ pointer }) => {
    const section = useAether.getState().section;
    const orbitActive = !!(camera as unknown as { userData?: { orbit?: boolean } }).userData?.orbit;

    // Free-flight section owns the camera — rig stands down
    if (section === 3 && orbitActive) return;

    const p = scrollState.damped;
    curve.getPoint(p, tmp.current);
    lookCurve.getPoint(p, tmp2.current);

    tmp.current.x += pointer.x * 0.6;
    tmp.current.y += pointer.y * 0.6;

    pos.current.lerp(tmp.current, 0.05);
    look.current.lerp(tmp2.current, 0.065);

    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}
