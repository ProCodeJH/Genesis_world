import seedrandom from 'seedrandom';

/**
 * 4계층 시드: session × person × action × time
 * "한 사람의 그날 분위기는 일관되되, 매 행동은 변주"
 */

export interface SeedContext {
  session: number;
  person: number;
  actionId: number;
  time: number;
}

const SESSION_SEED = Math.floor(Math.random() * 0xFFFFFFFF);

export function getSessionSeed(): number {
  return SESSION_SEED;
}

let actionCounter = 0;
export function nextActionId(): number {
  return ++actionCounter;
}

/** 32-bit FNV-1a hash combine */
export function hashCombine(...nums: number[]): number {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    let v = Math.floor(n) | 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xFF;
      h = Math.imul(h, 16777619) >>> 0;
      v >>>= 8;
    }
  }
  return h >>> 0;
}

export function makeRand(ctx: SeedContext): () => number {
  const seed = hashCombine(ctx.session, ctx.person, ctx.actionId, ctx.time);
  return seedrandom(String(seed));
}

/** 사람 ID에서 안정된 numeric seed 도출 */
export function personSeed(personId: number): number {
  return hashCombine(personId, 7919);
}
