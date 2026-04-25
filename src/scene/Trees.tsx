import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';

const MAX_BRANCHES = 6000; // 4명 × 3그루 × 500가지
const MAX_LEAVES = 1500;

export function Trees() {
  const positions = useMemo(() => new Float32Array(MAX_BRANCHES * 2 * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_BRANCHES * 2 * 3), []);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors]);

  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let v = 0;
    let li = 0;
    const t0 = performance.now() * 0.001;

    for (const tree of [...queries.trees]) {
      if (!tree.branches || !tree.growDuration) continue;
      const age = tree.age ?? 0;
      const grow = Math.min(1, age / tree.growDuration);
      const lifeLeft = tree.maxAge ? Math.max(0, tree.maxAge - age) : Infinity;
      const decay = lifeLeft < 2 ? lifeLeft / 2 : 1;

      for (const b of tree.branches) {
        if (grow < b.spawnAt) continue;
        // 가지 자라기: spawnAt부터 0.15초에 걸쳐 growLocal 0→1
        const growLocal = Math.min(1, (grow - b.spawnAt) / 0.05);
        const ex = b.start[0] + (b.end[0] - b.start[0]) * growLocal;
        const ey = b.start[1] + (b.end[1] - b.start[1]) * growLocal;
        const ez = b.start[2] + (b.end[2] - b.start[2]) * growLocal;

        if (v < MAX_BRANCHES) {
          positions[v * 6 + 0] = b.start[0];
          positions[v * 6 + 1] = b.start[1];
          positions[v * 6 + 2] = b.start[2];
          positions[v * 6 + 3] = ex;
          positions[v * 6 + 4] = ey;
          positions[v * 6 + 5] = ez;

          const cc = b.trunkColor;
          const a = decay;
          colors[v * 6 + 0] = cc[0] * a; colors[v * 6 + 1] = cc[1] * a; colors[v * 6 + 2] = cc[2] * a;
          colors[v * 6 + 3] = cc[0] * a; colors[v * 6 + 4] = cc[1] * a; colors[v * 6 + 5] = cc[2] * a;
          v++;
        }

        if (b.hasLeaf && growLocal >= 1 && li < MAX_LEAVES && leavesRef.current) {
          const sway = Math.sin(t0 * 1.2 + (b.start[0] + b.start[1]) * 3) * 0.02;
          dummy.position.set(ex + sway, ey, ez);
          const leafScale = 0.06 * (0.7 + Math.sin(t0 * 2 + b.start[0]) * 0.1) * decay;
          dummy.scale.setScalar(leafScale);
          dummy.rotation.set(0, t0 * 0.3, 0);
          dummy.updateMatrix();
          leavesRef.current.setMatrixAt(li, dummy.matrix);
          tmpColor.setRGB(b.leafColor[0], b.leafColor[1], b.leafColor[2]).multiplyScalar(decay);
          leavesRef.current.setColorAt(li, tmpColor);
          li++;
        }
      }
    }

    lineGeo.setDrawRange(0, v * 2);
    (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    if (leavesRef.current) {
      leavesRef.current.count = li;
      leavesRef.current.instanceMatrix.needsUpdate = true;
      if (leavesRef.current.instanceColor) leavesRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} />
      </lineSegments>
      <instancedMesh ref={leavesRef} args={[undefined, undefined, MAX_LEAVES]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors emissiveIntensity={1.5} transparent flatShading metalness={0.3} roughness={0.4} />
      </instancedMesh>
      <LeafEmissiveBinder leavesRef={leavesRef} />
    </>
  );
}

function LeafEmissiveBinder({ leavesRef }: { leavesRef: React.MutableRefObject<THREE.InstancedMesh | null> }) {
  useFrame(() => {
    const mesh = leavesRef.current;
    if (!mesh) return;
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
  });
  return null;
}
