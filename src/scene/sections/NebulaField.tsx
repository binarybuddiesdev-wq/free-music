import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute289(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute289(permute289(permute289(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, p0), dot(x1, p0), dot(x2, p1), dot(x3, p2)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p0, x1), dot(p1, x2), dot(p2, x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return v;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uSeed;
uniform float uScale;
varying vec2 vUv;

${"__NOISE__"}

void main() {
  vec2 uv = vUv;
  vec2 centered = (uv - 0.5) * 2.0;

  vec3 q = vec3(uv * uScale, uTime * 0.06 + uSeed);
  vec3 warped = vec3(q + fbm(q + vec3(uSeed)));
  float n = fbm(warped);

  float band = smoothstep(-0.6, 0.8, n);
  float falloff = smoothstep(1.4, 0.0, length(centered));

  vec3 col = mix(uColorA, uColorB, band);
  col = mix(col, uColorC, smoothstep(0.55, 0.95, n));

  float alpha = band * falloff * 0.55;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function NebulaField({ layers }: { layers: number }) {
  const group = useRef<THREE.Group>(null!);
  const mats = useRef<THREE.ShaderMaterial[]>([]);

  const layerCfg = useMemo(
    () =>
      [
        { pos: [0, 0, 62] as const, scale: 60, uScale: 2.2, seed: 0.0 },
        { pos: [-8, 2, 68] as const, scale: 70, uScale: 3.1, seed: 4.7 },
        { pos: [4, -3, 74] as const, scale: 80, uScale: 2.6, seed: 9.2 },
      ].slice(0, layers),
    [layers]
  );

  useFrame((_, dt) => {
    for (const m of mats.current) if (m) m.uniforms.uTime.value += dt;
  });

  return (
    <group ref={group}>
      {layerCfg.map((cfg, i) => (
        <mesh key={i} position={cfg.pos as unknown as THREE.Vector3Tuple} frustumCulled={false}>
          <planeGeometry args={[cfg.scale, cfg.scale * 0.7]} />
          <shaderMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            vertexShader={VERT}
            fragmentShader={FRAG.replace("__NOISE__", NOISE_GLSL)}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={{
              uTime: { value: cfg.seed * 10 },
              uColorA: { value: new THREE.Color("#1a1038") },
              uColorB: { value: new THREE.Color("#6b4dff") },
              uColorC: { value: new THREE.Color("#ff8a5c") },
              uSeed: { value: cfg.seed },
              uScale: { value: cfg.uScale },
            }}
          />
        </mesh>
      ))}
      <Embers />
    </group>
  );
}

function Embers() {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const COUNT = 900;

  const { positions, rands } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const rands = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 30 - 15 + 2;
      positions[i * 3 + 2] = 60 + Math.random() * 20;
      rands[i] = Math.random();
    }
    return { positions, rands };
  }, []);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uTime: { value: 0 }, uSize: { value: 30 } }}
        vertexShader={/* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uSize;
varying float vA;
void main() {
  vec3 p = position;
  p.y += mod(uTime * (0.3 + aRand * 0.5) + aRand * 40.0, 30.0) - 15.0;
  p.x += sin(uTime * 0.5 + aRand * 30.0) * 0.8;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aRand * (14.0 / -mv.z);
  vA = 0.5 + aRand * 0.5;
  gl_Position = projectionMatrix * mv;
}
`}
        fragmentShader={/* glsl */ `
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vec3(1.0, 0.62, 0.36), smoothstep(0.5, 0.0, d) * vA * 0.8);
}
`}
      />
    </points>
  );
}
