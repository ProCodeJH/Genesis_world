import { Canvas } from '@react-three/fiber';
import { WebcamPlane } from './WebcamPlane';
import { FolderOrb } from './FolderOrb';
import { Particles } from './Particles';
import { PersonSkeletons } from './PersonSkeletons';
import { Creations } from './Creations';
import { Trees } from './Trees';
import { FlowGlimpse } from './FlowGlimpse';
import { PostFX } from './PostFX';
import { CreationLifecycle } from '../world/systems/creationLifecycleSystem';
import { LSystemLifecycle } from '../world/systems/lsystemSystem';
import { BoidsSystem } from '../world/systems/boidsSystem';
import { FlowFieldSystem } from '../world/systems/flowFieldSystem';

export function Scene() {
  return (
    <Canvas
      camera={{ fov: 55, position: [0, 0, 4], near: 0.1, far: 100 }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#000']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-5, -3, 3]} intensity={0.6} color="#66e0ff" />
      <pointLight position={[0, 0, 3]} intensity={0.4} color="#ff8866" />

      <WebcamPlane />
      <FolderOrb />
      <Particles />
      <PersonSkeletons />
      <Creations />
      <Trees />
      <FlowGlimpse />
      <CreationLifecycle />
      <LSystemLifecycle />
      <BoidsSystem />
      <FlowFieldSystem />
      <PostFX />
    </Canvas>
  );
}
