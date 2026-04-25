import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';

const WORLD_WIDTH = 8;
const WORLD_HEIGHT = 4.5;
const Z_BACK = -2.5;

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32],
  [0, 11], [0, 12],
];

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const POSE_KEY_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

const MAX_PERSONS = 4;
const MAX_LINE_SEGMENTS = MAX_PERSONS * (POSE_CONNECTIONS.length + 2 * HAND_CONNECTIONS.length);
const MAX_LINE_VERTS = MAX_LINE_SEGMENTS * 2;
const MAX_POINTS = MAX_PERSONS * (POSE_KEY_INDICES.length + 2 * 21);

export function PersonSkeletons() {
  const positions = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors]);

  const ptPos = useMemo(() => new Float32Array(MAX_POINTS * 3), []);
  const ptCol = useMemo(() => new Float32Array(MAX_POINTS * 3), []);
  const pointGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(ptCol, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [ptPos, ptCol]);

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let v = 0;     // line verts
    let pi = 0;    // point verts
    let personIdx = 0;

    for (const p of [...queries.persons]) {
      if (personIdx >= MAX_PERSONS) break;
      const lms = p.pose?.landmarks as { x: number; y: number; z: number; visibility: number }[] | undefined;
      if (!lms || lms.length < 33) { personIdx++; continue; }

      const hue = (personIdx * 137.5) % 360;
      tmpColor.setHSL(hue / 360, 0.7, 0.6);
      const mode = p.mode ?? 'skeleton';
      const showLines = mode === 'skeleton' || mode === 'dual';
      const showPoints = mode === 'particles' || mode === 'dual';

      const project = (lm: { x: number; y: number; z: number }): [number, number, number] => [
        -((lm.x - 0.5) * WORLD_WIDTH),
        -(lm.y - 0.5) * WORLD_HEIGHT,
        Z_BACK - lm.z * 4,
      ];

      // Lines
      if (showLines) {
        for (const [a, b] of POSE_CONNECTIONS) {
          const la = lms[a], lb = lms[b];
          if (!la || !lb || la.visibility < 0.5 || lb.visibility < 0.5) continue;
          const pa = project(la), pb = project(lb);
          positions[v * 3] = pa[0]; positions[v * 3 + 1] = pa[1]; positions[v * 3 + 2] = pa[2];
          colors[v * 3] = tmpColor.r; colors[v * 3 + 1] = tmpColor.g; colors[v * 3 + 2] = tmpColor.b;
          v++;
          positions[v * 3] = pb[0]; positions[v * 3 + 1] = pb[1]; positions[v * 3 + 2] = pb[2];
          colors[v * 3] = tmpColor.r; colors[v * 3 + 1] = tmpColor.g; colors[v * 3 + 2] = tmpColor.b;
          v++;
        }
      }

      // Points
      if (showPoints) {
        for (const idx of POSE_KEY_INDICES) {
          const lm = lms[idx];
          if (!lm || lm.visibility < 0.5) continue;
          const pp = project(lm);
          if (pi < MAX_POINTS) {
            ptPos[pi * 3] = pp[0]; ptPos[pi * 3 + 1] = pp[1]; ptPos[pi * 3 + 2] = pp[2];
            ptCol[pi * 3] = tmpColor.r; ptCol[pi * 3 + 1] = tmpColor.g; ptCol[pi * 3 + 2] = tmpColor.b;
            pi++;
          }
        }
      }

      // Hands
      const hands = p.hands ?? [];
      for (const h of hands) {
        const handColor = h.isPinching ? new THREE.Color(1, 0.9, 0.4) : tmpColor;
        if (showLines) {
          for (const [a, b] of HAND_CONNECTIONS) {
            const la = h.landmarks[a], lb = h.landmarks[b];
            if (!la || !lb) continue;
            const pa = project(la), pb = project(lb);
            positions[v * 3] = pa[0]; positions[v * 3 + 1] = pa[1]; positions[v * 3 + 2] = pa[2];
            colors[v * 3] = handColor.r; colors[v * 3 + 1] = handColor.g; colors[v * 3 + 2] = handColor.b;
            v++;
            positions[v * 3] = pb[0]; positions[v * 3 + 1] = pb[1]; positions[v * 3 + 2] = pb[2];
            colors[v * 3] = handColor.r; colors[v * 3 + 1] = handColor.g; colors[v * 3 + 2] = handColor.b;
            v++;
          }
        }
        if (showPoints) {
          for (const lm of h.landmarks) {
            const pp = project(lm);
            if (pi < MAX_POINTS) {
              ptPos[pi * 3] = pp[0]; ptPos[pi * 3 + 1] = pp[1]; ptPos[pi * 3 + 2] = pp[2];
              ptCol[pi * 3] = handColor.r; ptCol[pi * 3 + 1] = handColor.g; ptCol[pi * 3 + 2] = handColor.b;
              pi++;
            }
          }
        }
      }
      personIdx++;
    }

    lineGeo.setDrawRange(0, v);
    (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    pointGeo.setDrawRange(0, pi);
    (pointGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (pointGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} />
      </lineSegments>
      <points geometry={pointGeo} frustumCulled={false}>
        <pointsMaterial vertexColors transparent opacity={0.95} size={0.08} sizeAttenuation />
      </points>
    </>
  );
}
