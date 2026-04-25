import { create } from 'zustand';

export interface RecentEvent {
  id: number;
  at: number;
  path: string;
  ext: string;
}

export interface FolderState {
  folderPath: string | null;

  totalSize: number;
  fileCount: number;
  lastMtime: number;
  fileTypes: Record<string, number>;

  gitClean: boolean;
  gitModified: number;
  gitCreated: number;
  gitDeleted: number;

  recentAdds: RecentEvent[];
  recentRemoves: RecentEvent[];
  sizeHistory: { at: number; size: number }[];

  setSnapshot: (s: { totalSize: number; fileCount: number; lastMtime: number; folderPath: string }) => void;
  onAdd: (e: { path: string; ext: string }) => void;
  onRemove: (e: { path: string; ext: string }) => void;
  setGit: (g: { clean: boolean; modified: number; created: number; deleted: number }) => void;
  pruneOldEvents: () => void;
  reset: () => void;
}

let idSeq = 0;
const EVENT_TTL_MS = 3000;
const HISTORY_MAX = 60;

export const useFolderStore = create<FolderState>((set, get) => ({
  folderPath: null,
  totalSize: 0,
  fileCount: 0,
  lastMtime: 0,
  fileTypes: {},
  gitClean: true,
  gitModified: 0,
  gitCreated: 0,
  gitDeleted: 0,
  recentAdds: [],
  recentRemoves: [],
  sizeHistory: [],

  setSnapshot: ({ totalSize, fileCount, lastMtime, folderPath }) => {
    const now = Date.now();
    const history = [...get().sizeHistory, { at: now, size: totalSize }].slice(-HISTORY_MAX);
    set({ totalSize, fileCount, lastMtime, folderPath, sizeHistory: history });
  },

  onAdd: ({ path, ext }) => {
    const now = Date.now();
    set((s) => ({
      recentAdds: [...s.recentAdds, { id: ++idSeq, at: now, path, ext }],
      fileTypes: { ...s.fileTypes, [ext]: (s.fileTypes[ext] ?? 0) + 1 },
    }));
  },

  onRemove: ({ path, ext }) => {
    const now = Date.now();
    set((s) => ({
      recentRemoves: [...s.recentRemoves, { id: ++idSeq, at: now, path, ext }],
      fileTypes: { ...s.fileTypes, [ext]: Math.max(0, (s.fileTypes[ext] ?? 0) - 1) },
    }));
  },

  setGit: ({ clean, modified, created, deleted }) =>
    set({ gitClean: clean, gitModified: modified, gitCreated: created, gitDeleted: deleted }),

  pruneOldEvents: () => {
    const cutoff = Date.now() - EVENT_TTL_MS;
    const s = get();
    const adds = s.recentAdds.filter((e) => e.at > cutoff);
    const rems = s.recentRemoves.filter((e) => e.at > cutoff);
    if (adds.length !== s.recentAdds.length || rems.length !== s.recentRemoves.length) {
      set({ recentAdds: adds, recentRemoves: rems });
    }
  },

  reset: () =>
    set({
      folderPath: null,
      totalSize: 0,
      fileCount: 0,
      lastMtime: 0,
      fileTypes: {},
      gitClean: true,
      gitModified: 0,
      gitCreated: 0,
      gitDeleted: 0,
      recentAdds: [],
      recentRemoves: [],
      sizeHistory: [],
    }),
}));
