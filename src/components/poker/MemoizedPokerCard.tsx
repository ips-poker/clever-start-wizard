import React, { memo } from 'react';
import { motion } from 'framer-motion';

const SUIT_SYMBOLS: Record<string, { symbol: string; color: string }> = { 
  h: { symbol: '♥', color: '#ef4444' }, 
  d: { symbol: '♦', color: '#3b82f6' }, 
  c: { symbol: '♣', color: '#22c55e' }, 
  s: { symbol: '♠', color: '#1f2937' } 
};

interface PokerCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const sizeStyles = {
  sm: { width: 32, height: 44, fontSize: 12, suitSize: 14 },
  md: { width: 44, height: 62, fontSize: 16, suitSize: 20 },
  lg: { width: 56, height: 78, fontSize: 20, suitSize: 26 },
};

export const MemoizedPokerCard = memo(function MemoizedPokerCard({ 
  card, 
  faceDown = false, 
  size = 'md',
  animate = true 
}: PokerCardProps) {
  const s = sizeStyles[size];

  if (faceDown || !card || card === '??') {
    return (
      <div 
        className="rounded-md shadow-lg flex-shrink-0 relative overflow-hidden"
        style={{
          width: s.width,
          height: s.height,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Grid pattern */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,122,0,0.12) 4px, rgba(255,122,0,0.12) 5px),
              repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,122,0,0.12) 4px, rgba(255,122,0,0.12) 5px)
            `
          }}
        />
        {/* Border frame */}
        <div className="absolute inset-0.5 border border-orange-400/30 rounded-sm" />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-display font-black"
            style={{ 
              fontSize: s.fontSize * 0.9,
              color: 'rgba(255, 122, 0, 0.5)'
            }}
          >
            S
          </span>
        </div>
        {/* Corner ornaments */}
        <div className="absolute top-0.5 left-0.5 w-1 h-1 border-l border-t border-orange-400/40" />
        <div className="absolute top-0.5 right-0.5 w-1 h-1 border-r border-t border-orange-400/40" />
        <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-l border-b border-orange-400/40" />
        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-r border-b border-orange-400/40" />
      </div>
    );
  }

  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1]?.toLowerCase() as keyof typeof SUIT_SYMBOLS;
  const suitInfo = SUIT_SYMBOLS[suit] || { symbol: '?', color: '#000' };

  const CardContent = (
    <div 
      className="rounded-md shadow-xl relative overflow-hidden flex-shrink-0"
      style={{
        width: s.width,
        height: s.height,
        background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)',
        border: '1px solid #e5e7eb',
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          style={{ 
            fontSize: s.fontSize, 
            fontWeight: 700, 
            color: suitInfo.color,
            lineHeight: 1 
          }}
        >
          {rank}
        </span>
        <span style={{ fontSize: s.suitSize, color: suitInfo.color }}>
          {suitInfo.symbol}
        </span>
      </div>
      {/* Corner pip - horizontal */}
      <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 leading-none" style={{ color: suitInfo.color }}>
        <span style={{ fontSize: s.fontSize * 0.6, fontWeight: 600 }}>{rank}</span>
        <span style={{ fontSize: s.suitSize * 0.5 }}>{suitInfo.symbol}</span>
      </div>
    </div>
  );

  if (!animate) {
    return CardContent;
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {CardContent}
    </motion.div>
  );
});
