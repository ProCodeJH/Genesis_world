import { useFrame } from '@react-three/fiber';
import { queries } from '../ecs';

/**
 * 진짜 Boids 3원칙 (Reynolds 1986):
 *   - separation (가까운 동료에서 멀어짐)
 *   - alignment (시야 내 평균 속도)
 *   - cohesion (시야 내 평균 위치)
 *
 * motion='flock'인 creation들만 대상.
 * O(n²)이지만 보통 동시 30~80개라 60fps 여유.
 */
export function BoidsSystem() {
  useFrame((_, dt) => {
    const flock = [...queries.creations].filter((c) => c.motion === 'flock');
    const n = flock.length;
    if (n < 2) return;

    const SEP_RADIUS = 0.25;
    const VIEW_RADIUS = 1.0;
    const SEP_FORCE = 2.0;
    const ALI_FORCE = 0.7;
    const COH_FORCE = 0.5;
    const MAX_SPEED = 1.8;

    for (let i = 0; i < n; i++) {
      const a = flock[i];
      if (!a.position || !a.velocity) continue;

      let sepX = 0, sepY = 0, sepZ = 0;
      let aliX = 0, aliY = 0, aliZ = 0;
      let cohX = 0, cohY = 0, cohZ = 0;
      let neighbors = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = flock[j];
        if (!b.position || !b.velocity) continue;
        const dx = a.position[0] - b.position[0];
        const dy = a.position[1] - b.position[1];
        const dz = a.position[2] - b.position[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > VIEW_RADIUS * VIEW_RADIUS) continue;
        const d = Math.sqrt(d2) || 0.001;

        if (d < SEP_RADIUS) {
          sepX += dx / d;
          sepY += dy / d;
          sepZ += dz / d;
        }
        aliX += b.velocity[0]; aliY += b.velocity[1]; aliZ += b.velocity[2];
        cohX += b.position[0]; cohY += b.position[1]; cohZ += b.position[2];
        neighbors++;
      }

      if (neighbors > 0) {
        aliX /= neighbors; aliY /= neighbors; aliZ /= neighbors;
        cohX = cohX / neighbors - a.position[0];
        cohY = cohY / neighbors - a.position[1];
        cohZ = cohZ / neighbors - a.position[2];

        a.velocity[0] += (sepX * SEP_FORCE + aliX * ALI_FORCE + cohX * COH_FORCE) * dt;
        a.velocity[1] += (sepY * SEP_FORCE + aliY * ALI_FORCE + cohY * COH_FORCE) * dt;
        a.velocity[2] += (sepZ * SEP_FORCE + aliZ * ALI_FORCE + cohZ * COH_FORCE) * dt;
      }

      // 속도 제한
      const sp = Math.sqrt(a.velocity[0] ** 2 + a.velocity[1] ** 2 + a.velocity[2] ** 2);
      if (sp > MAX_SPEED) {
        a.velocity[0] = a.velocity[0] / sp * MAX_SPEED;
        a.velocity[1] = a.velocity[1] / sp * MAX_SPEED;
        a.velocity[2] = a.velocity[2] / sp * MAX_SPEED;
      }
    }
  });
  return null;
}
