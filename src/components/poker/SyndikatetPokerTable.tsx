// ============================================
// SYNDIKATE POKER TABLE - Clean, Stable, Premium
// ============================================
// Built from scratch for maximum stability and Syndikate branding

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, MessageSquare, Users, Loader2, Settings2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';
import { useReconnectManager } from '@/hooks/useReconnectManager';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { resolveAvatarUrl } from '@/utils/avatarResolver';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// ============= CONSTANTS =============
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88 },  // Seat 1 - Hero (bottom center)
  { x: 8, y: 62 },   // Seat 2 - Left bottom
  { x: 8, y: 28 },   // Seat 3 - Left top
  { x: 50, y: 8 },   // Seat 4 - Top center
  { x: 92, y: 28 },  // Seat 5 - Right top
  { x: 92, y: 62 },  // Seat 6 - Right bottom
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

// ============= CARD COMPONENT =============
const SyndikatetCard = memo(function SyndikatetCard({
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
    xs: { w: 32, h: 44, rank: 'text-xs', suit: 'text-[8px]' },
    sm: { w: 40, h: 56, rank: 'text-sm', suit: 'text-xs' },
    md: { w: 48, h: 68, rank: 'text-base', suit: 'text-sm' },
    lg: { w: 60, h: 84, rank: 'text-xl', suit: 'text-base' },
  };
  
  const cfg = sizeConfig[size];
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1];
  const color = SUIT_COLORS[suit] || '#fff';
  const symbol = SUIT_SYMBOLS[suit] || '';

  // Card back - Syndikate industrial style
  if (faceDown) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded-md shadow-lg"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: 'linear-gradient(145deg, #1a1410 0%, #2d2520 50%, #1a1410 100%)',
          border: '2px solid rgba(255, 122, 0, 0.4)',
          boxShadow: isWinning 
            ? '0 0 15px rgba(34, 197, 94, 0.5)' 
            : '0 4px 12px rgba(0,0,0,0.5)'
        }}
      >
        {/* Syndikate pattern */}
        <div className="absolute inset-1 rounded flex items-center justify-center"
          style={{
            background: 'repeating-linear-gradient(45deg, rgba(255,122,0,0.05) 0px, rgba(255,122,0,0.05) 2px, transparent 2px, transparent 6px)'
          }}
        >
          <div className="text-lg font-black" style={{ color: 'rgba(255, 122, 0, 0.3)' }}>S</div>
        </div>
      </motion.div>
    );
  }

  // Card face
  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-md shadow-lg relative flex flex-col justify-between p-1"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
        border: isWinning ? '2px solid #22c55e' : '1px solid #ddd',
        boxShadow: isWinning 
          ? '0 0 20px rgba(34, 197, 94, 0.5)' 
          : '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      {/* Top left */}
      <div className="flex flex-col items-center leading-none">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color }}>{rank}</span>
        <span className={cfg.suit} style={{ color }}>{symbol}</span>
      </div>
      
      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl" style={{ color, opacity: 0.3 }}>{symbol}</span>
      </div>
    </motion.div>
  );
});

// ============= TIMER RING =============
const TimerRing = memo(function TimerRing({ 
  remaining, 
  total,
  size = 64
}: { 
  remaining: number; 
  total: number;
  size?: number;
}) {
  const progress = Math.max(0, Math.min(1, remaining / total));
  const circumference = 2 * Math.PI * (size / 2 - 3);
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = progress < 0.25;
  const isCritical = progress < 0.1;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle cx={size/2} cy={size/2} r={size/2 - 3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
      <circle
        cx={size/2} cy={size/2} r={size/2 - 3}
        fill="none"
        stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn("transition-all duration-500", isCritical && "animate-pulse")}
      />
    </svg>
  );
});

