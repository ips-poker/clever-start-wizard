// ============================================
// CYBERPUNK 3D SCENE - Neon city atmosphere
// ============================================
// Floating cubes, grid lines, rain particles

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Floating neon cube
function NeonCube({ position, color, size = 0.5, speed = 1 }: {
  position: [number, number, number];
  color: string;
  size?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15 * speed;
    }
  });
  
  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
          wireframe
        />
      </mesh>
    </Float>
  );
}

// Neon grid floor
function NeonGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[40, 40, 20, 20]} />
      <meshBasicMaterial
        color="#00d4ff"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// Rain particles
function RainParticles({ count = 200 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    return pos;
  }, [count]);
  
  useFrame(() => {
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] -= 0.08; // Fall speed
        if (pos[i * 3 + 1] < -5) {
          pos[i * 3 + 1] = 15;
        }
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
        color="#00d4ff"
        size={0.03}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Holographic sphere
function HoloSphere({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[1, 1]} />
      <MeshDistortMaterial
        color="#ff00ff"
        emissive="#ff00ff"
        emissiveIntensity={0.3}
        transparent
        opacity={0.4}
        wireframe
        distort={0.2}
        speed={2}
      />
    </mesh>
  );
}

export function CyberpunkScene() {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      
      {/* Neon point lights */}
      <pointLight position={[-5, 5, 5]} color="#00d4ff" intensity={2} distance={20} />
      <pointLight position={[5, 3, -5]} color="#ff00ff" intensity={2} distance={20} />
      <pointLight position={[0, -2, 3]} color="#00ff88" intensity={1} distance={15} />
      
      {/* Floating cubes */}
      <NeonCube position={[-4, 2, -3]} color="#00d4ff" size={0.8} speed={0.5} />
      <NeonCube position={[4, 3, -4]} color="#ff00ff" size={0.6} speed={0.7} />
      <NeonCube position={[-2, -1, -2]} color="#00ff88" size={0.4} speed={0.9} />
      <NeonCube position={[3, -2, -3]} color="#00d4ff" size={0.5} speed={0.6} />
      <NeonCube position={[0, 4, -5]} color="#ff00ff" size={0.7} speed={0.4} />
      
      {/* Holographic sphere */}
      <HoloSphere position={[0, 0, -8]} />
      
      {/* Grid floor */}
      <NeonGrid />
      
      {/* Rain effect */}
      <RainParticles count={150} />
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a1a', 5, 25]} />
    </>
  );
}

export default CyberpunkScene;
