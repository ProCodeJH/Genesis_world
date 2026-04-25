import { FilesetResolver, FaceLandmarker, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface FaceState {
  mouthOpen: number;   // 0..1
  smile: number;       // 0..1
  surprise: number;    // 0..1
}

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private lastVideoTime = -1;

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 4,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  }

  detect(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult | null {
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

/** Blendshape category 점수에서 표정 상태 추출 */
export function readFaceState(categories: { categoryName: string; score: number }[] | undefined): FaceState {
  if (!categories) return { mouthOpen: 0, smile: 0, surprise: 0 };
  const get = (n: string) => categories.find((c) => c.categoryName === n)?.score ?? 0;
  const jaw = get('jawOpen');
  const smileL = get('mouthSmileLeft');
  const smileR = get('mouthSmileRight');
  const browL = get('browInnerUp');
  const eyeL = get('eyeWideLeft');
  const eyeR = get('eyeWideRight');
  return {
    mouthOpen: Math.min(1, jaw * 1.5),
    smile: Math.min(1, (smileL + smileR) / 2 * 1.3),
    surprise: Math.min(1, ((eyeL + eyeR) / 2 * 0.6 + browL * 0.4)),
  };
}
