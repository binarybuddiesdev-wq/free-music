import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PLANETS, SYSTEM_POS, type PlanetCfg } from "./SolarSystem";
import { planetInfoBus } from "../../ui/PlanetCard";
import { useAether } from "../../store";

type FocusMode =
  | { kind: "system" }
  | { kind: "planet"; name: string; getWorld: (out: THREE.Vector3) => void };

/**
 * Free-flight solar system. Click a planet -> orbit target locks onto that
 * planet and tracks it while it orbits, so zoom/rotate work around the
 * focused planet. Click the sun or empty space -> back to system center.
 */
export function Celestia() {
  const section = useAether((s) => s.section);
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const active = section === 3;
  const [focus, setFocus] = useState<FocusMode>({ kind: "system" });
  const tracked = useRef(new THREE.Vector3(...SYSTEM_POS));
  const smTarget = useRef(new THREE.Vector3(...SYSTEM_POS));

  // planet pivot registry: SolarSystem reports live world positions
  const worldGetters = useRef(new Map<string, (out: THREE.Vector3) => void>());
  const registerGetter = (name: string, fn: (out: THREE.Vector3) => void) => {
    worldGetters.current.set(name, fn);
  };
  const unregisterGetter = (name: string) => {
    worldGetters.current.delete(name);
  };

  useFrame(() => {
    const c = controls.current;
    if (!c || !active) return;

    // track the focused planet's motion smoothly
    const goal = tracked.current;
    if (focus.kind === "planet") {
      const getter = worldGetters.current.get(focus.name);
      if (getter) {
        getter(goal);
      }
    } else {
      goal.set(...SYSTEM_POS);
    }
    smTarget.current.lerp(goal, 0.18);
    c.target.copy(smTarget.current);
    c.update();
  });

  useEffect(() => {
    camera.userData.orbit = active;
    if (active && controls.current) {
      camera.position.set(SYSTEM_POS[0] + 26, SYSTEM_POS[1] + 12, SYSTEM_POS[2] + 30);
      controls.current.target.set(...SYSTEM_POS);
      smTarget.current.set(...SYSTEM_POS);
      controls.current.update();
    }
  }, [active, camera]);

  useEffect(() => {
    if (!active) return;
    let onUp: ((ev: PointerEvent) => void) | null = null;
    const onDown = (e: PointerEvent) => {
      const startX = e.clientX;
      const startY = e.clientY;
      onUp = (ev: PointerEvent) => {
        if (onUp) window.removeEventListener("pointerup", onUp);
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (moved > 6) return; // drag-orbit, not a click
        // no planet stopPropagation'd -> empty space clicked -> refocus center
        setFocus({ kind: "system" });
        planetInfoBus.set(null);
      };
      window.addEventListener("pointerup", onUp);
    };
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      if (onUp) window.removeEventListener("pointerup", onUp);
    };
  }, [active]);

  const selectPlanet = (cfg: PlanetCfg | null) => {
    if (!cfg) {
      setFocus({ kind: "system" });
      planetInfoBus.set(null);
      return;
    }
    setFocus({ kind: "planet", name: cfg.name, getWorld: () => {} });
    planetInfoBus.set(cfg);
  };

  void gl;
  return (
    <group>
      <SolarSystemBridge onPlanetClick={selectPlanet} registerGetter={registerGetter} unregisterGetter={unregisterGetter} />
      {active && (
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={0.08}
          maxDistance={140}
          enablePan
          panSpeed={0.9}
          rotateSpeed={0.55}
          zoomSpeed={1.0}
        />
      )}
    </group>
  );
}

import { SolarSystem } from "./SolarSystem";

function SolarSystemBridge({
  onPlanetClick,
  registerGetter,
  unregisterGetter,
}: {
  onPlanetClick: (cfg: PlanetCfg | null) => void;
  registerGetter: (name: string, fn: (out: THREE.Vector3) => void) => void;
  unregisterGetter: (name: string) => void;
}) {
  return <SolarSystem onInfo={onPlanetClick} registerGetter={registerGetter} unregisterGetter={unregisterGetter} />;
}
