/**
 * L-System 식물 규칙 카탈로그 — 5종.
 *
 * Lindenmayer 1968. axiom + rules → 문자열 → turtle graphics → 3D 가지.
 *
 * Turtle commands:
 *   F = 직진 (가지 그리기)
 *   + = pitch up (앞쪽 회전)
 *   - = pitch down
 *   & = yaw left
 *   ^ = yaw right
 *   < = roll left
 *   > = roll right
 *   [ = push state (분기 시작)
 *   ] = pop state (분기 끝)
 */

export interface LSystemRule {
  name: string;
  axiom: string;
  rules: Record<string, string>;
  iterations: number;
  angleDeg: number;
  stepLength: number;
  weight: number;
}

export const LSYSTEM_RULES: LSystemRule[] = [
  {
    name: '버드나무',
    axiom: 'F',
    rules: { F: 'F[+F]F[-F]F' },
    iterations: 4,
    angleDeg: 25,
    stepLength: 0.18,
    weight: 1.5,
  },
  {
    name: '소나무',
    axiom: 'F',
    rules: { F: 'FF[+F][-F][&F][^F]' },
    iterations: 3,
    angleDeg: 28,
    stepLength: 0.15,
    weight: 1.2,
  },
  {
    name: '벚꽃',
    axiom: 'F',
    rules: { F: 'F[+F]F[-F][&F]F' },
    iterations: 4,
    angleDeg: 30,
    stepLength: 0.15,
    weight: 1.5,
  },
  {
    name: '고사리',
    axiom: 'F',
    rules: { F: 'F[+F[+F[+F]]]' },
    iterations: 4,
    angleDeg: 22,
    stepLength: 0.12,
    weight: 1,
  },
  {
    name: '포도나무',
    axiom: 'F',
    rules: { F: 'F[+F-F][-F+F]F' },
    iterations: 4,
    angleDeg: 35,
    stepLength: 0.16,
    weight: 1,
  },
];

export function pickLSystem(rand: () => number): LSystemRule {
  const total = LSYSTEM_RULES.reduce((a, r) => a + r.weight, 0);
  let r = rand() * total;
  for (const rule of LSYSTEM_RULES) {
    r -= rule.weight;
    if (r <= 0) return rule;
  }
  return LSYSTEM_RULES[0];
}

/** axiom + rules → iterations번 확장된 문자열 */
export function expandLSystem(rule: LSystemRule): string {
  let s = rule.axiom;
  for (let i = 0; i < rule.iterations; i++) {
    let next = '';
    for (const ch of s) {
      next += rule.rules[ch] ?? ch;
    }
    s = next;
  }
  return s;
}
