/**
 * 모양 카탈로그 — 15종.
 *
 * ⭐ 자현이 늘릴 곳 ⭐
 * 새 ShapeKind 추가하고 Creations.tsx의 instancedMesh 분기에 한 줄.
 */

export type ShapeKind =
  | 'sphere'
  | 'box'
  | 'icosahedron'
  | 'torus'
  | 'star'
  | 'tetrahedron'
  | 'dodecahedron'
  | 'capsule'
  | 'torusKnot'
  | 'cone'
  | 'ring'
  | 'crystal'
  | 'spike'
  | 'cluster'
  | 'blade'
  | 'plasma';

export interface ShapeDef {
  kind: ShapeKind;
  weight: number;
}

export const SHAPES: ShapeDef[] = [
  { kind: 'sphere', weight: 3 },
  { kind: 'box', weight: 2 },
  { kind: 'icosahedron', weight: 2.5 },
  { kind: 'torus', weight: 1.5 },
  { kind: 'star', weight: 2 },
  { kind: 'tetrahedron', weight: 1.5 },
  { kind: 'dodecahedron', weight: 1.5 },
  { kind: 'capsule', weight: 1 },
  { kind: 'torusKnot', weight: 0.8 },
  { kind: 'cone', weight: 1 },
  { kind: 'ring', weight: 1 },
  { kind: 'crystal', weight: 1.5 },
  { kind: 'spike', weight: 1 },
  { kind: 'cluster', weight: 1.2 },
  { kind: 'blade', weight: 0.8 },
  { kind: 'plasma', weight: 1.8 },
];

export function pickShape(rand: () => number): ShapeKind {
  const total = SHAPES.reduce((a, s) => a + s.weight, 0);
  let r = rand() * total;
  for (const s of SHAPES) {
    r -= s.weight;
    if (r <= 0) return s.kind;
  }
  return SHAPES[0].kind;
}
