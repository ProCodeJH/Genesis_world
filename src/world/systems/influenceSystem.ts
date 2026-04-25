import { useFrame } from '@react-three/fiber';
import { queries } from '../ecs';

const HAND_PULL_RADIUS = 0.6;
const HAND_PULL_FORCE = 2.0;
const AURA_RECOLOR_RADIUS = 1.4;
const AURA_RECOLOR_RATE = 0.6; // 0..1 per second
const WAVE_PUSH_RADIUS = 1.6;
const WAVE_PUSH_FORCE = 5;
const BEAM_HIT_RADIUS = 0.28;
const BEAM_FADE_REMAIN = 0.3;

/**
 * Cross-entity 영향 시스템 — entity들이 서로 끌고 밀고 색 바꾸고 파괴함.
 *   - Hand Magnetism: 손 → creation 끌어당김
 *   - Aura Recolor: aura 영역 → creation 색 lerp
 *   - Wave Push: wave spawn 직후 → 주변 creation 밀침
 *   - Beam Hit: beam 라인 → 통과 creation 수명 단축
 */
export function InfluenceSystem() {
  useFrame((_, dt) => {
    const persons = [...queries.persons];
    const creations = [...queries.creations];
    const spells = [...queries.spells];

    // ─── Hand Magnetism ───
    for (const p of persons) {
      const hands = p.hands ?? [];
      for (const h of hands) {
        const wrist = h.landmarks[0];
        if (!wrist) continue;
        // 월드 좌표 변환 (정규화 → 월드)
        const hx = -((wrist.x - 0.5) * 8);
        const hy = -(wrist.y - 0.5) * 4.5;
        const hz = -wrist.z * 4;
        for (const c of creations) {
          if (!c.position || !c.velocity) continue;
          const dx = hx - c.position[0];
          const dy = hy - c.position[1];
          const dz = hz - c.position[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > HAND_PULL_RADIUS * HAND_PULL_RADIUS) continue;
          const d = Math.sqrt(d2) || 0.001;
          const f = ((HAND_PULL_RADIUS - d) / HAND_PULL_RADIUS) * HAND_PULL_FORCE * dt;
          c.velocity[0] += (dx / d) * f;
          c.velocity[1] += (dy / d) * f;
          c.velocity[2] += (dz / d) * f;
        }
      }
    }

    // ─── Aura Recolor ───
    const auras = spells.filter((s) => s.spellKind === 'aura' && s.spellOrigin && s.primaryColor);
    if (auras.length > 0) {
      for (const a of auras) {
        const ao = a.spellOrigin!;
        const ac = a.primaryColor!;
        for (const c of creations) {
          if (!c.position || !c.primaryColor) continue;
          const dx = ao[0] - c.position[0];
          const dy = ao[1] - c.position[1];
          const dz = ao[2] - c.position[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > AURA_RECOLOR_RADIUS * AURA_RECOLOR_RADIUS) continue;
          const lerp = AURA_RECOLOR_RATE * dt;
          c.primaryColor[0] = c.primaryColor[0] * (1 - lerp) + ac[0] * lerp;
          c.primaryColor[1] = c.primaryColor[1] * (1 - lerp) + ac[1] * lerp;
          c.primaryColor[2] = c.primaryColor[2] * (1 - lerp) + ac[2] * lerp;
        }
      }
    }

    // ─── Wave Push (spawn 직후 0.15초 동안만) ───
    const waves = spells.filter((s) => s.spellKind === 'wave' && (s.age ?? 0) < 0.15 && s.spellOrigin);
    for (const w of waves) {
      const wo = w.spellOrigin!;
      for (const c of creations) {
        if (!c.position || !c.velocity) continue;
        const dx = c.position[0] - wo[0];
        const dy = c.position[1] - wo[1];
        const dz = c.position[2] - wo[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > WAVE_PUSH_RADIUS * WAVE_PUSH_RADIUS || d2 < 0.01) continue;
        const d = Math.sqrt(d2);
        const f = ((WAVE_PUSH_RADIUS - d) / WAVE_PUSH_RADIUS) * WAVE_PUSH_FORCE;
        c.velocity[0] += (dx / d) * f;
        c.velocity[1] += (dy / d) * f;
        c.velocity[2] += (dz / d) * f;
      }
    }

    // ─── Beam Hit (release phase 동안만) ───
    const beams = spells.filter(
      (s) => s.spellKind === 'beam' && s.spellOrigin && s.spellTarget && (s.age ?? 0) >= 0.8 && (s.age ?? 0) < 2.0,
    );
    for (const b of beams) {
      const o = b.spellOrigin!;
      const t = b.spellTarget!;
      for (const c of creations) {
        if (!c.position) continue;
        const dist = pointToLineDist(c.position, o, t);
        if (dist < BEAM_HIT_RADIUS) {
          if (c.maxAge != null && c.age != null) {
            const remaining = c.maxAge - c.age;
            if (remaining > BEAM_FADE_REMAIN) {
              c.maxAge = c.age + BEAM_FADE_REMAIN;
            }
          }
        }
      }
    }
  });
  return null;
}

function pointToLineDist(
  p: [number, number, number],
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 < 0.0001) {
    return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2 + (p[2] - a[2]) ** 2);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy + (p[2] - a[2]) * dz) / len2;
  const tc = Math.max(0, Math.min(1, t));
  const cx = a[0] + tc * dx, cy = a[1] + tc * dy, cz = a[2] + tc * dz;
  return Math.sqrt((p[0] - cx) ** 2 + (p[1] - cy) ** 2 + (p[2] - cz) ** 2);
}
