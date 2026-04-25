import chroma from 'chroma-js';
import { PALETTES, pickColor } from './catalog/palettes';
import { totalDuration, type SpellKind } from './catalog/spells';
import { getSessionSeed, makeRand, nextActionId, personSeed } from './seedHierarchy';
import type { Entity } from '../world/ecs';

interface ComposeSpellOpts {
  kind: SpellKind;
  origin: [number, number, number];
  target?: [number, number, number];
  personId: number;
}

export function composeSpell(opts: ComposeSpellOpts): Entity {
  const ctx = {
    session: getSessionSeed(),
    person: personSeed(opts.personId),
    actionId: nextActionId(),
    time: Date.now() & 0xFFFFFFFF,
  };
  const rand = makeRand(ctx);

  const palettePersonRand = makeRand({ ...ctx, time: 0, actionId: 0 });
  const palette = PALETTES[Math.floor(palettePersonRand() * PALETTES.length)];
  const baseHex = pickColor(palette, rand);
  const baseRgb = chroma(baseHex).rgb();
  const primaryColor: [number, number, number] = [baseRgb[0] / 255, baseRgb[1] / 255, baseRgb[2] / 255];

  const intensity = 1.5 + rand() * 1.5;
  const dur = totalDuration(opts.kind);

  return {
    id: crypto.randomUUID(),
    kind: 'spell',
    spellKind: opts.kind,
    spellOrigin: [...opts.origin],
    spellTarget: opts.target ? [...opts.target] : undefined,
    age: 0,
    maxAge: dur,
    palette,
    primaryColor,
    spellIntensity: intensity,
    seed: ctx.actionId,
    birthAt: Date.now(),
  } as Entity;
}
