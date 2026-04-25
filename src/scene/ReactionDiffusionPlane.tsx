import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rdStep, rdReadInto, RD_W, RD_H } from '../world/systems/reactionDiffusionSystem';

/**
 * Turing 패턴 plane — 화면 우측 아래 모서리에 작게.
 * Gray-Scott 시뮬레이션 결과를 DataTexture로 매핑.
 * 옅은 발광 (additive blending).
 */
export function ReactionDiffusionPlane() {
  const buffer = useMemo(() => new Uint8Array(RD_W * RD_H * 4), []);
  const texture = useMemo(() => {
    const tex = new THREE.DataTexture(buffer, RD_W, RD_H, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [buffer]);

  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  let stepFrame = 0;

  useFrame(() => {
    stepFrame++;
    // 매 2 프레임에 4 step → 안정적인 진화 속도
    if (stepFrame % 2 === 0) {
      rdStep(4);
      rdReadInto(buffer, [0.5, 0.85, 1.0]);
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh position={[2.6, -1.8, 0.5]}>
      <planeGeometry args={[1.4, 1.4]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
