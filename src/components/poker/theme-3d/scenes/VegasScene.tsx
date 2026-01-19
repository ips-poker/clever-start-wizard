// ============================================
// VEGAS 3D SCENE - Casino glamour atmosphere
// ============================================
// Light rings, sparkles, warm golden glow

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Rotating light ring
function LightRing({ position, color, radius = 2, speed = 0.3 }: {
  position: [number, number, number];
  color: string;
  radius?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed) * 0.2;
      meshRef.current.rotation.z = state.clock.elapsedTime * speed * 0.5;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Sparkle particles
function SparkleParticles({ count = 100 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
      sz[i] = Math.random() * 0.05 + 0.02;
    }
    return { positions: pos, sizes: sz };
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
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
        color="#ffd700"
        size={0.05}
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

// Diamond shape
function Diamond({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

// Chandelier-like structure
function Chandelier({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <LightRing position={[0, 0, 0]} color="#ffd700" radius={1.5} speed={0.2} />
      <LightRing position={[0, -0.3, 0]} color="#ff1493" radius={1.2} speed={0.25} />
      <LightRing position={[0, -0.6, 0]} color="#ffd700" radius={0.9} speed={0.3} />
      <pointLight position={[0, 0, 0]} color="#ffd700" intensity={3} distance={10} />
    </group>
  );
}

export function VegasScene() {
  return (
    <>
      {/* Warm ambient */}
      <ambientLight intensity={0.15} color="#ffcc88" />
      
      {/* Spotlight effects */}
      <spotLight
        position={[0, 10, 0]}
        angle={0.5}
        penumbra={1}
        color="#ffd700"
        intensity={2}
        distance={20}
      />
      <pointLight position={[-5, 3, 5]} color="#ff1493" intensity={1.5} distance={15} />
      <pointLight position={[5, 2, -5]} color="#00bfff" intensity={1} distance={15} />
      
      {/* Chandeliers */}
      <Chandelier position={[0, 5, -5]} />
      <Chandelier position={[-4, 4, -8]} />
      <Chandelier position={[4, 4, -8]} />
      
      {/* Floating diamonds */}
      <Diamond position={[-3, 1, -3]} color="#ffd700" />
      <Diamond position={[3, 2, -4]} color="#ff1493" />
      <Diamond position={[0, -1, -2]} color="#00bfff" />
      <Diamond position={[-2, 3, -5]} color="#ffd700" />
      <Diamond position={[2, 0, -3]} color="#ff1493" />
      
      {/* Sparkles */}
      <SparkleParticles count={80} />
      
      {/* Warm fog */}
      <fog attach="fog" args={['#150510', 5, 25]} />
    </>
  );
}

export default VegasScene;
