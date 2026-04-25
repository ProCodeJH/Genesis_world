import { World } from 'miniplex';
import { createReactAPI } from 'miniplex-react';
import type { ColorPalette } from '../factories/catalog/palettes';
import type { ShapeKind } from '../factories/catalog/shapes';
import type { MotionKind } from '../factories/catalog/motions';
import type { BirthKind } from '../factories/catalog/births';
import type { DeathKind } from '../factories/catalog/deaths';
import type { FaceState } from '../tracking/FaceTracker';
import type { TreeBranch } from '../factories/treeFactory';
import type { SpellKind } from '../factories/catalog/spells';

export interface PoseLandmark { x: number; y: number; z: number; visibility: number }
export interface HandLandmark { x: number; y: number; z: number }

export interface Pose {
  landmarks: PoseLandmark[];
  worldLandmarks?: PoseLandmark[];
}

export interface Hand {
  handedness: 'Left' | 'Right';
  landmarks: HandLandmark[];
  isPinching: boolean;
  isOpen: boolean;
  isFist: boolean;
  pinchPosition?: [number, number, number];
  fistPosition?: [number, number, number];
}

export type PersonMode = 'skeleton' | 'particles' | 'dual';

export interface Entity {
  id: string;
  kind: 'person' | 'creation' | 'orb' | 'effect' | 'tree' | 'spell';

  // person
  personId?: number;
  pose?: Pose;
  hands?: Hand[];
  face?: FaceState;
  mode?: PersonMode;
  prevFist?: Record<string, boolean>;

  // creation
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  velocity?: [number, number, number];
  spin?: [number, number, number];
  palette?: ColorPalette;
  shape?: ShapeKind;
  motion?: MotionKind;
  birth?: BirthKind;
  birthDuration?: number;
  death?: DeathKind;
  deathDuration?: number;
  age?: number;
  maxAge?: number;
  seed?: number;
  birthAt?: number;
  primaryColor?: [number, number, number];
  emissive?: number;
  origin?: 'hand' | 'folder';
  /** boids에서 생산자 식별 (분리/응집 그룹 분할용) */
  flockGroupId?: number;
  /** 잡힌 상태 (Physics) — 손이 따라옴 */
  grabbed?: { personId: number; handedness: 'Left' | 'Right' };

  // tree
  branches?: TreeBranch[];
  growDuration?: number;
  rule?: string;

  // spell
  spellKind?: SpellKind;
  spellOrigin?: [number, number, number];
  spellTarget?: [number, number, number];
  spellIntensity?: number;
  /** Aura — 매 프레임 owner의 가슴 위치로 spellOrigin update */
  spellFollowPersonId?: number;
}

export const world = new World<Entity>();
export const ECS = createReactAPI(world);

export const queries = {
  persons: world.with('kind', 'pose').where((e) => e.kind === 'person'),
  creations: world.with('kind', 'shape', 'position').where((e) => e.kind === 'creation'),
  trees: world.with('kind', 'branches').where((e) => e.kind === 'tree'),
  spells: world.with('kind', 'spellKind').where((e) => e.kind === 'spell'),
};
