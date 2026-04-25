import { EffectComposer, Bloom, ChromaticAberration, Vignette, Pixelation, Glitch, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';

/**
 * 4 모드 PostFX. 박수마다 모드 셔플.
 *   normal    — Bloom + ChromaticAberration + Vignette (기본)
 *   pixelate  — Bloom + Pixelation 8 (8-bit 게임 느낌)
 *   glitch    — Bloom + Glitch + Noise (사이버펑크)
 *   demoscene — Bloom 강화 + 강한 ChromaticAberration + Vignette (90년대 데모)
 */
export function PostFX() {
  const mode = useSceneStore((s) => s.postFxMode);

  if (mode === 'pixelate') {
    return (
      <EffectComposer multisampling={2}>
        <Bloom intensity={1.0} luminanceThreshold={0.4} luminanceSmoothing={0.7} mipmapBlur />
        <Pixelation granularity={6} />
        <Vignette offset={0.2} darkness={0.5} eskil={false} />
      </EffectComposer>
    );
  }

  if (mode === 'glitch') {
    return (
      <EffectComposer multisampling={2}>
        <Bloom intensity={1.6} luminanceThreshold={0.3} luminanceSmoothing={0.7} mipmapBlur />
        <Glitch
          delay={new THREE.Vector2(2.5, 5)}
          duration={new THREE.Vector2(0.2, 0.5)}
          strength={new THREE.Vector2(0.05, 0.2)}
          mode={GlitchMode.SPORADIC}
          ratio={0.5}
          active
        />
        <Noise opacity={0.12} blendFunction={BlendFunction.OVERLAY} />
        <Vignette offset={0.15} darkness={0.45} eskil={false} />
      </EffectComposer>
    );
  }

  if (mode === 'demoscene') {
    return (
      <EffectComposer multisampling={2}>
        <Bloom intensity={2.2} luminanceThreshold={0.25} luminanceSmoothing={0.8} mipmapBlur />
        <ChromaticAberration
          offset={new THREE.Vector2(0.005, 0.005)}
          radialModulation={false}
          modulationOffset={0}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette offset={0.1} darkness={0.6} eskil={false} />
      </EffectComposer>
    );
  }

  // normal
  return (
    <EffectComposer multisampling={2}>
      <Bloom intensity={1.4} luminanceThreshold={0.35} luminanceSmoothing={0.7} mipmapBlur />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0015, 0.0015)}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette offset={0.2} darkness={0.4} eskil={false} />
    </EffectComposer>
  );
}
