/**
 * 사망 효과 카탈로그 — 5종.
 * 마지막 1.5초 동안의 시각 변형.
 */

export type DeathKind =
  | 'fade'         // 단순 페이드
  | 'shatter'      // 빠른 회전 + 흩어짐
  | 'seed'         // 작은 점으로 응축 후 떨어짐
  | 'ascend'       // 위로 사라짐
  | 'crystallize'; // 정지 + 어두워짐 (화석화)

export interface DeathDef {
  kind: DeathKind;
  weight: number;
  durationSec: number;
}

export const DEATHS: DeathDef[] = [
  { kind: 'fade', weight: 2.5, durationSec: 1.2 },
  { kind: 'shatter', weight: 1.5, durationSec: 0.8 },
  { kind: 'seed', weight: 1.5, durationSec: 1.5 },
  { kind: 'ascend', weight: 1.5, durationSec: 1.4 },
  { kind: 'crystallize', weight: 1, durationSec: 2.0 },
];

export function pickDeath(rand: () => number): DeathDef {
  const total = DEATHS.reduce((a, d) => a + d.weight, 0);
  let r = rand() * total;
  for (const d of DEATHS) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return DEATHS[0];
}

/** 0..1 진행도(t=0 죽기 시작, t=1 완전 소멸) → 시각 변형 */
export function applyDeath(kind: DeathKind, t: number): { scaleMul: number; posOffsetY: number; opacity: number; spinBoost: number; darkness: number } {
  const tt = Math.max(0, Math.min(1, t));
  const inv = 1 - tt;
  switch (kind) {
    case 'fade':
      return { scaleMul: 1, posOffsetY: 0, opacity: inv, spinBoost: 0, darkness: 0 };
    case 'shatter':
      return { scaleMul: inv, posOffsetY: 0, opacity: inv, spinBoost: 8, darkness: 0 };
    case 'seed':
      return { scaleMul: inv * 0.3 + 0.05, posOffsetY: -tt * 1.5, opacity: inv * 0.6 + 0.4, spinBoost: 0, darkness: 0 };
    case 'ascend':
      return { scaleMul: inv * 0.6 + 0.4, posOffsetY: tt * 2, opacity: inv, spinBoost: 0, darkness: 0 };
    case 'crystallize':
      return { scaleMul: 1, posOffsetY: 0, opacity: 1 - tt * 0.3, spinBoost: -0.99, darkness: tt };
  }
}
