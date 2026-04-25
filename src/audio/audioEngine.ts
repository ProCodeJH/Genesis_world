import * as Tone from 'tone';
import seedrandom from 'seedrandom';
import type { ColorPalette } from '../factories/catalog/palettes';

let started = false;
let synth: Tone.PolySynth | null = null;
let pluck: Tone.PluckSynth | null = null;
let metal: Tone.MetalSynth | null = null;

const PENTATONIC = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

async function ensure(): Promise<void> {
  if (started) return;
  await Tone.start();
  Tone.Destination.volume.value = -10;
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.4 },
  }).toDestination();
  pluck = new Tone.PluckSynth({ attackNoise: 0.6, dampening: 4000, resonance: 0.85 }).toDestination();
  metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).toDestination();
  metal.volume.value = -22;
  started = true;
}

/**
 * 창조 이벤트에 맞춰 짧은 음 1개 재생. 팔레트 분위기에 따라 음색 선택.
 */
export async function playCreationSound(palette: ColorPalette, seed: number): Promise<void> {
  await ensure();
  const rand = seedrandom(String(seed));
  const note = PENTATONIC[Math.floor(rand() * PENTATONIC.length)];

  // 팔레트 이름 기반 음색 선택 (사이버펑크면 신스, 자연이면 종, 등등)
  const name = palette.name.toLowerCase();
  if (name.includes('사이버') || name.includes('8-bit')) {
    metal?.triggerAttackRelease(note, '16n');
  } else if (name.includes('자연') || name.includes('단청')) {
    pluck?.triggerAttackRelease(note, '8n');
  } else {
    synth?.triggerAttackRelease(note, '8n');
  }
}

export async function playClapBurst(): Promise<void> {
  await ensure();
  const chord = ['C4', 'E4', 'G4', 'C5'];
  synth?.triggerAttackRelease(chord, '4n');
}
