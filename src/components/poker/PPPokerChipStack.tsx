// PPPoker-style Chip + BB Display for bet display
// Realistic 3D poker chip with edge pattern + "X.X BB" text

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RealisticPokerChip } from './RealisticPokerChip';

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

  if (amount <= 0) return null;

  // PPPoker exact style: bets are positioned RIGHT NEXT TO player box, not far away
  const getBetPosition = () => {
    // Hero (bottom center - y > 75): bet goes ABOVE avatar, CENTERED
    if (isHero || seatPosition.y > 75) {
      return { x: 0, y: -50 };
    }
    
    // Left side of table (x < 30): bet to the right of name panel, very close
    if (seatPosition.x < 30) {
      return { x: 55, y: 32 };
    }
    
    // Right side of table (x > 70): bet to the left of name panel, very close  
    if (seatPosition.x > 70) {
      return { x: -55, y: 32 };
    }
    
    // Top seats (y < 35): bet goes below, close to panel
    if (seatPosition.y < 35) {
      return { x: 0, y: 42 };
    }
    
    // Middle seats: bet right next to box
    if (seatPosition.x < 50) {
      return { x: 50, y: 30 };
    } else {
      return { x: -50, y: 30 };
    }
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
      {/* Realistic 3D poker chip */}
      <RealisticPokerChip
        size={24}
        color="red"
        animated={animated}
        delay={0}
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
