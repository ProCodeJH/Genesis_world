import type { Entity } from './ecs';
import type { ShapeKind } from '../factories/catalog/shapes';
import type { MotionKind } from '../factories/catalog/motions';
import type { TreeBranch } from '../factories/treeFactory';

const STORAGE_KEY = 'genesis-world-snapshot-v1';
const MAX_PERSISTED = 200;
const DECAY_DAY_MS = 24 * 60 * 60 * 1000;
const RESTORE_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 영속된 건 30일

interface SerializedEntity {
  kind: 'creation' | 'tree';
  birthAt: number;
  persistedAt: number;
  position: [number, number, number];
  primaryColor: [number, number, number];
  scale?: number;
  shape?: ShapeKind;
  motion?: MotionKind;
  emissive?: number;
  rotation?: [number, number, number];
  spin?: [number, number, number];
  branches?: TreeBranch[];
  growDuration?: number;
  rule?: string;
}

interface Snapshot {
  v: 1;
  savedAt: number;
  entities: SerializedEntity[];
}

export function saveSnapshot(entities: Entity[]): boolean {
  const candidates = entities.filter((e) => (e.kind === 'creation' || e.kind === 'tree') && e.position);
  const sorted = candidates.sort((a, b) => (b.birthAt ?? 0) - (a.birthAt ?? 0));
  const top = sorted.slice(0, MAX_PERSISTED);

  const serialized: SerializedEntity[] = top.map((e) => ({
    kind: e.kind as 'creation' | 'tree',
    birthAt: e.birthAt ?? Date.now(),
    persistedAt: Date.now(),
    position: e.position!,
    primaryColor: e.primaryColor ?? [1, 1, 1],
    scale: e.scale,
    shape: e.shape,
    motion: e.motion,
    emissive: e.emissive,
    rotation: e.rotation,
    spin: e.spin,
    branches: e.branches,
    growDuration: e.growDuration,
    rule: e.rule,
  }));

  const snap: Snapshot = { v: 1, savedAt: Date.now(), entities: serialized };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(): SerializedEntity[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Snapshot;
    if (data.v !== 1) return null;
    return data.entities ?? null;
  } catch {
    return null;
  }
}

/**
 * 영속된 entity 복원. birthAt 기반 elapsedDays로 색 바램.
 *   1일 미만:  변화 없음
 *   1~10일:   linear lerp 1.0 → 0.3
 *   10일+:     0.2 (거의 화석)
 */
export function restoreEntities(serialized: SerializedEntity[]): Entity[] {
  const now = Date.now();
  return serialized.map((s) => {
    const elapsedDays = (now - s.birthAt) / DECAY_DAY_MS;
    const fadeFactor =
      elapsedDays < 1 ? 1 :
      elapsedDays < 10 ? Math.max(0.3, 1 - (elapsedDays - 1) * 0.078) :
      0.2;
    const fadedColor: [number, number, number] = [
      s.primaryColor[0] * fadeFactor,
      s.primaryColor[1] * fadeFactor,
      s.primaryColor[2] * fadeFactor,
    ];
    const fadedEmissive = (s.emissive ?? 1) * fadeFactor;

    const ent: Entity = {
      id: crypto.randomUUID(),
      kind: s.kind,
      position: [...s.position],
      primaryColor: fadedColor,
      birthAt: s.birthAt,
      age: 0,
      maxAge: RESTORE_MAX_AGE_SEC,
      scale: s.scale,
      shape: s.shape,
      motion: s.motion,
      emissive: fadedEmissive,
      rotation: s.rotation ? [...s.rotation] : [0, 0, 0],
      spin: s.spin ? [s.spin[0] * 0.3, s.spin[1] * 0.3, s.spin[2] * 0.3] : [0, 0, 0], // 영속된 건 천천히 회전
      velocity: [0, 0, 0],
      branches: s.branches,
      growDuration: s.growDuration,
      rule: s.rule,
      origin: 'hand',
    };
    return ent;
  });
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
