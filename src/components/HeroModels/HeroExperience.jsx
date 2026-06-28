import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMediaQuery } from 'react-responsive';
import HeroLights from './HeroLights';
import Particles from './Particles';
import DnaHelix from './DnaHelix';

const HeroExperience = () => {
    const isTablet = useMediaQuery({ query: '(max-width: 1024px)' });
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.3} color="#a8c0ff" />

        <OrbitControls
            enablePan={false}
            enableZoom={!isTablet}
            maxDistance={20}
            minDistance={5}
        />

        <HeroLights />
        <Particles count={100} />

        <group scale={isMobile ? 0.6 : 0.9} position={[0, 0, 0]}>
            <DnaHelix />
        </group>
    </Canvas>
  )
}

export default HeroExperience
