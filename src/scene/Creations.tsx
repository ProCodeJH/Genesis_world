import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries, type Entity } from '../world/ecs';
import { applyBirth } from '../factories/catalog/births';
import { applyDeath } from '../factories/catalog/deaths';
import type { ShapeKind } from '../factories/catalog/shapes';

const MAX_INSTANCES_PER_KIND = 40;
const SHAPE_KINDS: ShapeKind[] = [
  'sphere', 'box', 'icosahedron', 'torus', 'star',
  'tetrahedron', 'dodecahedron', 'capsule', 'torusKnot', 'cone',
  'ring', 'crystal', 'spike', 'cluster', 'blade',
];

export function Creations() {
  const refs = useMemo(() => {
    const map: Record<string, React.MutableRefObject<THREE.InstancedMesh | null>> = {};
    for (const k of SHAPE_KINDS) map[k] = { current: null };
    return map;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const counts: Record<string, number> = {};
    for (const k of SHAPE_KINDS) counts[k] = 0;

    for (const c of [...queries.creations]) {
      const kind = c.shape ?? 'sphere';
      const ref = refs[kind];
      const mesh = ref?.current;
      if (!mesh) continue;
      const idx = counts[kind];
      if (idx >= MAX_INSTANCES_PER_KIND) continue;

      const t = performance.now() * 0.001;
      const sBase = c.scale ?? 0.1;

      // birth/death 애니메이션 계산
      const birthT = computeBirthProgress(c);
      const deathT = computeDeathProgress(c);

      const birthMod = birthT < 1 && c.birth
        ? applyBirth(c.birth, birthT)
        : { scaleMul: 1, posOffsetY: 0, opacity: 1 };
      const deathMod = deathT > 0 && c.death
        ? applyDeath(c.death, deathT)
        : { scaleMul: 1, posOffsetY: 0, opacity: 1, spinBoost: 0, darkness: 0 };

      const pulse = c.motion === 'pulse' ? 1 + Math.sin(t * 4 + (c.seed ?? 0)) * 0.25 : 1;
      const s = sBase * pulse * birthMod.scaleMul * deathMod.scaleMul;

      const px = c.position![0];
      const py = c.position![1] + birthMod.posOffsetY + deathMod.posOffsetY;
      const pz = c.position![2];

      dummy.position.set(px, py, pz);
      const spinExtra = deathMod.spinBoost * 0.016; // 약간의 추가 회전
      dummy.rotation.set(
        c.rotation![0] + spinExtra,
        c.rotation![1] + spinExtra,
        c.rotation![2] + spinExtra,
      );
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      const col = c.primaryColor ?? [1, 1, 1];
      const opacity = birthMod.opacity * deathMod.opacity;
      const dark = 1 - deathMod.darkness;
      tmpColor.setRGB(col[0] * dark, col[1] * dark, col[2] * dark).multiplyScalar(opacity * (c.emissive ?? 1));
      mesh.setColorAt(idx, tmpColor);

      counts[kind]++;
    }

    for (const k of SHAPE_KINDS) {
      const mesh = refs[k].current;
      if (!mesh) continue;
      mesh.count = counts[k];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={refs.sphere as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <ShapeMaterial intensity={1.5} />
      </instancedMesh>
      <instancedMesh ref={refs.box as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <ShapeMaterial intensity={1.5} />
      </instancedMesh>
      <instancedMesh ref={refs.icosahedron as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <ShapeMaterial intensity={1.8} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.torus as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.25, 16, 32]} />
        <ShapeMaterial intensity={1.6} />
      </instancedMesh>
      <instancedMesh ref={refs.star as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <ShapeMaterial intensity={2} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.tetrahedron as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <ShapeMaterial intensity={2} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.dodecahedron as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <ShapeMaterial intensity={1.7} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.capsule as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <ShapeMaterial intensity={1.5} />
      </instancedMesh>
      <instancedMesh ref={refs.torusKnot as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <torusKnotGeometry args={[0.55, 0.18, 64, 8]} />
        <ShapeMaterial intensity={1.8} />
      </instancedMesh>
      <instancedMesh ref={refs.cone as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <coneGeometry args={[0.7, 1.4, 12]} />
        <ShapeMaterial intensity={1.6} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.ring as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <ringGeometry args={[0.4, 0.9, 24]} />
        <ShapeMaterial intensity={1.7} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={refs.crystal as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <ShapeMaterial intensity={2.2} flatShading metalness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.spike as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <octahedronGeometry args={[1, 2]} />
        <ShapeMaterial intensity={2} flatShading />
      </instancedMesh>
      <instancedMesh ref={refs.cluster as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <ShapeMaterial intensity={2.4} />
      </instancedMesh>
      <instancedMesh ref={refs.blade as React.Ref<THREE.InstancedMesh>} args={[undefined, undefined, MAX_INSTANCES_PER_KIND]} frustumCulled={false}>
        <boxGeometry args={[0.15, 1.6, 0.05]} />
        <ShapeMaterial intensity={1.8} />
      </instancedMesh>
      <EmissiveBinder refs={refs} />
    </>
  );
}

function ShapeMaterial(props: {
  intensity: number;
  flatShading?: boolean;
  metalness?: number;
  side?: THREE.Side;
}) {
  return (
    <meshStandardMaterial
      metalness={props.metalness ?? 0.5}
      roughness={0.2}
      emissiveIntensity={props.intensity}
      flatShading={props.flatShading}
      side={props.side}
      transparent
    />
  );
}

function computeBirthProgress(c: Entity): number {
  const age = c.age ?? 0;
  const dur = c.birthDuration ?? 0.4;
  return Math.min(1, age / dur);
}

function computeDeathProgress(c: Entity): number {
  const age = c.age ?? 0;
  const max = c.maxAge ?? Infinity;
  const dur = c.deathDuration ?? 1.5;
  const remaining = max - age;
  if (remaining > dur) return 0;
  return Math.max(0, Math.min(1, 1 - remaining / dur));
}

/** instancedMesh의 instanceColor를 emissive로도 활용 (한 번만 셰이더 패치) */
function EmissiveBinder({ refs }: { refs: Record<string, React.MutableRefObject<THREE.InstancedMesh | null>> }) {
  useFrame(() => {
    for (const ref of Object.values(refs)) {
      const mesh = ref.current;
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat.userData.emissiveBound) {
        const intensity = mat.emissiveIntensity;
        mat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * ${intensity.toFixed(2)};`,
          );
        };
        mat.vertexColors = true;
        mat.needsUpdate = true;
        mat.userData.emissiveBound = true;
      }
    }
  });
  return null;
}
