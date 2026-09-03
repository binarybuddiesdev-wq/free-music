import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

function glyphTargets(count: number): Float32Array {
  const canvas = document.createElement("canvas");
  const W = 512;
  const H = 256;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = "400 90px 'Instrument Serif', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("aether", W / 2, H / 2);

  const data = ctx.getImageData(0, 0, W, H).data;
  const targets: number[] = [];
  let attempts = 0;
  while (targets.length < count * 3 && attempts < count * 60) {
    const x = Math.floor(Math.random() * W);
    const y = Math.floor(Math.random() * H);
    attempts++;
    if (data[(y * W + x) * 4 + 3] > 128) {
      targets.push((x / W - 0.5) * 11, (0.5 - y / H) * 5.5, (Math.random() - 0.5) * 1.2);
    }
  }
  while (targets.length < count * 3) targets.push(0, 0, 0);
  return new Float32Array(targets);
}

export function ConstellationOutro({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);
  const settled = useRef(0);

  const { positions, targets, rands } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 26;
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) rands[i] = Math.random();
    const targets = glyphTargets(count);
    return { positions, targets, rands };
  }, [count]);

  const linePositions = useMemo(() => new Float32Array((count - 1) * 6), [count]);

  useFrame((_, dt) => {
    settled.current = Math.min(1, settled.current + dt * 0.22);
    if (mat.current) {
      mat.current.uniforms.uMorph.value = settled.current;
      mat.current.uniforms.uTime.value += dt;
    }
    if (linesRef.current) {
      const g = linesRef.current.geometry;
      const attr = g.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const t = settled.current;
      const linkUntil = Math.floor(t * (count - 1));
      const step = Math.max(1, Math.floor((count - 1) / 900));
      let w = 0;
      let lastValid = -1;
      for (let i = 0; i < count - 1; i += step) {
        if (i > linkUntil) break;
        const tx = targets[i * 3], ty = targets[i * 3 + 1], tz = targets[i * 3 + 2];
        const nx = targets[(i + 1) * 3], ny = targets[(i + 1) * 3 + 1], nz = targets[(i + 1) * 3 + 2];
        if (Math.abs(tx) + Math.abs(ty) < 0.01) continue;
        if (Math.abs(nx) + Math.abs(ny) < 0.01) continue;
        if (lastValid >= 0) {
          arr[w * 6] = targets[lastValid * 3]; arr[w * 6 + 1] = targets[lastValid * 3 + 1]; arr[w * 6 + 2] = targets[lastValid * 3 + 2];
          arr[w * 6 + 3] = tx; arr[w * 6 + 4] = ty; arr[w * 6 + 5] = tz;
          w++;
          if (w >= 900) break;
        }
        lastValid = i;
      }
      for (let k = w * 6; k < arr.length; k++) arr[k] = 0;
      attr.needsUpdate = true;
    }
  });

  return (
    <group position={[-60, -3, 126]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aTarget" args={[targets, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uMorph: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: 22.0 },
            uColorA: { value: new THREE.Color("#8b7bff") },
            uColorB: { value: new THREE.Color("#58e6d9") },
          }}
          vertexShader={/* glsl */ `
attribute vec3 aTarget;
attribute float aRand;
uniform float uMorph;
uniform float uTime;
uniform float uSize;
varying float vFade;
void main() {
  float t = clamp(uMorph * 1.3 - aRand * 0.3, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 chaotic = position;
  chaotic.x += sin(uTime * 0.35 + aRand * 18.0) * 0.35;
  chaotic.y += cos(uTime * 0.3 + aRand * 14.0) * 0.35;
  vec3 p = mix(chaotic, aTarget, t);
  vFade = t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + aRand * 0.4) * (14.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`}
          fragmentShader={/* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  vec3 col = mix(uColorA, uColorB, vFade);
  gl_FragColor = vec4(col, smoothstep(0.5, 0.0, d) * (0.3 + vFade * 0.7));
}
`}
        />
      </points>
      <lineSegments ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#5d6bd8" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
