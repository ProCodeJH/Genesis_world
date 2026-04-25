/**
 * 출생 효과 카탈로그 — 5종.
 * 첫 0.4초 동안의 시각 변형.
 */

export type BirthKind =
  | 'explosion'  // 큰 크기에서 작아짐 (폭발 → 모임)
  | 'summon'     // 위에서 떨어짐
  | 'bloom'      // 작은 크기에서 부드럽게 펴짐
  | 'assemble'   // 빠른 진동 후 안정
  | 'condense';  // 부풀어 있다가 응축

export interface BirthDef {
  kind: BirthKind;
  weight: number;
  durationSec: number;
}

export const BIRTHS: BirthDef[] = [
  { kind: 'explosion', weight: 2, durationSec: 0.5 },
  { kind: 'summon', weight: 1.5, durationSec: 0.6 },
  { kind: 'bloom', weight: 2.5, durationSec: 0.5 },
  { kind: 'assemble', weight: 1, durationSec: 0.4 },
  { kind: 'condense', weight: 1.2, durationSec: 0.45 },
];

export function pickBirth(rand: () => number): BirthDef {
  const total = BIRTHS.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  for (const b of BIRTHS) {
    r -= b.weight;
    if (r <= 0) return b;
  }
  return BIRTHS[0];
}

/** 0..1 진행도(t=0 막 태어남, t=1 완료) → 시각 변형 [scaleMul, posOffsetY, opacity] */
export function applyBirth(kind: BirthKind, t: number): { scaleMul: number; posOffsetY: number; opacity: number } {
  const tt = Math.max(0, Math.min(1, t));
  switch (kind) {
    case 'explosion': {
      const s = 2.2 - 1.2 * tt;
      return { scaleMul: s, posOffsetY: 0, opacity: tt };
    }
    case 'summon': {
      const fall = (1 - tt) * 1.5;
      return { scaleMul: 0.3 + 0.7 * tt, posOffsetY: fall, opacity: tt };
    }
    case 'bloom': {
      const ease = 1 - Math.pow(1 - tt, 3);
      return { scaleMul: ease, posOffsetY: 0, opacity: tt };
    }
    case 'assemble': {
      const wobble = 0.85 + Math.sin(tt * 30) * (1 - tt) * 0.15;
      return { scaleMul: wobble * tt + (1 - tt) * 0.2, posOffsetY: 0, opacity: tt };
    }
    case 'condense': {
      const s = 1.6 - 0.6 * tt;
      return { scaleMul: s, posOffsetY: 0, opacity: tt };
    }
  }
}
