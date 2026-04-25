import * as Tone from 'tone';
import { create } from 'zustand';

export type Instrument = 'synth' | 'pluck' | 'bell' | 'marimba';

export interface StepNote {
  pitch: string;
  personId: number;
  instrument: Instrument;
}

const PENTATONIC = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
const STEPS = 8;
const MAX_NOTES_PER_STEP = 4;

interface SequencerState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  stepNotes: StepNote[][];
  setBpm: (b: number) => void;
  toggle: () => Promise<void>;
  setCurrentStep: (s: number) => void;
  addNote: (step: number, note: StepNote) => void;
  clearAll: () => void;
}

export const useSequencerStore = create<SequencerState>((set, get) => ({
  bpm: 120,
  isPlaying: false,
  currentStep: 0,
  stepNotes: Array.from({ length: STEPS }, () => []),
  setBpm: (b) => {
    set({ bpm: b });
    Tone.Transport.bpm.value = b;
  },
  toggle: async () => {
    await initSequencer();
    const { isPlaying } = get();
    if (!isPlaying) {
      Tone.Transport.start();
      set({ isPlaying: true });
    } else {
      Tone.Transport.stop();
      set({ isPlaying: false, currentStep: 0 });
    }
  },
  setCurrentStep: (s) => set({ currentStep: s }),
  addNote: (step, note) => {
    const sn = get().stepNotes.slice();
    const cur = sn[step].slice();
    if (cur.length >= MAX_NOTES_PER_STEP) cur.shift();
    cur.push(note);
    sn[step] = cur;
    set({ stepNotes: sn });
  },
  clearAll: () => {
    set({ stepNotes: Array.from({ length: STEPS }, () => []) });
  },
}));

interface InstrumentSet {
  synth: Tone.PolySynth;
  pluck: Tone.PluckSynth;
  bell: Tone.MetalSynth;
  marimba: Tone.PolySynth;
}

let instruments: InstrumentSet | null = null;
let seq: Tone.Sequence | null = null;
let initialized = false;

export async function initSequencer(): Promise<void> {
  if (initialized) return;
  await Tone.start();

  instruments = {
    synth: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0.05, release: 0.3 },
    }).toDestination(),
    pluck: new Tone.PluckSynth({ attackNoise: 0.5, dampening: 4000, resonance: 0.85 }).toDestination(),
    bell: new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 },
      harmonicity: 8,
      modulationIndex: 32,
      resonance: 5000,
      octaves: 1.5,
    }).toDestination(),
    marimba: new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.4 },
    }).toDestination(),
  };
  instruments.synth.volume.value = -16;
  instruments.pluck.volume.value = -14;
  instruments.bell.volume.value = -22;
  instruments.marimba.volume.value = -14;

  Tone.Transport.bpm.value = useSequencerStore.getState().bpm;

  seq = new Tone.Sequence(
    (time, step) => {
      const { stepNotes, setCurrentStep } = useSequencerStore.getState();
      Tone.Draw.schedule(() => setCurrentStep(step as number), time);
      const notes = stepNotes[step as number];
      if (!notes || !instruments) return;
      for (const note of notes) {
        const inst = instruments[note.instrument];
        try { inst.triggerAttackRelease(note.pitch, '8n', time); } catch { /* ignore */ }
      }
    },
    [0, 1, 2, 3, 4, 5, 6, 7],
    '8n',
  );
  seq.start(0);
  initialized = true;
}

export function pickInstrument(personId: number): Instrument {
  const map: Instrument[] = ['synth', 'pluck', 'bell', 'marimba'];
  return map[((personId % map.length) + map.length) % map.length];
}

/** y(0=top) → pitch (top=highest). MediaPipe y는 상=0, 하=1. */
export function pitchFromY(yNorm: number): string {
  const tNorm = Math.max(0, Math.min(1, yNorm));
  const idx = Math.max(0, Math.min(PENTATONIC.length - 1, Math.floor((1 - tNorm) * PENTATONIC.length)));
  return PENTATONIC[idx];
}

/** x → step. 거울 모드라 1-x를 사용. */
export function stepFromX(xNorm: number): number {
  const tNorm = Math.max(0, Math.min(1, xNorm));
  return Math.max(0, Math.min(STEPS - 1, Math.floor(tNorm * STEPS)));
}

export const SEQ_STEPS = STEPS;
export const SEQ_PENTATONIC = PENTATONIC;

export function instrumentHueDeg(instrument: Instrument): number {
  switch (instrument) {
    case 'synth': return 200;   // 청록
    case 'pluck': return 30;    // 호박
    case 'bell': return 280;    // 보라
    case 'marimba': return 100; // 초록
  }
}
