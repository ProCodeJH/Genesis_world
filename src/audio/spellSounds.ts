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
    case 'chidori':
      // 치도리: 빠른 bell 연타 + 노이즈
      bell?.triggerAttackRelease('E5', '32n');
      setTimeout(() => bell?.triggerAttackRelease('G5', '32n'), 80);
      setTimeout(() => bell?.triggerAttackRelease('B5', '32n'), 160);
      noise?.triggerAttackRelease('16n');
      break;
    case 'aura':
      // 오라: 부드러운 FM 코드 (단음을 시간차로 쌓아 코드 효과)
      osc?.triggerAttackRelease('C4', '2n');
      setTimeout(() => osc?.triggerAttackRelease('E4', '2n'), 60);
      setTimeout(() => osc?.triggerAttackRelease('G4', '2n'), 120);
      break;
    case 'wave':
      // 충격파: 저음 sub + 짧은 노이즈
      lowOsc?.triggerAttackRelease('C2', '4n');
      noise?.triggerAttackRelease('8n');
      break;
    case 'magicCircle':
      // 소환진: bell 코드 (E, A, C#)
      bell?.triggerAttackRelease('E4', '4n');
      setTimeout(() => bell?.triggerAttackRelease('A4', '4n'), 100);
      setTimeout(() => bell?.triggerAttackRelease('C5', '4n'), 200);
      break;
    case 'spiral':
      // Rasenshuriken: 차지 → 회전 휘파람 + bell
      lowOsc?.triggerAttackRelease('E2', '0.4');
      setTimeout(() => bell?.triggerAttackRelease('B5', '8n'), 400);
      setTimeout(() => bell?.triggerAttackRelease('D6', '8n'), 600);
      break;
    case 'lightningBolt':
      // 번개: 짧은 cymbal + 빠른 sub
      bell?.triggerAttackRelease('C6', '32n');
      lowOsc?.triggerAttackRelease('A1', '16n');
      break;
    case 'comboSphere':
      // 콜라보: 깊은 코드 + 길게
      lowOsc?.triggerAttackRelease('C2', '0.6');
      setTimeout(() => osc?.triggerAttackRelease('C5', '1n'), 100);
      setTimeout(() => osc?.triggerAttackRelease('G5', '1n'), 200);
      setTimeout(() => bell?.triggerAttackRelease('E6', '4n'), 400);
      break;
    case 'highFive':
      // 하이파이브: 짧고 밝은 종 두 번
      bell?.triggerAttackRelease('G6', '32n');
      setTimeout(() => bell?.triggerAttackRelease('C7', '32n'), 60);
      break;
  }
}
