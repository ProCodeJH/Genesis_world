import { useFrame } from '@react-three/fiber';
import { createNoise3D } from 'simplex-noise';
import { queries, world, type Entity } from '../ecs';

const noise3D = createNoise3D();

/**
 * 매 프레임 모든 creation entity를 진화시킨다.
 * birth/death 애니메이션은 렌더 단계에서 사용할 수 있도록
 * entity의 동적 특성(velocity, spin)에만 영향, scale/opacity는 Creations.tsx가 계산.
 */
export function CreationLifecycle() {
  useFrame((_, dt) => {
    const t = performance.now() * 0.001;
    const flockCenter: [number, number, number] = [0, 0, 0];
    let flockCount = 0;
    // flock 중심 사전 계산
    for (const c of [...queries.creations]) {
      if (c.motion === 'flock' && c.position) {
        flockCenter[0] += c.position[0]; flockCenter[1] += c.position[1]; flockCenter[2] += c.position[2];
        flockCount++;
      }
    }
    if (flockCount > 0) {
      flockCenter[0] /= flockCount; flockCenter[1] /= flockCount; flockCenter[2] /= flockCount;
    }

    for (const c of [...queries.creations]) {
      if (!c.position || !c.velocity || !c.spin) continue;
      c.age = (c.age ?? 0) + dt;
      if (c.maxAge != null && c.age >= c.maxAge) {
        try { world.remove(c); } catch { /* ignore */ }
        continue;
      }

      switch (c.motion) {
        case 'float': {
          c.velocity[1] += Math.sin(t * 1.3 + (c.seed ?? 0)) * 0.05 * dt;
          dampen(c, 0.985);
          break;
        }
        case 'spin': {
          c.spin[1] += dt * 0.5;
          dampen(c, 0.95);
          break;
        }
        case 'orbit': {
          const r = 0.5;
          const w = 1.5;
          const phase = (c.seed ?? 0) * 0.1;
          c.velocity[0] = Math.cos(t * w + phase) * r * dt * 60;
          c.velocity[2] = Math.sin(t * w + phase) * r * dt * 60;
          break;
        }
        case 'flow': {
          const sx = c.position[0] * 0.5;
          const sy = c.position[1] * 0.5;
          const sz = c.position[2] * 0.5;
          c.velocity[0] += noise3D(sx, sy, t * 0.3) * 0.3 * dt;
          c.velocity[1] += noise3D(sy, sz, t * 0.3 + 100) * 0.3 * dt;
          c.velocity[2] += noise3D(sz, sx, t * 0.3 + 200) * 0.3 * dt;
          dampen(c, 0.97);
          break;
        }
        case 'pulse': {
          dampen(c, 0.92);
          break;
        }
        case 'flock': {
          // Boids: cohesion to center + alignment + 약한 separation
          if (flockCount > 1) {
            const dx = flockCenter[0] - c.position[0];
            const dy = flockCenter[1] - c.position[1];
            const dz = flockCenter[2] - c.position[2];
            c.velocity[0] += dx * 0.05 * dt;
            c.velocity[1] += dy * 0.05 * dt;
            c.velocity[2] += dz * 0.05 * dt;
          }
          // 약간의 무작위 흔들림
          c.velocity[0] += (Math.random() - 0.5) * 0.4 * dt;
          c.velocity[1] += (Math.random() - 0.5) * 0.4 * dt;
          c.velocity[2] += (Math.random() - 0.5) * 0.4 * dt;
          dampen(c, 0.96);
          break;
        }
        case 'fall': {
          c.velocity[1] -= 1.5 * dt;
          if (c.position[1] < -2 && c.velocity[1] < 0) {
            c.velocity[1] = -c.velocity[1] * 0.6;
          }
          dampen(c, 0.98);
          break;
        }
        case 'ascend': {
          c.velocity[1] += 0.6 * dt;
          dampen(c, 0.98);
          break;
        }
        case 'dance': {
          const phase = (c.seed ?? 0) * 0.1;
          c.velocity[0] = Math.sin(t * 2 + phase) * 0.6;
          c.velocity[1] = Math.cos(t * 1.7 + phase) * 0.4;
          c.velocity[2] = Math.sin(t * 1.3 + phase * 1.5) * 0.6;
          break;
        }
        case 'wobble': {
          c.velocity[0] += (Math.random() - 0.5) * 1.2 * dt;
          c.velocity[1] += (Math.random() - 0.5) * 1.2 * dt;
          c.velocity[2] += (Math.random() - 0.5) * 1.2 * dt;
          dampen(c, 0.85);
          break;
        }
        case 'burst': {
          dampen(c, 0.88);
          break;
        }
        case 'anchor': {
          // 위치 고정, 회전만
          c.velocity[0] = 0; c.velocity[1] = 0; c.velocity[2] = 0;
          c.spin[0] += dt * 0.3;
          break;
        }
      }

      c.position[0] += c.velocity[0] * dt;
      c.position[1] += c.velocity[1] * dt;
      c.position[2] += c.velocity[2] * dt;

      if (c.rotation) {
        c.rotation[0] += c.spin[0] * dt;
        c.rotation[1] += c.spin[1] * dt;
        c.rotation[2] += c.spin[2] * dt;
      }
    }
  });

  return null;
}

function dampen(c: Entity, factor: number): void {
  if (!c.velocity) return;
  c.velocity[0] *= factor;
  c.velocity[1] *= factor;
  c.velocity[2] *= factor;
}
