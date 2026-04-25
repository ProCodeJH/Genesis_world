import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';

const TRAIL_LEN = 12;
const MAX_HANDS = 8;
const MAX_SEG = MAX_HANDS * (TRAIL_LEN - 1);
const MAX_VERTS = MAX_SEG * 2;

const WORLD_W = 8;
const WORLD_H = 4.5;

interface Trail {
  pos: number[]; // [x0,y0,z0, x1,y1,z1, ...]
  active: boolean;
}

export function HandTrails() {
  const trails = useRef<Trail[]>(
    Array.from({ length: MAX_HANDS }, () => ({
      pos: new Array(TRAIL_LEN * 3).fill(0),
      active: false,
    })),
  );

  const positions = useMemo(() => new Float32Array(MAX_VERTS * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_VERTS * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors]);

  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    // 모든 활성 손 수집
    interface HandInfo { wx: number; wy: number; wz: number; pinch: boolean; personId: number }
    const activeHands: HandInfo[] = [];
    for (const p of [...queries.persons]) {
      const hands = p.hands ?? [];
      for (const h of hands) {
        if (activeHands.length >= MAX_HANDS) break;
        const wrist = h.landmarks[0];
        if (!wrist) continue;
        activeHands.push({
          wx: -((wrist.x - 0.5) * WORLD_W),
          wy: -(wrist.y - 0.5) * WORLD_H,
          wz: -wrist.z * 4,
          pinch: h.isPinching,
          personId: p.personId ?? 0,
        });
      }
    }

    let v = 0;
    for (let i = 0; i < MAX_HANDS; i++) {
      const trail = trails.current[i];
      const info = activeHands[i];
      if (!info) {
        trail.active = false;
        continue;
      }
      // shift trail
      for (let k = TRAIL_LEN - 1; k > 0; k--) {
        trail.pos[k * 3] = trail.pos[(k - 1) * 3];
        trail.pos[k * 3 + 1] = trail.pos[(k - 1) * 3 + 1];
        trail.pos[k * 3 + 2] = trail.pos[(k - 1) * 3 + 2];
      }
      // 새 진입 시 모든 슬롯을 현재 위치로 (잔상 튐 방지)
      if (!trail.active) {
        for (let k = 0; k < TRAIL_LEN; k++) {
          trail.pos[k * 3] = info.wx;
          trail.pos[k * 3 + 1] = info.wy;
          trail.pos[k * 3 + 2] = info.wz;
        }
        trail.active = true;
      }
      trail.pos[0] = info.wx;
      trail.pos[1] = info.wy;
      trail.pos[2] = info.wz;

      const hue = (info.personId * 137.5) % 360;
      tmpC.setHSL(hue / 360, 0.8, 0.6);
      const baseAlpha = info.pinch ? 1.0 : 0.5;

      for (let k = 0; k < TRAIL_LEN - 1; k++) {
        if (v >= MAX_VERTS / 2) break;
        const fade = baseAlpha * (1 - k / TRAIL_LEN);
        positions[v * 3] = trail.pos[k * 3];
        positions[v * 3 + 1] = trail.pos[k * 3 + 1];
        positions[v * 3 + 2] = trail.pos[k * 3 + 2];
        colors[v * 3] = tmpC.r * fade; colors[v * 3 + 1] = tmpC.g * fade; colors[v * 3 + 2] = tmpC.b * fade;
        v++;
        positions[v * 3] = trail.pos[(k + 1) * 3];
        positions[v * 3 + 1] = trail.pos[(k + 1) * 3 + 1];
        positions[v * 3 + 2] = trail.pos[(k + 1) * 3 + 2];
        colors[v * 3] = tmpC.r * fade; colors[v * 3 + 1] = tmpC.g * fade; colors[v * 3 + 2] = tmpC.b * fade;
        v++;
      }
    }

    geo.setDrawRange(0, v);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}
