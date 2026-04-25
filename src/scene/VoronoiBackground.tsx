import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore, SKY_PROFILES } from '../store/sceneStore';

/**
 * Voronoi (Worley noise 1996) 셰이더 — 잎맥/세포/갈라진 땅 패턴.
 * 화면 뒷쪽 (z=-7) 옅은 plane. 셀이 시간 따라 천천히 이동.
 * WebcamPlane(z=-8) 앞, 사람/창조물(z>0) 뒤. additive로 매우 옅게.
 */
const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */`
uniform float uTime;
uniform float uAspect;
uniform vec3 uTint;
varying vec2 vUv;

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float voronoi(vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float md = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      o = 0.5 + 0.5 * sin(uTime * 0.25 + 6.2831 * o);
      vec2 d = g + o - f;
      md = min(md, dot(d, d));
    }
  }
  return sqrt(md);
}

void main() {
  vec2 uv = vUv;
  uv.x *= uAspect;
  uv *= 5.5;
  float d = voronoi(uv);
  // 셀 가장자리 강조 (edge enhancement)
  float edge = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.05, 0.15, d));
  vec3 col = uTint * edge * 0.7;
  // 셀 내부 옅은 그라디언트 (tint의 1/3 어두운 색)
  col += uTint * 0.2 * (1.0 - d);
  gl_FragColor = vec4(col, 0.18); // 매우 옅음
}
`;

const PLANE_DISTANCE = -7;

export function VoronoiBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uTint: { value: new THREE.Vector3(0.4, 0.7, 1.0) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const targetTint = useMemo(() => new THREE.Vector3(0.4, 0.7, 1.0), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
    if (!meshRef.current) return;
    const cam = camera as THREE.PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fovRad / 2) * Math.abs(PLANE_DISTANCE);
    const aspect = size.width / size.height;
    const width = height * aspect;
    meshRef.current.scale.set(width, height, 1);
    material.uniforms.uAspect.value = aspect;

    // skyMode 색을 lerp
    const skyMode = useSceneStore.getState().skyMode;
    const t = SKY_PROFILES[skyMode].voronoiColor;
    targetTint.set(t[0], t[1], t[2]);
    (material.uniforms.uTint.value as THREE.Vector3).lerp(targetTint, Math.min(1, dt * 1.5));
  });

  return (
    <mesh ref={meshRef} position={[0, 0, PLANE_DISTANCE]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
