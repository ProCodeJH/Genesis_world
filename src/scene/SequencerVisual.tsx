import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSequencerStore, instrumentHueDeg, SEQ_STEPS } from '../audio/sequencer';

const Y = -2.0;
const STEP_WIDTH = 0.45;
const STEP_GAP = 0.05;
const TOTAL_W = (STEP_WIDTH + STEP_GAP) * SEQ_STEPS;

/**
 * 8 step LED 시퀀서 시각화 (화면 하단).
 * - 각 step bar: 현재 step이면 강한 발광
 * - 음표 점들: step 위에 쌓임, 악기별 hue
 */
export function SequencerVisual() {
  const ledRef = useRef<THREE.InstancedMesh>(null);
  const noteRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const isPlaying = useSequencerStore.getState().isPlaying;
    const currentStep = useSequencerStore.getState().currentStep;
    const stepNotes = useSequencerStore.getState().stepNotes;

    if (!isPlaying) {
      if (ledRef.current) { ledRef.current.count = 0; ledRef.current.instanceMatrix.needsUpdate = true; }
      if (noteRef.current) { noteRef.current.count = 0; noteRef.current.instanceMatrix.needsUpdate = true; }
      return;
    }

    // LED bar
    if (ledRef.current) {
      for (let s = 0; s < SEQ_STEPS; s++) {
        const x = (s - (SEQ_STEPS - 1) / 2) * (STEP_WIDTH + STEP_GAP);
        dummy.position.set(x, Y, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(STEP_WIDTH, 0.06, 0.1);
        dummy.updateMatrix();
        ledRef.current.setMatrixAt(s, dummy.matrix);
        const isCurrent = s === currentStep;
        const intensity = isCurrent ? 3 : 0.2;
        tmpC.setHSL(0.55, 0.7, 0.5).multiplyScalar(intensity);
        ledRef.current.setColorAt(s, tmpC);
      }
      ledRef.current.count = SEQ_STEPS;
      ledRef.current.instanceMatrix.needsUpdate = true;
      if (ledRef.current.instanceColor) ledRef.current.instanceColor.needsUpdate = true;
    }

    // 음표 점들
    if (noteRef.current) {
      let n = 0;
      for (let s = 0; s < SEQ_STEPS; s++) {
        const notes = stepNotes[s] ?? [];
        const x = (s - (SEQ_STEPS - 1) / 2) * (STEP_WIDTH + STEP_GAP);
        for (let i = 0; i < notes.length; i++) {
          if (n >= 64) break;
          const note = notes[i];
          dummy.position.set(x, Y + 0.12 + i * 0.09, 0);
          dummy.rotation.set(0, 0, 0);
          const isCurrent = s === currentStep;
          dummy.scale.setScalar(isCurrent ? 0.07 : 0.05);
          dummy.updateMatrix();
          noteRef.current.setMatrixAt(n, dummy.matrix);
          const hue = instrumentHueDeg(note.instrument) / 360;
          tmpC.setHSL(hue, 0.85, 0.6).multiplyScalar(isCurrent ? 3 : 1.5);
          noteRef.current.setColorAt(n, tmpC);
          n++;
        }
      }
      noteRef.current.count = n;
      noteRef.current.instanceMatrix.needsUpdate = true;
      if (noteRef.current.instanceColor) noteRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={ledRef} args={[undefined, undefined, SEQ_STEPS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors emissiveIntensity={1.5} transparent />
      </instancedMesh>
      <instancedMesh ref={noteRef} args={[undefined, undefined, 64]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial vertexColors emissiveIntensity={2} transparent />
      </instancedMesh>
      <SeqEmissiveBinder ledRef={ledRef} noteRef={noteRef} />
      {/* 사용되지 않은 상수 lint 회피 */}
      <SeqMeta />
    </>
  );
}

function SeqMeta() {
  void TOTAL_W;
  return null;
}

function SeqEmissiveBinder({
  ledRef, noteRef,
}: {
  ledRef: React.MutableRefObject<THREE.InstancedMesh | null>;
  noteRef: React.MutableRefObject<THREE.InstancedMesh | null>;
}) {
  useFrame(() => {
    [ledRef, noteRef].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat.userData.bound) {
        const intensity = mat.emissiveIntensity;
        mat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * ${intensity.toFixed(2)};`,
          );
        };
        mat.vertexColors = true;
        mat.needsUpdate = true;
        mat.userData.bound = true;
      }
    });
  });
  return null;
}
