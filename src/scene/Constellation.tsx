import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';

const MAX_LINES = 200;
const MAX_VERTS = MAX_LINES * 2;
const CONNECT_RADIUS = 1.4;
/** 1분 이상 된 entity만 별자리 후보 (즉발 확인용; 자연 본격은 1일+) */
const AGE_THRESHOLD_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * 영속된 흔적의 "별자리".
 * birthAt이 1분 이상 지난 creation 페어 사이 옅은 라인을 연결.
 * 거리 1.4 이내 + 옅은 fade. additive blending으로 빛이 더해짐.
 */
export function Constellation() {
  const positions = useMemo(() => new Float32Array(MAX_VERTS * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_VERTS * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors]);

  useFrame(() => {
    const now = Date.now();
    const persisted = [...queries.creations].filter(
      (c) => c.birthAt && now - c.birthAt > AGE_THRESHOLD_MS && c.position && c.primaryColor,
    );
    let v = 0;
    for (let i = 0; i < persisted.length; i++) {
      const a = persisted[i];
      for (let j = i + 1; j < persisted.length; j++) {
        if (v >= MAX_VERTS / 2) break;
        const b = persisted[j];
        const dx = a.position![0] - b.position![0];
        const dy = a.position![1] - b.position![1];
        const dz = a.position![2] - b.position![2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > CONNECT_RADIUS * CONNECT_RADIUS) continue;
        const d = Math.sqrt(d2);
        // 오래될수록 라인 진해짐 (별자리는 오래 묵을수록 명확)
        const ageHourA = (now - (a.birthAt ?? now)) / HOUR_MS;
        const ageHourB = (now - (b.birthAt ?? now)) / HOUR_MS;
        const ageBoost = Math.min(1, (ageHourA + ageHourB) / 48); // 24시간 둘이면 boost 1
        const fade = (1 - d / CONNECT_RADIUS) * (0.15 + ageBoost * 0.35);
        // 두 entity 색의 평균 (별자리 라인이 별빛 닮음)
        const r = ((a.primaryColor![0] + b.primaryColor![0]) / 2) * fade;
        const g_ = ((a.primaryColor![1] + b.primaryColor![1]) / 2) * fade;
        const bl = ((a.primaryColor![2] + b.primaryColor![2]) / 2) * fade;
        positions[v * 3] = a.position![0];
        positions[v * 3 + 1] = a.position![1];
        positions[v * 3 + 2] = a.position![2];
        colors[v * 3] = r; colors[v * 3 + 1] = g_; colors[v * 3 + 2] = bl;
        v++;
        positions[v * 3] = b.position![0];
        positions[v * 3 + 1] = b.position![1];
        positions[v * 3 + 2] = b.position![2];
        colors[v * 3] = r; colors[v * 3 + 1] = g_; colors[v * 3 + 2] = bl;
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
