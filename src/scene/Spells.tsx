import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queries } from '../world/ecs';
import { spellPhase } from '../factories/catalog/spells';

const MAX_SPHERE_PARTICLES = 200;
const MAX_SNAP_PARTICLES = 300;
const MAX_BEAM_PARTICLES = 200;

/**
 * 8종 spell 렌더:
 *   sphere: 회전 구체 + 외부 링 (Rasengan)
 *   beam:   양 끝 구체 + 가운데 빛 실린더 (Kamehameha)
 *   pillar: 위로 늘어나는 빛 기둥 (Bankai)
 *   snap:   사방 폭발 입자 (Amaterasu)
 *   chidori: 사방 jagged 번개 라인 (Chidori)
 *   aura:   사람 따라가는 큰 발광 sphere (Aura)
 *   wave:   동심원 ring 3개 퍼짐 (Shockwave)
 *   magicCircle: 회전 ring + 펜타그램 (소환진)
 */
export function Spells() {
  return (
    <>
      <SphereSpells />
      <BeamSpells />
      <PillarSpells />
      <SnapSpells />
      <ChidoriSpells />
      <AuraSpells />
      <WaveSpells />
      <MagicCircleSpells />
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

// ─── Chidori (Branching Lightning 치도리) ────────────
function ChidoriSpells() {
  const NUM_BOLTS = 8;
  const SEGS = 6;
  const MAX_SPELLS = 8;
  const MAX_VERTS = MAX_SPELLS * NUM_BOLTS * SEGS * 2;
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
    let v = 0;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'chidori' || !s.spellOrigin) continue;
      const ph = spellPhase('chidori', s.age ?? 0);
      let opa = 0;
      if (ph.phase === 'charge') opa = ph.t;
      else if (ph.phase === 'release') opa = 1;
      else opa = 1 - ph.t;
      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * opa;
      tmpC.setRGB(cr[0] * intens + 0.4 * intens, cr[1] * intens + 0.4 * intens, cr[2] * intens + 1.0 * intens);
      const ox = s.spellOrigin[0], oy = s.spellOrigin[1], oz = s.spellOrigin[2];
      const seedBase = (s.seed ?? 0) * 17;
      const reach = 0.4 + Math.min(1, ph.t * 2) * 0.8;

      for (let b = 0; b < NUM_BOLTS; b++) {
        const angle = (b / NUM_BOLTS) * Math.PI * 2 + seedBase;
        const elev = Math.sin(seedBase + b) * 0.6;
        let px = ox, py = oy, pz = oz;
        for (let k = 0; k < SEGS; k++) {
          if (v >= MAX_VERTS / 2) break;
          const tk = (k + 1) / SEGS;
          const baseX = ox + Math.cos(angle) * reach * tk;
          const baseY = oy + elev * reach * tk;
          const baseZ = oz + Math.sin(angle) * reach * tk;
          const jit = 0.08 * (1 - tk * 0.5);
          const nx = baseX + (Math.random() - 0.5) * jit;
          const ny = baseY + (Math.random() - 0.5) * jit;
          const nz = baseZ + (Math.random() - 0.5) * jit;
          positions[v * 3] = px; positions[v * 3 + 1] = py; positions[v * 3 + 2] = pz;
          colors[v * 3] = tmpC.r; colors[v * 3 + 1] = tmpC.g; colors[v * 3 + 2] = tmpC.b;
          v++;
          positions[v * 3] = nx; positions[v * 3 + 1] = ny; positions[v * 3 + 2] = nz;
          colors[v * 3] = tmpC.r; colors[v * 3 + 1] = tmpC.g; colors[v * 3 + 2] = tmpC.b;
          v++;
          px = nx; py = ny; pz = nz;
        }
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

// ─── Aura (사람 주위 광역 발광) ──────────────────────
function AuraSpells() {
  const innerRef = useRef<THREE.InstancedMesh>(null);
  const outerRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let n = 0;
    const t = performance.now() * 0.001;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'aura' || !s.spellOrigin) continue;
      const ph = spellPhase('aura', s.age ?? 0);
      let intensity = 0;
      if (ph.phase === 'charge') intensity = ph.t * 0.7;
      else if (ph.phase === 'release') intensity = 0.7 + Math.sin(t * 2) * 0.3;
      else intensity = (1 - ph.t) * 0.7;
      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * intensity;
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      if (innerRef.current) {
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1], s.spellOrigin[2]);
        dummy.rotation.set(0, t * 0.5, 0);
        dummy.scale.setScalar(0.6 + Math.sin(t * 3) * 0.05);
        dummy.updateMatrix();
        innerRef.current.setMatrixAt(n, dummy.matrix);
        innerRef.current.setColorAt(n, tmpC);
      }
      if (outerRef.current) {
        dummy.scale.setScalar(1.3 + Math.sin(t * 2.5 + 1) * 0.1);
        dummy.updateMatrix();
        outerRef.current.setMatrixAt(n, dummy.matrix);
        // 외부는 더 옅게
        const dimC = new THREE.Color(tmpC.r * 0.4, tmpC.g * 0.4, tmpC.b * 0.4);
        outerRef.current.setColorAt(n, dimC);
      }
      n++;
    }
    [innerRef, outerRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={innerRef} args={[undefined, undefined, 8]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <BoundMaterial intensity={2.5} />
      </instancedMesh>
      <instancedMesh ref={outerRef} args={[undefined, undefined, 8]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <BoundMaterial intensity={1.5} />
      </instancedMesh>
    </>
  );
}

// ─── Wave (Shockwave 충격파) ──────────────────────
function WaveSpells() {
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let n = 0;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'wave' || !s.spellOrigin) continue;
      const ph = spellPhase('wave', s.age ?? 0);
      let radius = 0;
      let opa = 0;
      if (ph.phase === 'release') {
        const ease = 1 - Math.pow(1 - ph.t, 2);
        radius = ease * 3.5;
        opa = 1 - ph.t * 0.7;
      } else if (ph.phase === 'fade') {
        radius = 3.5 + ph.t * 0.5;
        opa = (1 - ph.t) * 0.3;
      }
      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * opa;
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      // 3 ring (시간차)
      for (let r = 0; r < 3; r++) {
        if (!ringRef.current || n >= 30) break;
        const offset = r * 0.3;
        const localRadius = Math.max(0.05, radius - offset);
        if (localRadius < 0.1) continue;
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1], s.spellOrigin[2]);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.scale.set(localRadius, 0.05, localRadius);
        dummy.updateMatrix();
        ringRef.current.setMatrixAt(n, dummy.matrix);
        ringRef.current.setColorAt(n, tmpC);
        n++;
      }
    }
    if (ringRef.current) {
      ringRef.current.count = n;
      ringRef.current.instanceMatrix.needsUpdate = true;
      if (ringRef.current.instanceColor) ringRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={ringRef} args={[undefined, undefined, 30]} frustumCulled={false}>
      <torusGeometry args={[1, 0.04, 8, 48]} />
      <BoundMaterial intensity={3} />
    </instancedMesh>
  );
}

