import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFolderStore } from '../store/folderStore';

const MAX_PARTICLES = 300;

type Kind = 'add' | 'remove';

interface Particle {
  alive: boolean;
  life: number; // 0..1, 1=태어남, 0=소멸
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  kind: Kind;
}

export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      alive: false,
      life: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      color: new THREE.Color(),
      kind: 'add',
    })),
  );

  const lastAddId = useRef(0);
  const lastRemoveId = useRef(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const store = useFolderStore.getState();

    // 신규 add 이벤트 → 폭발
    for (const e of store.recentAdds) {
      if (e.id > lastAddId.current) {
        lastAddId.current = e.id;
        spawnBurst(particles.current, 'add');
      }
    }
    for (const e of store.recentRemoves) {
      if (e.id > lastRemoveId.current) {
        lastRemoveId.current = e.id;
        spawnBurst(particles.current, 'remove');
      }
    }
    store.pruneOldEvents();

    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles.current[i];
      if (!p.alive) {
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.life -= dt * 1.3;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.95); // drag

      if (p.life <= 0) {
        p.alive = false;
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      dummy.position.copy(p.pos);
      const s = 0.06 * Math.max(0, p.life);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(p.color).multiplyScalar(p.life);
      mesh.setColorAt(i, tmpColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent depthWrite={false} />
    </instancedMesh>
  );
}

function spawnBurst(pool: Particle[], kind: Kind) {
  const count = 18;
  const baseColor = kind === 'add' ? [0.3, 1.0, 0.55] : [1.0, 0.3, 0.3];
  for (let i = 0; i < count; i++) {
    const slot = findFreeSlot(pool);
    if (slot < 0) return;
    const p = pool[slot];
    p.alive = true;
    p.life = 1;
    p.kind = kind;
    p.pos.set(0, 0, 0);
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    );
    if (dir.lengthSq() === 0) dir.set(1, 0, 0);
    dir.normalize().multiplyScalar(1.8 + Math.random() * 2.2);
    p.vel.copy(dir);
    p.color.setRGB(baseColor[0], baseColor[1], baseColor[2]);
  }
}

function findFreeSlot(pool: Particle[]): number {
  for (let i = 0; i < MAX_PARTICLES; i++) if (!pool[i].alive) return i;
  return -1;
}
