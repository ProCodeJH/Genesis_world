/**
 * 애니메이션 마법 임팩트 카탈로그.
 * 나루토, 드래곤볼, BLEACH, 진격 등에서 추출한 archetypal 패턴.
 *
 * ⭐ 자현이 늘릴 곳 ⭐
 * 새 SpellKind 추가 후 spellFactory.composeSpell + Spells.tsx 렌더 + spellGestureSystem 트리거.
 */

export type SpellKind = 'sphere' | 'beam' | 'pillar' | 'snap';

export type SpellPhase = 'charge' | 'release' | 'fade';

export interface SpellPhaseTimings {
  charge: number;
  release: number;
  fade: number;
}

export const SPELL_TIMINGS: Record<SpellKind, SpellPhaseTimings> = {
  sphere: { charge: 0.6, release: 1.4, fade: 0.6 },  // 라센건 — 길게 회전
  beam: { charge: 0.8, release: 1.2, fade: 0.5 },     // 카메하메하 — 충전 길게, 발사 짧게
  pillar: { charge: 0.3, release: 1.6, fade: 0.6 },   // 반카이 — 즉발 + 길게 유지
  snap: { charge: 0.1, release: 0.5, fade: 0.7 },     // 아마테라스 — 즉발 폭발
};

export const SPELL_LABELS: Record<SpellKind, string> = {
  sphere: '🌀 Rasengan',
  beam: '💥 Kamehameha',
  pillar: '⚡ Bankai',
  snap: '🔥 Amaterasu',
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
