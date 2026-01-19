// ============================================
// UNDERGROUND 3D SCENE - Bunker atmosphere
// ============================================
// Concrete walls, emergency lights, smoke/fog

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Pulsing emergency light
function EmergencyLight({ position, color = '#ff0000' }: {
  position: [number, number, number];
  color?: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5;
    if (lightRef.current) {
      lightRef.current.intensity = 1 + pulse * 2;
    }
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + pulse;
    }
  });
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        color={color}
        intensity={2}
        distance={10}
        decay={2}
      />
    </group>
  );
}

// Smoke/fog particles
function SmokeParticles({ count = 50 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    return pos;
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        // Slow drift
        pos[i * 3] += Math.sin(state.clock.elapsedTime * 0.1 + i * 0.5) * 0.003;
        pos[i * 3 + 1] += 0.002; // Rise slowly
        if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -3;
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
        color="#666666"
        size={0.2}
        transparent
        opacity={0.15}
        sizeAttenuation
      />
    </points>
  );
}

// Metal grate
function MetalGrate({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[8, 8, 8, 8]} />
      <meshStandardMaterial
        color="#333333"
        wireframe
        transparent
        opacity={0.4}
        metalness={0.9}
        roughness={0.3}
      />
    </mesh>
  );
}

// Concrete pillar
function ConcretePillar({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.5, 8, 0.5]} />
      <meshStandardMaterial
        color="#3a3a3a"
        roughness={0.95}
        metalness={0.1}
      />
    </mesh>
  );
}

export function UndergroundScene() {
  return (
    <>
      {/* Minimal ambient - very dark */}
      <ambientLight intensity={0.05} color="#220000" />
      
      {/* Emergency lights */}
      <EmergencyLight position={[-4, 3, -3]} color="#cc0000" />
      <EmergencyLight position={[4, 3, -4]} color="#cc0000" />
      <EmergencyLight position={[0, 3, -8]} color="#cc0000" />
      <EmergencyLight position={[-3, 2, -6]} color="#880000" />
      <EmergencyLight position={[3, 2, -6]} color="#880000" />
      
      {/* Concrete pillars */}
      <ConcretePillar position={[-4, 0, -5]} />
      <ConcretePillar position={[4, 0, -5]} />
      <ConcretePillar position={[-2, 0, -8]} />
      <ConcretePillar position={[2, 0, -8]} />
      
      {/* Metal grates */}
      <MetalGrate position={[0, -4, -5]} rotation={[-Math.PI / 2, 0, 0]} />
      <MetalGrate position={[0, 0, -12]} rotation={[0, 0, 0]} />
      
      {/* Smoke effect */}
      <SmokeParticles count={40} />
      
      {/* Dark red fog */}
      <fog attach="fog" args={['#0a0505', 2, 18]} />
    </>
  );
}

export default UndergroundScene;
