/**
 * Gray-Scott Reaction-Diffusion (Turing 1952).
 * 두 화학 물질 A, B의 반응-확산이 자연스러운 무늬 (산호, 세포 분열, 동물 무늬).
 *
 * CPU 64×64 grid, 매 프레임 1 step. 가벼움.
 */

const W = 64;
const H = 64;

// 파라미터: f=0.055, k=0.062 → coral pattern
// f=0.062, k=0.062 → spots
// f=0.045, k=0.062 → spirals
const Da = 1.0;
const Db = 0.5;
const f = 0.055;
const k = 0.062;
const DT = 1.0;

let A = new Float32Array(W * H);
let B = new Float32Array(W * H);
let nextA = new Float32Array(W * H);
let nextB = new Float32Array(W * H);
let initialized = false;

function init(): void {
  for (let i = 0; i < W * H; i++) { A[i] = 1; B[i] = 0; }
  // 가운데 작은 정사각형 시드
  for (let y = H / 2 - 4; y < H / 2 + 4; y++) {
    for (let x = W / 2 - 4; x < W / 2 + 4; x++) {
      B[y * W + x] = 1;
    }
  }
  // 추가 무작위 시드 3개
  for (let s = 0; s < 3; s++) {
    const cx = 8 + Math.floor(Math.random() * (W - 16));
    const cy = 8 + Math.floor(Math.random() * (H - 16));
    for (let y = cy - 2; y < cy + 2; y++) {
      for (let x = cx - 2; x < cx + 2; x++) {
        B[y * W + x] = 1;
      }
    }
  }
  initialized = true;
}

export function ensureInit(): void {
  if (!initialized) init();
}

export function rdStep(steps = 4): void {
  ensureInit();
  for (let s = 0; s < steps; s++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const a = A[i], b = B[i];
        // 9-점 Laplacian (Moore neighborhood, weighted)
        const lapA =
          -a +
          0.2 * (A[i - 1] + A[i + 1] + A[i - W] + A[i + W]) +
          0.05 * (A[i - W - 1] + A[i - W + 1] + A[i + W - 1] + A[i + W + 1]);
        const lapB =
          -b +
          0.2 * (B[i - 1] + B[i + 1] + B[i - W] + B[i + W]) +
          0.05 * (B[i - W - 1] + B[i - W + 1] + B[i + W - 1] + B[i + W + 1]);
        const reaction = a * b * b;
        nextA[i] = a + (Da * lapA - reaction + f * (1 - a)) * DT;
        nextB[i] = b + (Db * lapB + reaction - (k + f) * b) * DT;
      }
    }
    [A, nextA] = [nextA, A];
    [B, nextB] = [nextB, B];
  }
}

export function rdReadInto(rgba: Uint8Array, palette: [number, number, number] = [0.4, 0.7, 1.0]): void {
  for (let i = 0; i < W * H; i++) {
    const v = Math.max(0, Math.min(1, B[i]));
    const intensity = Math.pow(v, 0.7);
    rgba[i * 4] = Math.floor(intensity * palette[0] * 255);
    rgba[i * 4 + 1] = Math.floor(intensity * palette[1] * 255);
    rgba[i * 4 + 2] = Math.floor(intensity * palette[2] * 255);
    rgba[i * 4 + 3] = Math.floor(intensity * 220);
  }
}

export const RD_W = W;
export const RD_H = H;
