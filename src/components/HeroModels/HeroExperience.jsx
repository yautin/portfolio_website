import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMediaQuery } from 'react-responsive';
import HeroLights from './HeroLights';
import Particles from './Particles';
import DnaHelix from './DnaHelix';
import { useTheme } from '../../hooks/useTheme';

const HeroExperience = () => {
    // Touch devices (phones, tablets, iPad) can't hover — disable interaction
    // there so the canvas never captures scroll gestures. Width alone misses
    // iPads (they're wider than 768px but still touch).
    const isTouch = useMediaQuery({ query: '(hover: none)' });
    const isNarrow = useMediaQuery({ query: '(max-width: 768px)' });
    const compact = isTouch || isNarrow;
    // brighter, cleaner illumination on the light theme so the helix reads as a
    // lit object rather than a dark-stage prop floating on a bright page
    const light = useTheme() === 'light';
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={light ? 0.9 : 0.3} color={light ? '#eef3fc' : '#a8c0ff'} />
        <hemisphereLight
            color={light ? '#ffffff' : '#243043'}
            groundColor={light ? '#c3d0e6' : '#05060a'}
            intensity={light ? 0.8 : 0.2}
        />

        <OrbitControls
            enabled={!isTouch}
            enablePan={false}
            enableZoom={false}
        />

        <HeroLights light={light} />
        <Particles count={100} light={light} />

        <group scale={compact ? 0.6 : 0.9} position={compact ? [0, -2.5, 0] : [0, 0, 0]}>
            <DnaHelix light={light} />
        </group>
    </Canvas>
  )
}

export default HeroExperience
