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
        className="rounded-md shadow-lg flex items-center justify-center flex-shrink-0"
        style={{
          width: s.width,
          height: s.height,
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1e40af 100%)',
          border: '2px solid #3b82f6',
        }}
      >
        <div className="w-full h-full rounded-md opacity-50" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='2' fill='rgba(255,255,255,0.1)'/%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px'
          }}
        />
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
