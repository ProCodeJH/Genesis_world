/**
 * 폴더 상태 → 시각 파라미터 매핑.
 *
 * ⭐ 자현이 튜닝할 곳 ⭐
 * 각 함수의 임계값/곡선을 조정하면 "작업실" vs "생명체" 느낌이 달라짐.
 * 순수 함수라 테스트 쉽고, 60fps 루프에서 매 프레임 호출돼도 가벼움.
 */

export interface MappingInput {
  totalSize: number;
  fileCount: number;
  lastMtime: number;
  sizeHistory: { at: number; size: number }[];
  gitClean: boolean;
  gitModified: number;
  gitCreated: number;
  gitDeleted: number;
}

export interface VisualParams {
  orbRadius: number;          // 구체 반지름 (월드 유닛)
  glowIntensity: number;      // 0..1 발광 강도
  heartbeatBPM: number;       // 60..180 심박 BPM
  growthRate: number;         // bytes/sec 성장률 (양수만)
  dustAmount: number;         // 0..1 먼지량
  ledColor: [number, number, number]; // RGB 0..1 (git LED 색)
}

export function mapFolderToVisual(state: MappingInput): VisualParams {
  return {
    orbRadius: orbRadiusFrom(state.totalSize),
    glowIntensity: glowFrom(state.lastMtime),
    heartbeatBPM: heartbeatFrom(state),
    growthRate: growthFrom(state.sizeHistory),
    dustAmount: dustFrom(state.lastMtime),
    ledColor: ledFrom(state),
  };
}

// ─── 튜닝 포인트 ──────────────────────────────────────

// [용량 → 크기]  로그 스케일. 1KB=0.33, 1MB=0.73, 1GB=1.12
function orbRadiusFrom(bytes: number): number {
  if (bytes <= 0) return 0.25;
  return 0.25 + Math.log10(bytes + 1) * 0.08;
}

// [최근 수정 → 발광]  지수 감쇠. 5분 반감기
function glowFrom(lastMtime: number): number {
  if (!lastMtime) return 0;
  const ageMs = Math.max(0, Date.now() - lastMtime);
  const HALF_LIFE_MS = 5 * 60 * 1000;
  return Math.pow(0.5, ageMs / HALF_LIFE_MS);
}

// [수정 빈도 + 파일 수 → 심박]  60~180 BPM
function heartbeatFrom(state: { lastMtime: number; fileCount: number }): number {
  const BASELINE = 60;
  const GLOW_BOOST = 80;
  const FILE_BOOST = 40;
  const glow = glowFrom(state.lastMtime);
  const fileRatio = Math.min(1, state.fileCount / 500);
  return BASELINE + glow * GLOW_BOOST + fileRatio * FILE_BOOST;
}

// [용량 증가율]  최근 30초 샘플 기반 bytes/sec
function growthFrom(history: { at: number; size: number }[]): number {
  if (history.length < 2) return 0;
  const WINDOW_MS = 30_000;
  const now = Date.now();
  const recent = history.filter((h) => now - h.at < WINDOW_MS);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = (last.at - first.at) / 1000;
  if (dt <= 0) return 0;
  return Math.max(0, (last.size - first.size) / dt);
}

// [방치 시간 → 먼지]  24시간 후 시작, 일주일이면 최대
function dustFrom(lastMtime: number): number {
  if (!lastMtime) return 0;
  const ageHr = (Date.now() - lastMtime) / (60 * 60 * 1000);
  const DUST_START_HR = 24;
  const DUST_FULL_HR = 24 * 7;
  if (ageHr < DUST_START_HR) return 0;
  return Math.min(1, (ageHr - DUST_START_HR) / (DUST_FULL_HR - DUST_START_HR));
}

// [git 상태 → LED]  clean=청록, 조금 변경=호박, 많이 변경=빨강
function ledFrom(state: { gitClean: boolean; gitModified: number; gitCreated: number; gitDeleted: number }): [number, number, number] {
  if (state.gitClean) return [0.2, 0.9, 0.8];
  const dirt = state.gitModified + state.gitCreated + state.gitDeleted;
  if (dirt < 5) return [1.0, 0.75, 0.2];
  return [1.0, 0.25, 0.2];
}
