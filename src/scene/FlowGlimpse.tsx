import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flowAt } from '../world/systems/flowFieldSystem';

const PARTICLES = 80;
const TRAIL_LEN = 8;
const WORLD_X = 4;
const WORLD_Y = 2.5;
const WORLD_Z = 1.5;

interface P {
  x: number; y: number; z: number;
  trail: number[]; // last TRAIL_LEN positions [x,y,z, x,y,z, ...]
  life: number;
}

export function FlowGlimpse() {
  const particles = useMemo<P[]>(() => {
    const arr: P[] = [];
    for (let i = 0; i < PARTICLES; i++) {
      arr.push({
        x: (Math.random() - 0.5) * WORLD_X * 2,
        y: (Math.random() - 0.5) * WORLD_Y * 2,
        z: (Math.random() - 0.5) * WORLD_Z * 2 - 1,
        trail: new Array(TRAIL_LEN * 3).fill(0),
        life: Math.random() * 3,
      });
    }
    return arr;
  }, []);

  const positions = useMemo(() => new Float32Array(PARTICLES * (TRAIL_LEN - 1) * 2 * 3), []);
  const colors = useMemo(() => new Float32Array(PARTICLES * (TRAIL_LEN - 1) * 2 * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions, colors]);

  const baseColor = useRef(new THREE.Color('#66e0ff'));

  useFrame((_, dt) => {
    const t = performance.now() * 0.001;
    let v = 0;
    for (const p of particles) {
      p.life += dt;
      if (p.life > 4 || Math.abs(p.x) > WORLD_X || Math.abs(p.y) > WORLD_Y) {
        p.x = (Math.random() - 0.5) * WORLD_X * 2;
        p.y = (Math.random() - 0.5) * WORLD_Y * 2;
        p.z = (Math.random() - 0.5) * WORLD_Z * 2 - 1;
        for (let k = 0; k < TRAIL_LEN * 3; k++) p.trail[k] = (k % 3 === 0 ? p.x : k % 3 === 1 ? p.y : p.z);
        p.life = 0;
      }
      const f = flowAt(p.x, p.y, p.z, t);
      p.x += f[0] * dt * 1.2;
      p.y += f[1] * dt * 1.2;
      p.z += f[2] * dt * 0.5;

      // shift trail
      for (let k = TRAIL_LEN - 1; k > 0; k--) {
        p.trail[k * 3 + 0] = p.trail[(k - 1) * 3 + 0];
        p.trail[k * 3 + 1] = p.trail[(k - 1) * 3 + 1];
        p.trail[k * 3 + 2] = p.trail[(k - 1) * 3 + 2];
      }
      p.trail[0] = p.x; p.trail[1] = p.y; p.trail[2] = p.z;

      // 라인 세그먼트로 변환
      for (let k = 0; k < TRAIL_LEN - 1; k++) {
        const fade = (1 - k / TRAIL_LEN) * 0.2; // 매우 옅음
        positions[v * 3 + 0] = p.trail[k * 3 + 0];
        positions[v * 3 + 1] = p.trail[k * 3 + 1];
        positions[v * 3 + 2] = p.trail[k * 3 + 2];
        colors[v * 3 + 0] = baseColor.current.r * fade;
        colors[v * 3 + 1] = baseColor.current.g * fade;
        colors[v * 3 + 2] = baseColor.current.b * fade;
        v++;
        positions[v * 3 + 0] = p.trail[(k + 1) * 3 + 0];
        positions[v * 3 + 1] = p.trail[(k + 1) * 3 + 1];
        positions[v * 3 + 2] = p.trail[(k + 1) * 3 + 2];
        colors[v * 3 + 0] = baseColor.current.r * fade;
        colors[v * 3 + 1] = baseColor.current.g * fade;
        colors[v * 3 + 2] = baseColor.current.b * fade;
        v++;
      }
    }
    geo.setDrawRange(0, v);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}
