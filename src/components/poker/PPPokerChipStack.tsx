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

  // Position bets FROM avatar center TOWARDS table center
  // The component is inside player container, so we offset from local center (0,0)
  const getBetPosition = () => {
    const tableCenterX = 50;
    const tableCenterY = 45;
    
    // Direction from player to table center
    const dx = tableCenterX - seatPosition.x;
    const dy = tableCenterY - seatPosition.y;
    
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: 0, y: -66 };
    
    const normalX = dx / length;
    const normalY = dy / length;
    
    // Fixed distance from avatar center (66px = 60px + 10%)
    const fixedDistance = 66;
    
    return { 
      x: normalX * fixedDistance, 
      y: normalY * fixedDistance 
    };
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
      className="absolute flex items-center gap-1.5 z-20 pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${betPos.x}px), calc(-50% + ${betPos.y}px))`
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
