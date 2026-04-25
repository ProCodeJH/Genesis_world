import { useFrame } from '@react-three/fiber';
import { queries, world } from '../ecs';
import { composeSpell } from '../../factories/spellFactory';
import { playSpell } from '../../audio/spellSounds';

const WORLD_WIDTH = 8;
const WORLD_HEIGHT = 4.5;

let lastHighFiveAt = 0;
let lastComboSphereAt = 0;

/**
 * 두 사람의 협업 모먼트 감지:
 *   - High Five: 두 사람의 손목이 매우 가까움 (정규화 < 0.06)
 *   - Combo Sphere: 두 sphere spell이 다른 사람 + release phase + 월드 거리 < 2.0
 */
export function ComboSystem() {
  useFrame(() => {
    const now = Date.now();
    const persons = [...queries.persons];
    if (persons.length < 2) return;

    // High Five (1.5초 쿨다운)
    if (now - lastHighFiveAt > 1500) {
      outer: for (let i = 0; i < persons.length; i++) {
        for (let j = i + 1; j < persons.length; j++) {
          const handsI = persons[i].hands ?? [];
          const handsJ = persons[j].hands ?? [];
          for (const hI of handsI) {
            for (const hJ of handsJ) {
              const lI = hI.landmarks[0];
              const lJ = hJ.landmarks[0];
              if (!lI || !lJ) continue;
              const dx = lI.x - lJ.x;
              const dy = lI.y - lJ.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < 0.06) {
                lastHighFiveAt = now;
                const mid: [number, number, number] = [
                  -(((lI.x + lJ.x) / 2 - 0.5) * WORLD_WIDTH),
                  -(((lI.y + lJ.y) / 2 - 0.5) * WORLD_HEIGHT),
                  -((lI.z + lJ.z) / 2) * 4,
                ];
                const pid = persons[i].personId ?? 0;
                world.add(composeSpell({ kind: 'highFive', origin: mid, personId: pid }));
                void playSpell('highFive');
                break outer;
              }
            }
          }
        }
      }
    }

    // Combo Sphere (3초 쿨다운)
    if (now - lastComboSphereAt > 3000) {
      const spheres = [...queries.spells].filter((s) => s.spellKind === 'sphere');
      for (let i = 0; i < spheres.length; i++) {
        for (let j = i + 1; j < spheres.length; j++) {
          const a = spheres[i], b = spheres[j];
          if (!a.spellOrigin || !b.spellOrigin) continue;
          const dx = a.spellOrigin[0] - b.spellOrigin[0];
          const dy = a.spellOrigin[1] - b.spellOrigin[1];
          const dz = a.spellOrigin[2] - b.spellOrigin[2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d > 2.0) continue;
          // 둘 다 release phase (age 0.6 ~ 2.0)
          const aAge = a.age ?? 0;
          const bAge = b.age ?? 0;
          if (aAge < 0.6 || aAge > 2.0 || bAge < 0.6 || bAge > 2.0) continue;
          lastComboSphereAt = now;
          const mid: [number, number, number] = [
            (a.spellOrigin[0] + b.spellOrigin[0]) / 2,
            (a.spellOrigin[1] + b.spellOrigin[1]) / 2,
            (a.spellOrigin[2] + b.spellOrigin[2]) / 2,
          ];
          world.add(composeSpell({ kind: 'comboSphere', origin: mid, personId: 0 }));
          void playSpell('comboSphere');
          // 두 원본 sphere를 fade phase로 가속 (release 끝 근처로)
          a.age = Math.max(aAge, 1.95);
          b.age = Math.max(bAge, 1.95);
          break;
        }
      }
    }
  });
  return null;
}
