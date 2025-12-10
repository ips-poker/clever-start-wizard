// =====================================================
// PPPOKER-STYLE ENHANCED CARDS
// =====================================================
// Premium poker cards with PPPoker-accurate design

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// PPPoker-style suit colors (blue diamonds, green clubs)
const SUIT_CONFIG = {
  h: { symbol: '♥', color: '#ef4444', name: 'hearts' },
  d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' },  // Blue in PPPoker
  c: { symbol: '♣', color: '#22c55e', name: 'clubs' },     // Green in PPPoker
  s: { symbol: '♠', color: '#1f2937', name: 'spades' },
};

const SIZE_CONFIG = {
  xs: { w: 32, h: 44, rankSize: 12, suitSize: 10, centerSize: 16, padding: 3, radius: 4 },
  sm: { w: 40, h: 56, rankSize: 14, suitSize: 12, centerSize: 20, padding: 4, radius: 5 },
  md: { w: 52, h: 72, rankSize: 18, suitSize: 14, centerSize: 26, padding: 5, radius: 6 },
  lg: { w: 64, h: 88, rankSize: 22, suitSize: 18, centerSize: 32, padding: 6, radius: 7 },
};

interface PPPokerEnhancedCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
  isHighlighted?: boolean;
  animate?: boolean;
}

// Card back component - PPPoker blue pattern
const CardBack = memo(function CardBack({ 
  width, 
  height, 
  radius,
  delay,
  animate
}: { 
  width: number; 
  height: number; 
  radius: number;
  delay: number;
  animate: boolean;
}) {
  const patternId = useMemo(() => `cardPattern-${Math.random().toString(36).substr(2, 9)}`, []);
  
  return (
    <motion.div
      initial={animate ? { rotateY: 180, scale: 0.5, opacity: 0 } : false}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      className="relative overflow-hidden"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 40%, #1e40af 100%)',
        border: '2px solid #60a5fa',
        boxShadow: `
          0 4px 12px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `
      }}
    >
      {/* Diamond grid pattern */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id={patternId} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="3" y="3" width="2" height="2" fill="white" opacity="0.15" transform="rotate(45 4 4)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`}/>
      </svg>
      
      {/* Inner border */}
      <div 
        className="absolute"
        style={{
          inset: 4,
          borderRadius: radius - 2,
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      />
      
      {/* Center logo/emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="rounded-full flex items-center justify-center font-black text-white"
          style={{
            width: width * 0.4,
            height: width * 0.4,
            fontSize: width * 0.2,
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          S
        </div>
      </div>
      
      {/* Top left shine */}
      <div 
        className="absolute top-1 left-1 rounded-full"
        style={{
          width: width * 0.25,
          height: height * 0.15,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 100%)'
        }}
      />
    </motion.div>
  );
});

// Card face component - PPPoker style
const CardFace = memo(function CardFace({
  rank,
  suit,
  width,
  height,
  radius,
  delay,
  isWinning,
  isHighlighted,
  animate
}: {
  rank: string;
  suit: string;
  width: number;
  height: number;
  radius: number;
  delay: number;
  isWinning: boolean;
  isHighlighted: boolean;
  animate: boolean;
}) {
  const suitConfig = SUIT_CONFIG[suit as keyof typeof SUIT_CONFIG] || SUIT_CONFIG.s;
  const displayRank = rank === 'T' ? '10' : rank;
  
  // Determine border and glow based on state
  const borderColor = isWinning 
    ? '#22c55e' 
    : isHighlighted 
      ? '#fbbf24' 
      : '#e5e7eb';
      
  const glowShadow = isWinning
    ? '0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.3)'
    : isHighlighted
      ? '0 0 15px rgba(251,191,36,0.5)'
      : '';

  return (
    <motion.div
      initial={animate ? { rotateY: 180, scale: 0.5, opacity: 0 } : false}
      animate={{ 
        rotateY: 0, 
        scale: isWinning ? [1, 1.05, 1] : 1, 
        opacity: 1 
      }}
      transition={{ 
        delay: delay * 0.1, 
        type: 'spring', 
        stiffness: 200, 
        damping: 20,
        scale: { repeat: isWinning ? Infinity : 0, duration: 1.5 }
      }}
      className="relative overflow-hidden"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%)',
        border: `2px solid ${borderColor}`,
        boxShadow: `
          0 4px 12px rgba(0,0,0,0.2),
          inset 0 1px 0 rgba(255,255,255,0.8),
          inset 0 -1px 0 rgba(0,0,0,0.05)
          ${glowShadow ? ', ' + glowShadow : ''}
        `
      }}
    >
      {/* Top-left rank and suit */}
      <div 
        className="absolute flex flex-col items-center leading-none"
        style={{ top: 3, left: 4 }}
      >
        <span 
          className="font-black"
          style={{ 
            fontSize: width * 0.28,
            color: suitConfig.color,
            lineHeight: 1
          }}
        >
          {displayRank}
        </span>
        <span 
          style={{ 
            fontSize: width * 0.22,
            color: suitConfig.color,
            lineHeight: 1,
            marginTop: -2
          }}
        >
          {suitConfig.symbol}
        </span>
      </div>
      
      {/* Bottom-right rank and suit (rotated) */}
      <div 
        className="absolute flex flex-col items-center leading-none"
        style={{ bottom: 3, right: 4, transform: 'rotate(180deg)' }}
      >
        <span 
          className="font-black"
          style={{ 
            fontSize: width * 0.28,
            color: suitConfig.color,
            lineHeight: 1
          }}
        >
          {displayRank}
        </span>
        <span 
          style={{ 
            fontSize: width * 0.22,
            color: suitConfig.color,
            lineHeight: 1,
            marginTop: -2
          }}
        >
          {suitConfig.symbol}
        </span>
      </div>
      
      {/* Large center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          style={{ 
            fontSize: width * 0.55,
            color: suitConfig.color,
            opacity: 0.12
          }}
        >
          {suitConfig.symbol}
        </span>
      </div>
      
      {/* Winning card shine effect */}
      {isWinning && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(34,197,94,0.2) 50%, transparent 100%)'
          }}
        />
      )}
    </motion.div>
  );
});

