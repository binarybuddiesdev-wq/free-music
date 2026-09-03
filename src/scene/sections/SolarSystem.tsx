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

  float b = fbm(vPos * uNoiseScale + vec3(0.0, uTime * uFlow, 0.0));
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

export type MoonCfg = { radius: number; dist: number; speed: number; color: string };
export type PlanetCfg = {
  name: string;
  radius: number;
  dist: number;
  speed: number;
  tilt: number;
  noiseScale: number;
  flow: number;
  colors: [string, string, string];
  atmosphere?: string;
  ring?: { inner: number; outer: number; color: string };
  moons?: MoonCfg[];
  info: string;
};

export const PLANETS: PlanetCfg[] = [
  {
    name: "Vulcan", radius: 0.55, dist: 5.2, speed: 0.50, tilt: 0.02, noiseScale: 5.0, flow: 0.10,
    colors: ["#3a2a20", "#8a5a3a", "#e8a25c"], atmosphere: "#ff9a5c",
    moons: [{ radius: 0.12, dist: 1.2, speed: 1.8, color: "#9a8a78" }],
    info: "Scorched iron world hugging the star. One cratered moon.",
  },
  {
    name: "Cerulea", radius: 0.85, dist: 7.8, speed: 0.36, tilt: 0.35, noiseScale: 3.4, flow: 0.16,
    colors: ["#0a2a4a", "#2a7aaa", "#bfe8ff"], atmosphere: "#6ab8ff",
    moons: [{ radius: 0.16, dist: 1.7, speed: 1.4, color: "#c8c8d0" }],
    info: "Ocean world. Cyclone bands churn beneath a blue haze.",
  },
  {
    name: "Verdant", radius: 0.95, dist: 11.0, speed: 0.27, tilt: 0.41, noiseScale: 2.8, flow: 0.05,
    colors: ["#122a18", "#3a7a3a", "#d8e8b0"], atmosphere: "#7ade8a",
    moons: [
      { radius: 0.14, dist: 1.8, speed: 1.2, color: "#b0a898" },
      { radius: 0.09, dist: 2.6, speed: 0.8, color: "#8a8880" },
    ],
    info: "Life-bearing. Two moons pull at its tides.",
  },
  {
    name: "Rubra", radius: 0.75, dist: 14.4, speed: 0.21, tilt: 0.44, noiseScale: 4.2, flow: 0.28,
    colors: ["#3a1010", "#a83a2a", "#ff9a6a"], atmosphere: "#ff6a4a",
    info: "Rust-red desert. Global dust storms seasonally veil it.",
  },
  {
    name: "Titanhold", radius: 2.0, dist: 21.5, speed: 0.13, tilt: 0.05, noiseScale: 2.0, flow: 0.22,
    colors: ["#4a3018", "#c89858", "#f8e8c8"], atmosphere: "#e8b878",
    ring: { inner: 2.7, outer: 4.4, color: "#d8c8a8" },
    moons: [
      { radius: 0.18, dist: 5.2, speed: 0.6, color: "#a8a098" },
      { radius: 0.12, dist: 6.2, speed: 0.45, color: "#787880" },
      { radius: 0.10, dist: 7.2, speed: 0.35, color: "#989088" },
    ],
    info: "Gas giant with banded storms. Grand ring, three shepherd moons.",
  },
  {
    name: "Aurelia", radius: 1.7, dist: 27.5, speed: 0.09, tilt: 0.47, noiseScale: 2.2, flow: 0.18,
    colors: ["#2a2a48", "#7a6aaa", "#e8dff8"], atmosphere: "#b8a8e8",
    ring: { inner: 2.3, outer: 3.8, color: "#c8b8e8" },
    moons: [{ radius: 0.15, dist: 4.6, speed: 0.5, color: "#c0c0c8" }],
    info: "Ammonia-cloud giant tilted on its side. Delicate violet rings.",
  },
  {
    name: "Glacius", radius: 1.05, dist: 33.5, speed: 0.06, tilt: 0.49, noiseScale: 3.0, flow: 0.03,
    colors: ["#16324a", "#5aa8c8", "#e8f8ff"], atmosphere: "#9ae8ff",
    moons: [
      { radius: 0.13, dist: 2.2, speed: 0.9, color: "#d0d8e0" },
      { radius: 0.11, dist: 3.0, speed: 0.7, color: "#a8b0c0" },
      { radius: 0.08, dist: 3.8, speed: 0.55, color: "#c0c8d8" },
    ],
    info: "Ice giant. Methane winds exceed the speed of sound.",
  },
  {
    name: "Nyx", radius: 0.5, dist: 39.5, speed: 0.04, tilt: 0.30, noiseScale: 5.5, flow: 0.0,
    colors: ["#1a1424", "#3a3050", "#8a8aa8"], atmosphere: "#6a6a9a",
    moons: [{ radius: 0.17, dist: 1.1, speed: 1.0, color: "#505058" }],
    info: "The far dark one. A single oversize moon, mutually locked.",
  },
];

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
    if (pivot.current) pivot.current.rotation.y += cfg.speed * dt * 0.3;
    if (spin.current) spin.current.rotation.y += dt * 0.15;
    cfg.moons?.forEach((m, i) => {
      const mesh = moonRefs.current[i];
      if (!mesh) return;
      const t = state.clock.elapsedTime * m.speed + i * 2.1;
      mesh.position.set(Math.cos(t) * m.dist, Math.sin(t * 0.6) * m.dist * 0.15, Math.sin(t) * m.dist);
    });
  });

  const lightDir = useMemo(() => new THREE.Vector3(1, 0.35, 0.4).normalize(), []);

  return (
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
                uColA: { value: new THREE.Color(cfg.colors[0]) },
                uColB: { value: new THREE.Color(cfg.colors[1]) },
                uColC: { value: new THREE.Color(cfg.colors[2]) },
                lightDir: { value: lightDir },
              }}
            />
          </mesh>
          {cfg.atmosphere && (
            <mesh scale={1.07}>
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
            <mesh rotation={[Math.PI / 2 + cfg.tilt * 0.6, 0, 0]}>
              <ringGeometry args={[cfg.ring.inner, cfg.ring.outer, 96, 1]} />
              <meshBasicMaterial color={cfg.ring.color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )}
          {cfg.moons?.map((m, i) => (
            <mesh
              key={i}
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
  );
}

function OrbitLine({ radius, active }: { radius: number; active: boolean }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
    return new Float32Array(pts);
  }, [radius]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={active ? "#8b7bff" : "#2a2a3f"} transparent opacity={active ? 0.8 : 0.35} depthWrite={false} />
    </line>
  );
}

