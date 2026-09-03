import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";

export const FIELD_POS: [number, number, number] = [0, 0, 124];

export function AsteroidField({ count }: { count: number }) {
  const [physicsFailed, setPhysicsFailed] = useState(false);

  return (
    <group position={FIELD_POS}>
      {physicsFailed ? (
        <FloatingFallback count={count} />
      ) : (
        <Suspense fallback={<FloatingFallback count={count} />}>
          <Physicsed count={count} onFail={() => setPhysicsFailed(true)} />
        </Suspense>
      )}
    </group>
  );
}

type RockCfg = { pos: [number, number, number]; scale: number; seed: number; color: string };

function Physicsed({ count, onFail }: { count: number; onFail: () => void }) {
  const rocks = useMemo<RockCfg[]>(() => {
    const arr: RockCfg[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10 + 2, (Math.random() - 0.5) * 12],
        scale: 0.35 + Math.random() * 0.7,
        seed: Math.random() * 100,
        color: ["#6e6a75", "#57525f", "#7d7488", "#4a4452"][i % 4],
      });
    }
    return arr;
  }, [count]);

  const baseGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  return (
    <Physics gravity={[0, -0.35, 0]} timeStep="vary">
      <Boundary />
      {rocks.map((r, i) => (
        <Asteroid key={i} geometry={baseGeometry} onFail={onFail} {...r} />
      ))}
    </Physics>
  );
}

function Boundary() {
  return (
    <>
      <RigidBody type="fixed" position={[0, -9, 0]}>
        <mesh>
          <boxGeometry args={[40, 0.4, 40]} />
          <meshStandardMaterial color="#14121f" roughness={1} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 14, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[40, 0.4, 40]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-22, 0, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[0.4, 40, 40]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[22, 0, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[0.4, 40, 40]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 0, -14]}>
        <mesh visible={false}>
          <boxGeometry args={[40, 40, 0.4]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 0, 14]}>
        <mesh visible={false}>
          <boxGeometry args={[40, 40, 0.4]} />
        </mesh>
      </RigidBody>
    </>
  );
}

function Asteroid({
  geometry,
  pos,
  scale,
  seed,
  color,
  onFail,
}: RockCfg & { geometry: THREE.BufferGeometry; onFail: () => void }) {
  const body = useRef<RapierRigidBody>(null);

  const distorted = useMemo(() => {
    try {
      const g = geometry.clone();
      const v = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < v.count; i++) {
        const x = v.getX(i), y = v.getY(i), z = v.getZ(i);
        const d = 1 + (Math.sin(x * 3.1 + seed) + Math.cos(y * 2.7 + seed) + Math.sin(z * 3.7 + seed)) * 0.13;
        v.setXYZ(i, x * d, y * d, z * d);
      }
      g.computeVertexNormals();
      return g;
    } catch {
      onFail();
      return geometry;
    }
  }, [geometry, seed, onFail]);

  const grab = () => {
    const rb = body.current;
    if (!rb) return;
    rb.setBodyType(1, true);
    document.body.style.cursor = "grabbing";
    const move = (ev: PointerEvent) => {
      const t = rb.translation();
      rb.setTranslation(
        { x: THREE.MathUtils.clamp(t.x + ev.movementX * 0.03, -20, 20), y: THREE.MathUtils.clamp(t.y - ev.movementY * 0.03, -8, 13), z: t.z },
        true
      );
    };
    const up = () => {
      rb.setBodyType(0, true);
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <RigidBody
      ref={body}
      position={pos}
      colliders="ball"
      restitution={0.55}
      linearDamping={0.05}
      angularDamping={0.2}
    >
      <mesh
        geometry={distorted}
        scale={scale}
        onPointerDown={(e) => {
          e.stopPropagation();
          grab();
        }}
      >
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.15} flatShading />
      </mesh>
    </RigidBody>
  );
}

function FloatingFallback({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10 + 2, (Math.random() - 0.5) * 12),
        rotAxis: new THREE.Vector3().randomDirection(),
        speed: 0.2 + Math.random() * 0.6,
      })),
    [count]
  );

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.children.forEach((c, i) => {
      const it = items[i];
      if (!it) return;
      c.position.y += Math.sin(performance.now() * 0.001 * it.speed + i) * 0.004;
      c.rotateOnAxis(it.rotAxis, dt * it.speed * 0.5);
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} scale={0.35 + Math.random() * 0.7}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={["#6e6a75", "#57525f", "#7d7488", "#4a4452"][i % 4]} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}
