import { useFrame } from '@react-three/fiber';
import { queries, world } from '../ecs';

const WORLD_WIDTH = 8;
const WORLD_HEIGHT = 4.5;

/**
 * spell entity의 age 증가 + 만료 시 제거.
 * Aura 등 follow 모드 spell은 매 프레임 owner의 가슴 위치로 origin update.
 */
export function SpellSystem() {
  useFrame((_, dt) => {
    // 사람 인덱스 빠른 조회
    const personMap = new Map<number, { x: number; y: number; z: number } | null>();
    for (const p of [...queries.persons]) {
      if (p.personId == null) continue;
      const lms = p.pose?.landmarks as { x: number; y: number; z: number; visibility: number }[] | undefined;
      if (!lms || lms.length < 25) { personMap.set(p.personId, null); continue; }
      const lShoulder = lms[11], rShoulder = lms[12];
      if (lShoulder && rShoulder) {
        personMap.set(p.personId, {
          x: (lShoulder.x + rShoulder.x) / 2,
          y: (lShoulder.y + rShoulder.y) / 2 + 0.05,
          z: (lShoulder.z + rShoulder.z) / 2,
        });
      } else {
        personMap.set(p.personId, null);
      }
    }

    for (const s of [...queries.spells]) {
      s.age = (s.age ?? 0) + dt;

      // Aura 등 follow → 가슴 위치로 origin 업데이트
      if (s.spellFollowPersonId != null && s.spellOrigin) {
        const chest = personMap.get(s.spellFollowPersonId);
        if (chest) {
          s.spellOrigin[0] = -((chest.x - 0.5) * WORLD_WIDTH);
          s.spellOrigin[1] = -(chest.y - 0.5) * WORLD_HEIGHT;
          s.spellOrigin[2] = -chest.z * 4;
        }
      }

      if (s.maxAge != null && s.age >= s.maxAge) {
        try { world.remove(s); } catch { /* ignore */ }
      }
    }
  });
  return null;
}
