// ============================================
// THEME 3D CANVAS - Base wrapper for all 3D scenes
// ============================================
// Provides Canvas with performance optimization and device detection

import React, { Suspense, memo, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei';

interface Theme3DCanvasProps {
  children: React.ReactNode;
  className?: string;
}

// Detect if device is low-power (mobile/tablet)
const isLowPowerDevice = () => {
  if (typeof window === 'undefined') return true;
  
  // Check for mobile/tablet
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Check for low core count
  const cores = navigator.hardwareConcurrency || 2;
  
  return isMobile || cores <= 4;
};

export const Theme3DCanvas = memo(function Theme3DCanvas({
  children,
  className = ''
}: Theme3DCanvasProps) {
  const isLowPower = useMemo(() => isLowPowerDevice(), []);
  
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        // Performance settings
        dpr={isLowPower ? [0.5, 1] : [1, 2]}
        gl={{
          antialias: !isLowPower,
          alpha: true,
          powerPreference: isLowPower ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true
        }}
        camera={{
          position: [0, 0, 10],
          fov: 60,
          near: 0.1,
          far: 100
        }}
        style={{ background: 'transparent' }}
        // Reduce updates when not visible
        frameloop="demand"
      >
        {/* Adaptive performance */}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        
        {/* Preload assets */}
        <Preload all />
        
        {/* Scene content */}
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Theme3DCanvas;
