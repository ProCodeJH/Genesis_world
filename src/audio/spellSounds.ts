import * as Tone from 'tone';
import type { SpellKind } from '../factories/catalog/spells';

let initted = false;
let osc: Tone.FMSynth | null = null;
let noise: Tone.NoiseSynth | null = null;
let bell: Tone.MetalSynth | null = null;
let lowOsc: Tone.MembraneSynth | null = null;

async function ensure(): Promise<void> {
  if (initted) return;
  await Tone.start();
  osc = new Tone.FMSynth({
    harmonicity: 3,
    modulationIndex: 14,
    envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 0.5 },
  }).toDestination();
  osc.volume.value = -16;

  noise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.05, decay: 0.7, sustain: 0.0, release: 0.3 },
  }).toDestination();
  noise.volume.value = -22;

  bell = new Tone.MetalSynth({
    harmonicity: 8,
    modulationIndex: 32,
    resonance: 5000,
    octaves: 1.5,
    envelope: { attack: 0.001, decay: 0.6, release: 0.4 },
  }).toDestination();
  bell.volume.value = -20;

  lowOsc = new Tone.MembraneSynth({
    pitchDecay: 0.2,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.4 },
  }).toDestination();
  lowOsc.volume.value = -10;

  initted = true;
}

export async function playSpell(kind: SpellKind): Promise<void> {
  await ensure();
  switch (kind) {
    case 'sphere':
      // 라센건: FM 신스 충전음 + 미세한 노이즈
      osc?.triggerAttackRelease('C3', '2n');
      setTimeout(() => noise?.triggerAttackRelease('1n'), 100);
      break;
    case 'beam':
      // 카메하메하: 저음 charge → bell 발사
      lowOsc?.triggerAttackRelease('C2', '0.6');
      setTimeout(() => bell?.triggerAttackRelease('C5', '4n'), 700);
      break;
    case 'pillar':
      // 반카이: 강력 bell + 노이즈
      bell?.triggerAttackRelease('G5', '2n');
      noise?.triggerAttackRelease('2n');
      break;
    case 'snap':
      // 아마테라스: 즉발 폭발
      lowOsc?.triggerAttackRelease('A1', '8n');
      noise?.triggerAttackRelease('8n');
      break;
  }
}
