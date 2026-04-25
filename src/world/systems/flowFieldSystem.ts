import { useFrame } from '@react-three/fiber';
import { createNoise4D } from 'simplex-noise';
import { queries } from '../ecs';

const flowX = createNoise4D();
const flowY = createNoise4D();
const flowZ = createNoise4D();

const FORCE = 0.08;
const SCALE_S = 0.25;
const SCALE_T = 0.15;

/**
 * 화면 전체에 보이지 않는 4D Perlin 바람.
 * 모든 creation에 약하게 영향 — "살아있는 공기".
 * 'anchor' / 'fall' / 'ascend' 같이 자기 운동이 강한 motion은 영향 약하게.
 */
export function FlowFieldSystem() {
  useFrame((_, dt) => {
    const t = performance.now() * 0.001 * SCALE_T;
    for (const c of [...queries.creations]) {
      if (!c.position || !c.velocity) continue;
      if (c.motion === 'anchor') continue;
      const weight =
        c.motion === 'fall' || c.motion === 'ascend' ? 0.3 :
        c.motion === 'flock' ? 0.2 :
        c.motion === 'orbit' || c.motion === 'dance' ? 0.4 :
        1.0;
      const sx = c.position[0] * SCALE_S;
      const sy = c.position[1] * SCALE_S;
      const sz = c.position[2] * SCALE_S;
      c.velocity[0] += flowX(sx, sy, sz, t) * FORCE * weight * dt;
      c.velocity[1] += flowY(sx, sy, sz, t) * FORCE * weight * dt;
      c.velocity[2] += flowZ(sx, sy, sz, t) * FORCE * weight * dt;
    }
  });
  return null;
}

/** 외부에서 (예: FlowGlimpse 시각화) flow 값 직접 조회 */
export function flowAt(x: number, y: number, z: number, time: number): [number, number, number] {
  const t = time * SCALE_T;
  const sx = x * SCALE_S;
  const sy = y * SCALE_S;
  const sz = z * SCALE_S;
  return [flowX(sx, sy, sz, t), flowY(sx, sy, sz, t), flowZ(sx, sy, sz, t)];
}
