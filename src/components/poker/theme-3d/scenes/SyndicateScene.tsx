// ============================================
// SYNDICATE 3D SCENE - Mafia luxury atmosphere
// ============================================
// Gold accents, elegant frames, warm shadows

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Gold frame
function GoldFrame({ position, size = [2, 1.5] }: {
  position: [number, number, number];
  size?: [number, number];
}) {
  const [width, height] = size;
  const thickness = 0.08;
  
  return (
    <group position={position}>
      {/* Top */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width + thickness * 2, thickness, thickness]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[width + thickness * 2, thickness, thickness]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Left */}
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Right */}
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Cigar smoke particles
function CigarSmoke({ count = 30 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Concentrated in one area
      pos[i * 3] = (Math.random() - 0.5) * 3 + 3;
      pos[i * 3 + 1] = Math.random() * 4 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 - 3;
    }
    return pos;
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.005;
        pos[i * 3 + 1] += 0.01;
        if (pos[i * 3 + 1] > 5) {
          pos[i * 3 + 1] = -1;
          pos[i * 3] = (Math.random() - 0.5) * 3 + 3;
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
        color="#aaaaaa"
        size={0.15}
        transparent
        opacity={0.2}
        sizeAttenuation
      />
    </points>
  );
}

// Whiskey glass (abstract)
function WhiskeyGlass({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
      <group position={position}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.1, 0.2, 8, 1, true]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            metalness={0.1}
            roughness={0}
          />
        </mesh>
        {/* Liquid */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.1, 0.08, 0.1, 8]} />
          <meshStandardMaterial
            color="#b8860b"
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
    </Float>
  );
}

// Candle flame
function Candle({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.3;
    }
  });
  
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.15, 0]}
        color="#ff9933"
        intensity={1}
        distance={3}
      />
    </group>
  );
}

export function SyndicateScene() {
  return (
    <>
      {/* Warm dim ambient */}
      <ambientLight intensity={0.08} color="#d4af37" />
      
      {/* Warm spotlights */}
      <spotLight
        position={[0, 8, 0]}
        angle={0.6}
        penumbra={1}
        color="#ff9933"
        intensity={1.5}
        distance={15}
      />
      <pointLight position={[-3, 2, -2]} color="#d4af37" intensity={0.8} distance={8} />
      <pointLight position={[3, 2, -3]} color="#8b4513" intensity={0.5} distance={8} />
      
      {/* Gold frames on "walls" */}
      <GoldFrame position={[-3, 1, -8]} size={[2.5, 2]} />
      <GoldFrame position={[3, 1.5, -8]} size={[2, 1.5]} />
      <GoldFrame position={[0, 2, -10]} size={[3, 2.5]} />
      
      {/* Candles */}
      <Candle position={[-2, -1, -3]} />
      <Candle position={[2, -1, -4]} />
      <Candle position={[0, -0.5, -5]} />
      
      {/* Whiskey glass */}
      <WhiskeyGlass position={[4, -1, -2]} />
      
      {/* Cigar smoke */}
      <CigarSmoke count={25} />
      
      {/* Dark warm fog */}
      <fog attach="fog" args={['#1a1510', 3, 20]} />
    </>
  );
}

export default SyndicateScene;
