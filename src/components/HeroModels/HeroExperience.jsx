import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMediaQuery } from 'react-responsive';
import HeroLights from './HeroLights';
import Particles from './Particles';
import DnaHelix from './DnaHelix';

const HeroExperience = () => {
    // Touch devices (phones, tablets, iPad) can't hover — disable interaction
    // there so the canvas never captures scroll gestures. Width alone misses
    // iPads (they're wider than 768px but still touch).
    const isTouch = useMediaQuery({ query: '(hover: none)' });
    const isNarrow = useMediaQuery({ query: '(max-width: 768px)' });
    const compact = isTouch || isNarrow;
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.3} color="#a8c0ff" />

        <OrbitControls
            enabled={!isTouch}
            enablePan={false}
            enableZoom={false}
        />

        <HeroLights />
        <Particles count={100} />

        <group scale={compact ? 0.6 : 0.9} position={compact ? [0, -2.5, 0] : [0, 0, 0]}>
            <DnaHelix />
        </group>
    </Canvas>
  )
}

export default HeroExperience
