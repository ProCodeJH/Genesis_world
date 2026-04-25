import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

export function PostFX() {
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={1.4}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.7}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0015, 0.0015)}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette eskil={false} offset={0.2} darkness={0.4} />
    </EffectComposer>
  );
}
