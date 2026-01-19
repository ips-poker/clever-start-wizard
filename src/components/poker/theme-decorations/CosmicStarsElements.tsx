// ============================================
// COSMIC STARS DECORATIONS
// ============================================
// Звезды, туманности, планеты, космическая пыль

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

export const CosmicStarsElements = memo(function CosmicStarsElements() {
  const purple = '#9b59b6';
  const blue = '#3498db';
  const pink = '#e91e63';
  
  // Generate random stars
  const stars = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    })),
    []
  );

  // Generate shooting stars
  const shootingStars = useMemo(() => [
    { delay: 0, startX: 10, startY: 5 },
    { delay: 5, startX: 80, startY: 8 },
    { delay: 10, startX: 50, startY: 3 },
  ], []);

  return (
    <>
      {/* === TWINKLING STARS === */}
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: 'white',
            boxShadow: `0 0 ${star.size * 2}px white`
          }}
          animate={{ 
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: star.duration, 
            repeat: Infinity, 
            delay: star.delay 
          }}
        />
      ))}

      {/* === SHOOTING STARS === */}
      {shootingStars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            width: 80,
            height: 2,
            background: `linear-gradient(90deg, transparent, white, white, transparent)`,
            borderRadius: 2,
            transformOrigin: 'left center'
          }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 35 }}
          animate={{ 
            opacity: [0, 1, 0],
            x: [0, 200],
            y: [0, 120]
          }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            repeatDelay: 8,
            delay: star.delay,
            ease: "easeOut"
          }}
        />
      ))}

      {/* === TOP LEFT: Nebula Glow === */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 pointer-events-none">
        <motion.div
          animate={{ 
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="w-full h-full"
          style={{
            background: `radial-gradient(ellipse at 30% 30%, ${purple}40 0%, transparent 60%)`,
            filter: 'blur(20px)'
          }}
        />
      </div>

      {/* === BOTTOM RIGHT: Nebula Glow === */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 pointer-events-none">
        <motion.div
          animate={{ 
            opacity: [0.15, 0.25, 0.15],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="w-full h-full"
          style={{
            background: `radial-gradient(ellipse at 70% 70%, ${blue}40 0%, transparent 60%)`,
            filter: 'blur(25px)'
          }}
        />
      </div>

      {/* === PLANET (top right corner) === */}
      <div className="absolute top-8 right-8 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="relative w-10 h-10"
        >
          {/* Planet body */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${purple}, ${blue}80)`,
              boxShadow: `0 0 20px ${purple}50, inset -5px -5px 10px rgba(0,0,0,0.5)`
            }}
          />
          {/* Ring */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-4"
            style={{
              border: `1px solid ${purple}60`,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%) rotateX(70deg)'
            }}
          />
        </motion.div>
      </div>

      {/* === BOTTOM LEFT: Moon === */}
      <div className="absolute bottom-8 left-8 pointer-events-none">
        <div 
          className="w-6 h-6 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, #e0e0e0, #808080)`,
            boxShadow: `0 0 15px ${blue}40`
          }}
        />
      </div>

      {/* === CONSTELLATION LINES === */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        {/* Big Dipper style constellation */}
        <path
          d="M 10% 15% L 15% 12% L 20% 14% L 25% 11% L 30% 13% L 32% 18% L 35% 22%"
          stroke={purple}
          strokeWidth="0.5"
          fill="none"
          strokeDasharray="2 4"
        />
        {/* Orion style */}
        <path
          d="M 70% 75% L 75% 78% L 80% 76% L 85% 80%"
          stroke={blue}
          strokeWidth="0.5"
          fill="none"
          strokeDasharray="2 4"
        />
      </svg>

      {/* === COSMIC DUST PARTICLES === */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2,
            height: 2,
            background: i % 3 === 0 ? purple : i % 3 === 1 ? blue : pink,
            left: `${5 + i * 6}%`,
            bottom: `${5 + (i * 3) % 15}%`,
            opacity: 0.4
          }}
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 4 + i * 0.3, 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
        />
      ))}

      {/* === CORNER LABELS === */}
      <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono" style={{ color: purple, opacity: 0.5 }}>
        SECTOR 7G
      </div>
      <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono" style={{ color: blue, opacity: 0.5 }}>
        ★ ANDROMEDA ★
      </div>
    </>
  );
});

export default CosmicStarsElements;
