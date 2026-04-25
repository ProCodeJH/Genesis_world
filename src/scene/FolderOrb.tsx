import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useFolderStore } from '../store/folderStore';
import { mapFolderToVisual } from '../mapping/visualMapping';

export function FolderOrb() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const pulsePhase = useRef(0);
  const radiusLerp = useRef(0.25);

  useFrame((_, dt) => {
    const state = useFolderStore.getState();
    const v = mapFolderToVisual(state);

    // 반지름 lerp
    radiusLerp.current = THREE.MathUtils.lerp(radiusLerp.current, v.orbRadius, Math.min(1, dt * 2));

    // 심박
    pulsePhase.current += dt * (v.heartbeatBPM / 60) * Math.PI * 2;
    const beat = (Math.sin(pulsePhase.current) + 1) * 0.5;
    const breathScale = 1 + beat * 0.06;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(radiusLerp.current * breathScale);
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + v.glowIntensity * (1.2 + beat * 0.8);
      mat.emissive.setRGB(v.ledColor[0], v.ledColor[1], v.ledColor[2]);
      coreRef.current.rotation.y += dt * 0.1;
      // 성장 시 추가 회전
      if (v.growthRate > 0) coreRef.current.rotation.y += dt * Math.min(1.5, v.growthRate / 1024);
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(radiusLerp.current * (1.5 + beat * 0.2));
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + v.glowIntensity * 0.45;
      mat.color.setRGB(v.ledColor[0], v.ledColor[1], v.ledColor[2]);
    }

    if (dustRef.current) {
      dustRef.current.scale.setScalar(radiusLerp.current * 1.08);
      const mat = dustRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = v.dustAmount * 0.75;
      dustRef.current.rotation.y -= dt * 0.03;
      dustRef.current.rotation.x += dt * 0.01;
    }

    if (ringRef.current) {
      ringRef.current.scale.setScalar(radiusLerp.current * (1.8 + beat * 0.1));
      ringRef.current.rotation.z += dt * 0.15;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + v.glowIntensity * 0.35;
      mat.color.setRGB(v.ledColor[0], v.ledColor[1], v.ledColor[2]);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 코어 */}
      <Sphere ref={coreRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#0a0a14"
          emissive="#66e0ff"
          emissiveIntensity={1}
          metalness={0.85}
          roughness={0.18}
        />
      </Sphere>

      {/* 글로우 쉘 */}
      <Sphere ref={glowRef} args={[1, 32, 32]}>
        <meshBasicMaterial
          color="#66e0ff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>

      {/* 먼지 wireframe */}
      <Sphere ref={dustRef} args={[1, 24, 24]}>
        <meshStandardMaterial
          color="#777"
          transparent
          opacity={0}
          wireframe
          depthWrite={false}
        />
      </Sphere>

      {/* LED 링 (회전) */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.015, 16, 96]} />
        <meshBasicMaterial color="#66e0ff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}
