// ============================================
// PPPOKER BET DISPLAY - Shows bet amount in BB format with chip icon
// ============================================
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerBetDisplayProps {
  amount: number;
  bigBlind: number;
  position: { x: number; y: number };
  seatIndex: number;
  isMobile?: boolean;
  animated?: boolean;
}

// Chip icon component
const ChipIcon = memo(function ChipIcon({ size = 16 }: { size?: number }) {
  return (
    <div 
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
        border: '1.5px solid #f87171',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.3)'
      }}
    >
      {/* Chip pattern */}
      <div 
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: 'repeating-conic-gradient(from 0deg, transparent 0deg 30deg, rgba(255,255,255,0.15) 30deg 60deg)'
        }}
      />
    </div>
  );
});

// Calculate bet offset based on seat position - moves towards table center
function getBetOffset(seatIndex: number, isMobile: boolean): { x: number; y: number } {
  const multiplier = isMobile ? 1 : 1.3;
  
  // Offsets positioned to show bet between player and table center
  const offsets: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: -40 * multiplier },      // Hero (bottom) - bet above
    1: { x: 35 * multiplier, y: 0 },       // Left middle - bet to right
    2: { x: 25 * multiplier, y: 20 * multiplier },  // Left top - bet to right-down
    3: { x: 0, y: 30 * multiplier },       // Top center - bet below
    4: { x: -25 * multiplier, y: 20 * multiplier }, // Right top - bet to left-down
    5: { x: -35 * multiplier, y: 0 },      // Right middle - bet to left
  };
  
  return offsets[seatIndex] || { x: 0, y: -30 };
}

export const PPPokerBetDisplay = memo(function PPPokerBetDisplay({
  amount,
  bigBlind,
  position,
  seatIndex,
  isMobile = false,
  animated = true
}: PPPokerBetDisplayProps) {
  if (!amount || amount <= 0) return null;

  const offset = getBetOffset(seatIndex, isMobile);
  
  // Format as BB
  const bbAmount = bigBlind > 0 ? amount / bigBlind : amount;
  const bbFormatted = bbAmount >= 10 
    ? bbAmount.toFixed(0) 
    : bbAmount >= 1 
      ? bbAmount.toFixed(1).replace('.0', '')
      : bbAmount.toFixed(1);

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="absolute z-20 pointer-events-none"
      style={{
        left: `calc(50% + ${offset.x}px)`,
        top: `calc(50% + ${offset.y}px)`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div 
        className={cn(
          "flex items-center gap-1.5 rounded-full shadow-lg",
          isMobile ? "px-2 py-1" : "px-2.5 py-1"
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(15,15,15,0.95) 0%, rgba(5,5,5,0.98) 100%)',
          border: '1.5px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), 0 0 10px rgba(239, 68, 68, 0.15)'
        }}
      >
        <ChipIcon size={isMobile ? 14 : 16} />
        <span 
          className={cn(
            "font-bold whitespace-nowrap",
            isMobile ? "text-[11px]" : "text-xs"
          )}
          style={{
            background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {bbFormatted} BB
        </span>
      </div>
    </motion.div>
  );
});

export default PPPokerBetDisplay;
