import { contextBridge, ipcRenderer } from 'electron';

export type WatchEvent =
  | { kind: 'add'; path: string; size: number; mtime: number; ext: string }
  | { kind: 'change'; path: string; size: number; mtime: number; ext: string }
  | { kind: 'unlink'; path: string; ext: string }
  | { kind: 'snapshot'; totalSize: number; fileCount: number; lastMtime: number; folderPath: string }
  | { kind: 'git'; modified: number; created: number; deleted: number; clean: boolean }
  | { kind: 'error'; message: string };

const api = {
  startWatch: (folder: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('watch:start', folder),
  stopWatch: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('watch:stop'),
  onEvent: (cb: (payload: WatchEvent) => void): (() => void) => {
    const listener = (_e: unknown, payload: WatchEvent) => cb(payload);
    ipcRenderer.on('watch:event', listener);
    return () => ipcRenderer.off('watch:event', listener);
  },
};

contextBridge.exposeInMainWorld('nava', api);

export type NavaApi = typeof api;
