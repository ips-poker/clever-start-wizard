// PPPoker-style Chip + BB Display for bet display
// Realistic 3D poker chip stack with edge pattern + "X.X BB" text

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PPPokerChipStackVisual } from './RealisticPokerChip';

interface PPPokerChipStackProps {
  amount: number;
  seatPosition: { x: number; y: number };
  bigBlind?: number;
  showBBFormat?: boolean;
  animated?: boolean;
  isHero?: boolean;
}

// Format BB value
const formatBB = (amount: number, bigBlind: number): string => {
  if (bigBlind <= 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  if (bb >= 100) return Math.round(bb).toLocaleString();
  if (bb >= 10) return bb.toFixed(1);
  return bb.toFixed(1);
};

export const PPPokerChipStack = memo(function PPPokerChipStack({
  amount,
  seatPosition,
  bigBlind = 20,
  showBBFormat = true,
  animated = true,
  isHero = false
}: PPPokerChipStackProps) {
  
  const bbValue = useMemo(() => formatBB(amount, bigBlind), [amount, bigBlind]);
  const bbNumeric = bigBlind > 0 ? amount / bigBlind : 1;

  if (amount <= 0) return null;

  // Calculate stack count based on bet size - more stacks for better 3D effect
  const getStackCount = (bb: number) => {
    if (bb >= 20) return 4;
    if (bb >= 10) return 3;
    if (bb >= 3) return 2;
    return 2; // minimum 2 for visible depth
  };

  // Position bets TOWARDS the center of the table (perpendicular to edge)
  // Calculate direction from player position to center (50, 50)
  const getBetPosition = () => {
    const centerX = 50;
    const centerY = 45; // Slightly above center for better visual
    
    // Vector from player to center
    const dx = centerX - seatPosition.x;
    const dy = centerY - seatPosition.y;
    
    // Normalize and scale - bets should be ~45px towards center
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: 0, y: -45 };
    
    const distance = 75; // Distance from player avatar towards center (increased by 30%)
    const offsetX = (dx / length) * distance;
    const offsetY = (dy / length) * distance;
    
    return { x: offsetX, y: offsetY };
  };
  
  const betPos = getBetPosition();

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 24,
        delay: 0.03
      }}
      className="absolute flex items-center gap-1.5 z-20"
      style={{
        left: `calc(50% + ${betPos.x}px)`,
        top: `calc(50% + ${betPos.y}px)`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Premium 3D stacked poker chips */}
      <PPPokerChipStackVisual
        size={28}
        bbValue={bbNumeric}
        stackCount={getStackCount(bbNumeric)}
        animated={animated}
      />

      {/* BB Amount text in rounded pill - PPPoker exact style */}
      <div 
        className="px-2 py-0.5 rounded-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, rgba(30,40,45,0.95) 0%, rgba(15,25,30,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
        }}
      >
        <span 
          className="font-bold text-[12px] leading-none whitespace-nowrap"
          style={{
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {bbValue} BB
        </span>
      </div>
    </motion.div>
  );
});

export default PPPokerChipStack;
