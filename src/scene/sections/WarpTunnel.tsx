import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "../../hooks/useScrollTimeline";

const VERT = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uSpeed;
uniform float uSize;
varying float vAlpha;

void main() {
  vec3 p = position;
  float z = mod(p.z + uTime * uSpeed * (0.5 + aRand), 90.0) - 45.0;
  p.z = z;
  p.x *= 1.0 + aRand * 0.02;
  p.y *= 1.0 + aRand * 0.02;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + aRand) * (14.0 / -mv.z);
  vAlpha = clamp(uSpeed * 1.2, 0.15, 1.0) * (0.3 + aRand * 0.7);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
varying float vAlpha;
uniform vec3 uColorA;
uniform vec3 uColorB;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (abs(c.x) > 0.5 || abs(c.y) > 0.5) discard;
  vec2 stretched = vec2(c.x * 6.0, c.y * 1.2);
  float d = length(stretched);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  vec3 col = mix(uColorA, uColorB, vAlpha);
  gl_FragColor = vec4(col, a);
}
`;

export function WarpTunnel({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.pow(Math.random(), 0.6) * 12;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius;
      arr[i * 3 + 2] = Math.random() * 90 - 45;
    }
    return arr;
  }, [count]);

  const rands = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random();
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (!mat.current) return;
    const local = scrollState.damped * 7 - 1;
    const speed = THREE.MathUtils.clamp(2 + Math.abs(scrollState.velocity) * 60 + Math.sin(local * Math.PI) * 6, 2, 12);
    mat.current.uniforms.uSpeed.value = THREE.MathUtils.lerp(mat.current.uniforms.uSpeed.value, speed, 0.05);
    mat.current.uniforms.uTime.value += dt;
  });

  return (
    <group position={[0, 0, 38]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
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
            uTime: { value: 0 },
            uSpeed: { value: 2 },
            uSize: { value: 34.0 },
            uColorA: { value: new THREE.Color("#ffffff") },
            uColorB: { value: new THREE.Color("#8b7bff") },
          }}
        />
      </points>
    </group>
  );
}
