import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const DISK_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DISK_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  float r = vUv.y;
  float ang = vUv.x * 6.2831;

  float spin = uTime * 1.2;
  float shear = fbm(vec2(ang * 2.0 + spin / (0.25 + r), r * 14.0 - spin * 0.15));
  float streak = fbm(vec2(ang * 5.0 - spin / (0.15 + r * 0.8), r * 30.0));

  float density = smoothstep(0.0, 0.25, r) * smoothstep(1.0, 0.5, r);
  density *= 0.55 + shear * 0.5 + streak * 0.35;

  float doppler = 0.5 + 0.5 * cos(ang + 1.2);
  vec3 hot = vec3(1.0, 0.85, 0.6);
  vec3 cool = vec3(0.75, 0.35, 0.95);
  vec3 col = mix(cool, hot, doppler * (1.2 - r * 0.6));

  col *= 1.5 + doppler * 2.0;
  float alpha = clamp(density, 0.0, 1.0);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export function Singularity() {
  const diskMat = useRef<THREE.ShaderMaterial>(null!);
  const group = useRef<THREE.Group>(null!);

  useFrame(({ pointer }, dt) => {
    if (diskMat.current) diskMat.current.uniforms.uTime.value += dt;
    if (group.current) {
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, pointer.x * 0.08, 0.05);
    }
  });

  return (
    <group ref={group} position={[-40, 0, 86]}>
      {/* event horizon */}
      <mesh>
        <sphereGeometry args={[2.4, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* photon ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.62, 0.045, 16, 128]} />
        <meshBasicMaterial color="#fff5e0" toneMapped={false} />
      </mesh>

      {/* accretion disk, front and back halves rendered via two rings offset for parallax */}
      <mesh rotation={[Math.PI / 2.08, 0.25, 0]}>
        <ringGeometry args={[2.9, 7.4, 256, 1]} />
        <shaderMaterial
          ref={diskMat}
          vertexShader={DISK_VERT}
          fragmentShader={DISK_FRAG}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* lensing halo */}
      <mesh scale={1.02}>
        <sphereGeometry args={[2.4, 64, 64]} />
        <shaderMaterial
          vertexShader={/* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`}
          fragmentShader={/* glsl */ `
varying vec3 vNormal;
void main() {
  float rim = pow(1.0 - abs(normalize(vNormal).z), 2.2);
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.75) * rim * 2.2, rim * 0.9);
}
`}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <StarDome />
    </group>
  );
}

function StarDome() {
  const COUNT = 3000;
  const positions = useRef<Float32Array>(new Float32Array(0));
  if (positions.current.length === 0) {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const R = 55;
      arr[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = R * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = R * Math.cos(phi);
    }
    positions.current = arr;
  }

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.22} color="#cdd6ff" sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}
