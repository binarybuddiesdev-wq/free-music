import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getPlanetTextures, getRingTexture } from "../textures";

const SUN_VERT = `
varying vec3 vPos;
varying vec3 vNormal;
void main(){
  vPos = position;
  vNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SUN_FRAG = `
uniform float uTime;
varying vec3 vPos;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
  float e=hash(i+vec3(0,0,1)), f1=hash(i+vec3(1,0,1)), g=hash(i+vec3(0,1,1)), h=hash(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,f1,f.x),mix(g,h,f.x),f.y), f.z);
}
float fbm(vec3 p){
  float v=0.0,a=0.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.2; a*=0.5; }
  return v;
}
void main(){
  float n = fbm(vPos * 1.6 + vec3(uTime * 0.06));
  float granule = fbm(vPos * 5.0 + vec3(uTime * 0.1)) * 0.35;
  vec3 core = mix(vec3(1.0, 0.62, 0.16), vec3(1.0, 0.95, 0.82), n * 0.7 + granule);
  core += vec3(1.0, 0.5, 0.15) * pow(max(n - 0.35, 0.0), 2.0) * 1.6;
  gl_FragColor = vec4(core * 2.2, 1.0);
}
`;

const CORONA_FRAG = `
uniform float uTime;
varying vec3 vNormal;
void main(){
  float rim = pow(1.0 - abs(normalize(vNormal).z), 2.6);
  float pulse = 0.9 + 0.1 * sin(uTime * 0.8);
  gl_FragColor = vec4(vec3(1.0, 0.72, 0.35) * rim * 1.5 * pulse, rim * 0.4);
}
`;

const ATMO_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vNormal = normalMatrix * normal;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const ATMO_FRAG = `
uniform vec3 uColor;
uniform float uStrength;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float rim = pow(1.0 - abs(normalize(vNormal).z), 3.2);
  vec3 vd = normalize(vView);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), vd)), 3.0);
  float a = rim * 0.55 + fres * 0.25;
  gl_FragColor = vec4(uColor * (rim * 1.2 + fres * 0.8) * uStrength, clamp(a * uStrength, 0.0, 1.0));
}
`;

export type MoonCfg = { name: string; radius: number; dist: number; speed: number; texture?: string; color?: string };

export type PlanetCfg = {
  name: string;
  kind: string;
  radius: number;
  dist: number;
  au: number;
  speed: number;
  tilt: number;
  orbitTilt: number;
  rotSpeed: number;
  atmosphere?: string;
  atmoStrength?: number;
  ring?: "saturn" | "uranus";
  ringInner?: number;
  ringOuter?: number;
  moons?: MoonCfg[];
  info: string;
};

/** Real Sol system. True size ratios (Jupiter = 10.97 Earths), absolute scale
 *  compressed to fit the scene; distances heavily compressed but ordered. */
export const PLANETS: PlanetCfg[] = [
  {
    name: "Mercury", kind: "mercury", radius: 0.024, dist: 7.5, au: 0.39, speed: 0.161, tilt: 0.001, orbitTilt: 0.02, rotSpeed: 0.02,
    info: "Closest to the Sun. A cratered, airless world of extremes — 430°C by day, −180°C by night. Orbital period: 88 days.",
  },
  {
    name: "Venus", kind: "venus", radius: 0.060, dist: 9.2, au: 0.72, speed: 0.117, tilt: 3.09, orbitTilt: 0.03, rotSpeed: -0.008,
    atmosphere: "#e8cd9a", atmoStrength: 1.15,
    info: "Wrapped in sulfuric acid clouds that spin faster than the planet. Runaway greenhouse: 465°C, day and night.",
  },
  {
    name: "Earth", kind: "earth", radius: 0.063, dist: 11.0, au: 1.0, speed: 0.10, tilt: 0.41, orbitTilt: 0, rotSpeed: 0.35,
    atmosphere: "#7db4ff", atmoStrength: 1.0,
    moons: [{ name: "Luna", radius: 0.017, dist: 0.22, speed: 0.35, texture: "moon" }],
    info: "The only known living world. 71% ocean, one large moon that steadies its tilt — and everyone you've ever met.",
  },
  {
    name: "Mars", kind: "mars", radius: 0.034, dist: 13.0, au: 1.52, speed: 0.081, tilt: 0.44, orbitTilt: 0.03, rotSpeed: 0.34,
    atmosphere: "#d8a284", atmoStrength: 0.35,
    moons: [
      { name: "Phobos", radius: 0.0035, dist: 0.09, speed: 1.4, color: "#8a7a6a" },
      { name: "Deimos", radius: 0.0024, dist: 0.14, speed: 0.9, color: "#9a8a7a" },
    ],
    info: "The rust-red desert world. Home of Olympus Mons — a volcano three times the height of Everest.",
  },
  {
    name: "Jupiter", kind: "jupiter", radius: 0.70, dist: 26, au: 5.2, speed: 0.044, tilt: 0.05, orbitTilt: 0.01, rotSpeed: 0.9,
    atmosphere: "#e8c89a", atmoStrength: 0.35,
    moons: [
      { name: "Io", radius: 0.018, dist: 1.05, speed: 1.15, texture: "io" },
      { name: "Europa", radius: 0.016, dist: 1.32, speed: 0.85, texture: "europa" },
      { name: "Ganymede", radius: 0.026, dist: 1.60, speed: 0.55, texture: "ganymede" },
      { name: "Callisto", radius: 0.024, dist: 1.92, speed: 0.38, texture: "callisto" },
    ],
    info: "King of planets — 2.5× the mass of all others combined. The Great Red Spot is a storm older than photography.",
  },
  {
    name: "Saturn", kind: "saturn", radius: 0.60, dist: 34, au: 9.6, speed: 0.032, tilt: 0.47, orbitTilt: 0.02, rotSpeed: 0.8,
    atmosphere: "#e8d0a0", atmoStrength: 0.3,
    ring: "saturn", ringInner: 1.24, ringOuter: 2.27,
    moons: [
      { name: "Titan", radius: 0.025, dist: 1.55, speed: 0.42, texture: "titan" },
      { name: "Rhea", radius: 0.010, dist: 1.90, speed: 0.3, color: "#c8c4bc" },
    ],
    info: "Less dense than water. Its rings span 280,000 km but are often just 10 meters thick. 146 known moons.",
  },
  {
    name: "Uranus", kind: "uranus", radius: 0.27, dist: 42, au: 19.2, speed: 0.023, tilt: 1.71, orbitTilt: 0.05, rotSpeed: -0.5,
    atmosphere: "#a8e0e8", atmoStrength: 0.5,
    ring: "uranus", ringInner: 1.6, ringOuter: 2.0,
    info: "Knocked on its side — 98° axial tilt. each pole gets 42 years of sunlight, then 42 years of dark.",
  },
  {
    name: "Neptune", kind: "neptune", radius: 0.26, dist: 48, au: 30.1, speed: 0.018, tilt: 0.49, orbitTilt: 0.03, rotSpeed: 0.55,
    atmosphere: "#5a7dff", atmoStrength: 0.6,
    moons: [{ name: "Triton", radius: 0.018, dist: 0.65, speed: 0.35, texture: "triton" }],
    info: "The windiest world — supersonic gales at 2,100 km/h. Found by mathematics before telescopes saw it.",
  },
  {
    name: "Pluto", kind: "pluto", radius: 0.012, dist: 54, au: 39.5, speed: 0.014, tilt: 0.3, orbitTilt: 0.16, rotSpeed: 0.08,
    moons: [{ name: "Charon", radius: 0.006, dist: 0.06, speed: 0.25, color: "#9a9288" }],
    info: "Dwarf planet with a heart-shaped nitrogen glacier. Charon is so large they orbit a point between them.",
  },
];

/** Sol System sits high above the flight path (y+30) — physically apart from nebula (z50) and journey. */
export const SYSTEM_POS: [number, number, number] = [-24, 30, 80];
export const SUN_RADIUS = 4.8;

function PlanetBody({ cfg, selected, onSelect }: { cfg: PlanetCfg; selected: boolean; onSelect: (name: string | null) => void }) {
  const pivot = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const moonRefs = useRef<(THREE.Mesh | null)[]>([]);
  const initialAngle = useMemo(() => Math.random() * Math.PI * 2, []);
  const texs = useMemo(() => getPlanetTextures(cfg.kind), [cfg.kind]);

  useFrame((state, dt) => {
    if (pivot.current) pivot.current.rotation.y += cfg.speed * dt * 0.35;
    if (spin.current) spin.current.rotation.y += cfg.rotSpeed * dt * 0.5;
    cfg.moons?.forEach((m, i) => {
      const mesh = moonRefs.current[i];
      if (!mesh) return;
      const t = state.clock.elapsedTime * m.speed * 0.5 + i * 2.1;
      mesh.position.set(Math.cos(t) * m.dist, Math.sin(t * 0.6) * m.dist * 0.12, Math.sin(t) * m.dist);
    });
  });

  return (
    <group rotation={[cfg.orbitTilt, 0, 0]}>
      <group ref={pivot} rotation={[0, initialAngle, 0]}>
        <group position={[cfg.dist, 0, 0]}>
          <group ref={spin} rotation={[cfg.tilt, 0, 0]}>
            <mesh
              onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : cfg.name); }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "")}
            >
              <sphereGeometry args={[cfg.radius, 96, 96]} />
              <meshStandardMaterial
                map={texs.map}
                bumpMap={texs.bump ?? null}
                bumpScale={cfg.radius * 0.05}
                roughness={0.92}
                metalness={0}
              />
            </mesh>
            {cfg.atmosphere && (
              <mesh scale={1.035}>
                <sphereGeometry args={[cfg.radius, 64, 64]} />
                <shaderMaterial
                  vertexShader={ATMO_VERT}
                  fragmentShader={ATMO_FRAG}
                  transparent
                  blending={THREE.AdditiveBlending}
                  side={THREE.BackSide}
                  depthWrite={false}
                  uniforms={{
                    uColor: { value: new THREE.Color(cfg.atmosphere) },
                    uStrength: { value: cfg.atmoStrength ?? 1 },
                  }}
                />
              </mesh>
            )}
            {cfg.ring && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[cfg.radius * (cfg.ringInner ?? 1.2), cfg.radius * (cfg.ringOuter ?? 2), 128, 1]} />
                <meshBasicMaterial
                  map={getRingTexture(cfg.ring)}
                  transparent
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
            {cfg.moons?.map((m, i) => {
              const mtex = m.texture ? getPlanetTextures(m.texture) : null;
              return (
                <mesh
                  key={m.name}
                  ref={(r) => { moonRefs.current[i] = r; }}
                  onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : cfg.name); }}
                >
                  <sphereGeometry args={[m.radius, 48, 48]} />
                  <meshStandardMaterial
                    map={mtex?.map ?? null}
                    color={mtex ? "#ffffff" : m.color ?? "#b0aca4"}
                    roughness={0.95}
                    flatShading={!mtex}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      </group>
    </group>
  );
}

function OrbitLine({ radius, tilt, active }: { radius: number; tilt: number; active: boolean }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
    return new Float32Array(pts);
  }, [radius]);

  return (
    <group rotation={[tilt, 0, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geo, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={active ? "#8b7bff" : "#2a2a3f"} transparent opacity={active ? 0.8 : 0.35} depthWrite={false} />
      </line>
    </group>
  );
}

export function SolarSystem({ onInfo }: { onInfo: (cfg: PlanetCfg | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const belt = useRef<THREE.InstancedMesh>(null);

  const beltMatrices = useMemo(() => {
    const COUNT = 900;
    const mats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 15.5 + Math.random() * 2.5;
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.25, Math.sin(a) * r);
      const s = 0.008 + Math.random() * 0.03;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
    return mats;
  }, []);

  useFrame((_, dt) => {
    if (belt.current) belt.current.rotation.y += dt * 0.03;
  });

  return (
    <group position={SYSTEM_POS}>
      <Sun />
      {PLANETS.map((p) => (
        <OrbitLine key={p.name} radius={p.dist} tilt={p.orbitTilt} active={selected === p.name} />
      ))}
      {PLANETS.map((p) => (
        <PlanetBody
          key={p.name}
          cfg={p}
          selected={selected === p.name}
          onSelect={(name) => {
            setSelected(name);
            onInfo(name ? PLANETS.find((x) => x.name === name) ?? null : null);
          }}
        />
      ))}
      <instancedMesh
        key={beltMatrices.length}
        ref={(m) => {
          if (m) {
            beltMatrices.forEach((mat, i) => m.setMatrixAt(i, mat));
            m.instanceMatrix.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, beltMatrices.length]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a4552" roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

function Sun() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const corona = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
    if (corona.current) corona.current.uniforms.uTime.value += dt;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS, 96, 96]} />
        <shaderMaterial
          ref={mat}
          vertexShader={SUN_VERT}
          fragmentShader={SUN_FRAG}
          toneMapped={false}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <shaderMaterial
          ref={corona}
          vertexShader={ATMO_VERT}
          fragmentShader={CORONA_FRAG}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={300} distance={300} decay={2} color="#fff2dc" />
    </group>
  );
}
