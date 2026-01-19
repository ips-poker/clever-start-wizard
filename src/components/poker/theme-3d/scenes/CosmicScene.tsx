// ============================================
// COSMIC 3D SCENE - Space station atmosphere
// ============================================
// Stars, nebulae, planets, cosmic glow

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Star field
function StarField({ count = 200 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread stars in a dome around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const r = 15 + Math.random() * 10;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 10;
    }
    return pos;
  }, [count]);
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.08}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Nebula cloud
function Nebula({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.02;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// Planet/moon
function Planet({ position, size = 1, color, ringColor }: {
  position: [number, number, number];
  size?: number;
  color: string;
  ringColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });
  
  return (
    <Float speed={0.3} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={position}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial
            color={color}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
        {ringColor && (
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[size * 1.5, 0.1, 2, 50]} />
            <meshStandardMaterial
              color={ringColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </Float>
  );
}

// Station ring
function StationRing({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[4, 0.1, 8, 60]} />
      <meshStandardMaterial
        color="#4488ff"
        emissive="#4488ff"
        emissiveIntensity={0.3}
        metalness={0.9}
        roughness={0.2}
      />
    </mesh>
  );
}

// Shooting star
function ShootingStar() {
  const meshRef = useRef<THREE.Mesh>(null);
  const startPos = useRef({ x: 10, y: 8, z: -15 });
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x -= 0.15;
      meshRef.current.position.y -= 0.08;
      
      if (meshRef.current.position.x < -15) {
        meshRef.current.position.x = 10 + Math.random() * 5;
        meshRef.current.position.y = 5 + Math.random() * 5;
      }
    }
  });
  
  return (
    <mesh ref={meshRef} position={[startPos.current.x, startPos.current.y, startPos.current.z]}>
      <sphereGeometry args={[0.05]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

export function CosmicScene() {
  return (
    <>
      {/* Minimal ambient - space is dark */}
      <ambientLight intensity={0.05} color="#4466aa" />
      
      {/* Star light */}
      <pointLight position={[10, 5, -10]} color="#ffffff" intensity={0.5} distance={30} />
      
      {/* Nebula glow */}
      <pointLight position={[-5, 3, -8]} color="#9b59b6" intensity={1} distance={15} />
      <pointLight position={[5, -2, -10]} color="#3498db" intensity={1} distance={15} />
      
      {/* Star field */}
      <StarField count={150} />
      
      {/* Nebulae */}
      <Nebula position={[-8, 5, -18]} color="#9b59b6" />
      <Nebula position={[8, 3, -20]} color="#3498db" />
      <Nebula position={[0, -5, -22]} color="#e74c3c" />
      
      {/* Planets */}
      <Planet position={[-5, 2, -12]} size={0.8} color="#8b4513" />
      <Planet position={[6, -1, -15]} size={1.2} color="#4a5568" ringColor="#a0aec0" />
      <Planet position={[2, 4, -18]} size={0.5} color="#48bb78" />
      
      {/* Station ring */}
      <StationRing position={[0, 0, -10]} />
      
      {/* Shooting stars */}
      <ShootingStar />
      
      {/* Deep space fog */}
      <fog attach="fog" args={['#0a0515', 8, 30]} />
    </>
  );
}

export default CosmicScene;
