// ============================================
// VEGAS NEON DECORATIONS - Casino atmosphere elements
// ============================================
// Неоновые вывески, огни казино, игровые автоматы в углах

import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const VegasNeonElements = memo(function VegasNeonElements() {
  const hotPink = '#ff1493';
  const electricBlue = '#00bfff';
  const neonGreen = '#39ff14';
  const gold = '#ffd700';
  const neonPurple = '#bf00ff';
  
  return (
    <>
      {/* === TOP LEFT: Neon "CASINO" Sign === */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          animate={{ 
            textShadow: [
              `0 0 10px ${hotPink}, 0 0 20px ${hotPink}, 0 0 30px ${hotPink}`,
              `0 0 15px ${hotPink}, 0 0 30px ${hotPink}, 0 0 45px ${hotPink}`,
              `0 0 10px ${hotPink}, 0 0 20px ${hotPink}, 0 0 30px ${hotPink}`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-2xl md:text-3xl font-black tracking-wider"
          style={{ 
            color: hotPink,
            fontFamily: 'sans-serif',
            textShadow: `0 0 10px ${hotPink}, 0 0 20px ${hotPink}, 0 0 30px ${hotPink}`
          }}
        >
          CASINO
        </motion.div>
        {/* Подсветка под вывеской */}
        <div 
          className="h-1 mt-1 rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${hotPink}, transparent)`,
            boxShadow: `0 0 10px ${hotPink}`
          }}
        />
      </div>

      {/* === TOP RIGHT: Neon "JACKPOT" Sign === */}
      <div className="absolute top-4 right-4 pointer-events-none text-right">
        <motion.div
          animate={{ 
            textShadow: [
              `0 0 10px ${gold}, 0 0 20px ${gold}, 0 0 30px ${gold}`,
              `0 0 20px ${gold}, 0 0 40px ${gold}, 0 0 60px ${gold}`,
              `0 0 10px ${gold}, 0 0 20px ${gold}, 0 0 30px ${gold}`
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-xl md:text-2xl font-black tracking-wider"
          style={{ 
            color: gold,
            textShadow: `0 0 10px ${gold}, 0 0 20px ${gold}`
          }}
        >
          ★ JACKPOT ★
        </motion.div>
      </div>

      {/* === LEFT SIDE: Slot Machine Lights === */}
      <div className="absolute left-2 top-1/4 bottom-1/4 w-3 pointer-events-none flex flex-col justify-between py-8">
        {[hotPink, electricBlue, neonGreen, gold, neonPurple, hotPink].map((color, i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{ 
              duration: 0.8 + i * 0.2, 
              repeat: Infinity, 
              delay: i * 0.15 
            }}
            className="w-3 h-3 rounded-full"
            style={{ 
              background: color,
              boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`
            }}
          />
        ))}
      </div>

      {/* === RIGHT SIDE: Slot Machine Lights (mirror) === */}
      <div className="absolute right-2 top-1/4 bottom-1/4 w-3 pointer-events-none flex flex-col justify-between py-8">
        {[neonPurple, gold, neonGreen, electricBlue, hotPink, neonPurple].map((color, i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{ 
              duration: 0.8 + i * 0.2, 
              repeat: Infinity, 
              delay: i * 0.15 + 0.4 
            }}
            className="w-3 h-3 rounded-full"
            style={{ 
              background: color,
              boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`
            }}
          />
        ))}
      </div>

      {/* === BOTTOM LEFT: Playing Card Suits Neon === */}
      <div className="absolute bottom-4 left-4 pointer-events-none flex gap-3">
        {['♠', '♥', '♦', '♣'].map((suit, i) => {
          const colors = [electricBlue, hotPink, gold, neonGreen];
          return (
            <motion.span
              key={suit}
              animate={{ 
                opacity: [0.5, 1, 0.5],
                y: [0, -3, 0]
              }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                delay: i * 0.3 
              }}
              className="text-2xl md:text-3xl"
              style={{ 
                color: colors[i],
                textShadow: `0 0 10px ${colors[i]}, 0 0 20px ${colors[i]}`
              }}
            >
              {suit}
            </motion.span>
          );
        })}
      </div>

      {/* === BOTTOM RIGHT: Dice Neon === */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-2xl md:text-3xl"
          style={{ 
            color: neonGreen,
            textShadow: `0 0 10px ${neonGreen}, 0 0 20px ${neonGreen}`
          }}
        >
          🎲🎲
        </motion.div>
      </div>

      {/* === CORNER ACCENT TRIANGLES === */}
      {/* Top corners */}
      <svg className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-60">
        <polygon 
          points="0,0 60,0 0,60" 
          fill="none" 
          stroke={hotPink}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 5px ${hotPink})` }}
        />
      </svg>
      <svg className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-60">
        <polygon 
          points="60,0 60,60 0,0" 
          fill="none" 
          stroke={electricBlue}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 5px ${electricBlue})` }}
        />
      </svg>
      
      {/* Bottom corners */}
      <svg className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none opacity-60">
        <polygon 
          points="0,60 60,60 0,0" 
          fill="none" 
          stroke={neonGreen}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 5px ${neonGreen})` }}
        />
      </svg>
      <svg className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none opacity-60">
        <polygon 
          points="60,60 0,60 60,0" 
          fill="none" 
          stroke={gold}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 5px ${gold})` }}
        />
      </svg>

      {/* === RUNNING LIGHTS BORDER === */}
      <div className="absolute top-0 left-0 right-0 h-1 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute h-full w-1/3"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${hotPink}, ${electricBlue}, ${neonGreen}, transparent)`
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute h-full w-1/3"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${gold}, ${neonPurple}, ${hotPink}, transparent)`
          }}
        />
      </div>
    </>
  );
});

export default VegasNeonElements;
