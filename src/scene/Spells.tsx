import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';
import { spellPhase } from '../factories/catalog/spells';

const MAX_SPHERE_PARTICLES = 200;
const MAX_SNAP_PARTICLES = 300;
const MAX_BEAM_PARTICLES = 200;

/**
 * 4종 spell 렌더:
 *   sphere: 회전 구체 + 외부 링 + 수렴 입자
 *   beam:   양 끝 구체 + 가운데 빛 실린더
 *   pillar: 위로 늘어나는 빛 기둥 + 회전 링
 *   snap:   사방 폭발 입자 + 중심 광역 펄스
 */
export function Spells() {
  return (
    <>
      <SphereSpells />
      <BeamSpells />
      <PillarSpells />
      <SnapSpells />
    </>
  );
}

// ─── Sphere (Rasengan 라센건) ───────────────────────────────
function SphereSpells() {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const ringARef = useRef<THREE.InstancedMesh>(null);
  const ringBRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let n = 0;
    const t = performance.now() * 0.001;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'sphere' || !s.spellOrigin) continue;
      const ph = spellPhase('sphere', s.age ?? 0);
      const sizeBase = 0.18 + (s.spellIntensity ?? 1) * 0.05;
      let sizeMul = 1;
      let opacity = 1;
      if (ph.phase === 'charge') { sizeMul = 0.3 + ph.t * 0.7; opacity = ph.t; }
      else if (ph.phase === 'release') { sizeMul = 1 + Math.sin(ph.t * Math.PI * 4) * 0.1; opacity = 1; }
      else { sizeMul = 1 - ph.t * 0.4; opacity = 1 - ph.t; }

      const sz = sizeBase * sizeMul;
      const cr = s.primaryColor ?? [1, 1, 1];

      [coreRef, ringARef, ringBRef].forEach((ref, idx) => {
        const mesh = ref.current;
        if (!mesh) return;
        if (idx === 0) {
          dummy.position.set(s.spellOrigin![0], s.spellOrigin![1], s.spellOrigin![2]);
          dummy.rotation.set(t * 2, t * 3, 0);
          dummy.scale.setScalar(sz);
        } else {
          dummy.position.set(s.spellOrigin![0], s.spellOrigin![1], s.spellOrigin![2]);
          dummy.rotation.set(idx === 1 ? t * 4 : -t * 4, t * (idx * 2.5), Math.PI / 2 * (idx - 1));
          dummy.scale.setScalar(sz * 1.5);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        const intensity = (s.spellIntensity ?? 1) * opacity;
        tmpC.setRGB(cr[0] * intensity, cr[1] * intensity, cr[2] * intensity);
        mesh.setColorAt(n, tmpC);
      });
      n++;
    }
    [coreRef, ringARef, ringBRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={coreRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <BoundMaterial intensity={2.5} />
      </instancedMesh>
      <instancedMesh ref={ringARef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <torusGeometry args={[1, 0.06, 8, 32]} />
        <BoundMaterial intensity={2} />
      </instancedMesh>
      <instancedMesh ref={ringBRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <torusGeometry args={[1, 0.06, 8, 32]} />
        <BoundMaterial intensity={2} />
      </instancedMesh>
    </>
  );
}

// ─── Beam (Kamehameha 카메하메하) ─────────────────────────
function BeamSpells() {
  const startRef = useRef<THREE.InstancedMesh>(null);
  const beamRef = useRef<THREE.InstancedMesh>(null);
  const tipRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);
  const v1 = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    let n = 0;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'beam' || !s.spellOrigin || !s.spellTarget) continue;
      const ph = spellPhase('beam', s.age ?? 0);
      let chargeOpa = 0, beamLen = 0;
      if (ph.phase === 'charge') { chargeOpa = ph.t; beamLen = 0; }
      else if (ph.phase === 'release') { chargeOpa = 1; beamLen = Math.min(1, ph.t * 2); }
      else { chargeOpa = 1 - ph.t; beamLen = 1; }

      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * Math.max(chargeOpa, beamLen);
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      v1.fromArray(s.spellOrigin);
      v2.fromArray(s.spellTarget);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

      // 시작 구체 (충전)
      if (startRef.current) {
        dummy.position.copy(v1);
        dummy.rotation.set(0, 0, 0);
        const sz = 0.15 + chargeOpa * 0.15;
        dummy.scale.setScalar(sz);
        dummy.updateMatrix();
        startRef.current.setMatrixAt(n, dummy.matrix);
        startRef.current.setColorAt(n, tmpC);
      }

      // 빔 실린더 (release 시)
      if (beamRef.current && beamLen > 0) {
        dummy.position.copy(mid);
        dummy.scale.set(0.08 + chargeOpa * 0.05, len * beamLen, 0.08 + chargeOpa * 0.05);
        // 방향에 맞춰 회전
        const q = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
        dummy.quaternion.copy(q);
        dummy.updateMatrix();
        beamRef.current.setMatrixAt(n, dummy.matrix);
        beamRef.current.setColorAt(n, tmpC);
      } else if (beamRef.current) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        beamRef.current.setMatrixAt(n, dummy.matrix);
      }

      // 끝 구체 (release 시)
      if (tipRef.current) {
        dummy.position.lerpVectors(v1, v2, beamLen);
        dummy.rotation.set(0, 0, 0);
        const sz = beamLen > 0 ? 0.18 : 0;
        dummy.scale.setScalar(sz);
        dummy.updateMatrix();
        tipRef.current.setMatrixAt(n, dummy.matrix);
        tipRef.current.setColorAt(n, tmpC);
      }
      n++;
    }
    [startRef, beamRef, tipRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={startRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <BoundMaterial intensity={3} />
      </instancedMesh>
      <instancedMesh ref={beamRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <BoundMaterial intensity={3.5} />
      </instancedMesh>
      <instancedMesh ref={tipRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <BoundMaterial intensity={3} />
      </instancedMesh>
    </>
  );
}

// ─── Pillar (Bankai 반카이) ──────────────────────────────
function PillarSpells() {
  const colRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let n = 0;
    const t = performance.now() * 0.001;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'pillar' || !s.spellOrigin) continue;
      const ph = spellPhase('pillar', s.age ?? 0);
      let height = 0, opa = 0;
      if (ph.phase === 'charge') { height = ph.t * 1.5; opa = ph.t; }
      else if (ph.phase === 'release') { height = 1.5 + ph.t * 1.5 + Math.sin(t * 8) * 0.05; opa = 1; }
      else { height = 3 + ph.t * 0.3; opa = 1 - ph.t; }

      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * opa;
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      if (colRef.current) {
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1] + height / 2, s.spellOrigin[2]);
        dummy.rotation.set(0, t * 2, 0);
        dummy.scale.set(0.18, height, 0.18);
        dummy.updateMatrix();
        colRef.current.setMatrixAt(n, dummy.matrix);
        colRef.current.setColorAt(n, tmpC);
      }

      if (ringRef.current) {
        const ringY = s.spellOrigin[1] + (height * 0.5 + Math.sin(t * 3 + n) * height * 0.3);
        dummy.position.set(s.spellOrigin[0], ringY, s.spellOrigin[2]);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.scale.setScalar(0.5);
        dummy.updateMatrix();
        ringRef.current.setMatrixAt(n, dummy.matrix);
        ringRef.current.setColorAt(n, tmpC);
      }
      n++;
    }
    [colRef, ringRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={colRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <BoundMaterial intensity={3.5} />
      </instancedMesh>
      <instancedMesh ref={ringRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <BoundMaterial intensity={3} />
      </instancedMesh>
    </>
  );
}

// ─── Snap (Amaterasu 아마테라스 — 광역 폭발) ──────────
function SnapSpells() {
  const burstRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let coreN = 0;
    let burstN = 0;
    const t = performance.now() * 0.001;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'snap' || !s.spellOrigin) continue;
      const ph = spellPhase('snap', s.age ?? 0);
      let coreSize = 0, opa = 0, burstRadius = 0;
      if (ph.phase === 'charge') { coreSize = ph.t * 0.3; opa = ph.t; }
      else if (ph.phase === 'release') { coreSize = 0.5 + ph.t * 0.5; opa = 1; burstRadius = ph.t * 2.5; }
      else { coreSize = 1; opa = 1 - ph.t; burstRadius = 2.5 + ph.t * 0.5; }

      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * opa;
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      if (coreRef.current) {
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1], s.spellOrigin[2]);
        dummy.rotation.set(t * 3, t * 4, t * 2);
        dummy.scale.setScalar(coreSize);
        dummy.updateMatrix();
        coreRef.current.setMatrixAt(coreN, dummy.matrix);
        coreRef.current.setColorAt(coreN, tmpC);
        coreN++;
      }

      // 사방 폭발 입자: 24방향
      if (burstRef.current && burstRadius > 0) {
        for (let k = 0; k < 24; k++) {
          if (burstN >= MAX_SNAP_PARTICLES) break;
          const phi = (k / 24) * Math.PI * 2 + (s.seed ?? 0) * 0.01;
          const theta = ((k * 0.7) % 1) * Math.PI;
          const r = burstRadius;
          const px = s.spellOrigin[0] + Math.sin(theta) * Math.cos(phi) * r;
          const py = s.spellOrigin[1] + Math.cos(theta) * r;
          const pz = s.spellOrigin[2] + Math.sin(theta) * Math.sin(phi) * r;
          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.1 * opa);
          dummy.updateMatrix();
          burstRef.current.setMatrixAt(burstN, dummy.matrix);
          burstRef.current.setColorAt(burstN, tmpC);
          burstN++;
        }
      }
    }
    if (coreRef.current) {
      coreRef.current.count = coreN;
      coreRef.current.instanceMatrix.needsUpdate = true;
      if (coreRef.current.instanceColor) coreRef.current.instanceColor.needsUpdate = true;
    }
    if (burstRef.current) {
      burstRef.current.count = burstN;
      burstRef.current.instanceMatrix.needsUpdate = true;
      if (burstRef.current.instanceColor) burstRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={coreRef} args={[undefined, undefined, 16]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <BoundMaterial intensity={4} />
      </instancedMesh>
      <instancedMesh ref={burstRef} args={[undefined, undefined, MAX_SNAP_PARTICLES]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <BoundMaterial intensity={3} />
      </instancedMesh>
    </>
  );
}

// 공통 셰이더 패치 머티리얼 (instanceColor → emissive)
function BoundMaterial({ intensity }: { intensity: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const mat = matRef.current;
    if (!mat || mat.userData.bound) return;
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * ${intensity.toFixed(2)};`,
      );
    };
    mat.vertexColors = true;
    mat.needsUpdate = true;
    mat.userData.bound = true;
  });
  return <meshStandardMaterial ref={matRef} metalness={0.5} roughness={0.2} emissiveIntensity={intensity} transparent depthWrite={false} blending={THREE.AdditiveBlending} />;
}

// 사용되지 않은 상수 lint 회피 (향후 확장용)
void MAX_SPHERE_PARTICLES;
void MAX_BEAM_PARTICLES;
