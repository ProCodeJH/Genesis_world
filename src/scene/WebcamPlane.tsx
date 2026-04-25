import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSharedVideo } from '../tracking/useTrackers';

const PLANE_DISTANCE = -8;

export function WebcamPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const { camera, size } = useThree();

  useEffect(() => {
    let cancelled = false;
    getSharedVideo()
      .then((video) => {
        if (cancelled) return;
        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = tex;
        if (meshRef.current) {
          const mat = meshRef.current.material as THREE.MeshBasicMaterial;
          mat.map = tex;
          mat.needsUpdate = true;
        }
      })
      .catch(() => { /* 웹캠 권한 거부 — 검정 배경 fallback */ });

    return () => {
      cancelled = true;
      textureRef.current?.dispose();
      textureRef.current = null;
    };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const cam = camera as THREE.PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fovRad / 2) * Math.abs(PLANE_DISTANCE);
    const aspect = size.width / size.height;
    const width = height * aspect;
    // 좌우 반전 — 거울 모드
    meshRef.current.scale.set(-width, height, 1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, PLANE_DISTANCE]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial toneMapped={false} side={THREE.FrontSide} />
    </mesh>
  );
}
