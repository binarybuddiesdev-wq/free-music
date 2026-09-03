import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "../hooks/useScrollTimeline";

const WAYPOINTS: [number, number, number][] = [
  [0, 0, 14],
  [0, 0.5, 30],
  [-6, 1, 46],
  [-20, 2, 62],
  [-38, 0, 78],
  [-52, -2, 96],
  [-60, -3, 116],
  [-60, -4, 138],
];

const LOOK_TARGETS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 40],
  [-4, 0, 55],
  [-22, 0, 70],
  [-40, 0, 86],
  [-54, 0, 104],
  [-60, 0, 124],
  [-60, -2, 142],
];

const SECTION_SPAN = 1 / 7;

export function CameraRig() {
  const camera = useRef<THREE.PerspectiveCamera>(null!);
  const pos = useRef(new THREE.Vector3(0, 0, 14));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const lookDamped = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const tmp2 = useRef(new THREE.Vector3());

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w)), false, "centripetal", 0.5),
    []
  );
  const lookCurve = useMemo(
    () => new THREE.CatmullRomCurve3(LOOK_TARGETS.map((w) => new THREE.Vector3(...w)), false, "centripetal", 0.5),
    []
  );

  useFrame(({ camera: cam, pointer }) => {
    const p = scrollState.damped;

    curve.getPoint(p, tmp.current);
    lookCurve.getPoint(p, tmp2.current);

    const parallax = 0.6;
    tmp.current.x += pointer.x * parallax;
    tmp.current.y += pointer.y * parallax;

    pos.current.lerp(tmp.current, 0.045);
    lookDamped.current.lerp(tmp2.current, 0.06);

    cam.position.copy(pos.current);
    cam.lookAt(lookDamped.current);
  });

  return null;
}