export function SolarSystem({ onInfo }: { onInfo: (cfg: PlanetCfg | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const system = useRef<THREE.Group>(null);
  const belt = useRef<THREE.InstancedMesh>(null);

  const beltMatrices = useMemo(() => {
    const COUNT = 500;
    const mats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 17.5 + Math.random() * 3.5;
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r);
      const s = 0.03 + Math.random() * 0.09;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
    return mats;
  }, []);

  useFrame((_, dt) => {
    if (system.current) system.current.rotation.y += dt * 0.006;
    if (belt.current) belt.current.rotation.y += dt * 0.02;
    if (system.current) {
      system.current.scale.setScalar(THREE.MathUtils.lerp(system.current.scale.x, selected ? 0.72 : 1, 0.04));
    }
  });

  return (
    <group ref={system} position={[-24, 0, 68]}>
      {/* sun */}
      <Sun />
      {PLANETS.map((p) => (
        <OrbitLine key={p.name} radius={p.dist} active={selected === p.name} />
      ))}
      {PLANETS.map((p) => (
        <Planet
          key={p.name}
          cfg={p}
          selected={selected === p.name}
          onSelect={(name) => {
            setSelected(name);
            const cfg = name ? PLANETS.find((x) => x.name === name) ?? null : null;
            onInfo(cfg);
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
        <sphereGeometry args={[2.6, 64, 64]} />
        <shaderMaterial
          ref={mat}
          vertexShader={PLANET_VERT}
          fragmentShader={SUN_FRAG}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>
      <mesh scale={1.35}>
        <sphereGeometry args={[2.6, 48, 48]} />
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
      <pointLight position={[0, 0, 0]} intensity={140} distance={140} decay={2} color="#ffd9a0" />
    </group>
  );
}
