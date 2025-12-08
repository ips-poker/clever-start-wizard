// ============================================
// SYNDIKATE POKER TABLE - PPPoker Premium Design
// ============================================
// Максимально приближенный к PPPoker дизайн

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Loader2, 
  Settings2, Menu, X, Send, Trophy, Eye, EyeOff, 
  LogOut, Wallet, HelpCircle, Palette, Users, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';
import { useReconnectManager } from '@/hooks/useReconnectManager';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { TableSettingsPanel, TableSettings } from './TableSettingsPanel';
import { resolveAvatarUrl } from '@/utils/avatarResolver';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// ============= CONSTANTS =============
// PPPoker style 6-max positions - optimized for octagonal table
// Positions are relative to table area (not full screen)
const SEAT_POSITIONS_6MAX_MOBILE = [
  { x: 50, y: 95 },  // Seat 1 - Hero (bottom center, below table)
  { x: 5, y: 65 },   // Seat 2 - Left bottom
  { x: 5, y: 25 },   // Seat 3 - Left top
  { x: 50, y: 5 },   // Seat 4 - Top center
  { x: 95, y: 25 },  // Seat 5 - Right top
  { x: 95, y: 65 },  // Seat 6 - Right bottom
];

const SEAT_POSITIONS_6MAX_DESKTOP = [
  { x: 50, y: 90 },  // Seat 1 - Hero
  { x: 8, y: 60 },   // Seat 2
  { x: 8, y: 25 },   // Seat 3
  { x: 50, y: 5 },   // Seat 4
  { x: 92, y: 25 },  // Seat 5
  { x: 92, y: 60 },  // Seat 6
];

const SUIT_COLORS: Record<string, string> = {
  h: '#ef4444', // Red hearts
  d: '#3b82f6', // Blue diamonds  
  c: '#22c55e', // Green clubs
  s: '#1f2937', // Dark spades
};

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥', d: '♦', c: '♣', s: '♠'
};

// PPPoker style emojis
const POKER_EMOJIS = ['😀', '😂', '😎', '🤔', '😡', '😭', '👍', '👎', '🔥', '💪', '🙏', '💰'];

// ============= CARD COMPONENT - PPPoker Style =============
const PPPokerCard = memo(function PPPokerCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isWinning = false
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
}) {
  const sizeConfig = {
    xs: { w: 28, h: 40, rank: 'text-[10px]', suit: 'text-[8px]', center: 'text-sm' },
    sm: { w: 36, h: 50, rank: 'text-xs', suit: 'text-[10px]', center: 'text-base' },
    md: { w: 44, h: 62, rank: 'text-sm', suit: 'text-xs', center: 'text-lg' },
    lg: { w: 56, h: 78, rank: 'text-lg', suit: 'text-sm', center: 'text-2xl' },
  };
  
  const cfg = sizeConfig[size];
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1];
  const color = SUIT_COLORS[suit] || '#1f2937';
  const symbol = SUIT_SYMBOLS[suit] || '';

  if (faceDown) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: delay * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded shadow-lg relative"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
          border: '1.5px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        <div className="absolute inset-0.5 rounded flex items-center justify-center"
          style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 6px)' }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded shadow-lg relative flex flex-col p-0.5"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: '#fff',
        border: isWinning ? '2px solid #22c55e' : '1px solid #e5e7eb',
        boxShadow: isWinning ? '0 0 15px rgba(34,197,94,0.5)' : '0 4px 12px rgba(0,0,0,0.25)'
      }}
    >
      <div className="flex flex-col items-center leading-none ml-0.5">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color }}>{rank}</span>
        <span className={cfg.suit} style={{ color }}>{symbol}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color, opacity: 0.25 }}>{symbol}</span>
      </div>
    </motion.div>
  );
});

// ============= TIMER RING - PPPoker Style =============
const TimerRing = memo(function TimerRing({ 
  remaining, 
  total,
  size = 56
}: { 
  remaining: number; 
  total: number;
  size?: number;
}) {
  const progress = Math.max(0, Math.min(1, remaining / total));
  const circumference = 2 * Math.PI * (size / 2 - 2);
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = progress < 0.3;
  const isCritical = progress < 0.15;

  return (
    <svg 
      className="absolute pointer-events-none"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle cx={size/2} cy={size/2} r={size/2 - 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5"/>
      <circle
        cx={size/2} cy={size/2} r={size/2 - 2}
        fill="none"
        stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn("transition-all duration-300", isCritical && "animate-pulse")}
      />
    </svg>
  );
});

