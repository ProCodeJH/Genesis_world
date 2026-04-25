import { create } from 'zustand';

/**
 * 전역 시각 모드. 박수마다 셔플.
 */
export type PostFxMode = 'normal' | 'pixelate' | 'glitch' | 'demoscene';
export type SkyMode = 'dawn' | 'day' | 'dusk' | 'night';

const POST_MODES: PostFxMode[] = ['normal', 'pixelate', 'glitch', 'demoscene'];
const SKY_MODES: SkyMode[] = ['dawn', 'day', 'dusk', 'night'];

export interface SkyProfile {
  bgColor: string;
  ambientColor: string;
  ambientIntensity: number;
  voronoiColor: [number, number, number];
  bloomBoost: number;
}

export const SKY_PROFILES: Record<SkyMode, SkyProfile> = {
  dawn: {
    bgColor: '#1a1538',
    ambientColor: '#ffb88c',
    ambientIntensity: 0.45,
    voronoiColor: [1.0, 0.55, 0.7],
    bloomBoost: 1.3,
  },
  day: {
    bgColor: '#0a0a1a',
    ambientColor: '#ffffff',
    ambientIntensity: 0.55,
    voronoiColor: [0.4, 0.7, 1.0],
    bloomBoost: 1.0,
  },
  dusk: {
    bgColor: '#2a0a1f',
    ambientColor: '#ff7b35',
    ambientIntensity: 0.4,
    voronoiColor: [1.0, 0.5, 0.3],
    bloomBoost: 1.5,
  },
  night: {
    bgColor: '#000510',
    ambientColor: '#4480ff',
    ambientIntensity: 0.18,
    voronoiColor: [0.35, 0.45, 1.0],
    bloomBoost: 1.8,
  },
};

export function skyFromHour(hour: number): SkyMode {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

interface SceneStore {
  postFxMode: PostFxMode;
  skyMode: SkyMode;
  cyclePostFxMode: () => void;
  setPostFxMode: (m: PostFxMode) => void;
  cycleSkyMode: () => void;
  setSkyMode: (m: SkyMode) => void;
}

const initialSky: SkyMode = skyFromHour(new Date().getHours());

export const useSceneStore = create<SceneStore>((set, get) => ({
  postFxMode: 'normal',
  skyMode: initialSky,
  cyclePostFxMode: () => {
    const cur = get().postFxMode;
    const idx = POST_MODES.indexOf(cur);
    set({ postFxMode: POST_MODES[(idx + 1) % POST_MODES.length] });
  },
  setPostFxMode: (m) => set({ postFxMode: m }),
  cycleSkyMode: () => {
    const cur = get().skyMode;
    const idx = SKY_MODES.indexOf(cur);
    set({ skyMode: SKY_MODES[(idx + 1) % SKY_MODES.length] });
  },
  setSkyMode: (m) => set({ skyMode: m }),
}));
