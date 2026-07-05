import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// The random drift field is generated once per particle count at module level
// (not during render): keeps renders pure and stops the Float32Array from
// being rebuilt on every render.
const makeField = (count) => {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = Math.random() * 10 + 5; // higher starting point
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    speeds[i] = 0.005 + Math.random() * 0.001;
  }
  return { positions, speeds };
};

const fieldCache = new Map();
const getField = (count) => {
  if (!fieldCache.has(count)) fieldCache.set(count, makeField(count));
  return fieldCache.get(count);
};

const Particles = ({ count = 200, light = false }) => {
  const mesh = useRef();
  const { positions, speeds } = getField(count);

  useFrame(() => {
    const pos = mesh.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      let y = pos[i * 3 + 1];
      y -= speeds[i];
      if (y < -2) y = Math.random() * 10 + 5;
      pos[i * 3 + 1] = y;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={light ? "#6f63c9" : "#ffffff"}
        size={light ? 0.07 : 0.05}
        transparent
        opacity={light ? 0.85 : 0.9}
        depthWrite={false}
      />
    </points>
  );
};

export default Particles;
