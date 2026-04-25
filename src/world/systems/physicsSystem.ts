import { useFrame } from '@react-three/fiber';
import { queries, type Hand } from '../ecs';

const GRAVITY = 2.5;
const BOUND_Y_BOTTOM = -1.8;
const BOUND_Y_TOP = 2.2;
const BOUND_X = 3.5;
const BOUND_Z_NEAR = 0.5;
const BOUND_Z_FAR = -3.5;
const BOUNCE_FLOOR = 0.6;
const BOUNCE_WALL = 0.7;
const AIR_DRAG = 0.992;

const WORLD_W = 8;
const WORLD_H = 4.5;

interface HandTrack {
  prev: [number, number, number];
  curr: [number, number, number];
}

/** 잡힌 entity의 손 위치 추적 (key: personId-handedness) */
const handTracks = new Map<string, HandTrack>();

/**
 * 자체 간단 물리:
 *   - motion='physics' creation: 중력 + bound bounce + 공기 저항
 *   - grabbed entity: 손 위치로 setPosition, 핀치 풀면 마지막 속도 × 1.5로 던지기
 */
export function PhysicsSystem() {
  useFrame((_, dt) => {
    // 사람별 손 빠른 조회
    const personHands = new Map<number, Hand[]>();
    for (const p of [...queries.persons]) {
      if (p.personId == null) continue;
      personHands.set(p.personId, p.hands ?? []);
    }

    // 활성 손 위치 갱신 (모든 활성 손 추적)
    const seenKeys = new Set<string>();
    for (const [pid, hands] of personHands) {
      for (const h of hands) {
        const key = `${pid}-${h.handedness}`;
        seenKeys.add(key);
        const wrist = h.landmarks[0];
        if (!wrist) continue;
        const wx = -((wrist.x - 0.5) * WORLD_W);
        const wy = -(wrist.y - 0.5) * WORLD_H;
        const wz = -wrist.z * 4;
        let track = handTracks.get(key);
        if (!track) {
          track = { prev: [wx, wy, wz], curr: [wx, wy, wz] };
          handTracks.set(key, track);
        } else {
          track.prev[0] = track.curr[0]; track.prev[1] = track.curr[1]; track.prev[2] = track.curr[2];
          track.curr[0] = wx; track.curr[1] = wy; track.curr[2] = wz;
        }
      }
    }
    // 사라진 손은 추적 해제
    for (const k of [...handTracks.keys()]) {
      if (!seenKeys.has(k)) handTracks.delete(k);
    }

    for (const c of [...queries.creations]) {
      if (!c.position || !c.velocity) continue;

      // 잡힌 entity 처리 우선
      if (c.grabbed) {
        const hands = personHands.get(c.grabbed.personId);
        const hand = hands?.find((h) => h.handedness === c.grabbed!.handedness);

        if (!hand || !hand.isPinching) {
          // 핀치 풀림 = 던지기. 마지막 손 속도 적용
          const key = `${c.grabbed.personId}-${c.grabbed.handedness}`;
          const track = handTracks.get(key);
          if (track) {
            const dx = track.curr[0] - track.prev[0];
            const dy = track.curr[1] - track.prev[1];
            const dz = track.curr[2] - track.prev[2];
            // dt 보정 → 초당 속도. 강도 1.5x
            const sec = Math.max(0.005, dt);
            c.velocity[0] = (dx / sec) * 1.5;
            c.velocity[1] = (dy / sec) * 1.5;
            c.velocity[2] = (dz / sec) * 1.5;
          }
          c.grabbed = undefined;
        } else {
          const key = `${c.grabbed.personId}-${c.grabbed.handedness}`;
          const track = handTracks.get(key);
          if (track) {
            c.position[0] = track.curr[0];
            c.position[1] = track.curr[1];
            c.position[2] = track.curr[2];
          }
          c.velocity[0] = 0; c.velocity[1] = 0; c.velocity[2] = 0;
          continue;
        }
      }

      // physics motion: 중력 + bound bounce
      if (c.motion === 'physics') {
        c.velocity[1] -= GRAVITY * dt;
        c.velocity[0] *= AIR_DRAG;
        c.velocity[1] *= AIR_DRAG;
        c.velocity[2] *= AIR_DRAG;

        // 바닥 bounce
        if (c.position[1] < BOUND_Y_BOTTOM && c.velocity[1] < 0) {
          c.position[1] = BOUND_Y_BOTTOM;
          c.velocity[1] = -c.velocity[1] * BOUNCE_FLOOR;
          c.velocity[0] *= 0.85;
          c.velocity[2] *= 0.85;
          if (Math.abs(c.velocity[1]) < 0.05) c.velocity[1] = 0;
        }
        // 천장 (드물지만 던졌을 때)
        if (c.position[1] > BOUND_Y_TOP && c.velocity[1] > 0) {
          c.position[1] = BOUND_Y_TOP;
          c.velocity[1] = -c.velocity[1] * BOUNCE_FLOOR;
        }
        // 벽 X
        if (c.position[0] > BOUND_X && c.velocity[0] > 0) {
          c.position[0] = BOUND_X;
          c.velocity[0] = -c.velocity[0] * BOUNCE_WALL;
        }
        if (c.position[0] < -BOUND_X && c.velocity[0] < 0) {
          c.position[0] = -BOUND_X;
          c.velocity[0] = -c.velocity[0] * BOUNCE_WALL;
        }
        // 깊이 Z
        if (c.position[2] > BOUND_Z_NEAR && c.velocity[2] > 0) {
          c.position[2] = BOUND_Z_NEAR;
          c.velocity[2] = -c.velocity[2] * BOUNCE_WALL;
        }
        if (c.position[2] < BOUND_Z_FAR && c.velocity[2] < 0) {
          c.position[2] = BOUND_Z_FAR;
          c.velocity[2] = -c.velocity[2] * BOUNCE_WALL;
        }
      }
    }
  });
  return null;
}
