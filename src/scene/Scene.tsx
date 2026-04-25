import { Canvas } from '@react-three/fiber';
import { WebcamPlane } from './WebcamPlane';
import { FolderOrb } from './FolderOrb';
import { Particles } from './Particles';
import { PersonSkeletons } from './PersonSkeletons';
import { Creations } from './Creations';
import { Trees } from './Trees';
import { FlowGlimpse } from './FlowGlimpse';
import { Spells } from './Spells';
import { PlasmaSphere } from './PlasmaSphere';
import { VoronoiBackground } from './VoronoiBackground';
import { ReactionDiffusionPlane } from './ReactionDiffusionPlane';
import { PostFX } from './PostFX';
import { CreationLifecycle } from '../world/systems/creationLifecycleSystem';
import { LSystemLifecycle } from '../world/systems/lsystemSystem';
import { BoidsSystem } from '../world/systems/boidsSystem';
import { FlowFieldSystem } from '../world/systems/flowFieldSystem';
import { SpellSystem } from '../world/systems/spellSystem';
import { ComboSystem } from '../world/systems/comboSystem';
import { InfluenceSystem } from '../world/systems/influenceSystem';
import { PersistenceSystem } from '../world/systems/persistenceSystem';
import { HandTrails } from './HandTrails';
import { Constellation } from './Constellation';
import { SequencerVisual } from './SequencerVisual';

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
      <VoronoiBackground />
      <FolderOrb />
      <Particles />
      <PersonSkeletons />
      <Creations />
      <PlasmaSphere />
      <Trees />
      <FlowGlimpse />
      <ReactionDiffusionPlane />
      <Constellation />
      <HandTrails />
      <SequencerVisual />
      <Spells />
      <CreationLifecycle />
      <LSystemLifecycle />
      <BoidsSystem />
      <FlowFieldSystem />
      <SpellSystem />
      <ComboSystem />
      <InfluenceSystem />
      <PersistenceSystem />
      <PostFX />
    </Canvas>
  );
}
