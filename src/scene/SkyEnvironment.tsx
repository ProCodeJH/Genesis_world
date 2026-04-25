import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore, SKY_PROFILES } from '../store/sceneStore';

const LERP_RATE = 1.5;

/**
 * Sky 환경 통합 — background color + ambient light가 skyMode에 따라 부드럽게 전환.
 * Scene 안의 기존 <color attach="background"> + <ambientLight> 대체.
 */
export function SkyEnvironment() {
  const skyMode = useSceneStore((s) => s.skyMode);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const { scene } = useThree();

  // scene.background가 Color가 아니면 초기화
  useMemo(() => {
    if (!(scene.background instanceof THREE.Color)) {
      scene.background = new THREE.Color('#000');
    }
  }, [scene]);

  const targetBg = useMemo(() => new THREE.Color(SKY_PROFILES[skyMode].bgColor), [skyMode]);
  const targetAmb = useMemo(() => new THREE.Color(SKY_PROFILES[skyMode].ambientColor), [skyMode]);

  useFrame((_, dt) => {
    const profile = SKY_PROFILES[skyMode];
    const k = Math.min(1, dt * LERP_RATE);

    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(targetBg, k);
    }

    const amb = ambientRef.current;
    if (amb) {
      amb.color.lerp(targetAmb, k);
      amb.intensity = THREE.MathUtils.lerp(amb.intensity, profile.ambientIntensity, k);
    }
  });

  return <ambientLight ref={ambientRef} intensity={0.3} />;
}
