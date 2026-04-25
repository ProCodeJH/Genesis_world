/**
 * 애니메이션 마법 임팩트 카탈로그.
 * 나루토, 드래곤볼, BLEACH, 진격 등에서 추출한 archetypal 패턴.
 *
 * ⭐ 자현이 늘릴 곳 ⭐
 * 새 SpellKind 추가 후 spellFactory.composeSpell + Spells.tsx 렌더 + spellGestureSystem 트리거.
 */

export type SpellKind = 'sphere' | 'beam' | 'pillar' | 'snap' | 'chidori' | 'aura' | 'wave' | 'magicCircle' | 'spiral' | 'lightningBolt' | 'comboSphere' | 'highFive';

export type SpellPhase = 'charge' | 'release' | 'fade';

export interface SpellPhaseTimings {
  charge: number;
  release: number;
  fade: number;
}

export const SPELL_TIMINGS: Record<SpellKind, SpellPhaseTimings> = {
  sphere: { charge: 0.6, release: 1.4, fade: 0.6 },
  beam: { charge: 0.8, release: 1.2, fade: 0.5 },
  pillar: { charge: 0.3, release: 1.6, fade: 0.6 },
  snap: { charge: 0.1, release: 0.5, fade: 0.7 },
  chidori: { charge: 0.2, release: 1.0, fade: 0.4 },     // 치도리 — 짧고 강렬한 번개
  aura: { charge: 0.5, release: 2.5, fade: 0.8 },        // 오라 — 길게 유지
  wave: { charge: 0.1, release: 1.2, fade: 0.4 },        // 충격파 — 즉발 퍼짐
  magicCircle: { charge: 0.3, release: 2.0, fade: 0.7 }, // 소환진 — 회전 유지
  spiral: { charge: 0.5, release: 1.8, fade: 0.7 },      // Rasenshuriken — 회전체 + 칼날
  lightningBolt: { charge: 0.15, release: 0.5, fade: 0.3 }, // 번개 — 즉발 직선
  comboSphere: { charge: 0.2, release: 2.5, fade: 1.0 },  // 콜라보 거대 회전체
  highFive: { charge: 0.05, release: 0.3, fade: 0.5 },    // 하이파이브 폭죽
};

export const SPELL_LABELS: Record<SpellKind, string> = {
  sphere: '🌀 Rasengan',
  beam: '💥 Kamehameha',
  pillar: '⚡ Bankai',
  snap: '🔥 Amaterasu',
  chidori: '⚡ Chidori',
  aura: '✨ Aura',
  wave: '💫 Wave',
  magicCircle: '🔮 Magic Circle',
  spiral: '🌀 Rasenshuriken',
  lightningBolt: '⚡ Lightning Bolt',
  comboSphere: '🌌 Combo Sphere',
  highFive: '🎆 High Five',
};

/** 현재 phase 계산 + 그 phase 안에서의 0..1 진행도 */
export function spellPhase(kind: SpellKind, age: number): { phase: SpellPhase; t: number; totalDuration: number } {
  const tm = SPELL_TIMINGS[kind];
  const total = tm.charge + tm.release + tm.fade;
  if (age < tm.charge) return { phase: 'charge', t: age / tm.charge, totalDuration: total };
  if (age < tm.charge + tm.release) return { phase: 'release', t: (age - tm.charge) / tm.release, totalDuration: total };
  return { phase: 'fade', t: Math.min(1, (age - tm.charge - tm.release) / tm.fade), totalDuration: total };
}

export function totalDuration(kind: SpellKind): number {
  const tm = SPELL_TIMINGS[kind];
  return tm.charge + tm.release + tm.fade;
}
