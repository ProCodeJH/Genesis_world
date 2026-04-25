import { World } from 'miniplex';
import { createReactAPI } from 'miniplex-react';
import type { ColorPalette } from '../factories/catalog/palettes';
import type { ShapeKind } from '../factories/catalog/shapes';
import type { MotionKind } from '../factories/catalog/motions';
import type { BirthKind } from '../factories/catalog/births';
import type { DeathKind } from '../factories/catalog/deaths';
import type { FaceState } from '../tracking/FaceTracker';

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
}

export type PersonMode = 'skeleton' | 'particles' | 'dual';

export interface Entity {
  id: string;
  kind: 'person' | 'creation' | 'orb' | 'effect';

  // person
  personId?: number;
  pose?: Pose;
  hands?: Hand[];
  face?: FaceState;
  mode?: PersonMode;

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
  /** 폴더 commit으로 생성된 별 등 출처 표시 */
  origin?: 'hand' | 'folder';
}

export const world = new World<Entity>();
export const ECS = createReactAPI(world);

export const queries = {
  persons: world.with('kind', 'pose').where((e) => e.kind === 'person'),
  creations: world.with('kind', 'shape', 'position').where((e) => e.kind === 'creation'),
};
