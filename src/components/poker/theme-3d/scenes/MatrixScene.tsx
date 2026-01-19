// ============================================
// MATRIX 3D SCENE - Digital rain atmosphere
// ============================================
// Falling code, green glow, virtual grid

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Falling code column
function CodeColumn({ position, speed = 1, length = 10 }: {
  position: [number, number, number];
  speed?: number;
  length?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = i * 0.5;
      pos[i * 3 + 2] = 0;
    }
    return pos;
  }, [length]);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y -= 0.05 * speed;
      if (groupRef.current.position.y < -8) {
        groupRef.current.position.y = 8;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={length}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00ff41"
          size={0.12}
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Digital grid floor
function DigitalGrid() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });
  
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial
        color="#00ff41"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// Glowing orb
function DataOrb({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.5, 1]} />
      <meshStandardMaterial
        color="#00ff41"
        emissive="#00ff41"
        emissiveIntensity={0.5}
        wireframe
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// Vertical scan line
function ScanLine() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 5;
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[20, 0.05]} />
      <meshBasicMaterial
        color="#00ff41"
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

export function MatrixScene() {
  // Generate random code columns
  const columns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < 25; i++) {
      cols.push({
        x: (Math.random() - 0.5) * 18,
        z: (Math.random() - 0.5) * 10 - 5,
        speed: 0.5 + Math.random() * 1,
        length: 5 + Math.floor(Math.random() * 10),
        offset: Math.random() * 16 - 8
      });
    }
    return cols;
  }, []);
  
  return (
    <>
      {/* Green ambient */}
      <ambientLight intensity={0.1} color="#00ff41" />
      
      {/* Point lights */}
      <pointLight position={[0, 5, -5]} color="#00ff41" intensity={2} distance={20} />
      <pointLight position={[-5, 0, 0]} color="#00cc33" intensity={1} distance={15} />
      <pointLight position={[5, 0, 0]} color="#00cc33" intensity={1} distance={15} />
      
      {/* Code rain */}
      {columns.map((col, i) => (
        <CodeColumn
          key={i}
          position={[col.x, col.offset, col.z]}
          speed={col.speed}
          length={col.length}
        />
      ))}
      
      {/* Digital grid */}
      <DigitalGrid />
      
      {/* Data orbs */}
      <DataOrb position={[-3, 0, -6]} />
      <DataOrb position={[3, 1, -7]} />
      <DataOrb position={[0, -1, -5]} />
      
      {/* Scan line */}
      <ScanLine />
      
      {/* Dark green fog */}
      <fog attach="fog" args={['#001a00', 5, 25]} />
    </>
  );
}

export default MatrixScene;
