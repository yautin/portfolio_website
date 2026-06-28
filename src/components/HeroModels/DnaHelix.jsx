import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A procedurally generated DNA double helix — a recognizable nod to the
 * medical / life-sciences focus of the portfolio. Built entirely from
 * primitives (no .glb asset required) so it stays light and easy to tweak.
 */
const DnaHelix = ({ count = 24, radius = 1.5, rise = 0.4, turns = 2.5 }) => {
  const group = useRef();

  const { nodes, rungs } = useMemo(() => {
    const nodes = [];
    const rungs = [];
    const angleStep = (Math.PI * 2 * turns) / count;
    const height = count * rise;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const y = i * rise - height / 2;

      // the two backbone strands sit on opposite sides of the central axis
      nodes.push({
        pos: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        strand: 0,
      });
      nodes.push({
        pos: [Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius],
        strand: 1,
      });

      // base-pair rung: a horizontal bar bridging the two strands.
      // orient a Y-aligned cylinder onto the strand-to-strand direction.
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      rungs.push({ pos: [0, y, 0], quaternion: [q.x, q.y, q.z, q.w] });
    }

    return { nodes, rungs };
  }, [count, radius, rise, turns]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={group} rotation={[0, 0, 0.3]}>
      {nodes.map((n, i) => (
        <mesh key={`node-${i}`} position={n.pos}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial
            color={n.strand === 0 ? "#4cc9f0" : "#9d4edd"}
            emissive={n.strand === 0 ? "#1b6fa3" : "#5a2d8a"}
            emissiveIntensity={0.35}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
      ))}

      {rungs.map((r, i) => (
        <mesh key={`rung-${i}`} position={r.pos} quaternion={r.quaternion}>
          <cylinderGeometry args={[0.05, 0.05, radius * 2, 12]} />
          <meshStandardMaterial
            color="#a8dadc"
            emissive="#3a506b"
            emissiveIntensity={0.2}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};

export default DnaHelix;
