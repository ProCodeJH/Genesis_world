import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';

const MAX_PLASMA = 50;

/**
 * 데모씬 Plasma 셰이더 — sin 합성으로 "타오르는" 표면.
 * 1990년대 데모씬 클래식이 GPU fragment shader로 부활.
 * 모든 plasma shape entity는 한 InstancedMesh로 그려짐 (단일 draw call).
 */
const VERT = /* glsl */`
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  vWorldPos = (modelMatrix * wp).xyz;
  vec3 instNormal = normalize(mat3(instanceMatrix) * normal);
  vNormal = normalize(normalMatrix * instNormal);
  gl_Position = projectionMatrix * modelViewMatrix * wp;
}
`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 p = vWorldPos * 1.5;
  float v = sin(p.x * 3.5 + uTime * 1.2);
  v += sin(p.y * 2.7 + uTime * 1.5);
  v += sin(p.z * 3.1 + uTime * 0.9);
  v += sin(length(p) * 4.5 - uTime * 2.3);
  v = v * 0.25 + 0.5;

  float light = max(0.35, dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))));
  vec3 plasma = mix(uColorA, uColorB, smoothstep(0.25, 0.75, v));
  vec3 col = plasma * (0.6 + light * 0.6) * 1.8;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function PlasmaSphere() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorA = useMemo(() => new THREE.Color(0, 0, 0), []);
  const colorB = useMemo(() => new THREE.Color(0, 0, 0), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ff00ff') },
        uColorB: { value: new THREE.Color('#00ffff') },
      },
      transparent: false,
    });
  }, []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
    if (!ref.current) return;
    let n = 0;
    let aR = 0, aG = 0, aB = 0;
    for (const c of [...queries.creations]) {
      if (c.shape !== 'plasma') continue;
      if (n >= MAX_PLASMA) break;
      const sBase = c.scale ?? 0.1;
      const t = performance.now() * 0.001;
      const pulse = 1 + Math.sin(t * 3 + (c.seed ?? 0)) * 0.15;
      dummy.position.set(c.position![0], c.position![1], c.position![2]);
      dummy.rotation.set(c.rotation![0], c.rotation![1], c.rotation![2]);
      dummy.scale.setScalar(sBase * pulse * 1.4);
      dummy.updateMatrix();
      ref.current.setMatrixAt(n, dummy.matrix);
      const cc = c.primaryColor ?? [1, 1, 1];
      aR += cc[0]; aG += cc[1]; aB += cc[2];
      n++;
    }
    ref.current.count = n;
    ref.current.instanceMatrix.needsUpdate = true;

    if (n > 0) {
      colorA.setRGB(aR / n, aG / n, aB / n);
      // colorB = colorA의 보색 + 채도 부스트
      const hsl = { h: 0, s: 0, l: 0 };
      colorA.getHSL(hsl);
      colorB.setHSL((hsl.h + 0.5) % 1, Math.min(1, hsl.s + 0.3), 0.6);
      material.uniforms.uColorA.value.copy(colorA);
      material.uniforms.uColorB.value.copy(colorB);
    }
  });

  return (
    <instancedMesh ref={ref} args={[undefined, material, MAX_PLASMA]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 3]} />
    </instancedMesh>
  );
}
