import { useEffect, useState, useCallback } from 'react';
import { Scene } from './scene/Scene';
import { useFolderStore } from './store/folderStore';
import { useTrackers } from './tracking/useTrackers';
import { composeCreation } from './factories/randomComposer';
import { world } from './world/ecs';
import { useSceneStore } from './store/sceneStore';

const DEFAULT_FOLDER = 'C:/Users/exodia/.local/bin/Nava';

interface NavaApi {
  startWatch: (folder: string) => Promise<{ ok: boolean; error?: string }>;
  stopWatch: () => Promise<{ ok: boolean }>;
  onEvent: (cb: (payload: any) => void) => () => void;
}

declare global {
  interface Window { nava: NavaApi }
}

export default function App() {
  const [folder, setFolder] = useState(DEFAULT_FOLDER);
  const [watching, setWatching] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ready: trackersReady, error: trackerError } = useTrackers(tracking);
  const postFxMode = useSceneStore((s) => s.postFxMode);

  const totalSize = useFolderStore((s) => s.totalSize);
  const fileCount = useFolderStore((s) => s.fileCount);
  const lastMtime = useFolderStore((s) => s.lastMtime);
  const gitClean = useFolderStore((s) => s.gitClean);
  const gitModified = useFolderStore((s) => s.gitModified);
  const gitCreated = useFolderStore((s) => s.gitCreated);
  const gitDeleted = useFolderStore((s) => s.gitDeleted);

  useEffect(() => {
    const off = window.nava.onEvent((payload) => {
      const store = useFolderStore.getState();
      switch (payload.kind) {
        case 'snapshot': store.setSnapshot(payload); break;
        case 'add': {
          store.onAdd(payload);
          // 폴더 add → 가장자리에 별 자동 생성 (어제 코드와 융합)
          const angle = Math.random() * Math.PI * 2;
          const r = 2.8 + Math.random() * 0.5;
          const star = composeCreation({
            position: [Math.cos(angle) * r, Math.sin(angle) * r * 0.6, -1 + Math.random() * 1.5],
            personId: 9999, // 폴더는 가상 person
            origin: 'folder',
          });
          world.add(star);
          break;
        }
        case 'unlink': store.onRemove(payload); break;
        case 'git': store.setGit(payload); break;
        case 'error': setError(payload.message); break;
      }
    });
    return off;
  }, []);

  const startWatch = useCallback(async () => {
    setError(null);
    const res = await window.nava.startWatch(folder);
    if (!res.ok) {
      setError(res.error ?? '감시 시작 실패');
      return;
    }
    setWatching(true);
  }, [folder]);

  const stopWatch = useCallback(async () => {
    await window.nava.stopWatch();
    setWatching(false);
    useFolderStore.getState().reset();
  }, []);

  const toggleTracking = useCallback(() => {
    setTracking((t) => !t);
  }, []);

  return (
    <div style={rootStyle}>
      <Scene />
      <div style={hudStyle}>
        <div style={titleStyle}>🦋 <b>창조의 세계</b> <span style={versionStyle}>v0.7</span></div>
        <div style={hintStyle}>
          v0.7 마법 8종 + Reaction-Diffusion (Turing 1952)<br />
          <span style={{ color: '#66e0ff' }}>FX: {postFxMode}</span>
        </div>

        <div style={sectionLabel}>📂 폴더</div>
        <input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          disabled={watching}
          style={inputStyle}
          spellCheck={false}
        />
        <div style={btnRow}>
          {!watching
            ? <button onClick={startWatch} style={btnPrimary}>감시 시작</button>
            : <button onClick={stopWatch} style={btnStop}>감시 정지</button>}
        </div>

        <div style={sectionLabel}>🤚 손짓 + 표정 트래킹</div>
        <div style={btnRow}>
          {!tracking
            ? <button onClick={toggleTracking} style={btnPrimary}>트래킹 시작</button>
            : <button onClick={toggleTracking} style={btnStop}>트래킹 정지</button>}
          <span style={{ color: trackersReady ? '#66e0ff' : '#888', fontSize: 10, alignSelf: 'center' }}>
            {tracking ? (trackersReady ? '● 작동중' : '◌ 모델 로딩...') : ''}
          </span>
        </div>
        {trackerError && <div style={errorStyle}>⚠ tracker: {trackerError}</div>}
        {tracking && trackersReady && (
          <div style={hintStyle}>
            <b>기본</b><br />
            👌 핀치 → 무언가 태어남<br />
            ✊ 주먹 → 나무 자라기 (max 3그루)<br />
            😮 입 벌리고 핀치 → 큰 창조물<br />
            😊 미소 / 😲 놀람 → 색조 변화<br /><br />
            <b>마법 8종</b><br />
            🤲 양손 펴고 가깝게 → 🌀 Rasengan<br />
            👐 양손 펴고 같은 높이 → 💥 Kamehameha<br />
            ☝️ 한 손 펴고 어깨 위 → ⚡ Bankai<br />
            👏 박수 → 🔥 Amaterasu + 모드 셔플<br />
            ✊👌 한손 주먹 + 다른손 핀치 → ⚡ Chidori<br />
            🙌 양손 펴고 양손 어깨 위 → ✨ Aura<br />
            👐 양손 펴고 멀리 (&gt;0.7) → 💫 Wave<br />
            👇 한 손 펴고 hip 아래 → 🔮 Magic Circle
          </div>
        )}

        {error && <div style={errorStyle}>⚠ {error}</div>}

        <hr style={divider} />

        <StatRow label="파일" value={fileCount.toString()} />
        <StatRow label="용량" value={formatBytes(totalSize)} />
        <StatRow label="최근 수정" value={lastMtime ? timeAgo(lastMtime) : '—'} />
        <StatRow
          label="git"
          value={gitClean ? '✓ clean' : `M${gitModified} +${gitCreated} -${gitDeleted}`}
          color={gitClean ? '#66e0ff' : '#ffb84d'}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ color: color ?? '#c0f5ff' }}>{value}</span>
    </div>
  );
}

const rootStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: '#000' };
const hudStyle: React.CSSProperties = {
  position: 'absolute', top: 16, left: 16, padding: 14,
  background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(8px)',
  color: '#c0f5ff', fontFamily: 'ui-monospace, monospace', fontSize: 12,
  border: '1px solid rgba(100,220,255,0.3)', borderRadius: 10, minWidth: 340, maxWidth: 380,
  boxShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 20px rgba(100,220,255,0.08)',
};
const titleStyle: React.CSSProperties = { fontSize: 14, marginBottom: 2 };
const versionStyle: React.CSSProperties = { fontSize: 10, opacity: 0.5, marginLeft: 6 };
const hintStyle: React.CSSProperties = { opacity: 0.55, fontSize: 10, marginTop: 6, lineHeight: 1.5 };
const sectionLabel: React.CSSProperties = { marginTop: 12, marginBottom: 4, opacity: 0.7, fontSize: 11 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(100,220,255,0.3)', color: '#c0f5ff', borderRadius: 4,
  fontFamily: 'inherit', fontSize: 11, outline: 'none',
};
const btnRow: React.CSSProperties = { display: 'flex', gap: 6, marginTop: 6 };
const btnPrimary: React.CSSProperties = {
  padding: '6px 14px', background: '#0a2a3a', color: '#66e0ff',
  border: '1px solid #66e0ff', borderRadius: 4, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 11,
};
const btnStop: React.CSSProperties = { ...btnPrimary, background: '#3a0a1a', color: '#ff88aa', borderColor: '#ff88aa' };
const errorStyle: React.CSSProperties = { marginTop: 8, color: '#ff88aa', fontSize: 10 };
const divider: React.CSSProperties = { opacity: 0.15, margin: '12px 0', border: 0, borderTop: '1px solid #66e0ff' };

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function timeAgo(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