// ============= PLAYER SEAT =============
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
  lastAction
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
}) {
  const avatarSize = isHero ? 64 : 56;
  const showTurnTimer = isCurrentTurn && !player?.isFolded && !player?.isAllIn;
  
  // Calculate bet position towards center
  const betOffset = useMemo(() => {
    const cx = 50, cy = 45;
    const dx = cx - position.x, dy = cy - position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    return { x: (dx/dist) * 25, y: (dy/dist) * 25 };
  }, [position.x, position.y]);

  // Cards position based on seat
  const cardsPosition = useMemo(() => {
    if (position.x < 30) return 'right';
    if (position.x > 70) return 'left';
    if (position.y < 30) return 'below';
    return 'above';
  }, [position.x, position.y]);

  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="w-14 h-14 rounded-full cursor-pointer flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9))',
            border: '2px dashed hsl(var(--primary) / 0.3)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
          }}
        >
          <span className="text-2xl font-light" style={{ color: 'hsl(var(--primary) / 0.5)' }}>+</span>
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
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: seatIndex * 0.05 }}
    >
      {/* Action badge */}
      <AnimatePresence>
        {lastAction && (
          <motion.div 
            className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
          >
            <div className={cn(
              "px-3 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wide",
              lastAction.action === 'fold' && "bg-gray-700/90",
              lastAction.action === 'check' && "bg-blue-600/90",
              lastAction.action === 'call' && "bg-green-600/90",
              (lastAction.action === 'raise' || lastAction.action === 'bet') && "bg-amber-600/90",
              lastAction.action === 'allin' && "bg-red-600/90"
            )}>
              {lastAction.action === 'allin' ? 'ALL-IN' : lastAction.action.toUpperCase()}
              {lastAction.amount ? ` ${lastAction.amount}` : ''}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer ring */}
      {showTurnTimer && turnTimeRemaining !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <TimerRing remaining={turnTimeRemaining} total={turnDuration} size={avatarSize + 12}/>
        </div>
      )}

      {/* Avatar - Premium round Syndikate style */}
      <div 
        className={cn("relative rounded-full overflow-hidden transition-all duration-300", player.isFolded && "opacity-40 grayscale")}
        style={{
          width: avatarSize,
          height: avatarSize,
          border: isCurrentTurn && !player.isFolded
            ? '3px solid hsl(var(--primary))'
            : player.isAllIn
              ? '3px solid #ef4444'
              : '3px solid rgba(60,60,60,0.8)',
          boxShadow: isCurrentTurn && !player.isFolded
            ? '0 0 25px hsl(var(--primary) / 0.6), 0 0 50px hsl(var(--primary) / 0.3)'
            : player.isAllIn
              ? '0 0 20px rgba(239, 68, 68, 0.5)'
              : '0 5px 20px rgba(0,0,0,0.5)',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)'
        }}
      >
        <img 
          src={resolvedAvatarUrl}
          alt={player.name || 'Player'}
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          onError={(e) => { e.currentTarget.src = resolveAvatarUrl(null, player.playerId); }}
        />
        
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full">
            <span className="text-white/80 text-[10px] font-bold uppercase">Fold</span>
          </div>
        )}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 top-0 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            border: '2px solid #333'
          }}
        >
          <span className="text-[10px] font-black text-gray-900">D</span>
        </motion.div>
      )}

      {/* Player info plate */}
      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center px-3 py-1.5 rounded min-w-[75px]"
          style={{
            background: 'linear-gradient(180deg, rgba(25,25,25,0.95) 0%, rgba(15,15,15,0.98) 100%)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
            border: '1px solid hsl(var(--primary) / 0.15)'
          }}
        >
          <div className="text-white text-[10px] font-medium truncate max-w-[80px]">
            {isHero ? 'Вы' : (player.name || 'Игрок')}
          </div>
          <div 
            className={cn("text-[13px] font-bold", player.isAllIn && "animate-pulse")}
            style={{ color: player.isAllIn ? '#ef4444' : 'hsl(var(--primary))' }}
          >
            {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
          </div>
        </motion.div>
      </div>

      {/* SB/BB indicator */}
      {(isSB || isBB) && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -left-1 -bottom-0 w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center z-20"
          style={{
            background: isBB 
              ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {isBB ? 'BB' : 'SB'}
        </motion.div>
      )}

      {/* Player cards - opponents only (hero cards at bottom) */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && !isHero && (
        <div className={cn(
          "absolute flex gap-0.5 z-5",
          cardsPosition === 'right' && "left-full ml-2 top-1/2 -translate-y-1/2",
          cardsPosition === 'left' && "right-full mr-2 top-1/2 -translate-y-1/2",
          cardsPosition === 'above' && "-top-14 left-1/2 -translate-x-1/2",
          cardsPosition === 'below' && "top-full mt-12 left-1/2 -translate-x-1/2"
        )}>
          {player.holeCards.map((card, idx) => (
            <SyndikatetCard key={`${card}-${idx}`} card={card} faceDown={!showCards} size="xs" delay={idx} isWinning={showCards}/>
          ))}
        </div>
      )}

      {/* Current bet */}
      {player.betAmount > 0 && (
        <motion.div
          className="absolute z-15"
          style={{ left: `${betOffset.x}px`, top: `${betOffset.y}px` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div 
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))',
              border: '1px solid hsl(var(--primary) / 0.3)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}/>
            <span className="text-[12px] font-bold" style={{ color: 'hsl(var(--primary))' }}>
              {player.betAmount.toLocaleString()}
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
  if (prev.isSB !== next.isSB) return false;
  if (prev.isBB !== next.isBB) return false;
  if (prev.isCurrentTurn !== next.isCurrentTurn) return false;
  if (prev.turnTimeRemaining !== next.turnTimeRemaining) return false;
  if (prev.lastAction?.action !== next.lastAction?.action) return false;
  return true;
});

// ============= TABLE FELT - Syndikate Premium =============
const SyndikatetTableFelt = memo(function SyndikatetTableFelt() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Deep dark industrial background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a1410 0%, #0d0a08 50%, #1a1410 100%)' }}/>
      
      {/* Metallic rail with orange tint */}
      <div 
        className="absolute inset-[3%] rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #2d2520 0%, #1a1410 50%, #2d2520 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 10px 40px rgba(0,0,0,0.8), 0 0 60px hsl(var(--primary) / 0.1)'
        }}
      />
      
      {/* Premium felt - dark industrial orange-brown */}
      <div 
        className="absolute inset-[5%] rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #3d2a1a 0%, #2a1d12 30%, #1f150d 60%, #140d08 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 -20px 60px rgba(0,0,0,0.4), 0 15px 50px rgba(0,0,0,0.8), 0 0 80px hsl(var(--primary) / 0.15)'
        }}
      >
        {/* Texture overlay */}
        <div className="absolute inset-0 rounded-[50%] opacity-20"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
        />
        
        {/* Inner decorative line */}
        <div className="absolute inset-[8%] rounded-[50%] border border-primary/10"/>
        
        {/* Orange accent glow */}
        <div className="absolute inset-[8%] rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.08) 0%, transparent 50%)' }}/>
        
        {/* Center logo watermark */}
        <div className="absolute inset-[30%] rounded-[50%] flex items-center justify-center opacity-15">
          <img src={syndikateLogo} alt="" className="w-full h-auto"/>
        </div>
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS =============
const CommunityCards = memo(function CommunityCards({ cards, phase }: { cards: string[]; phase: string; }) {
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div key={`card-slot-${idx}`}>
          {idx < visibleCount && cards[idx] ? (
            <SyndikatetCard card={cards[idx]} size="md" delay={idx}/>
          ) : (
            <div className="w-12 h-[68px] rounded-md border border-white/10 bg-black/20" style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)' }}/>
          )}
        </div>
      ))}
    </div>
  );
});

