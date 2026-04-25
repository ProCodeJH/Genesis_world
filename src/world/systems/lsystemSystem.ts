import { useFrame } from '@react-three/fiber';
import { queries, world } from '../ecs';

/**
 * 나무 entity의 age를 증가시키고, 수명 다하면 제거.
 * 가지 가시성(spawnAt 기반)은 Trees.tsx 렌더에서 처리.
 */
export function LSystemLifecycle() {
  useFrame((_, dt) => {
    for (const t of [...queries.trees]) {
      t.age = (t.age ?? 0) + dt;
      if (t.maxAge != null && t.age >= t.maxAge) {
        try { world.remove(t); } catch { /* ignore */ }
      }
    }
  });
  return null;
}
