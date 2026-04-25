import { useFrame } from '@react-three/fiber';
import { queries, world } from '../ecs';

/**
 * spell entity의 age 증가 + 만료 시 제거.
 * 시각/사운드는 Spells.tsx와 spellGestureSystem이 담당.
 */
export function SpellSystem() {
  useFrame((_, dt) => {
    for (const s of [...queries.spells]) {
      s.age = (s.age ?? 0) + dt;
      if (s.maxAge != null && s.age >= s.maxAge) {
        try { world.remove(s); } catch { /* ignore */ }
      }
    }
  });
  return null;
}