export const PPPokerEnhancedCard = memo(function PPPokerEnhancedCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isWinning = false,
  isHighlighted = false,
  animate = true
}: PPPokerEnhancedCardProps) {
  const config = SIZE_CONFIG[size];
  
  if (!card || card === 'XX' || faceDown) {
    return (
      <CardBack 
        width={config.w} 
        height={config.h} 
        radius={config.radius}
        delay={delay}
        animate={animate}
      />
    );
  }
  
  const rank = card[0];
  const suit = card[1];
  
  return (
    <CardFace
      rank={rank}
      suit={suit}
      width={config.w}
      height={config.h}
      radius={config.radius}
      delay={delay}
      isWinning={isWinning}
      isHighlighted={isHighlighted}
      animate={animate}
    />
  );
});

// =====================================================
// HAND STRENGTH INDICATOR - Shows hand ranking
// =====================================================
interface HandStrengthBadgeProps {
  handName?: string;
  cards?: string[];
  isMobile?: boolean;
}

const HAND_NAMES_RU: Record<string, string> = {
  'Royal Flush': 'Роял Флеш',
  'Straight Flush': 'Стрит Флеш',
  'Four of a Kind': 'Каре',
  'Full House': 'Фулл Хаус',
  'Flush': 'Флеш',
  'Straight': 'Стрит',
  'Three of a Kind': 'Тройка',
  'Two Pair': 'Две Пары',
  'One Pair': 'Пара',
  'Pair': 'Пара',
  'High Card': 'Старшая карта',
  // Additional variations
  'royal flush': 'Роял Флеш',
  'straight flush': 'Стрит Флеш',
  'four of a kind': 'Каре',
  'full house': 'Фулл Хаус',
  'flush': 'Флеш',
  'straight': 'Стрит',
  'three of a kind': 'Тройка',
  'two pair': 'Две Пары',
  'one pair': 'Пара',
  'pair': 'Пара',
  'high card': 'Старшая карта',
};

export const HandStrengthBadge = memo(function HandStrengthBadge({
  handName,
  cards,
  isMobile = false
}: HandStrengthBadgeProps) {
  if (!handName) return null;
  
  const displayName = HAND_NAMES_RU[handName] || handName;
  
  // Determine badge color based on hand strength
  const getHandColor = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('royal') || lowerName.includes('straight flush')) return '#fbbf24';
    if (lowerName.includes('four') || lowerName.includes('каре')) return '#a855f7';
    if (lowerName.includes('full') || lowerName.includes('фулл')) return '#ec4899';
    if (lowerName.includes('flush') || lowerName.includes('флеш')) return '#3b82f6';
    if (lowerName.includes('straight') || lowerName.includes('стрит')) return '#22c55e';
    if (lowerName.includes('three') || lowerName.includes('тройка')) return '#f97316';
    if (lowerName.includes('two pair') || lowerName.includes('две')) return '#06b6d4';
    if (lowerName.includes('pair') || lowerName.includes('пара')) return '#8b5cf6';
    return '#64748b';
  };
  
  const color = getHandColor(handName);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "rounded-full font-bold shadow-lg",
        isMobile ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        border: `1px solid ${color}60`,
        color: color,
        boxShadow: `0 0 10px ${color}30`
      }}
    >
      {displayName}
    </motion.div>
  );
});

export default PPPokerEnhancedCard;
