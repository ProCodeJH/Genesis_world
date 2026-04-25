import chroma from 'chroma-js';
import { PALETTES, pickColor, type ColorPalette } from './catalog/palettes';
import { pickShape } from './catalog/shapes';
import { pickMotion } from './catalog/motions';
import { pickBirth } from './catalog/births';
import { pickDeath } from './catalog/deaths';
import { getSessionSeed, makeRand, nextActionId, personSeed } from './seedHierarchy';
import type { Entity } from '../world/ecs';
import type { FaceState } from '../tracking/FaceTracker';

interface ComposeOpts {
  position: [number, number, number];
  personId: number;
  velocityHint?: [number, number, number];
  face?: FaceState;
  origin?: 'hand' | 'folder';
}

/**
 * 랜덤 Creation 생성. 같은 입력 절대 같은 결과 X.
 * - 사람의 그날 팔레트는 일관 (person seed)
 * - 매 손짓마다 모양/움직임/출생/사망 변주 (action seed)
 * - 표정으로 크기/색조 미세 조정 (입 벌림 → 큼, 미소 → 따뜻)
 */
export function composeCreation(opts: ComposeOpts): Entity {
  const ctx = {
    session: getSessionSeed(),
    person: personSeed(opts.personId),
    actionId: nextActionId(),
    time: Date.now() & 0xFFFFFFFF,
  };
  const rand = makeRand(ctx);

  const palettePersonRand = makeRand({ ...ctx, time: 0, actionId: 0 });
  let palette = pickPalette(palettePersonRand);

  // 미소가 강하면 따뜻한 팔레트 우선 (Ghibli/한국/Pixar 계열)
  if (opts.face && opts.face.smile > 0.5) {
    const warm = PALETTES.filter((p) => /Ghibli|한국|Pixar|자연 — 노을/.test(p.name));
    if (warm.length > 0) palette = warm[Math.floor(rand() * warm.length)];
  }
  // 놀람이 강하면 사이버/Plasma 우선
  if (opts.face && opts.face.surprise > 0.6) {
    const wild = PALETTES.filter((p) => /사이버|Plasma|NES/.test(p.name));
    if (wild.length > 0) palette = wild[Math.floor(rand() * wild.length)];
  }

  const baseHex = pickColor(palette, rand);
  const baseRgb = chroma(baseHex).rgb();
  const primaryColor: [number, number, number] = [baseRgb[0] / 255, baseRgb[1] / 255, baseRgb[2] / 255];

  const shape = pickShape(rand);
  const motion = pickMotion(rand);
  const birth = pickBirth(rand);
  const death = pickDeath(rand);

  // 입 벌림 → 크기 1.0~2.5x
  const mouthBoost = opts.face ? 1 + opts.face.mouthOpen * 1.5 : 1;
  const scale = (0.04 + rand() * 0.18) * mouthBoost;

  const v = opts.velocityHint ?? [0, 0, 0];
  const velocity: [number, number, number] = [
    v[0] * 0.5 + (rand() - 0.5) * 0.4,
    v[1] * 0.5 + (rand() - 0.5) * 0.4 + 0.1,
    v[2] * 0.5 + (rand() - 0.5) * 0.4,
  ];
  const spin: [number, number, number] = [
    (rand() - 0.5) * 4,
    (rand() - 0.5) * 4,
    (rand() - 0.5) * 4,
  ];

  const lifeMul = opts.origin === 'folder' ? 2.5 : 1; // 폴더 별은 더 오래 떠있음
  const maxAge = (6 + rand() * 18) * lifeMul;

  return {
    id: crypto.randomUUID(),
    kind: 'creation',
    position: [...opts.position],
    rotation: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
    scale,
    velocity,
    spin,
    palette,
    shape,
    motion,
    birth: birth.kind,
    birthDuration: birth.durationSec,
    death: death.kind,
    deathDuration: death.durationSec,
    age: 0,
    maxAge,
    seed: ctx.actionId,
    birthAt: Date.now(),
    primaryColor,
    emissive: 0.8 + rand() * 1.2,
    origin: opts.origin ?? 'hand',
  };
}

function pickPalette(rand: () => number): ColorPalette {
  return PALETTES[Math.floor(rand() * PALETTES.length)];
}
