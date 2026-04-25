import * as THREE from 'three';
import chroma from 'chroma-js';
import { PALETTES, pickColor, type ColorPalette } from './catalog/palettes';
import { LSYSTEM_RULES, expandLSystem, pickLSystem, type LSystemRule } from './catalog/lsystemRules';
import { getSessionSeed, makeRand, nextActionId, personSeed } from './seedHierarchy';

export interface TreeBranch {
  start: [number, number, number];
  end: [number, number, number];
  depth: number;
  /** 0..1 grow progress 시점에 보이기 시작 */
  spawnAt: number;
  hasLeaf: boolean;
  /** RGB 0..1 */
  leafColor: [number, number, number];
  trunkColor: [number, number, number];
}

export interface TreeData {
  id: string;
  kind: 'tree';
  position: [number, number, number];
  palette: ColorPalette;
  rule: string;
  branches: TreeBranch[];
  age: number;
  growDuration: number;
  maxAge: number;
  seed: number;
  birthAt: number;
}

interface TurtleState {
  pos: THREE.Vector3;
  /** forward 방향 */
  dir: THREE.Vector3;
  /** up 방향 */
  up: THREE.Vector3;
  depth: number;
}

/**
 * 손짓(주먹)으로 한 그루 나무를 절차적으로 생성.
 * L-System 규칙을 한 번만 펼쳐서 가지 리스트를 만들고,
 * 각 가지의 spawnAt(0..1)으로 시간에 걸쳐 자라남.
 */
export function composeTree(opts: { position: [number, number, number]; personId: number }): TreeData {
  const ctx = {
    session: getSessionSeed(),
    person: personSeed(opts.personId),
    actionId: nextActionId(),
    time: Date.now() & 0xFFFFFFFF,
  };
  const rand = makeRand(ctx);

  const palettePersonRand = makeRand({ ...ctx, time: 0, actionId: 0 });
  const palette = PALETTES[Math.floor(palettePersonRand() * PALETTES.length)];

  const rule = pickLSystem(rand);
  const word = expandLSystem(rule);

  const trunkHex = pickColor(palette, rand);
  const leafHex = pickColor(palette, rand);
  const trunkRgb = chroma(trunkHex).rgb();
  const leafRgb = chroma(leafHex).rgb();
  const trunkColor: [number, number, number] = [trunkRgb[0] / 255, trunkRgb[1] / 255, trunkRgb[2] / 255];
  const leafColor: [number, number, number] = [leafRgb[0] / 255, leafRgb[1] / 255, leafRgb[2] / 255];

  const branches = buildBranches(word, rule, opts.position, trunkColor, leafColor, rand);

  return {
    id: crypto.randomUUID(),
    kind: 'tree',
    position: [...opts.position],
    palette,
    rule: rule.name,
    branches,
    age: 0,
    growDuration: 4 + rand() * 2.5,
    maxAge: 18 + rand() * 18,
    seed: ctx.actionId,
    birthAt: Date.now(),
  };
}

function buildBranches(
  word: string,
  rule: LSystemRule,
  origin: [number, number, number],
  trunkColor: [number, number, number],
  leafColor: [number, number, number],
  rand: () => number,
): TreeBranch[] {
  const branches: TreeBranch[] = [];
  const stack: TurtleState[] = [];
  const angleRad = (rule.angleDeg * Math.PI) / 180;

  const turtle: TurtleState = {
    pos: new THREE.Vector3(origin[0], origin[1], origin[2]),
    dir: new THREE.Vector3(0, 1, 0), // 위로
    up: new THREE.Vector3(0, 0, 1),
    depth: 0,
  };

  // 가지 깊이 추적 (그래야 spawnAt 계산)
  let maxDepthSeen = 0;

  for (const ch of word) {
    switch (ch) {
      case 'F': {
        const len = rule.stepLength * (1 - turtle.depth * 0.05); // 깊을수록 짧아짐
        const start = turtle.pos.toArray() as [number, number, number];
        turtle.pos.addScaledVector(turtle.dir, Math.max(0.04, len));
        const end = turtle.pos.toArray() as [number, number, number];
        if (turtle.depth > maxDepthSeen) maxDepthSeen = turtle.depth;
        branches.push({
          start, end, depth: turtle.depth,
          spawnAt: 0, // 나중에 정규화
          hasLeaf: false,
          trunkColor,
          leafColor,
        });
        break;
      }
      case '+': rotate(turtle, turtle.up, +angleRad); break;
      case '-': rotate(turtle, turtle.up, -angleRad); break;
      case '&': {
        const right = new THREE.Vector3().crossVectors(turtle.dir, turtle.up).normalize();
        rotate(turtle, right, +angleRad);
        break;
      }
      case '^': {
        const right = new THREE.Vector3().crossVectors(turtle.dir, turtle.up).normalize();
        rotate(turtle, right, -angleRad);
        break;
      }
      case '<': turtle.up.applyAxisAngle(turtle.dir, +angleRad); break;
      case '>': turtle.up.applyAxisAngle(turtle.dir, -angleRad); break;
      case '[':
        stack.push({ pos: turtle.pos.clone(), dir: turtle.dir.clone(), up: turtle.up.clone(), depth: turtle.depth + 1 });
        turtle.depth++;
        break;
      case ']': {
        const popped = stack.pop();
        if (popped) {
          turtle.pos.copy(popped.pos);
          turtle.dir.copy(popped.dir);
          turtle.up.copy(popped.up);
          turtle.depth = popped.depth - 1;
        }
        break;
      }
    }
  }

  // spawnAt 정규화: depth 깊을수록 늦게 (0..1 분포)
  const md = Math.max(1, maxDepthSeen);
  for (const b of branches) {
    b.spawnAt = b.depth / md * 0.95;
  }

  // 잎 표시: 같은 가지 다음에 [가 안 오는, 가장 끝 가지들 = leaf
  // 단순화: depth가 maxDepth에 가까운 가지들 (상위 30%)
  const leafThreshold = md * 0.7;
  for (const b of branches) {
    if (b.depth >= leafThreshold && rand() < 0.6) {
      b.hasLeaf = true;
    }
  }

  return branches;
}

function rotate(turtle: TurtleState, axis: THREE.Vector3, angle: number): void {
  turtle.dir.applyAxisAngle(axis, angle);
}

export const TREE_RULES_COUNT = LSYSTEM_RULES.length;
