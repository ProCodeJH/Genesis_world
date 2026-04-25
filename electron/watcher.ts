import chokidar, { FSWatcher } from 'chokidar';
import { simpleGit } from 'simple-git';
import { stat } from 'node:fs/promises';

export type WatchEvent =
  | { kind: 'add'; path: string; size: number; mtime: number; ext: string }
  | { kind: 'change'; path: string; size: number; mtime: number; ext: string }
  | { kind: 'unlink'; path: string; ext: string }
  | { kind: 'snapshot'; totalSize: number; fileCount: number; lastMtime: number; folderPath: string }
  | { kind: 'git'; modified: number; created: number; deleted: number; clean: boolean }
  | { kind: 'error'; message: string };

type Emit = (ev: WatchEvent) => void;

const IGNORED = /(^|[/\\])(node_modules|\.git|dist|\.next|__pycache__|\.venv|out|\.turbo|\.cache)([/\\]|$)/;

let watcher: FSWatcher | null = null;
let gitTimer: NodeJS.Timeout | null = null;
let snapshotTimer: NodeJS.Timeout | null = null;
let stats = { totalSize: 0, fileCount: 0, lastMtime: 0 };
let snapshotDirty = false;

export async function setupWatcher(folderPath: string, emit: Emit): Promise<{ ok: boolean; error?: string }> {
  await disposeWatcher();
  stats = { totalSize: 0, fileCount: 0, lastMtime: 0 };
  snapshotDirty = false;

  try {
    watcher = chokidar.watch(folderPath, {
      ignored: IGNORED,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      depth: 10,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit({ kind: 'error', message: msg });
    return { ok: false, error: msg };
  }

  watcher
    .on('add', async (p) => {
      try {
        const s = await stat(p);
        stats.totalSize += s.size;
        stats.fileCount += 1;
        stats.lastMtime = Math.max(stats.lastMtime, s.mtimeMs);
        emit({ kind: 'add', path: p, size: s.size, mtime: s.mtimeMs, ext: extOf(p) });
        snapshotDirty = true;
      } catch { /* race on delete */ }
    })
    .on('change', async (p) => {
      try {
        const s = await stat(p);
        stats.lastMtime = Math.max(stats.lastMtime, s.mtimeMs);
        emit({ kind: 'change', path: p, size: s.size, mtime: s.mtimeMs, ext: extOf(p) });
        snapshotDirty = true;
      } catch { /* race */ }
    })
    .on('unlink', (p) => {
      stats.fileCount = Math.max(0, stats.fileCount - 1);
      emit({ kind: 'unlink', path: p, ext: extOf(p) });
      snapshotDirty = true;
    })
    .on('error', (err) => emit({ kind: 'error', message: String(err) }));

  snapshotTimer = setInterval(() => {
    if (!snapshotDirty) return;
    snapshotDirty = false;
    emit({ kind: 'snapshot', ...stats, folderPath });
  }, 500);

  gitTimer = setInterval(async () => {
    try {
      const git = simpleGit(folderPath);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return;
      const status = await git.status();
      emit({
        kind: 'git',
        modified: status.modified.length,
        created: status.created.length + status.not_added.length,
        deleted: status.deleted.length,
        clean: status.isClean(),
      });
    } catch { /* non-repo or git missing — silent */ }
  }, 5000);

  return { ok: true };
}

export async function disposeWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close().catch(() => { /* ignore */ });
    watcher = null;
  }
  if (gitTimer) { clearInterval(gitTimer); gitTimer = null; }
  if (snapshotTimer) { clearInterval(snapshotTimer); snapshotTimer = null; }
}

function extOf(p: string): string {
  const i = p.lastIndexOf('.');
  return i < 0 ? '' : p.slice(i + 1).toLowerCase();
}
