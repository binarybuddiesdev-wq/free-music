import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const VERT = /* glsl */ `
attribute vec3 aTarget;
attribute float aRand;
uniform float uMorph;
uniform float uTime;
uniform float uSize;
varying float vFade;

void main() {
  float t = clamp(uMorph * 1.35 - aRand * 0.35, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  vec3 chaotic = position;
  chaotic.x += sin(uTime * 0.4 + aRand * 20.0) * 0.4;
  chaotic.y += cos(uTime * 0.3 + aRand * 15.0) * 0.4;
  chaotic.z += sin(uTime * 0.5 + aRand * 10.0) * 0.3;

  vec3 p = mix(chaotic, aTarget, t);
  vFade = t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (1.0 + aRand) * (14.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * (0.35 + vFade * 0.65);
  vec3 col = mix(uColorA, uColorB, vFade);
  gl_FragColor = vec4(col, alpha);
}
`;

function sampleWordmark(text: string, count: number): Float32Array {
  const canvas = document.createElement("canvas");
  const W = 1024;
  const H = 256;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = "700 170px 'Instrument Serif', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + 8);

  const data = ctx.getImageData(0, 0, W, H).data;
  const targets: number[] = [];
  let attempts = 0;
  while (targets.length < count * 3 && attempts < count * 60) {
    const x = Math.floor(Math.random() * W);
    const y = Math.floor(Math.random() * H);
    attempts++;
    if (data[(y * W + x) * 4 + 3] > 128) {
      targets.push((x / W - 0.5) * 14, (0.5 - y / H) * 3.5, (Math.random() - 0.5) * 0.5);
    }
  }
  while (targets.length < count * 3) targets.push(0, 0, 0);
  return new Float32Array(targets);
}

export function HeroMorph({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const morph = useRef(0);

  const { positions, targets, rands } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 30;
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) rands[i] = Math.random();
    const targets = sampleWordmark("AETHER", count);
    return { positions, targets, rands };
  }, [count]);

  useFrame((_, dt) => {
    morph.current = Math.min(1, morph.current + dt * 0.18);
    if (mat.current) mat.current.uniforms.uMorph.value = morph.current;
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <group>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aTarget" args={[targets, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uMorph: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: 26.0 },
            uColorA: { value: new THREE.Color("#58e6d9") },
            uColorB: { value: new THREE.Color("#8b7bff") },
          }}
        />
      </points>
    </group>
  );
}
