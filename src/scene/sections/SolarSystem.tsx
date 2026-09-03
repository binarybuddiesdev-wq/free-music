import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const PLANET_VERT = `
varying vec3 vNormal;
varying vec3 vPos;
void main(){
  vNormal = normalMatrix * normal;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PLANET_FRAG = `
uniform float uTime;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uNoiseScale;
uniform float uFlow;
uniform float uBanding;
uniform vec3 lightDir;
varying vec3 vNormal;
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
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
  return v;
}

void main(){
  vec3 n = normalize(vNormal);
  float diff = clamp(dot(n, normalize(lightDir)), 0.0, 1.0);
  float terminator = smoothstep(0.0, 0.3, diff);

  /* stretch noise along latitude for gas-giant banding when uBanding > 0 */
  vec3 samplePos = vPos * uNoiseScale;
  samplePos.y *= mix(1.0, 6.0, uBanding);
  float b = fbm(samplePos + vec3(0.0, uTime * uFlow, 0.0));
  b = b * 0.5 + 0.5;

  vec3 col = mix(uColA, uColB, smoothstep(0.2, 0.8, b));
  col = mix(col, uColC, smoothstep(0.72, 0.95, b));

  float fres = pow(1.0 - clamp(dot(n, normalize(cameraPosition - vPos)), 0.0, 1.0), 2.5);
  col += uColC * fres * 0.35;
  col *= (0.14 + terminator * 1.05);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ATMO_VERT = `
varying vec3 vNormal;
void main(){
  vNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMO_FRAG = `
uniform vec3 uColor;
varying vec3 vNormal;
void main(){
  float rim = pow(1.0 - abs(normalize(vNormal).z), 3.0);
  gl_FragColor = vec4(uColor * rim * 1.6, rim * 0.55);
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
  float n = fbm(vPos * 2.4 + vec3(uTime * 0.12));
  vec3 col = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.85, 0.5), n);
  col += vec3(1.0, 0.6, 0.2) * pow(n, 3.0) * 2.0;
  gl_FragColor = vec4(col * 2.6, 1.0);
}
`;

const CORONA_FRAG = `
uniform float uTime;
varying vec3 vNormal;
void main(){
  float rim = pow(1.0 - abs(normalize(vNormal).z), 2.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.4);
  gl_FragColor = vec4(vec3(1.0, 0.55, 0.2) * rim * 2.4 * pulse, rim * 0.55);
}
`;

export type MoonCfg = { name: string; radius: number; dist: number; speed: number; color: string };

export type PlanetCfg = {
  name: string;
  radius: number;
  dist: number;
  au: number;
  speed: number;
  tilt: number;
  orbitTilt: number;
  noiseScale: number;
  flow: number;
  banding: number;
  colors: [string, string, string];
  atmosphere?: string;
  atmoStrength?: number;
  ring?: { inner: number; outer: number; color: string; opacity: number };
  moons?: MoonCfg[];
  info: string;
};

/** Real Sol system — colors sampled from NASA imagery, distances/radii artistically compressed. */
export const PLANETS: PlanetCfg[] = [
  {
    name: "Mercury", radius: 0.25, dist: 3.6, au: 0.39, speed: 0.30, tilt: 0.001, orbitTilt: 0.02,
    noiseScale: 6.5, flow: 0.0, banding: 0,
    colors: ["#3a3a40", "#8c8c94", "#c8c8cc"],
    info: "Closest to the Sun. A cratered, airless world that roasts by day and freezes by night. Orbital period: 88 days.",
  },
  {
    name: "Venus", radius: 0.45, dist: 4.9, au: 0.72, speed: 0.22, tilt: 3.09, orbitTilt: 0.03,
    noiseScale: 3.2, flow: 0.25, banding: 0.4,
    colors: ["#8a5a2a", "#d9a86a", "#f5e6c8"], atmosphere: "#e8cd9a", atmoStrength: 1.2,
    info: "Wrapped in sulfuric acid clouds. Runaway greenhouse makes it the hottest planet — 465°C, day and night.",
  },
  {
    name: "Earth", radius: 0.48, dist: 6.3, au: 1.0, speed: 0.19, tilt: 0.41, orbitTilt: 0,
    noiseScale: 3.0, flow: 0.06, banding: 0,
    colors: ["#0b2e59", "#1565c0", "#dceeff"], atmosphere: "#6ab8ff", atmoStrength: 1.0,
    moons: [{ name: "Luna", radius: 0.13, dist: 1.15, speed: 1.1, color: "#c8c8cc" }],
    info: "The only known living world. 71% ocean, one large moon stabilizing its tilt — and everyone you've ever met.",
  },
  {
    name: "Mars", radius: 0.30, dist: 8.0, au: 1.52, speed: 0.15, tilt: 0.44, orbitTilt: 0.03,
    noiseScale: 4.5, flow: 0.20, banding: 0,
    colors: ["#4a1e0e", "#b5522a", "#e8a878"], atmosphere: "#ff9a6a", atmoStrength: 0.45,
    moons: [
      { name: "Phobos", radius: 0.035, dist: 0.65, speed: 2.6, color: "#8a7a6a" },
      { name: "Deimos", radius: 0.02, dist: 0.95, speed: 1.6, color: "#9a8a7a" },
    ],
    info: "The rust-red desert world. Home of Olympus Mons — a volcano three times the height of Everest.",
  },
  {
    name: "Jupiter", radius: 1.5, dist: 12.5, au: 5.2, speed: 0.08, tilt: 0.05, orbitTilt: 0.01,
    noiseScale: 1.8, flow: 0.35, banding: 0.85,
    colors: ["#8a6a4a", "#d9b98a", "#f5e8d0"], atmosphere: "#e8b878", atmoStrength: 0.5,
    moons: [
      { name: "Io", radius: 0.09, dist: 2.1, speed: 1.3, color: "#e8d878" },
      { name: "Europa", radius: 0.08, dist: 2.7, speed: 1.0, color: "#e8e4dc" },
      { name: "Ganymede", radius: 0.12, dist: 3.4, speed: 0.8, color: "#a89a88" },
      { name: "Callisto", radius: 0.11, dist: 4.2, speed: 0.6, color: "#6a6058" },
    ],
    info: "King of planets — 2.5× the mass of all others combined. The Great Red Spot is a storm older than photography.",
  },
  {
    name: "Saturn", radius: 1.3, dist: 16.5, au: 9.6, speed: 0.06, tilt: 0.47, orbitTilt: 0.02,
    noiseScale: 1.9, flow: 0.30, banding: 0.9,
    colors: ["#a88a4a", "#e8d0a0", "#f8f0dc"], atmosphere: "#e8d0a0", atmoStrength: 0.4,
    ring: { inner: 1.7, outer: 2.7, color: "#d8c8a8", opacity: 0.55 },
    moons: [
      { name: "Titan", radius: 0.11, dist: 3.6, speed: 0.7, color: "#d9a04a" },
      { name: "Rhea", radius: 0.05, dist: 4.4, speed: 0.5, color: "#c8c4bc" },
    ],
    info: "Less dense than water. Its rings are 280,000 km wide but sometimes just 10 meters thick. 146 known moons.",
  },
  {
    name: "Uranus", radius: 0.75, dist: 21, au: 19.2, speed: 0.042, tilt: 1.71, orbitTilt: 0.05,
    noiseScale: 2.4, flow: 0.12, banding: 0.6,
    colors: ["#4a8a8a", "#8ac8c8", "#d8f0f0"], atmosphere: "#a8e8e8", atmoStrength: 0.6,
    ring: { inner: 1.05, outer: 1.35, color: "#9ad8d8", opacity: 0.22 },
    info: "Knocked on its side — 98° axial tilt. Each pole gets 42 years of sunlight, then 42 years of dark.",
  },
  {
    name: "Neptune", radius: 0.72, dist: 25, au: 30.1, speed: 0.033, tilt: 0.49, orbitTilt: 0.03,
    noiseScale: 2.6, flow: 0.15, banding: 0.55,
    colors: ["#1a2a6a", "#2a5ac8", "#8ab8f8"], atmosphere: "#6a8aff", atmoStrength: 0.7,
    moons: [{ name: "Triton", radius: 0.08, dist: 1.6, speed: 0.9, color: "#d8c0c8" }],
    info: "The windiest world — supersonic gales at 2,100 km/h. Discovered by mathematics before telescopes found it.",
  },
  {
    name: "Pluto", radius: 0.14, dist: 28.5, au: 39.5, speed: 0.027, tilt: 0.3, orbitTilt: 0.16,
    noiseScale: 6.0, flow: 0.0, banding: 0,
    colors: ["#6a5a4a", "#b0a08a", "#e0d8c8"],
    moons: [{ name: "Charon", radius: 0.07, dist: 0.5, speed: 0.8, color: "#9a9288" }],
    info: "Dwarf planet with a heart-shaped nitrogen glacier. Charon is so large they orbit a point between them.",
  },
];

export const SYSTEM_POS: [number, number, number] = [-24, 0.5, 68];

function Planet({
  cfg,
  selected,
  onSelect,
}: { cfg: PlanetCfg; selected: boolean; onSelect: (name: string | null) => void }) {
  const pivot = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const moonRefs = useRef<(THREE.Mesh | null)[]>([]);
  const initialAngle = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
    if (pivot.current) pivot.current.rotation.y += cfg.speed * dt * 0.35;
    if (spin.current) spin.current.rotation.y += dt * 0.18;
    cfg.moons?.forEach((m, i) => {
      const mesh = moonRefs.current[i];
      if (!mesh) return;
      const t = state.clock.elapsedTime * m.speed + i * 2.1;
      mesh.position.set(Math.cos(t) * m.dist, Math.sin(t * 0.6) * m.dist * 0.15, Math.sin(t) * m.dist);
    });
  });

  const lightDir = useMemo(() => new THREE.Vector3(0, 0.35, 0.4).normalize(), []);

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
              <sphereGeometry args={[cfg.radius, 72, 72]} />
              <shaderMaterial
                ref={mat}
                vertexShader={PLANET_VERT}
                fragmentShader={PLANET_FRAG}
                uniforms={{
                  uTime: { value: cfg.dist },
                  uNoiseScale: { value: cfg.noiseScale },
                  uFlow: { value: cfg.flow },
                  uBanding: { value: cfg.banding },
                  uColA: { value: new THREE.Color(cfg.colors[0]) },
                  uColB: { value: new THREE.Color(cfg.colors[1]) },
                  uColC: { value: new THREE.Color(cfg.colors[2]) },
                  lightDir: { value: lightDir },
                }}
              />
            </mesh>
            {cfg.atmosphere && (
              <mesh scale={1 + 0.07 * (cfg.atmoStrength ?? 1)}>
                <sphereGeometry args={[cfg.radius, 48, 48]} />
                <shaderMaterial
                  vertexShader={ATMO_VERT}
                  fragmentShader={ATMO_FRAG}
                  transparent
                  blending={THREE.AdditiveBlending}
                  side={THREE.BackSide}
                  depthWrite={false}
                  uniforms={{ uColor: { value: new THREE.Color(cfg.atmosphere) } }}
                />
              </mesh>
            )}
            {cfg.ring && (
              <mesh rotation={[Math.PI / 2 + cfg.tilt * 0.3, 0, 0]}>
                <ringGeometry args={[cfg.ring.inner, cfg.ring.outer, 96, 1]} />
                <meshBasicMaterial
                  color={cfg.ring.color}
                  transparent
                  opacity={cfg.ring.opacity}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
            {cfg.moons?.map((m, i) => (
              <mesh
                key={m.name}
                ref={(r) => { moonRefs.current[i] = r; }}
                onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : cfg.name); }}
              >
                <icosahedronGeometry args={[m.radius, 2]} />
                <meshStandardMaterial color={m.color} roughness={0.95} flatShading />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

function OrbitLine({ radius, tilt, active }: { radius: number; tilt: number; active: boolean }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
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
    const COUNT = 700;
    const mats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 9.2 + Math.random() * 1.4;
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.4, Math.sin(a) * r);
      const s = 0.015 + Math.random() * 0.05;
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
        <Planet
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
        <meshStandardMaterial color="#5a5565" roughness={1} flatShading />
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
        <sphereGeometry args={[2.0, 64, 64]} />
        <shaderMaterial
          ref={mat}
          vertexShader={PLANET_VERT}
          fragmentShader={SUN_FRAG}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>
      <mesh scale={1.4}>
        <sphereGeometry args={[2.0, 48, 48]} />
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
      <pointLight position={[0, 0, 0]} intensity={160} distance={160} decay={2} color="#ffd9a0" />
    </group>
  );
}