// ============= PLAYER SEAT - PPPoker Premium Style =============
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  seatIndex,
  isHero,
  showCards,
  isDealer,
  isSB,
  isBB,
  isCurrentTurn,
  turnTimeRemaining,
  turnDuration = 30,
  lastAction,
  isMobile = false,
  onPlayerClick
}: {
  player: PokerPlayer | null;
  position: { x: number; y: number };
  seatIndex: number;
  isHero: boolean;
  showCards: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isCurrentTurn: boolean;
  turnTimeRemaining?: number;
  turnDuration?: number;
  lastAction?: { action: string; amount?: number } | null;
  isMobile?: boolean;
  onPlayerClick?: (player: PokerPlayer) => void;
}) {
  const avatarSize = isMobile ? (isHero ? 48 : 42) : (isHero ? 56 : 48);
  const showTurnTimer = isCurrentTurn && !player?.isFolded && !player?.isAllIn;
  
  // Calculate bet position towards center
  const betOffset = useMemo(() => {
    const cx = 50, cy = 45;
    const dx = cx - position.x, dy = cy - position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const multiplier = isMobile ? 14 : 20;
    return { x: (dx/dist) * multiplier, y: (dy/dist) * multiplier };
  }, [position.x, position.y, isMobile]);

  // Cards position based on seat
  const cardsPosition = useMemo(() => {
    if (position.x < 25) return 'right';
    if (position.x > 75) return 'left';
    if (position.y < 25) return 'below';
    return 'above';
  }, [position.x, position.y]);

  // Empty seat - PPPoker style
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "rounded-full cursor-pointer flex items-center justify-center",
            isMobile ? "w-10 h-10" : "w-12 h-12"
          )}
          style={{
            background: 'linear-gradient(145deg, rgba(40,40,40,0.8), rgba(25,25,25,0.9))',
            border: '2px dashed rgba(100,100,100,0.5)',
          }}
        >
          <span className={cn("font-medium opacity-50 text-gray-400", isMobile ? "text-[10px]" : "text-xs")}>Empty</span>
        </motion.div>
      </div>
    );
  }

  const resolvedAvatarUrl = resolveAvatarUrl(player.avatarUrl, player.playerId);

  return (
    <motion.div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", isHero ? "z-20" : "z-10")}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: seatIndex * 0.02 }}
    >
      {/* Action badge - PPPoker style */}
      <AnimatePresence>
        {lastAction && (
          <motion.div 
            className={cn("absolute left-1/2 -translate-x-1/2 z-30", isMobile ? "-top-5" : "-top-7")}
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
          >
            <div className={cn(
              "px-2 py-0.5 rounded font-bold text-white uppercase tracking-wider shadow-lg",
              isMobile ? "text-[7px]" : "text-[9px]",
              lastAction.action === 'fold' && "bg-gray-600/95",
              lastAction.action === 'check' && "bg-blue-500/95",
              lastAction.action === 'call' && "bg-emerald-500/95",
              (lastAction.action === 'raise' || lastAction.action === 'bet') && "bg-amber-500/95",
              lastAction.action === 'allin' && "bg-red-500/95 animate-pulse"
            )}>
              {lastAction.action === 'allin' ? 'ALL-IN' : 
               lastAction.action === 'fold' ? 'Фолд' :
               lastAction.action === 'check' ? 'Чек' :
               lastAction.action === 'call' ? 'Колл' :
               lastAction.action === 'raise' ? 'Рейз' :
               lastAction.action === 'bet' ? 'Бет' :
               lastAction.action.toUpperCase()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer ring around avatar */}
      {showTurnTimer && turnTimeRemaining !== undefined && (
        <TimerRing remaining={turnTimeRemaining} total={turnDuration} size={avatarSize + 8}/>
      )}

      {/* Avatar container */}
      <div 
        className={cn("relative rounded-full overflow-hidden cursor-pointer transition-all duration-200", player.isFolded && "opacity-40 grayscale")}
        style={{
          width: avatarSize,
          height: avatarSize,
          border: isCurrentTurn && !player.isFolded
            ? '3px solid #22c55e'
            : player.isAllIn
              ? '3px solid #ef4444'
              : '2px solid rgba(100,100,100,0.8)',
          boxShadow: isCurrentTurn && !player.isFolded
            ? '0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.3)'
            : player.isAllIn
              ? '0 0 15px rgba(239,68,68,0.5)'
              : '0 4px 15px rgba(0,0,0,0.5)',
          background: '#2a2a2a'
        }}
        onClick={() => player && onPlayerClick?.(player)}
      >
        <img 
          src={resolvedAvatarUrl}
          alt={player.name || 'Player'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = resolveAvatarUrl(null, player.playerId); }}
        />
        
        {/* Fold overlay */}
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className={cn("text-white/90 font-bold", isMobile ? "text-[7px]" : "text-[9px]")}>Фолд</span>
          </div>
        )}
      </div>

      {/* Dealer button - PPPoker white D */}
      {isDealer && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn("absolute rounded-full flex items-center justify-center z-20",
            isMobile ? "-right-1 -top-1 w-4 h-4" : "-right-1 top-0 w-5 h-5"
          )}
          style={{
            background: 'linear-gradient(135deg, #fff 0%, #ddd 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            border: '1px solid #333'
          }}
        >
          <span className={cn("font-black text-gray-800", isMobile ? "text-[7px]" : "text-[9px]")}>D</span>
        </motion.div>
      )}

      {/* SB/BB indicator */}
      {(isSB || isBB) && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn("absolute rounded-full text-white font-bold flex items-center justify-center z-20",
            isMobile ? "-left-1 -bottom-1 w-4 h-4 text-[6px]" : "-left-1 bottom-0 w-5 h-5 text-[8px]"
          )}
          style={{
            background: isBB 
              ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
          }}
        >
          {isBB ? 'BB' : 'SB'}
        </motion.div>
      )}

      {/* Player name plate - PPPoker style */}
      <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("flex flex-col items-center rounded px-1.5 py-0.5",
            isMobile ? "min-w-[48px]" : "min-w-[60px]"
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div className={cn("text-white font-medium truncate",
            isMobile ? "text-[7px] max-w-[46px]" : "text-[9px] max-w-[58px]"
          )}>
            {isHero ? 'Вы' : (player.name?.slice(0, 7) || 'Игрок')}
            {!isMobile && player.name && player.name.length > 7 && '...'}
          </div>
          <div 
            className={cn("font-bold", isMobile ? "text-[9px]" : "text-[11px]")}
            style={{ color: player.isAllIn ? '#ef4444' : '#22c55e' }}
          >
            {player.isAllIn ? 'ALL-IN' : `${(player.stack / (20)).toFixed(1)} BB`}
          </div>
        </motion.div>
      </div>

      {/* Cards beside avatar - opponents only */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && !isHero && (
        <div className={cn("absolute flex gap-0 z-5",
          cardsPosition === 'right' && "left-full ml-1 top-1/2 -translate-y-1/2",
          cardsPosition === 'left' && "right-full mr-1 top-1/2 -translate-y-1/2",
          cardsPosition === 'above' && "-top-12 left-1/2 -translate-x-1/2",
          cardsPosition === 'below' && "top-full mt-10 left-1/2 -translate-x-1/2"
        )}>
          {player.holeCards.map((card, idx) => (
            <div key={`${card}-${idx}`} style={{ marginLeft: idx > 0 ? '-4px' : 0 }}>
              <PPPokerCard card={card} faceDown={!showCards} size={isMobile ? "xs" : "sm"} delay={idx} isWinning={showCards}/>
            </div>
          ))}
        </div>
      )}

      {/* Bet chip + amount - PPPoker style */}
      {player.betAmount > 0 && (
        <motion.div
          className="absolute z-15"
          style={{ left: `${betOffset.x}px`, top: `${betOffset.y}px` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className={cn("flex items-center rounded-full",
            isMobile ? "gap-0.5 px-1 py-0.5" : "gap-1 px-2 py-0.5"
          )}
          style={{
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,200,0,0.4)'
          }}>
            <div className={cn("rounded-full", isMobile ? "w-2 h-2" : "w-3 h-3")} 
              style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)' }}/>
            <span className={cn("font-bold text-amber-400", isMobile ? "text-[8px]" : "text-[10px]")}>
              {(player.betAmount / 20).toFixed(1)} BB
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}, (prev, next) => {
  if (prev.player?.playerId !== next.player?.playerId) return false;
  if (prev.player?.stack !== next.player?.stack) return false;
  if (prev.player?.isFolded !== next.player?.isFolded) return false;
  if (prev.player?.isAllIn !== next.player?.isAllIn) return false;
  if (prev.player?.betAmount !== next.player?.betAmount) return false;
  if (prev.showCards !== next.showCards) return false;
  if (prev.isDealer !== next.isDealer) return false;
  if (prev.isCurrentTurn !== next.isCurrentTurn) return false;
  if (prev.turnTimeRemaining !== next.turnTimeRemaining) return false;
  if (prev.lastAction?.action !== next.lastAction?.action) return false;
  return true;
});

// ============= TABLE FELT - PPPoker Premium Octagon Style =============
const PPPokerTableFelt = memo(function PPPokerTableFelt() {
  // PPPoker-style octagonal table shape
  const octagonPath = "polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)";
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark outer background - space themed */}
      <div className="absolute inset-0" style={{ 
        background: 'radial-gradient(ellipse at 50% 30%, #1a2433 0%, #0f1419 40%, #0a0d12 100%)'
      }}/>
      
      {/* Subtle space glow effects */}
      <div className="absolute top-0 left-1/4 w-40 h-40 rounded-full opacity-20" 
        style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', filter: 'blur(40px)' }}/>
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full opacity-15" 
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(35px)' }}/>
      
      {/* Metallic outer rail - octagonal */}
      <div 
        className="absolute"
        style={{
          top: '8%',
          left: '3%',
          right: '3%',
          bottom: '25%',
          clipPath: octagonPath,
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 30%, #1a202c 70%, #2d3748 100%)',
          boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1), 0 10px 40px rgba(0,0,0,0.8)'
        }}
      />
      
      {/* Inner rail highlight */}
      <div 
        className="absolute"
        style={{
          top: '9%',
          left: '4%',
          right: '4%',
          bottom: '26%',
          clipPath: octagonPath,
          background: 'linear-gradient(180deg, #3a4049 0%, #252a31 50%, #1a1f26 100%)',
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
        }}
      />
      
      {/* Premium green felt - PPPoker signature octagon */}
      <div 
        className="absolute"
        style={{
          top: '10%',
          left: '5%',
          right: '5%',
          bottom: '27%',
          clipPath: octagonPath,
          background: 'radial-gradient(ellipse at 50% 40%, #1a6b3c 0%, #156b35 25%, #0f5a2a 50%, #0a4a22 75%, #083d1c 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), inset 0 -20px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Subtle felt texture */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            clipPath: octagonPath
          }}
        />
        
        {/* Inner border line */}
        <div 
          className="absolute"
          style={{
            top: '4%',
            left: '4%',
            right: '4%',
            bottom: '4%',
            clipPath: octagonPath,
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        />
        
        {/* Center watermark - NLH text like PPPoker */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/[0.04] font-black text-6xl tracking-widest select-none">
            NLH
          </div>
        </div>
        
        {/* Center Syndikate logo */}
        <div className="absolute inset-[30%] flex items-center justify-center pointer-events-none">
          <img src={syndikateLogo} alt="" className="w-full h-auto opacity-[0.08]"/>
        </div>
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS =============
const CommunityCards = memo(function CommunityCards({ 
  cards, 
  phase,
  isMobile = false 
}: { 
  cards: string[]; 
  phase: string;
  isMobile?: boolean;
}) {
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  const cardSize = isMobile ? 'sm' : 'md';

  return (
    <div className={cn("flex items-center justify-center", isMobile ? "gap-0.5" : "gap-1")}>
      {[0, 1, 2, 3, 4].map((idx) => (
        <div key={`card-slot-${idx}`}>
          {idx < visibleCount && cards[idx] ? (
            <PPPokerCard card={cards[idx]} size={cardSize} delay={idx}/>
          ) : (
            <div className={cn("rounded border border-white/10 bg-black/20",
              isMobile ? "w-9 h-[50px]" : "w-11 h-[62px]"
            )}/>
          )}
        </div>
      ))}
    </div>
  );
});

// ============= POT DISPLAY - PPPoker Style =============
const PotDisplay = memo(function PotDisplay({ pot, bigBlind, isMobile = false }: { pot: number; bigBlind: number; isMobile?: boolean; }) {
  if (pot <= 0) return null;
  const potBB = (pot / bigBlind).toFixed(1);

  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-1">
      {/* Chip stack */}
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("rounded-full", isMobile ? "w-2.5 h-2.5" : "w-3 h-3")}
            style={{ 
              background: `linear-gradient(135deg, ${['#fcd34d', '#ef4444', '#22c55e'][i]}, ${['#f59e0b', '#dc2626', '#16a34a'][i]})`,
              marginTop: `${i * -1.5}px`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}/>
        ))}
      </div>
      
      {/* Pot amount */}
      <div className={cn("rounded-full", isMobile ? "px-2 py-0.5" : "px-3 py-1")}
        style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,200,0,0.3)' }}
      >
        <span className={cn("font-bold text-amber-400", isMobile ? "text-[10px]" : "text-xs")}>
          Банк: {potBB} BB
        </span>
      </div>
    </motion.div>
  );
});

