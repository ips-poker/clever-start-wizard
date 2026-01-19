// ============================================
// MAFIA LUXURY DECORATIONS
// ============================================
// Золотые рамки, элегантные орнаменты, сигарный дым, бокалы виски

import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const MafiaLuxuryElements = memo(function MafiaLuxuryElements() {
  const gold = '#d4af37';
  const darkGold = '#b8860b';
  const bronze = '#8b5a2b';
  
  return (
    <>
      {/* === TOP LEFT: Ornate Gold Corner === */}
      <div className="absolute top-2 left-2 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80">
          {/* Ornate corner frame */}
          <path
            d="M5,40 L5,15 Q5,5 15,5 L40,5"
            stroke={gold}
            strokeWidth="2"
            fill="none"
            style={{ filter: `drop-shadow(0 0 3px ${gold})` }}
          />
          <path
            d="M10,35 L10,18 Q10,10 18,10 L35,10"
            stroke={darkGold}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          {/* Decorative flourish */}
          <circle cx="5" cy="40" r="3" fill={gold} opacity="0.8" />
          <circle cx="40" cy="5" r="3" fill={gold} opacity="0.8" />
          <circle cx="10" cy="10" r="2" fill={darkGold} opacity="0.6" />
        </svg>
      </div>

      {/* === TOP RIGHT: Ornate Gold Corner (mirrored) === */}
      <div className="absolute top-2 right-2 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <path
            d="M75,40 L75,15 Q75,5 65,5 L40,5"
            stroke={gold}
            strokeWidth="2"
            fill="none"
            style={{ filter: `drop-shadow(0 0 3px ${gold})` }}
          />
          <path
            d="M70,35 L70,18 Q70,10 62,10 L45,10"
            stroke={darkGold}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <circle cx="75" cy="40" r="3" fill={gold} opacity="0.8" />
          <circle cx="40" cy="5" r="3" fill={gold} opacity="0.8" />
          <circle cx="70" cy="10" r="2" fill={darkGold} opacity="0.6" />
        </svg>
      </div>

      {/* === BOTTOM LEFT: Ornate Gold Corner === */}
      <div className="absolute bottom-2 left-2 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <path
            d="M5,40 L5,65 Q5,75 15,75 L40,75"
            stroke={gold}
            strokeWidth="2"
            fill="none"
            style={{ filter: `drop-shadow(0 0 3px ${gold})` }}
          />
          <path
            d="M10,45 L10,62 Q10,70 18,70 L35,70"
            stroke={darkGold}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <circle cx="5" cy="40" r="3" fill={gold} opacity="0.8" />
          <circle cx="40" cy="75" r="3" fill={gold} opacity="0.8" />
        </svg>
      </div>

      {/* === BOTTOM RIGHT: Ornate Gold Corner (mirrored) === */}
      <div className="absolute bottom-2 right-2 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <path
            d="M75,40 L75,65 Q75,75 65,75 L40,75"
            stroke={gold}
            strokeWidth="2"
            fill="none"
            style={{ filter: `drop-shadow(0 0 3px ${gold})` }}
          />
          <path
            d="M70,45 L70,62 Q70,70 62,70 L45,70"
            stroke={darkGold}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <circle cx="75" cy="40" r="3" fill={gold} opacity="0.8" />
          <circle cx="40" cy="75" r="3" fill={gold} opacity="0.8" />
        </svg>
      </div>

      {/* === LEFT SIDE: Cigar Smoke Effect === */}
      <div className="absolute left-6 bottom-1/4 pointer-events-none">
        <motion.div
          animate={{ 
            y: [-10, -40],
            opacity: [0.6, 0],
            scale: [1, 1.5]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          className="w-8 h-20"
          style={{
            background: `linear-gradient(to top, ${bronze}30, transparent)`,
            borderRadius: '50%',
            filter: 'blur(6px)'
          }}
        />
        {/* Cigar icon */}
        <div className="text-lg mt-2" style={{ filter: `drop-shadow(0 0 5px ${bronze})` }}>
          🚬
        </div>
      </div>

      {/* === RIGHT SIDE: Whiskey Glass === */}
      <div className="absolute right-6 bottom-1/4 pointer-events-none">
        <motion.div
          animate={{ 
            rotate: [-2, 2, -2]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="text-2xl"
          style={{ 
            filter: `drop-shadow(0 0 8px ${gold})`,
            color: gold
          }}
        >
          🥃
        </motion.div>
      </div>

      {/* === TOP CENTER: "FAMIGLIA" Text === */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-sm tracking-[0.5em] font-serif"
          style={{ 
            color: gold,
            textShadow: `0 0 10px ${gold}40`
          }}
        >
          FAMIGLIA
        </motion.div>
        <div 
          className="h-[1px] mt-2 mx-4"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${gold}, transparent)`
          }}
        />
      </div>

      {/* === BOTTOM CENTER: "SYNDIKATE" Emblem === */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div 
          className="h-[1px] mb-2 mx-4"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${gold}, transparent)`
          }}
        />
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-xs tracking-[0.3em] font-serif"
          style={{ 
            color: darkGold,
            textShadow: `0 0 5px ${darkGold}30`
          }}
        >
          ★ SYNDIKATE ★
        </motion.div>
      </div>

      {/* === DECORATIVE SIDE LINES === */}
      <div 
        className="absolute left-0 top-1/4 bottom-1/4 w-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent, ${gold}40, ${gold}, ${gold}40, transparent)`
        }}
      />
      <div 
        className="absolute right-0 top-1/4 bottom-1/4 w-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent, ${gold}40, ${gold}, ${gold}40, transparent)`
        }}
      />

      {/* === FLOATING GOLD PARTICLES === */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            background: gold,
            left: `${15 + i * 12}%`,
            top: `${10 + (i * 7) % 20}%`,
            boxShadow: `0 0 6px ${gold}`
          }}
          animate={{ 
            y: [0, -10, 0],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ 
            duration: 3 + i * 0.5, 
            repeat: Infinity, 
            delay: i * 0.3 
          }}
        />
      ))}
    </>
  );
});

export default MafiaLuxuryElements;
