import { create } from 'zustand';

/**
 * 전역 시각 모드. 박수마다 셔플.
 */
export type PostFxMode = 'normal' | 'pixelate' | 'glitch' | 'demoscene';

const MODES: PostFxMode[] = ['normal', 'pixelate', 'glitch', 'demoscene'];

interface SceneStore {
  postFxMode: PostFxMode;
  cyclePostFxMode: () => void;
  setPostFxMode: (m: PostFxMode) => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  postFxMode: 'normal',
  cyclePostFxMode: () => {
    const cur = get().postFxMode;
    const idx = MODES.indexOf(cur);
    set({ postFxMode: MODES[(idx + 1) % MODES.length] });
  },
  setPostFxMode: (m) => set({ postFxMode: m }),
}));