// ============= POT DISPLAY =============
const PotDisplay = memo(function PotDisplay({ pot }: { pot: number }) {
  if (pot <= 0) return null;

  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
      {/* Chip stack visual */}
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${['#fbbf24', '#ef4444', '#22c55e'][i]} 0%, ${['#d97706', '#dc2626', '#16a34a'][i]} 100%)`, boxShadow: '0 2px 4px rgba(0,0,0,0.3)', marginTop: `${i * -2}px` }}/>
        ))}
      </div>
      
      {/* Pot label - Syndikate style */}
      <div 
        className="px-4 py-1.5 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
          border: '1px solid hsl(var(--primary) / 0.3)',
          boxShadow: '0 0 15px hsl(var(--primary) / 0.15)'
        }}
      >
        <span className="font-bold text-sm" style={{ color: 'hsl(var(--primary))' }}>
          POT: {pot.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
});

// ============= ACTION PANEL =============
const ActionPanel = memo(function ActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, callAmount * 2));
  }, [minRaise, callAmount]);

  if (!isVisible) return null;

  const presets = [
    { label: '½ Pot', amount: Math.floor(pot / 2) },
    { label: 'Pot', amount: pot },
    { label: '2x', amount: callAmount * 2 },
  ].filter(p => p.amount >= minRaise && p.amount <= maxBet);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 70%, transparent 100%)' }}
    >
      {/* Presets */}
      <div className="flex justify-center gap-1.5 mb-3">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(preset.amount)}
            className={cn(
              "h-7 text-[10px] px-2 border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/50",
              raiseAmount === preset.amount && "bg-primary/30 border-primary text-primary"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="mx-auto max-w-[280px] mb-3">
        <input
          type="range"
          min={minRaise}
          max={maxBet}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-secondary/50 cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                     [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
        />
        <div className="text-center text-primary font-bold text-lg mt-1">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Action buttons - Syndikate style */}
      <div className="flex justify-center gap-2">
        <Button onClick={() => onAction('fold')} className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95">
          Фолд
        </Button>

        {canCheck ? (
          <Button onClick={() => onAction('check')} className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95">
            Чек
          </Button>
        ) : (
          <Button onClick={() => onAction('call')} className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95">
            <div className="flex flex-col items-center leading-tight">
              <span>Колл</span>
              <span className="text-[9px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        <Button onClick={() => onAction('raise', raiseAmount)} className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95">
          <div className="flex flex-col items-center leading-tight">
            <span>Рейз</span>
            <span className="text-[9px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        <Button onClick={() => onAction('allin')} className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95">
          All-in
        </Button>
      </div>
    </motion.div>
  );
});

// ============= WINNER OVERLAY =============
const WinnerOverlay = memo(function WinnerOverlay({
  winners,
  onClose
}: {
  winners: Array<{ name?: string; amount: number; handRank?: string }>;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    const timer = setTimeout(onClose, 3000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onClose]);

  if (!winners.length) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="rounded-xl p-6 shadow-2xl text-center"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
          border: '2px solid hsl(var(--primary) / 0.6)',
          boxShadow: '0 0 40px hsl(var(--primary) / 0.3), 0 20px 60px rgba(0,0,0,0.8)'
        }}
      >
        <div className="text-4xl mb-3 font-black text-primary" style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.5)' }}>
          🏆 ПОБЕДА
        </div>
        <div className="text-foreground font-bold text-lg mb-1">{winners[0].name || 'Игрок'}</div>
        <div className="text-2xl font-black text-primary mb-2">+{winners[0].amount.toLocaleString()}</div>
        {winners[0].handRank && (
          <div className="text-muted-foreground text-sm mb-3 uppercase tracking-wider">{winners[0].handRank}</div>
        )}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="text-muted-foreground text-xs uppercase tracking-wider">Следующая раздача через</div>
          <motion.div key={countdown} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-2xl font-bold mt-1 text-primary">
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

  const sounds = usePokerSounds();
  const SEAT_POSITIONS = SEAT_POSITIONS_6MAX; // For now only 6-max

  // Poker table hook
  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  
  const {
    isConnected,
    isConnecting,
    error,
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    lastAction,
    showdownResult,
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    clearShowdown
  } = pokerTable;

  // Reconnection manager
  const reconnectManager = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    onReconnect: connect,
    onMaxRetriesReached: () => console.log('[SyndikatetTable] Max retries reached')
  });

  // Connect on mount
  useEffect(() => {
    connect();
    reconnectManager.markConnected();
    return () => {
      disconnect();
      reconnectManager.reset();
    };
  }, []);

  // Track connection status
  useEffect(() => {
    if (isConnected) reconnectManager.markConnected();
    else if (!isConnecting && error) reconnectManager.markDisconnected(error);
  }, [isConnected, isConnecting, error]);

  // Sound effects
  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  // Turn timer
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
      setTurnTimeRemaining(tableState?.actionTimer || 30);
      const interval = setInterval(() => {
        setTurnTimeRemaining(prev => (prev === null || prev <= 0) ? null : prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTurnTimeRemaining(null);
    }
  }, [isMyTurn, tableState?.currentPlayerSeat]);

  // Track actions for badges
  useEffect(() => {
    if (lastAction?.playerId) {
      setPlayerActions(prev => ({ ...prev, [lastAction.playerId]: { action: lastAction.action, amount: lastAction.amount }}));
      setTimeout(() => {
        setPlayerActions(prev => { const next = { ...prev }; delete next[lastAction.playerId]; return next; });
      }, 2000);
      
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise': case 'bet': sounds.playRaise(); break;
        case 'allin': sounds.playAllIn(); break;
      }
    }
  }, [lastAction]);

  // Handle actions
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

  // Memoized players
  const players = useMemo(() => {
    if (!tableState) return [];
    return SEAT_POSITIONS.map((pos, idx) => {
      const seatNumber = idx + 1;
      const player = tableState.players.find(p => p.seatNumber === seatNumber);
      return { position: pos, seatNumber, player };
    });
  }, [tableState?.players, SEAT_POSITIONS]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background rounded-2xl">
        <Loader2 className="h-10 w-10 text-primary animate-spin"/>
        <p className="text-muted-foreground mt-4">Подключение к столу...</p>
      </div>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background rounded-2xl p-6">
        <p className="text-destructive mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={connect}>Переподключиться</Button>
          <Button variant="outline" onClick={onLeave}>Выйти</Button>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={connect} onGoHome={handleLeave}>
      <div className="relative w-full min-h-[500px] bg-background rounded-2xl overflow-hidden">
        {/* Connection status */}
        <ConnectionStatusBanner
          status={reconnectManager.status}
          retryCount={reconnectManager.retryCount}
          nextRetryIn={reconnectManager.nextRetryIn}
          onReconnectNow={reconnectManager.reconnectNow}
          onCancel={reconnectManager.cancelReconnect}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="sm" onClick={handleLeave} className="h-8 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
            <ArrowLeft className="h-4 w-4 mr-1"/>Выйти
          </Button>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")}/>
            {tableState?.smallBlindAmount}/{tableState?.bigBlindAmount}
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              {soundEnabled ? <Volume2 className="h-4 w-4"/> : <VolumeX className="h-4 w-4"/>}
            </Button>
          </div>
        </div>

        {/* Table area */}
        <div className="relative w-full aspect-[4/3] max-h-[65vh]">
          <SyndikatetTableFelt/>

          {/* Pot */}
          {tableState && (
            <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
              <PotDisplay pot={tableState.pot}/>
            </div>
          )}

          {/* Blinds info */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 z-10">
              <div className="text-muted-foreground text-[10px]">
                Блайнды: {tableState.smallBlindAmount}/{tableState.bigBlindAmount}
              </div>
            </div>
          )}

          {/* Community cards */}
          {tableState && (
            <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards cards={tableState.communityCards} phase={tableState.phase}/>
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
            />
          ))}

          {/* Phase indicator */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
              <span className="px-3 py-1 rounded-full bg-black/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                {tableState.phase}
              </span>
            </div>
          )}

          {/* Waiting for players */}
          {tableState?.playersNeeded && tableState.playersNeeded > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="rounded-xl px-6 py-4 text-center bg-card border border-primary/30" style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
                <Users className="h-8 w-8 mx-auto mb-2 text-primary"/>
                <p className="text-foreground text-sm font-medium">Ожидание игроков</p>
                <p className="text-muted-foreground text-xs mt-1">Нужно ещё {tableState.playersNeeded} игрок(а)</p>
              </div>
            </div>
          )}

          {/* Hero cards at bottom */}
          {myPlayer && myPlayer.holeCards && myPlayer.holeCards.length > 0 && !myPlayer.isFolded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {myPlayer.holeCards.map((card, idx) => (
                <SyndikatetCard key={`hero-${idx}-${card}`} card={card} size="lg" delay={idx}/>
              ))}
            </div>
          )}
        </div>

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && tableState && tableState.phase !== 'waiting' && myPlayer && (
            <ActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={tableState.minRaise || tableState.bigBlindAmount || 40}
              maxBet={myPlayer.stack}
              pot={tableState.pot}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>

        {/* Winner overlay */}
        <AnimatePresence>
          {showdownResult && showdownResult.winners.length > 0 && (
            <WinnerOverlay
              winners={showdownResult.winners.map(w => ({ name: w.name, amount: w.amount, handRank: w.handRank }))}
              onClose={clearShowdown}
            />
          )}
        </AnimatePresence>
      </div>
    </PokerErrorBoundary>
  );
}

export default SyndikatetPokerTable;
