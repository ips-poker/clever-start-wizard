// ============================================
// PPPOKER PLAYER CARDS - Cards displayed at angle below avatar
// ============================================
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerPlayerCardsProps {
  cards: string[];
  faceDown?: boolean;
  position: 'left' | 'right' | 'bottom' | 'top';
  size?: 'xs' | 'sm' | 'md';
  isWinning?: boolean;
  handName?: string;
  showHandName?: boolean;
  isMobile?: boolean;
}

const SUIT_CONFIG = {
  h: { symbol: '♥', color: 'hsl(0, 84%, 55%)' },
  d: { symbol: '♦', color: 'hsl(217, 91%, 55%)' },
  c: { symbol: '♣', color: 'hsl(142, 71%, 40%)' },
  s: { symbol: '♠', color: 'hsl(220, 13%, 18%)' }
} as const;

const SIZE_CONFIG = {
  xs: { w: 28, h: 38, fontSize: 10, suitSize: 12 },
  sm: { w: 34, h: 46, fontSize: 12, suitSize: 14 },
  md: { w: 42, h: 58, fontSize: 14, suitSize: 18 }
};

// Individual card component
const MiniCard = memo(function MiniCard({
  card,
  faceDown = false,
  size = 'sm',
  index,
  rotation,
  offsetX,
  isWinning = false
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md';
  index: number;
  rotation: number;
  offsetX: number;
  isWinning?: boolean;
}) {
  const config = SIZE_CONFIG[size];
  
  if (faceDown || !card || card === 'XX' || card === '??') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0, rotateY: 180 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          rotateY: 0,
          rotate: rotation,
          x: offsetX
        }}
        transition={{ 
          delay: index * 0.08, 
          type: 'spring', 
          stiffness: 400, 
          damping: 25 
        }}
        className="relative shadow-lg overflow-hidden"
        style={{
          width: config.w,
          height: config.h,
          borderRadius: 4,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e5e7eb',
          transformOrigin: 'bottom center'
        }}
      >
        {/* Grid pattern */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,122,0,0.12) 2px, rgba(255,122,0,0.12) 3px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,122,0,0.12) 2px, rgba(255,122,0,0.12) 3px)
            `
          }}
        />
        {/* Border frame */}
        <div className="absolute inset-0.5 rounded-sm border border-orange-400/30" />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black text-[10px]" style={{ color: '#ff7a00', opacity: 0.5 }}>S</span>
        </div>
      </motion.div>
    );
  }

  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1]?.toLowerCase() as keyof typeof SUIT_CONFIG;
  const suitInfo = SUIT_CONFIG[suit] || { symbol: '?', color: '#000' };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotateY: 180 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        rotateY: 0,
        rotate: rotation,
        x: offsetX
      }}
      transition={{ 
        delay: index * 0.1, 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      className={cn(
        "relative shadow-lg",
        isWinning && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent"
      )}
      style={{
        width: config.w,
        height: config.h,
        borderRadius: 4,
        background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
        border: isWinning ? '2px solid #fbbf24' : '1px solid #e0e0e0',
        transformOrigin: 'bottom center',
        boxShadow: isWinning 
          ? '0 0 12px rgba(251, 191, 36, 0.5), 0 4px 8px rgba(0,0,0,0.2)'
          : '0 2px 6px rgba(0,0,0,0.2)'
      }}
    >
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold leading-none"
          style={{ 
            fontSize: config.fontSize, 
            color: suitInfo.color 
          }}
        >
          {rank}
        </span>
        <span 
          style={{ 
            fontSize: config.suitSize, 
            color: suitInfo.color,
            marginTop: -2
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Corner pip - horizontal */}
      <div 
        className="absolute top-0.5 left-0.5 flex items-center gap-0.5 leading-none"
        style={{ color: suitInfo.color }}
      >
        <span style={{ fontSize: config.fontSize * 0.5, fontWeight: 600 }}>{rank}</span>
        <span style={{ fontSize: config.suitSize * 0.4 }}>{suitInfo.symbol}</span>
      </div>

      {/* Glossy effect */}
      <div 
        className="absolute inset-0 pointer-events-none rounded"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%)'
        }}
      />
      
      {/* Winning glow animation */}
      {isWinning && (
        <motion.div
          className="absolute inset-0 rounded bg-yellow-400/20 pointer-events-none"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

// Main component - Cards fanned out below/beside avatar like PPPoker
export const PPPokerPlayerCards = memo(function PPPokerPlayerCards({
  cards,
  faceDown = false,
  position = 'bottom',
  size = 'sm',
  isWinning = false,
  handName,
  showHandName = false,
  isMobile = false
}: PPPokerPlayerCardsProps) {
  if (!cards || cards.length === 0) return null;

  // Calculate card rotations and offsets for fan effect - PPPoker style
  const getCardTransforms = (index: number, total: number, pos: string) => {
    if (total === 2) {
      // For 2 cards - slight fan like PPPoker
      if (pos === 'bottom' || pos === 'top') {
        const rotations = [-8, 8];
        const offsets = [-4, 4];
        return { rotation: rotations[index] || 0, offsetX: offsets[index] || 0 };
      } else if (pos === 'left') {
        // Cards fanned to the right
        const rotations = [-10, 10];
        const offsets = [0, 2];
        return { rotation: rotations[index] || 0, offsetX: offsets[index] || 0 };
      } else {
        // Cards fanned to the left  
        const rotations = [10, -10];
        const offsets = [-2, 0];
        return { rotation: rotations[index] || 0, offsetX: offsets[index] || 0 };
      }
    } else if (total === 4) {
      // For PLO 4 cards - wider fan
      const rotations = [-15, -5, 5, 15];
      const offsets = [-10, -3, 3, 10];
      return { rotation: rotations[index] || 0, offsetX: offsets[index] || 0 };
    }
    return { rotation: 0, offsetX: 0 };
  };

  const containerStyle = {
    bottom: 'flex-col items-center',
    top: 'flex-col-reverse items-center',
    left: 'flex-row items-center',
    right: 'flex-row-reverse items-center'
  };

  return (
    <div className={cn("flex gap-1", containerStyle[position])}>
      {/* Cards container */}
      <div className="relative flex items-end">
        {cards.map((card, idx) => {
          const { rotation, offsetX } = getCardTransforms(idx, cards.length, position);
          return (
            <div 
              key={`${card}-${idx}`}
              style={{ 
                marginLeft: idx > 0 ? (size === 'xs' ? -12 : size === 'sm' ? -14 : -16) : 0,
                zIndex: idx + 1
              }}
            >
              <MiniCard
                card={card}
                faceDown={faceDown}
                size={size}
                index={idx}
                rotation={rotation}
                offsetX={offsetX}
                isWinning={isWinning}
              />
            </div>
          );
        })}
      </div>
      
      {/* Hand name badge - shown during showdown */}
      <AnimatePresence>
        {showHandName && handName && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
            className={cn(
              "px-2 py-0.5 rounded text-center whitespace-nowrap",
              isWinning 
                ? "bg-gradient-to-r from-emerald-500/90 to-emerald-600/90"
                : "bg-black/70"
            )}
            style={{
              boxShadow: isWinning ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none'
            }}
          >
            <span className={cn(
              "font-bold uppercase tracking-wider",
              isMobile ? "text-[8px]" : "text-[9px]",
              isWinning ? "text-white" : "text-white/80"
            )}>
              {handName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default PPPokerPlayerCards;
