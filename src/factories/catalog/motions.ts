/**
 * 움직임 카탈로그 — 12종.
 *
 * ⭐ 자현이 늘릴 곳 ⭐
 * 새 MotionKind 추가 후 creationLifecycleSystem에 case 한 줄.
 */

export type MotionKind =
  | 'float'    // 떠있기 (살짝 흔들림)
  | 'spin'     // 자전
  | 'orbit'    // 원형 궤도
  | 'flow'     // Perlin 흐름
  | 'pulse'    // 크기 진동
  | 'flock'    // Boids 군집
  | 'fall'     // 중력 + bounce
  | 'ascend'   // 위로 상승
  | 'dance'    // XYZ 사인 합성
  | 'wobble'   // 불안정 흔들림
  | 'burst'    // 폭발 후 정지
  | 'anchor'   // 한 자리 고정 (회전만)
  | 'physics'; // 중력 + 충돌 + 잡기 가능

export interface MotionDef {
  kind: MotionKind;
  weight: number;
}

export const MOTIONS: MotionDef[] = [
  { kind: 'float', weight: 3 },
  { kind: 'spin', weight: 2 },
  { kind: 'orbit', weight: 1.5 },
  { kind: 'flow', weight: 2.5 },
  { kind: 'pulse', weight: 1.5 },
  { kind: 'flock', weight: 1.5 },
  { kind: 'fall', weight: 1 },
  { kind: 'ascend', weight: 1 },
  { kind: 'dance', weight: 1.2 },
  { kind: 'wobble', weight: 1 },
  { kind: 'burst', weight: 1 },
  { kind: 'anchor', weight: 0.8 },
  { kind: 'physics', weight: 2.0 },
];

export function pickMotion(rand: () => number): MotionKind {
  const total = MOTIONS.reduce((a, m) => a + m.weight, 0);
  let r = rand() * total;
  for (const m of MOTIONS) {
    r -= m.weight;
    if (r <= 0) return m.kind;
  }
  return MOTIONS[0].kind;
}
