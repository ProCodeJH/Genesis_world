import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 8,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  detect(video: HTMLVideoElement, timestampMs: number): HandLandmarkerResult | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;
    return this.landmarker.detectForVideo(video, timestampMs);
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

/** 엄지(4) + 검지(8) 거리로 핀치 판정 (정규화 좌표 기준) */
export function isPinching(landmarks: { x: number; y: number; z: number }[]): boolean {
  if (landmarks.length < 9) return false;
  const t = landmarks[4];
  const i = landmarks[8];
  const dx = t.x - i.x, dy = t.y - i.y, dz = t.z - i.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.05;
}

/** 모든 손가락이 펴졌는지 (TIP이 PIP보다 위/멀리) */
export function isOpenHand(landmarks: { x: number; y: number; z: number }[]): boolean {
  if (landmarks.length < 21) return false;
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    if (landmarks[tips[i]].y < landmarks[pips[i]].y) extended++;
  }
  return extended >= 3;
}

export function isFist(landmarks: { x: number; y: number; z: number }[]): boolean {
  if (landmarks.length < 21) return false;
  const tips = [8, 12, 16, 20];
  const mcp = [5, 9, 13, 17];
  let curled = 0;
  for (let i = 0; i < tips.length; i++) {
    if (landmarks[tips[i]].y > landmarks[mcp[i]].y) curled++;
  }
  return curled >= 3;
}

/** 핀치 위치 (엄지+검지 중간점)를 월드 좌표로 변환 */
export function pinchWorld(
  landmarks: { x: number; y: number; z: number }[],
  worldWidth: number,
  worldHeight: number,
): [number, number, number] {
  const t = landmarks[4];
  const i = landmarks[8];
  // MediaPipe: x=0..1 (좌→우), y=0..1 (상→하), z=상대 깊이 (음수=가까움)
  const mx = (t.x + i.x) / 2;
  const my = (t.y + i.y) / 2;
  const mz = (t.z + i.z) / 2;
  // 웹캠 미러링이라 x 반전
  return [
    -((mx - 0.5) * worldWidth),
    -(my - 0.5) * worldHeight,
    -mz * 4,
  ];
}
