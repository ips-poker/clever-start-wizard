// ============================================
// LOFT 3D SCENE - Industrial warehouse atmosphere
// ============================================
// Brick walls, pipes, warm lighting, dust particles

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Industrial pipe
function Pipe({ start, end, color = '#4a3728' }: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}) {
  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const length = direction.length();
  const center = new THREE.Vector3(...start).add(direction.multiplyScalar(0.5));
  
  return (
    <mesh position={[center.x, center.y, center.z]}>
      <cylinderGeometry args={[0.05, 0.05, length, 8]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.4}
      />
    </mesh>
  );
}

// Dust particles floating slowly
function DustParticles({ count = 80 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 3;
    }
    return pos;
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        // Slow floating motion
        pos[i * 3] += Math.sin(state.clock.elapsedTime * 0.2 + i) * 0.002;
        pos[i * 3 + 1] += Math.cos(state.clock.elapsedTime * 0.15 + i) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffcc88"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// Hanging industrial lamp
function HangingLamp({ position, color = '#ff8c00' }: {
  position: [number, number, number];
  color?: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      // Gentle flicker
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });
  
  return (
    <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <group position={position}>
        {/* Lamp shade */}
        <mesh>
          <coneGeometry args={[0.3, 0.2, 8, 1, true]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.9}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Light source */}
        <pointLight
          ref={lightRef}
          position={[0, -0.1, 0]}
          color={color}
          intensity={2}
          distance={8}
          decay={2}
        />
        {/* Wire */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1, 4]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      </group>
    </Float>
  );
}

// Brick wall plane (abstract representation)
function BrickWall({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[15, 10, 10, 6]} />
      <meshStandardMaterial
        color="#4a3728"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

export function LoftScene() {
  return (
    <>
      {/* Warm ambient light */}
      <ambientLight intensity={0.1} color="#ff8c00" />
      
      {/* Main warm lights */}
      <HangingLamp position={[-3, 4, -3]} color="#ff8c00" />
      <HangingLamp position={[3, 3.5, -4]} color="#ff7700" />
      <HangingLamp position={[0, 4, -6]} color="#ff9933" />
      
      {/* Background glow */}
      <pointLight position={[0, -2, -5]} color="#ff6600" intensity={0.5} distance={15} />
      
      {/* Abstract brick walls */}
      <BrickWall position={[0, 0, -10]} />
      <BrickWall position={[-8, 0, -5]} rotation={[0, Math.PI / 4, 0]} />
      <BrickWall position={[8, 0, -5]} rotation={[0, -Math.PI / 4, 0]} />
      
      {/* Industrial pipes (abstract) */}
      <group position={[0, 4, -8]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 12, 8]} />
          <meshStandardMaterial color="#5c4033" metalness={0.7} roughness={0.5} />
        </mesh>
      </group>
      <group position={[-5, 2, -6]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 8, 8]} />
          <meshStandardMaterial color="#5c4033" metalness={0.7} roughness={0.5} />
        </mesh>
      </group>
      
      {/* Floating dust */}
      <DustParticles count={60} />
      
      {/* Warm fog */}
      <fog attach="fog" args={['#1a1008', 3, 20]} />
    </>
  );
}

export default LoftScene;
