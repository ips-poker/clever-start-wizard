// ============================================
// CYBERPUNK HOLOGRAPHIC DECORATIONS
// ============================================
// Голограммы, tech-линии, глитч-эффекты, футуристические элементы

import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const CyberpunkHoloElements = memo(function CyberpunkHoloElements() {
  const cyan = '#00d4ff';
  const magenta = '#ff00ff';
  const purple = '#8b00ff';
  
  return (
    <>
      {/* === TOP LEFT: Holographic HUD Frame === */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <svg width="100" height="60" viewBox="0 0 100 60">
          {/* Corner bracket */}
          <motion.path
            d="M0,20 L0,5 Q0,0 5,0 L30,0"
            stroke={cyan}
            strokeWidth="2"
            fill="none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 5px ${cyan})` }}
          />
          <motion.path
            d="M0,40 L0,55 Q0,60 5,60 L30,60"
            stroke={magenta}
            strokeWidth="1"
            fill="none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 3px ${magenta})` }}
          />
          {/* Data text */}
          <text x="8" y="25" fill={cyan} fontSize="8" fontFamily="monospace" opacity="0.8">
            SYS:ONLINE
          </text>
          <text x="8" y="38" fill={magenta} fontSize="7" fontFamily="monospace" opacity="0.6">
            v2.077
          </text>
        </svg>
      </div>

      {/* === TOP RIGHT: Holographic HUD Frame (mirrored) === */}
      <div className="absolute top-3 right-3 pointer-events-none">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <motion.path
            d="M100,20 L100,5 Q100,0 95,0 L70,0"
            stroke={cyan}
            strokeWidth="2"
            fill="none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            style={{ filter: `drop-shadow(0 0 5px ${cyan})` }}
          />
          <motion.path
            d="M100,40 L100,55 Q100,60 95,60 L70,60"
            stroke={magenta}
            strokeWidth="1"
            fill="none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            style={{ filter: `drop-shadow(0 0 3px ${magenta})` }}
          />
          <text x="72" y="25" fill={cyan} fontSize="8" fontFamily="monospace" opacity="0.8">
            NET:SYNC
          </text>
          <text x="72" y="38" fill={magenta} fontSize="7" fontFamily="monospace" opacity="0.6">
            POKER++
          </text>
        </svg>
      </div>

      {/* === LEFT SIDE: Vertical Tech Lines === */}
      <div className="absolute left-0 top-20 bottom-20 w-8 pointer-events-none">
        {/* Main vertical line */}
        <div 
          className="absolute left-2 top-0 bottom-0 w-[2px]"
          style={{ 
            background: `linear-gradient(180deg, transparent 0%, ${cyan} 20%, ${cyan} 80%, transparent 100%)`,
            boxShadow: `0 0 10px ${cyan}`
          }}
        />
        {/* Horizontal tick marks */}
        {[20, 35, 50, 65, 80].map((top, i) => (
          <motion.div
            key={i}
            className="absolute left-2 h-[1px] w-5"
            style={{ 
              top: `${top}%`,
              background: i % 2 === 0 ? cyan : magenta,
              boxShadow: `0 0 5px ${i % 2 === 0 ? cyan : magenta}`
            }}
            animate={{ opacity: [0.3, 1, 0.3], width: [12, 20, 12] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* === RIGHT SIDE: Vertical Tech Lines (mirrored) === */}
      <div className="absolute right-0 top-20 bottom-20 w-8 pointer-events-none">
        <div 
          className="absolute right-2 top-0 bottom-0 w-[2px]"
          style={{ 
            background: `linear-gradient(180deg, transparent 0%, ${magenta} 20%, ${magenta} 80%, transparent 100%)`,
            boxShadow: `0 0 10px ${magenta}`
          }}
        />
        {[20, 35, 50, 65, 80].map((top, i) => (
          <motion.div
            key={i}
            className="absolute right-2 h-[1px] w-5"
            style={{ 
              top: `${top}%`,
              background: i % 2 === 0 ? magenta : cyan,
              boxShadow: `0 0 5px ${i % 2 === 0 ? magenta : cyan}`
            }}
            animate={{ opacity: [0.3, 1, 0.3], width: [12, 20, 12] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 + 0.5 }}
          />
        ))}
      </div>

      {/* === BOTTOM LEFT: Holographic Chip Icon === */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <motion.div
          animate={{ 
            rotateY: [0, 360],
            opacity: [0.6, 1, 0.6]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="relative w-12 h-12"
        >
          <svg viewBox="0 0 50 50" className="w-full h-full">
            {/* Holographic chip */}
            <circle 
              cx="25" cy="25" r="20" 
              fill="none" 
              stroke={cyan} 
              strokeWidth="2"
              strokeDasharray="5 3"
              style={{ filter: `drop-shadow(0 0 8px ${cyan})` }}
            />
            <circle 
              cx="25" cy="25" r="12" 
              fill="none" 
              stroke={magenta} 
              strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 5px ${magenta})` }}
            />
            <text x="25" y="29" fill={cyan} fontSize="12" fontFamily="monospace" textAnchor="middle">
              ₿
            </text>
          </svg>
        </motion.div>
      </div>

      {/* === BOTTOM RIGHT: Data Stream === */}
      <div className="absolute bottom-4 right-4 pointer-events-none text-right">
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xs font-mono"
          style={{ color: cyan, textShadow: `0 0 5px ${cyan}` }}
        >
          SYNDIKATE::
        </motion.div>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-[10px] font-mono"
          style={{ color: magenta, textShadow: `0 0 3px ${magenta}` }}
        >
          NEURAL_LINK
        </motion.div>
      </div>

      {/* === GLITCH SCAN LINE (occasional) === */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${cyan}40, ${magenta}60, transparent)`,
          boxShadow: `0 0 20px ${cyan}`
        }}
        animate={{ 
          top: ['-5%', '105%'],
          opacity: [0, 0.8, 0.8, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          repeatDelay: 6,
          ease: "linear"
        }}
      />

      {/* === CORNER HEXAGONS === */}
      {[
        { pos: 'top-8 left-1/4', delay: 0 },
        { pos: 'top-8 right-1/4', delay: 1 },
        { pos: 'bottom-8 left-1/4', delay: 2 },
        { pos: 'bottom-8 right-1/4', delay: 3 }
      ].map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.pos} pointer-events-none opacity-40`}
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            scale: [0.9, 1.1, 0.9]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: item.delay }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <polygon 
              points="10,0 18,5 18,15 10,20 2,15 2,5" 
              fill="none" 
              stroke={i % 2 === 0 ? cyan : magenta}
              strokeWidth="1"
              style={{ filter: `drop-shadow(0 0 3px ${i % 2 === 0 ? cyan : magenta})` }}
            />
          </svg>
        </motion.div>
      ))}
    </>
  );
});

export default CyberpunkHoloElements;