// ─── Magic Circle (소환진) ──────────────────────
function MagicCircleSpells() {
  const outerRef = useRef<THREE.InstancedMesh>(null);
  const innerRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    let n = 0;
    const t = performance.now() * 0.001;
    for (const s of [...queries.spells]) {
      if (s.spellKind !== 'magicCircle' || !s.spellOrigin) continue;
      const ph = spellPhase('magicCircle', s.age ?? 0);
      let opa = 0, scale = 0;
      if (ph.phase === 'charge') { opa = ph.t; scale = ph.t * 0.6; }
      else if (ph.phase === 'release') { opa = 1; scale = 0.6 + Math.sin(ph.t * Math.PI) * 0.1; }
      else { opa = 1 - ph.t; scale = 0.6; }
      const cr = s.primaryColor ?? [1, 1, 1];
      const intens = (s.spellIntensity ?? 1) * opa;
      tmpC.setRGB(cr[0] * intens, cr[1] * intens, cr[2] * intens);

      if (outerRef.current) {
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1] - 0.3, s.spellOrigin[2]);
        dummy.rotation.set(Math.PI / 2, 0, t * 0.6);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        outerRef.current.setMatrixAt(n, dummy.matrix);
        outerRef.current.setColorAt(n, tmpC);
      }
      if (innerRef.current) {
        dummy.rotation.set(Math.PI / 2, 0, -t * 0.9);
        dummy.scale.setScalar(scale * 0.7);
        dummy.updateMatrix();
        innerRef.current.setMatrixAt(n, dummy.matrix);
        innerRef.current.setColorAt(n, tmpC);
      }
      if (starRef.current) {
        dummy.position.set(s.spellOrigin[0], s.spellOrigin[1] - 0.25, s.spellOrigin[2]);
        dummy.rotation.set(0, t * 1.2, 0);
        dummy.scale.setScalar(scale * 0.45);
        dummy.updateMatrix();
        starRef.current.setMatrixAt(n, dummy.matrix);
        starRef.current.setColorAt(n, tmpC);
      }
      n++;
    }
    [outerRef, innerRef, starRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={outerRef} args={[undefined, undefined, 8]} frustumCulled={false}>
        <torusGeometry args={[1, 0.05, 8, 48]} />
        <BoundMaterial intensity={2.5} />
      </instancedMesh>
      <instancedMesh ref={innerRef} args={[undefined, undefined, 8]} frustumCulled={false}>
        <torusGeometry args={[1, 0.04, 8, 36]} />
        <BoundMaterial intensity={2.5} />
      </instancedMesh>
      <instancedMesh ref={starRef} args={[undefined, undefined, 8]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <BoundMaterial intensity={3} />
      </instancedMesh>
    </>
  );
}

// 사용되지 않은 상수 lint 회피 (향후 확장용)
void MAX_SPHERE_PARTICLES;
void MAX_BEAM_PARTICLES;