// ============= HERO CARDS - PPPoker Bottom Style =============
const HeroCards = memo(function HeroCards({ cards, isWinning = false, isMobile = false }: { cards: string[]; isWinning?: boolean; isMobile?: boolean; }) {
  if (!cards || cards.length === 0) return null;

  return (
    <motion.div 
      className="flex items-center gap-0.5"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {cards.map((card, idx) => (
        <PPPokerCard key={`hero-${card}-${idx}`} card={card} size={isMobile ? "md" : "lg"} delay={idx} isWinning={isWinning}/>
      ))}
    </motion.div>
  );
});

// ============= LEFT MENU - PPPoker Style =============
const LeftMenu = memo(function LeftMenu({
  isOpen,
  onClose,
  onLeave,
  soundEnabled,
  onSoundToggle,
  onSettingsClick,
  onViewClick,
  onRulesClick
}: {
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onSettingsClick: () => void;
  onViewClick: () => void;
  onRulesClick: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-56 z-50 bg-gradient-to-b from-[#1a1f26] to-[#0f1419] border-r border-white/10"
          >
            <div className="py-4">
              <MenuItem icon={Eye} label="Встать" onClick={() => {}}/>
              <MenuItem icon={Wallet} label="Пополнить" onClick={() => {}}/>
              <MenuItem icon={Settings2} label="Настройки" onClick={onSettingsClick}/>
              <MenuItem icon={Palette} label="Вид" hasNotification onClick={onViewClick}/>
              <MenuItem icon={Users} label="Стол полон" onClick={() => {}}/>
              <MenuItem icon={HelpCircle} label="Правила" onClick={onRulesClick}/>
              <div className="border-t border-white/10 my-2"/>
              <MenuItem icon={LogOut} label="Выход" danger onClick={onLeave}/>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

const MenuItem = memo(function MenuItem({
  icon: Icon, label, onClick, danger = false, hasNotification = false
}: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean; hasNotification?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-5 py-3.5 transition-colors",
      danger ? "text-red-400 hover:bg-red-500/10" : "text-white/90 hover:bg-white/5"
    )}>
      <Icon className="h-5 w-5" style={{ color: '#22c55e' }}/>
      <span className="font-medium text-sm">{label}</span>
      {hasNotification && <div className="w-2 h-2 rounded-full bg-red-500 ml-auto"/>}
    </button>
  );
});

// ============= EMOJI PANEL - PPPoker Style =============
const EmojiPanel = memo(function EmojiPanel({
  isOpen,
  onClose,
  onSendEmoji
}: {
  isOpen: boolean;
  onClose: () => void;
  onSendEmoji: (emoji: string) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="absolute bottom-16 right-3 w-48 p-2 rounded-xl bg-[#1a1f26]/95 backdrop-blur-md border border-white/10 shadow-xl z-30"
        >
          <div className="text-[10px] text-white/50 mb-1 px-1">Эмодзи</div>
          <div className="grid grid-cols-6 gap-1">
            {POKER_EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => { onSendEmoji(emoji); onClose(); }}
                className="w-7 h-7 flex items-center justify-center text-lg hover:bg-white/10 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============= PLAYER PROFILE MODAL - PPPoker Style =============
const PlayerProfileModal = memo(function PlayerProfileModal({
  player,
  onClose
}: {
  player: PokerPlayer | null;
  onClose: () => void;
}) {
  if (!player) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#1a1f26] to-[#0f1419] rounded-2xl overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <HelpCircle className="h-5 w-5 text-emerald-500"/>
          <span className="text-white font-bold">Профиль</span>
          <button onClick={onClose} className="text-emerald-500 hover:text-emerald-400">
            <X className="h-5 w-5"/>
          </button>
        </div>
        
        {/* Player info */}
        <div className="p-4 bg-gradient-to-r from-emerald-800/30 to-emerald-600/20">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/50">
              <img 
                src={resolveAvatarUrl(player.avatarUrl, player.playerId)} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-white font-bold text-lg">{player.name || 'Игрок'}</div>
              <div className="text-white/50 text-xs">ID: {player.playerId.slice(0, 8)}</div>
              <div className="text-emerald-400 text-xs mt-0.5">Lvl. 1</div>
            </div>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10">
          {[
            { label: 'VPIP', value: '0%' },
            { label: 'PFR', value: '0%' },
            { label: '3-Bet', value: '0%' },
            { label: 'C-Bet', value: '0%' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-white font-bold text-sm">{stat.value}</div>
              <div className="text-white/50 text-[10px]">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-4 gap-2 p-4">
          {[
            { label: 'Всего раздач', value: '0' },
            { label: 'Всего игр', value: '0' },
            { label: 'Победитель', value: '0' },
            { label: 'Рыба', value: '0' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-white font-bold text-sm">{stat.value}</div>
              <div className="text-white/40 text-[9px]">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
});

// ============= ACTION PANEL - PPPoker 3-Button Style =============
const ActionPanel = memo(function ActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  bigBlind,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  bigBlind: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaisePanel, setShowRaisePanel] = useState(false);

  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, callAmount * 2));
  }, [minRaise, callAmount]);

  if (!isVisible) return null;

  const callAmountBB = (callAmount / bigBlind).toFixed(1);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
    >
      {/* Raise panel */}
      <AnimatePresence>
        {showRaisePanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-3 mb-2 p-3 rounded-xl bg-[#1a1f26]/95 border border-white/10"
          >
            {/* Quick presets */}
            <div className="flex justify-center gap-2 mb-3">
              {[
                { label: '2x', mult: 2 },
                { label: '3x', mult: 3 },
                { label: '½ Pot', mult: pot / 2 / callAmount || 2 },
                { label: 'Pot', mult: pot / callAmount || 4 },
              ].map((preset, i) => {
                const amount = Math.min(Math.max(callAmount * preset.mult, minRaise), maxBet);
                return (
                  <button
                    key={i}
                    onClick={() => setRaiseAmount(Math.floor(amount))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      Math.abs(raiseAmount - amount) < 1 ? "bg-emerald-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            
            {/* Slider */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minRaise}
                max={maxBet}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
              />
              <div className="text-emerald-400 font-bold text-sm min-w-[60px] text-right">
                {(raiseAmount / bigBlind).toFixed(1)} BB
              </div>
            </div>
            
            {/* Confirm raise */}
            <button
              onClick={() => { onAction('raise', raiseAmount); setShowRaisePanel(false); }}
              className="w-full mt-3 py-3 bg-gradient-to-b from-amber-500 to-amber-600 text-white font-bold rounded-xl"
            >
              Рейз {(raiseAmount / bigBlind).toFixed(1)} BB
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main action buttons - PPPoker 3-button style */}
      <div className="flex gap-2 px-3 pb-safe pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', background: 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(0,0,0,0.7), transparent)' }}>
        {/* Fold */}
        <button
          onClick={() => onAction('fold')}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-b from-red-600 to-red-700 text-white shadow-lg active:scale-95 transition-transform"
        >
          Фолд
        </button>
        
        {/* Call / Check */}
        <button
          onClick={() => canCheck ? onAction('check') : onAction('call')}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-lg active:scale-95 transition-transform"
        >
          {canCheck ? 'Чек' : `Колл ${callAmountBB} BB`}
        </button>
        
        {/* Raise */}
        <button
          onClick={() => setShowRaisePanel(!showRaisePanel)}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg active:scale-95 transition-transform"
        >
          Рейз
        </button>
      </div>
    </motion.div>
  );
});

// ============= WINNER OVERLAY =============
const WinnerOverlay = memo(function WinnerOverlay({
  winners, onClose
}: { winners: Array<{ name?: string; amount: number; handRank?: string }>; onClose: () => void; }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
    const timer = setTimeout(onClose, 3000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onClose]);

  if (!winners.length) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="rounded-2xl p-6 text-center max-w-[280px]"
        style={{
          background: 'linear-gradient(180deg, #1a1f26 0%, #0f1419 100%)',
          border: '2px solid rgba(34,197,94,0.5)',
          boxShadow: '0 0 40px rgba(34,197,94,0.2)'
        }}
      >
        <div className="text-4xl mb-3">🏆</div>
        <div className="text-2xl font-black text-emerald-400 mb-2">ПОБЕДА</div>
        <div className="text-white font-bold text-lg mb-1">{winners[0].name || 'Игрок'}</div>
        <div className="text-3xl font-black text-emerald-400 mb-2">+{winners[0].amount.toLocaleString()}</div>
        {winners[0].handRank && (
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm mb-3">{winners[0].handRank}</div>
        )}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-white/50 text-xs">Следующая раздача</div>
          <motion.div key={countdown} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-2xl font-bold text-emerald-400 mt-1">
            {countdown}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ============= MAIN COMPONENT =============
interface SyndikatetPokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
  maxSeats?: 6 | 9;
}

export function SyndikatetPokerTable({
  tableId,
  playerId,
  buyIn,
  isTournament = false,
  tournamentId,
  onLeave,
  maxSeats = 6
}: SyndikatetPokerTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [playerActions, setPlayerActions] = useState<Record<string, { action: string; amount?: number }>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMyCards, setShowMyCards] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PokerPlayer | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const isTelegram = typeof window !== 'undefined' && 
        (window.location.pathname.includes('telegram') || 
         (window as any).Telegram?.WebApp || 
         document.documentElement.classList.contains('telegram-webapp'));
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTelegram || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sounds = usePokerSounds();
  const SEAT_POSITIONS = isMobile ? SEAT_POSITIONS_6MAX_MOBILE : SEAT_POSITIONS_6MAX_DESKTOP;

  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  
  const {
    isConnected, isConnecting, error, tableState, myCards, mySeat, myPlayer, isMyTurn, canCheck, callAmount, lastAction, showdownResult,
    connect, disconnect, fold, check, call, raise, allIn, clearShowdown, configureTable
  } = pokerTable;

  const reconnectManager = useReconnectManager({
    maxRetries: 5, baseDelay: 2000, maxDelay: 30000,
    onReconnect: connect,
    onMaxRetriesReached: () => console.log('[SyndikatetTable] Max retries')
  });

  const hasConnectedRef = useRef(false);
  
  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;
    const timeoutId = setTimeout(() => connect(), 100);
    return () => { clearTimeout(timeoutId); hasConnectedRef.current = false; disconnect(); reconnectManager.reset(); };
  }, [tableId, playerId]);

  useEffect(() => {
    if (isConnected) reconnectManager.markConnected();
    else if (!isConnecting && error) reconnectManager.markDisconnected(error);
  }, [isConnected, isConnecting, error]);

  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
      setTurnTimeRemaining(tableState?.actionTimer || 30);
      const interval = setInterval(() => setTurnTimeRemaining(prev => (prev === null || prev <= 0) ? null : prev - 1), 1000);
      return () => clearInterval(interval);
    } else { setTurnTimeRemaining(null); }
  }, [isMyTurn, tableState?.currentPlayerSeat]);

  useEffect(() => {
    if (lastAction?.playerId) {
      setPlayerActions(prev => ({ ...prev, [lastAction.playerId]: { action: lastAction.action, amount: lastAction.amount }}));
      setTimeout(() => setPlayerActions(prev => { const next = { ...prev }; delete next[lastAction.playerId]; return next; }), 2000);
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise': case 'bet': sounds.playRaise(); break;
        case 'allin': sounds.playAllIn(); break;
      }
    }
  }, [lastAction]);

  const handleAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => {
    switch (action) {
      case 'fold': fold(); break;
      case 'check': check(); break;
      case 'call': call(); break;
      case 'raise': raise(amount || 0); break;
      case 'allin': allIn(); break;
    }
  }, [fold, check, call, raise, allIn]);

  const handleLeave = useCallback(() => { disconnect(); onLeave(); }, [disconnect, onLeave]);

  const handleSettingsSave = useCallback((settings: Partial<TableSettings>) => {
    configureTable({
      smallBlindAmount: settings.smallBlind,
      bigBlindAmount: settings.bigBlind,
      anteAmount: settings.ante,
      actionTimer: settings.actionTimeSeconds,
      straddleEnabled: settings.straddleEnabled,
      runItTwiceEnabled: settings.runItTwiceEnabled,
      rakePercent: settings.rakePercent,
      rakeCap: settings.rakeCap,
    });
    setShowSettings(false);
  }, [configureTable]);

  const players = useMemo(() => {
    if (!tableState) return [];
    return SEAT_POSITIONS.map((pos, idx) => {
      const seatNumber = idx + 1;
      const player = tableState.players.find(p => p.seatNumber === seatNumber);
      return { position: pos, seatNumber, player };
    });
  }, [tableState?.players, SEAT_POSITIONS]);

  const bigBlind = tableState?.bigBlindAmount || 20;
  const smallBlind = tableState?.smallBlindAmount || 10;

  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0f1419]">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin"/>
        <p className="text-white/60 mt-4 text-sm">Подключение к столу...</p>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0f1419] p-6">
        <div className="text-6xl mb-4">😔</div>
        <p className="text-red-400 mb-4 text-center">{error}</p>
        <div className="flex gap-2">
          <Button onClick={connect} className="bg-emerald-500 hover:bg-emerald-600">Переподключиться</Button>
          <Button variant="outline" onClick={onLeave} className="border-white/20 text-white">Выйти</Button>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={connect} onGoHome={handleLeave}>
      <div 
        className="relative w-full overflow-hidden" 
        style={{ 
          height: isMobile ? 'calc(var(--vh, 1vh) * 100)' : '100dvh',
          minHeight: isMobile ? 'calc(var(--vh, 1vh) * 100)' : '100dvh',
          background: 'radial-gradient(ellipse at 50% 30%, #1a2433 0%, #0f1419 50%, #0a0d12 100%)'
        }}
      >
        <ConnectionStatusBanner status={reconnectManager.status} retryCount={reconnectManager.retryCount} nextRetryIn={reconnectManager.nextRetryIn} onReconnectNow={reconnectManager.reconnectNow} onCancel={reconnectManager.cancelReconnect}/>

        {/* Top bar - PPPoker style */}
        <div className={cn(
          "absolute left-0 right-0 z-30 flex items-center justify-between px-3",
          isMobile ? "top-0 pt-safe h-12" : "top-0 h-14"
        )}>
          {/* Left: Menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowMenu(true)}
            className={cn("rounded-full text-white hover:bg-white/10 relative", isMobile ? "h-9 w-9" : "h-10 w-10")}
          >
            <Menu className={isMobile ? "h-4 w-4" : "h-5 w-5"}/>
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/>
          </Button>
          
          {/* Center: Game type badge */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-full text-white font-bold",
              isMobile ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"
            )} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              NLH
            </div>
            <button className={cn(
              "rounded-full bg-white/10 flex items-center justify-center text-white",
              isMobile ? "w-7 h-7 text-base" : "w-8 h-8 text-lg"
            )}>+</button>
          </div>
          
          {/* Right: Stats */}
          <Button variant="ghost" size="icon" className={cn("rounded-full text-white hover:bg-white/10", isMobile ? "h-9 w-9" : "h-10 w-10")}>
            <BarChart2 className={isMobile ? "h-4 w-4" : "h-5 w-5"}/>
          </Button>
        </div>

        {/* Table area - fills most of screen */}
        <div 
          className="relative w-full"
          style={{ 
            height: isMobile ? 'calc((var(--vh, 1vh) * 100) - 120px)' : 'calc(100dvh - 100px)',
            marginTop: isMobile ? '48px' : '56px'
          }}
        >
          <PPPokerTableFelt/>

          {/* Pot */}
          {tableState && (
            <div className={cn("absolute left-1/2 -translate-x-1/2 z-10", isMobile ? "top-[18%]" : "top-[22%]")}>
              <PotDisplay pot={tableState.pot} bigBlind={bigBlind} isMobile={isMobile}/>
            </div>
          )}

          {/* Community cards */}
          {tableState && (
            <div className={cn("absolute left-1/2 -translate-x-1/2 z-10", isMobile ? "top-[32%]" : "top-[38%]")}>
              <CommunityCards cards={tableState.communityCards} phase={tableState.phase} isMobile={isMobile}/>
            </div>
          )}

          {/* Blinds info - PPPoker style */}
          {tableState && (
            <div className={cn("absolute left-1/2 -translate-x-1/2 z-10", isMobile ? "top-[46%]" : "top-[50%]")}>
              <div className="text-white/50 text-[9px] font-medium tracking-wide">
                Блайнды: {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()} {tableState.anteAmount ? `анте: ${tableState.anteAmount.toLocaleString()}` : ''}
              </div>
            </div>
          )}

          {/* Player seats */}
          {players.map(({ position, seatNumber, player }, idx) => (
            <PlayerSeat
              key={seatNumber}
              player={player || null}
              position={position}
              seatIndex={idx}
              isHero={player?.playerId === playerId}
              showCards={tableState?.phase === 'showdown'}
              isDealer={tableState?.dealerSeat === seatNumber}
              isSB={tableState?.smallBlindSeat === seatNumber}
              isBB={tableState?.bigBlindSeat === seatNumber}
              isCurrentTurn={tableState?.currentPlayerSeat === seatNumber}
              turnTimeRemaining={tableState?.currentPlayerSeat === seatNumber && player?.playerId === playerId ? turnTimeRemaining || undefined : undefined}
              turnDuration={tableState?.actionTimer || 30}
              lastAction={player ? playerActions[player.playerId] : null}
              isMobile={isMobile}
              onPlayerClick={setSelectedPlayer}
            />
          ))}

          {/* Winner overlay */}
          <AnimatePresence>
            {showdownResult && showdownResult.winners.length > 0 && (
              <WinnerOverlay winners={showdownResult.winners.map(w => ({ name: w.name, amount: w.amount, handRank: w.handRank }))} onClose={clearShowdown}/>
            )}
          </AnimatePresence>
        </div>

        {/* Hero cards - positioned above action panel */}
        {myCards && myCards.length > 0 && showMyCards && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{ bottom: isMobile ? '100px' : '120px' }}
          >
            <HeroCards cards={myCards} isWinning={tableState?.phase === 'showdown'} isMobile={isMobile}/>
          </div>
        )}

        {/* Side buttons - PPPoker style */}
        <div className="absolute left-3 z-25 flex flex-col gap-2" style={{ bottom: isMobile ? '100px' : '120px' }}>
          <button className={cn("rounded-full bg-black/60 flex items-center justify-center text-white", isMobile ? "w-9 h-9" : "w-10 h-10")} onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4"/> : <VolumeX className="h-4 w-4"/>}
          </button>
        </div>
        
        <div className="absolute right-3 z-25 flex flex-col gap-2" style={{ bottom: isMobile ? '100px' : '120px' }}>
          <button className={cn("rounded-full bg-black/60 flex items-center justify-center text-white", isMobile ? "w-9 h-9" : "w-10 h-10")} onClick={() => setShowEmoji(!showEmoji)}>
            <MessageSquare className="h-4 w-4"/>
          </button>
        </div>

        {/* Emoji panel */}
        <EmojiPanel isOpen={showEmoji} onClose={() => setShowEmoji(false)} onSendEmoji={(emoji) => console.log('Emoji:', emoji)}/>

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && tableState && (
            <ActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={tableState.currentBet * 2}
              maxBet={myPlayer?.stack || 0}
              pot={tableState.pot}
              bigBlind={bigBlind}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>

        {/* Left menu */}
        <LeftMenu
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          onLeave={handleLeave}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          onSettingsClick={() => { setShowMenu(false); setShowSettings(true); }}
          onViewClick={() => setShowMenu(false)}
          onRulesClick={() => setShowMenu(false)}
        />

        {/* Player profile modal */}
        <AnimatePresence>
          {selectedPlayer && (
            <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)}/>
          )}
        </AnimatePresence>

        {/* Settings panel */}
        <TableSettingsPanel
          isOpen={showSettings}
          settings={{
            smallBlind: tableState?.smallBlindAmount || 10,
            bigBlind: tableState?.bigBlindAmount || 20,
            actionTimeSeconds: tableState?.actionTimer || 15,
          }}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
          isHost={true}
        />
      </div>
    </PokerErrorBoundary>
  );
}

export default SyndikatetPokerTable;
