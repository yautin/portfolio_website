import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMediaQuery } from 'react-responsive';
import HeroLights from './HeroLights';
import Particles from './Particles';
import DnaHelix from './DnaHelix';
import { useTheme } from '../../hooks/useTheme';

// The helix leans a little toward the cursor.
//
// OrbitControls already lets you drag the camera, but that has to be discovered
// — most visitors never try. A lean responds before you do anything, which is
// what signals "this is alive" without asking for a gesture.
//
// Deliberately on the GROUP, not the camera: the camera belongs to
// OrbitControls, and two things driving it would fight. It also stays off the Y
// axis, which DnaHelix spins continuously — a Y offset there would just shift
// the phase of a rotation you cannot see the start of anyway.
//
// The easing is intentionally slow. During a drag the pointer moves a long way,
// and a snappy lean would read as the object resisting you rather than
// following; lagging behind reads as inertia.
const PointerLean = ({ enabled, children, ...groupProps }) => {
    const ref = useRef();
    useFrame((state, delta) => {
        if (!ref.current) return;
        const tiltX = enabled ? -state.pointer.y * 0.16 : 0;
        const rollZ = enabled ? state.pointer.x * 0.10 : 0;
        // frame-rate independent easing: same feel at 30fps and 144fps
        const k = 1 - Math.pow(0.06, delta);
        ref.current.rotation.x += (tiltX - ref.current.rotation.x) * k;
        ref.current.rotation.z += (rollZ - ref.current.rotation.z) * k;
    });
    return <group ref={ref} {...groupProps}>{children}</group>;
};

const HeroExperience = () => {
    // Touch devices (phones, tablets, iPad) can't hover — disable interaction
    // there so the canvas never captures scroll gestures. Width alone misses
    // iPads (they're wider than 768px but still touch).
    const isTouch = useMediaQuery({ query: '(hover: none)' });
    // Mirrors `@media (max-width: 1279px), (hover: none)` in hero.css, where the
    // figure leaves the absolute overlay and stacks beneath the copy. Once it
    // has a box of its own there is nothing to dodge, so the helix centres in it
    // rather than being pushed down out of the text's way.
    // Change one, change both.
    const belowXl = useMediaQuery({ query: '(max-width: 1279px)' });
    const stacked = belowXl || isTouch;
    // brighter, cleaner illumination on the light theme so the helix reads as a
    // lit object rather than a dark-stage prop floating on a bright page
    const light = useTheme() === 'light';
    // no pointer to follow on touch, and the lean is decorative motion
    const reduced = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });
    const lean = !isTouch && !reduced;
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
        <Particles count={100} light={light} still={reduced} />

        <PointerLean
            enabled={lean}
            // Nothing to dodge any more, so it always sits centred in its box;
            // the downward shove only ever existed to clear the overlaid text.
            //
            // One scale for every stacked view. The old per-device values (0.6
            // on phones, 0.75 on a portrait tablet) were picked when the canvas
            // was an absolute overlay that had to stay out of the copy's way,
            // and were never revisited once stacking gave it a box of its own —
            // which left the phone helix filling 48% of its canvas against the
            // 82% a landscape tablet already had. Since the canvas now sizes
            // itself to the space available, one value fills them all alike.
            scale={stacked ? 1 : 0.9}
            position={[0, 0, 0]}
        >
            <DnaHelix light={light} still={reduced} />
        </PointerLean>
    </Canvas>
  )
}

export default HeroExperience
