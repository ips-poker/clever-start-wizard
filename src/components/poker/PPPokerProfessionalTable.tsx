import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Users, Loader2, Clock, Sparkles, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Hooks
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';
import { useReconnectManager } from '@/hooks/useReconnectManager';
import { usePokerSounds } from '@/hooks/usePokerSounds';

// Error boundary and connection banner
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

// Stable optimized components - Syndikate style
import { StablePokerCard } from './stable/StablePokerCard';
import { StableChipStack } from './stable/StableChipStack';
import { StableActionPanel } from './stable/StableActionPanel';

// Chat, Emoji and Settings components
import { TableChat } from './TableChat';
import { TableReactions, QuickReactionButton, useTableReactions, ReactionType } from './TableEmojis';
import { TableSettingsPanel, TableSettings } from './TableSettingsPanel';

// Avatar resolver utility
import { resolveAvatarUrl } from '@/utils/avatarResolver';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// PPPoker-style seat positions (6-max optimized for mobile)
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88, angle: 0 },     // Seat 1 (bottom center - hero)
  { x: 8, y: 62, angle: 45 },     // Seat 2 (left bottom)
  { x: 8, y: 28, angle: 90 },     // Seat 3 (left top)
  { x: 50, y: 8, angle: 180 },    // Seat 4 (top center)
  { x: 92, y: 28, angle: 270 },   // Seat 5 (right top)
  { x: 92, y: 62, angle: 315 },   // Seat 6 (right bottom)
];

// 9-max positions
const SEAT_POSITIONS_9MAX = [
  { x: 50, y: 92 },    // 1 - hero bottom
  { x: 15, y: 78 },    // 2
  { x: 3, y: 50 },     // 3
  { x: 15, y: 22 },    // 4
  { x: 35, y: 8 },     // 5
  { x: 65, y: 8 },     // 6
  { x: 85, y: 22 },    // 7
  { x: 97, y: 50 },    // 8
  { x: 85, y: 78 },    // 9
];

// ============= SYNDIKATE CARD - uses stable component =============
const SyndikatePPCard = memo(function SyndikatePPCard({
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
  const sizeMap = { xs: 'xs', sm: 'sm', md: 'md', lg: 'lg' } as const;
  return (
    <StablePokerCard 
      card={card} 
      faceDown={faceDown} 
      size={sizeMap[size]} 
      dealDelay={delay}
      isWinning={isWinning}
    />
  );
});
// ============= CHIP DISPLAY =============
const ChipDisplay = memo(function ChipDisplay({ 
  amount, 
  size = 'md' 
}: { 
  amount: number; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const formatAmount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        sizeClasses[size],
        "bg-black/70 rounded-full text-amber-400 font-bold",
        "flex items-center gap-1"
      )}
    >
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      {formatAmount(amount)}
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
      style={{ 
        left: '50%', 
        top: '50%', 
        transform: 'translate(-50%, -50%) rotate(-90deg)' 
      }}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 3}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2.5"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 3}
        fill="none"
        stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn(
          "transition-all duration-500",
          isCritical && "animate-pulse"
        )}
      />
    </svg>
  );
});

// ============= ACTION BADGE =============
const ActionBadge = memo(function ActionBadge({ 
  action, 
  amount 
}: { 
  action: string; 
  amount?: number 
}) {
  const actionConfig: Record<string, { bg: string; text: string }> = {
    fold: { bg: 'bg-gray-600', text: 'Fold' },
    check: { bg: 'bg-blue-600', text: 'Check' },
    call: { bg: 'bg-green-600', text: amount ? `Call ${amount}` : 'Call' },
    bet: { bg: 'bg-amber-600', text: amount ? `Bet ${amount}` : 'Bet' },
    raise: { bg: 'bg-orange-600', text: amount ? `Raise ${amount}` : 'Raise' },
    allin: { bg: 'bg-red-600', text: 'All-In' },
  };

  const config = actionConfig[action.toLowerCase()] || { bg: 'bg-gray-500', text: action };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      className={cn(
        config.bg,
        "px-2 py-0.5 rounded-full text-white text-[9px] font-bold uppercase",
        "shadow-lg"
      )}
    >
      {config.text}
    </motion.div>
  );
});

// ============= SYNDIKATE PLAYER SEAT (Premium Round Avatars) =============
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
  // Calculate bet position - BETWEEN player and table center
  const getBetPosition = useMemo(() => {
    const centerX = 50;
    const centerY = 45;
    const dirX = centerX - position.x;
    const dirY = centerY - position.y;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY);
    const scale = 0.35;
    return {
      x: dirX / dist * 35 * scale,
      y: dirY / dist * 35 * scale
    };
  }, [position.x, position.y]);

  // Get cards position based on seat
  const getCardsPosition = useMemo(() => {
    if (position.x < 30) return 'right';
    if (position.x > 70) return 'left';
    if (position.y < 30) return 'below';
    return 'above';
  }, [position.x, position.y]);

  // Empty seat - Syndikate industrial style
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full cursor-pointer flex items-center justify-center
                     transition-all duration-300"
          style={{
            background: 'linear-gradient(145deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9))',
            border: '2px dashed rgba(255, 122, 0, 0.3)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
          }}
        >
          <span className="text-2xl font-light" style={{ color: 'rgba(255, 122, 0, 0.5)' }}>+</span>
        </motion.div>
      </div>
    );
  }

  const avatarSize = isHero ? 64 : 56;
  const showTurnTimer = isCurrentTurn && !player.isFolded && !player.isAllIn;
  
  // Resolve avatar URL (supports Telegram URLs)
  const resolvedAvatarUrl = resolveAvatarUrl(player.avatarUrl, player.playerId);

  return (
    <motion.div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2",
        isHero ? "z-20" : "z-10"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: seatIndex * 0.05 }}
    >
      {/* Action badge - above avatar */}
      <AnimatePresence>
        {lastAction && (
          <motion.div 
            className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
          >
            <div 
              className={cn(
                "px-3 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wide",
                lastAction.action === 'fold' && "bg-gray-700/90",
                lastAction.action === 'check' && "bg-blue-600/90",
                lastAction.action === 'call' && "bg-green-600/90",
                (lastAction.action === 'raise' || lastAction.action === 'bet') && "bg-amber-600/90",
                lastAction.action === 'allin' && "bg-red-600/90"
              )}
              style={{
                boxShadow: lastAction.action === 'allin' 
                  ? '0 0 15px rgba(239, 68, 68, 0.5)' 
                  : '0 4px 15px rgba(0,0,0,0.5)'
              }}
            >
              {lastAction.action === 'fold' ? 'FOLD' :
               lastAction.action === 'check' ? 'CHECK' :
               lastAction.action === 'call' ? 'CALL' :
               lastAction.action === 'allin' ? 'ALL-IN' :
               `${lastAction.action.toUpperCase()} ${lastAction.amount || ''}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn timer ring - around avatar */}
      {showTurnTimer && turnTimeRemaining !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <TimerRing 
            remaining={turnTimeRemaining} 
            total={turnDuration} 
            size={avatarSize + 12}
          />
        </div>
      )}

      {/* Avatar container - Premium Syndikate round style */}
      <div 
        className={cn(
          "relative rounded-full overflow-hidden transition-all duration-300",
          player.isFolded && "opacity-40 grayscale"
        )}
        style={{
          width: avatarSize,
          height: avatarSize,
          border: isCurrentTurn && !player.isFolded
            ? '3px solid hsl(var(--primary))'
            : player.isAllIn
              ? '3px solid #ef4444'
              : '3px solid rgba(60,60,60,0.8)',
          boxShadow: isCurrentTurn && !player.isFolded
            ? '0 0 25px rgba(255, 122, 0, 0.6), 0 0 50px rgba(255, 122, 0, 0.3)'
            : player.isAllIn
              ? '0 0 20px rgba(239, 68, 68, 0.5)'
              : '0 5px 20px rgba(0,0,0,0.5)',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)'
        }}
      >
        {/* Avatar image - круглая */}
        <img 
          src={resolvedAvatarUrl}
          alt={player.name || 'Player'}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: '50%' }}
          onError={(e) => {
            // Fallback to default avatar on error
            e.currentTarget.src = resolveAvatarUrl(null, player.playerId);
          }}
        />
        
        {/* Fold overlay */}
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full">
            <span className="text-white/80 text-[10px] font-bold uppercase">Fold</span>
          </div>
        )}

        {/* Winner glow effect */}
        {!player.isFolded && showCards && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle, rgba(255, 122, 0, 0.3) 0%, transparent 70%)'
            }}
          />
        )}
      </div>

      {/* Dealer button - Syndikate style */}
      {isDealer && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 top-0 w-6 h-6 rounded-full 
                     flex items-center justify-center z-20"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '2px solid #333'
          }}
        >
          <span className="text-[10px] font-black text-gray-900">D</span>
        </motion.div>
      )}

      {/* Player info plate - Syndikate industrial */}
      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center px-3 py-1.5 rounded min-w-[75px]"
          style={{
            background: 'linear-gradient(180deg, rgba(25,25,25,0.95) 0%, rgba(15,15,15,0.98) 100%)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            border: '1px solid rgba(255, 122, 0, 0.15)'
          }}
        >
          {/* Name */}
          <div className="text-white text-[10px] font-medium truncate max-w-[80px]">
            {isHero ? 'Вы' : (player.name || 'Игрок')}
          </div>
          {/* Stack */}
          <div 
            className={cn(
              "text-[13px] font-bold",
              player.isAllIn && "animate-pulse"
            )}
            style={{ 
              color: player.isAllIn ? '#ef4444' : '#FF7A00',
              textShadow: player.isAllIn ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
            }}
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
          className={cn(
            "absolute -left-1 -bottom-0 w-5 h-5 rounded-full text-white text-[8px] font-bold",
            "flex items-center justify-center z-20"
          )}
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

      {/* Player cards - for opponents only (hero cards shown at bottom) */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && !isHero && (
        <div className={cn(
          "absolute flex gap-0.5 z-5",
          getCardsPosition === 'right' && "left-full ml-2 top-1/2 -translate-y-1/2",
          getCardsPosition === 'left' && "right-full mr-2 top-1/2 -translate-y-1/2",
          getCardsPosition === 'above' && "-top-14 left-1/2 -translate-x-1/2",
          getCardsPosition === 'below' && "top-full mt-12 left-1/2 -translate-x-1/2"
        )}>
          {player.holeCards.map((card, idx) => (
            <SyndikatePPCard
              key={`${card}-${idx}`}
              card={card}
              faceDown={!showCards}
              size="xs"
              delay={idx}
              isWinning={showCards}
            />
          ))}
        </div>
      )}

      {/* Current bet - positioned BETWEEN player and center */}
      {player.betAmount > 0 && (
        <motion.div
          className="absolute z-15"
          style={{
            left: `${getBetPosition.x}px`,
            top: `${getBetPosition.y}px`
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div 
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))',
              border: '1px solid rgba(255, 122, 0, 0.3)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            <div 
              className="w-3.5 h-3.5 rounded-full" 
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
            />
            <span className="text-[12px] font-bold" style={{ color: '#FF7A00' }}>
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
  if (prev.player?.avatarUrl !== next.player?.avatarUrl) return false;
  if (prev.showCards !== next.showCards) return false;
  if (prev.isDealer !== next.isDealer) return false;
  if (prev.isSB !== next.isSB) return false;
  if (prev.isBB !== next.isBB) return false;
  if (prev.isCurrentTurn !== next.isCurrentTurn) return false;
  if (prev.turnTimeRemaining !== next.turnTimeRemaining) return false;
  if (prev.lastAction?.action !== next.lastAction?.action) return false;
  
  const prevCards = prev.player?.holeCards || [];
  const nextCards = next.player?.holeCards || [];
  if (prevCards.length !== nextCards.length) return false;
  for (let i = 0; i < prevCards.length; i++) {
    if (prevCards[i] !== nextCards[i]) return false;
  }
  
  return true;
});

// ============= SYNDIKATE ORANGE INDUSTRIAL TABLE FELT =============
const SyndikatetTableFelt = memo(function SyndikatetTableFelt() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Dark industrial background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a1410 0%, #0d0a08 50%, #1a1410 100%)'
        }}
      />
      
      {/* Metallic rail - dark with orange tint */}
      <div 
        className="absolute inset-[3%] rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #2d2520 0%, #1a1410 50%, #2d2520 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 10px 40px rgba(0,0,0,0.8), 0 0 60px rgba(249,115,22,0.1)'
        }}
      />
      
      {/* Table felt - Syndikate dark orange-brown industrial */}
      <div 
        className="absolute inset-[5%] rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #3d2a1a 0%, #2a1d12 30%, #1f150d 60%, #140d08 100%)',
          boxShadow: `
            inset 0 0 60px rgba(0,0,0,0.5),
            inset 0 -20px 60px rgba(0,0,0,0.4),
            0 15px 50px rgba(0,0,0,0.8),
            0 0 80px rgba(249,115,22,0.15)
          `
        }}
      >
        {/* Industrial texture overlay */}
        <div 
          className="absolute inset-0 rounded-[50%] opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Inner orange decorative line */}
        <div 
          className="absolute inset-[8%] rounded-[50%] border border-orange-500/10"
        />
        
        {/* Orange accent glow */}
        <div className="absolute inset-[8%] rounded-[50%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 50%)'
          }}
        />
        
        {/* Center logo watermark */}
        <div className="absolute inset-[30%] rounded-[50%] flex items-center justify-center opacity-15">
          <img src={syndikateLogo} alt="" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS (Optimized - no JSON.stringify) =============
const CommunityCards = memo(function CommunityCards({
  cards,
  phase
}: {
  cards: string[];
  phase: string;
}) {
  const visibleCount = useMemo(() => {
    switch (phase) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  }, [phase]);

  // Memoize the rendered cards to prevent re-renders
  const renderedCards = useMemo(() => {
    return [0, 1, 2, 3, 4].map((idx) => {
      const card = cards[idx];
      const isVisible = idx < visibleCount;

      return (
        <div key={`card-slot-${idx}`} className="relative">
          {isVisible && card ? (
            <SyndikatePPCard card={card} size="md" delay={idx} />
          ) : (
            <div 
              className="w-11 h-16 rounded-md border border-white/10 bg-black/20"
              style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)' }}
            />
          )}
        </div>
      );
    });
  }, [cards, visibleCount]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {renderedCards}
    </div>
  );
}, (prev, next) => {
  // Custom equality check - avoid JSON.stringify
  if (prev.phase !== next.phase) return false;
  if (prev.cards.length !== next.cards.length) return false;
  for (let i = 0; i < prev.cards.length; i++) {
    if (prev.cards[i] !== next.cards[i]) return false;
  }
  return true;
});

// ============= SYNDIKATE POT DISPLAY =============
const SyndikatePotDisplay = memo(function SyndikatePotDisplay({ pot }: { pot: number }) {
  if (pot <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Use StableChipStack for visual */}
      <StableChipStack amount={pot} size="md" />
      
      {/* Syndikate-style pot label */}
      <div 
        className="px-4 py-1.5 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
          border: '1px solid rgba(255, 122, 0, 0.3)',
          boxShadow: '0 0 15px rgba(255, 122, 0, 0.15)'
        }}
      >
        <span 
          className="font-bold text-sm"
          style={{ color: '#FF7A00' }}
        >
          POT: {pot.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
});

// ============= ACTION PANEL (PPPoker Style) =============
const PPPokerActionPanel = memo(function PPPokerActionPanel({
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
    { label: '3x', amount: callAmount * 3 },
  ].filter(p => p.amount >= minRaise && p.amount <= maxBet);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-gray-950 via-gray-900/98 to-transparent"
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
              "h-7 text-[10px] px-2 border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
              raiseAmount === preset.amount && "bg-amber-600/30 border-amber-500 text-amber-400"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="mx-auto max-w-[280px] mb-3">
        <div className="relative">
          <input
            type="range"
            min={minRaise}
            max={maxBet}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
        </div>
        <div className="text-center text-amber-400 font-bold text-lg mt-1">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        {/* Fold */}
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-red-600 to-red-700 
                     hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          Фолд
        </Button>

        {/* Check/Call */}
        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-blue-600 to-blue-700 
                       hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl
                       shadow-lg active:scale-95 transition-transform"
          >
            Чек
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-green-600 to-green-700 
                       hover:from-green-500 hover:to-green-600 text-white font-bold text-xs rounded-xl
                       shadow-lg active:scale-95 transition-transform"
          >
            <div className="flex flex-col items-center leading-tight">
              <span>Колл</span>
              <span className="text-[9px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        {/* Raise */}
        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-amber-600 to-amber-700 
                     hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          <div className="flex flex-col items-center leading-tight">
            <span>Рейз</span>
            <span className="text-[9px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        {/* All-in */}
        <Button
          onClick={() => onAction('allin')}
          className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-purple-600 to-purple-700 
                     hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          All-in
        </Button>
      </div>
    </motion.div>
  );
});

// ============= WINNER OVERLAY - Syndikate Style =============
const WinnerOverlay = memo(function WinnerOverlay({
  winners,
  onClose
}: {
  winners: Array<{ name?: string; amount: number; handRank?: string }>;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown for next hand
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-close after 3 seconds
    const timer = setTimeout(onClose, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onClose]);

  if (!winners.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="rounded-xl p-6 shadow-2xl text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.99) 100%)',
          border: '2px solid rgba(255, 122, 0, 0.6)',
          boxShadow: '0 0 40px rgba(255, 122, 0, 0.3), 0 20px 60px rgba(0,0,0,0.8)'
        }}
      >
        <div 
          className="text-4xl mb-3 font-black"
          style={{ color: '#FF7A00', textShadow: '0 0 20px rgba(255,122,0,0.5)' }}
        >
          🏆 ПОБЕДА
        </div>
        <div className="text-white font-bold text-lg mb-1">
          {winners[0].name || 'Игрок'}
        </div>
        <div 
          className="text-2xl font-black mb-2"
          style={{ color: '#FF7A00' }}
        >
          +{winners[0].amount.toLocaleString()}
        </div>
        {winners[0].handRank && (
          <div className="text-white/70 text-sm mb-3 uppercase tracking-wider">
            {winners[0].handRank}
          </div>
        )}
        
        {/* Next hand countdown */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-white/50 text-xs uppercase tracking-wider">
            Следующая раздача через
          </div>
          <motion.div 
            key={countdown}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold mt-1"
            style={{ color: '#FF7A00' }}
          >
            {countdown}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ============= MAIN COMPONENT =============
interface PPPokerProfessionalTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
  maxSeats?: 6 | 9;
}

export function PPPokerProfessionalTable({
  tableId,
  playerId,
  buyIn,
  isTournament = false,
  tournamentId,
  onLeave,
  maxSeats = 6
}: PPPokerProfessionalTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [playerActions, setPlayerActions] = useState<Record<string, { action: string; amount?: number }>>({});
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [tableSettings, setTableSettings] = useState<Partial<TableSettings>>({
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    actionTimeSeconds: 15,
    timeBankSeconds: 30,
    chatEnabled: true,
    bombPotEnabled: false,
    autoStartEnabled: true
  });

  const sounds = usePokerSounds();
  const SEAT_POSITIONS = maxSeats === 6 ? SEAT_POSITIONS_6MAX : SEAT_POSITIONS_9MAX;

  // Emoji reactions hook
  const { reactions, addReaction, removeReaction } = useTableReactions();

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
    chatMessages,
    chatEnabled,
    chatSlowMode,
    chatSlowModeInterval,
    bombPotEnabled,
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    clearShowdown,
    sendChat,
    triggerBombPot,
    mutePlayer
  } = pokerTable;

  // Reconnection manager
  const reconnectManager = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    onReconnect: connect,
    onMaxRetriesReached: () => console.log('[PPPokerTable] Max retries reached')
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
    if (isConnected) {
      reconnectManager.markConnected();
    } else if (!isConnecting && error) {
      reconnectManager.markDisconnected(error);
    }
  }, [isConnected, isConnecting, error]);

  // Sound effects
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Turn sound and timer
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
      setTurnTimeRemaining(tableState?.actionTimer || 30);
      
      const interval = setInterval(() => {
        setTurnTimeRemaining(prev => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setTurnTimeRemaining(null);
    }
  }, [isMyTurn, tableState?.currentPlayerSeat]);

  // Track last actions for badges
  useEffect(() => {
    if (lastAction && lastAction.playerId) {
      setPlayerActions(prev => ({
        ...prev,
        [lastAction.playerId]: { 
          action: lastAction.action, 
          amount: lastAction.amount 
        }
      }));
      
      // Clear action after 2s
      setTimeout(() => {
        setPlayerActions(prev => {
          const next = { ...prev };
          delete next[lastAction.playerId];
          return next;
        });
      }, 2000);
      
      // Play sound
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise':
        case 'bet': sounds.playRaise(); break;
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

  const handleLeave = useCallback(() => {
    disconnect();
    onLeave();
  }, [disconnect, onLeave]);

  // Memoized players array
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
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-2xl">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-white/60 mt-4">Подключение к столу...</p>
      </div>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-2xl p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={connect}>Переподключиться</Button>
          <Button variant="outline" onClick={onLeave}>Выйти</Button>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={connect} onGoHome={handleLeave}>
      <div className="relative w-full min-h-[500px] bg-gray-950 rounded-2xl overflow-hidden">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="h-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Выйти
          </Button>
          
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
            {tableState?.smallBlindAmount}/{tableState?.bigBlindAmount}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Emoji reactions button */}
            <QuickReactionButton
              onReact={(type: ReactionType) => {
                if (mySeat && myPlayer) {
                  addReaction(playerId, myPlayer.name, mySeat, type);
                }
              }}
              disabled={!isConnected}
            />
            
            {/* Chat toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "h-8 w-8 text-white/70 hover:text-white hover:bg-white/10",
                showChat && "text-orange-400"
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            {/* Sound toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            {/* Settings toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table area */}
        <div className="relative w-full aspect-[4/3] max-h-[65vh]">
          <SyndikatetTableFelt />

          {/* Pot */}
          {tableState && (
            <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
              <SyndikatePotDisplay pot={tableState.pot} />
            </div>
          )}

          {/* Blinds info */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 z-10">
              <div className="text-white/50 text-[10px]">
                Блайнды: {tableState.smallBlindAmount}/{tableState.bigBlindAmount}
              </div>
            </div>
          )}

          {/* Community cards */}
          {tableState && (
            <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards cards={tableState.communityCards} phase={tableState.phase} />
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
              turnTimeRemaining={
                tableState?.currentPlayerSeat === seatNumber && player?.playerId === playerId
                  ? turnTimeRemaining || undefined
                  : undefined
              }
              turnDuration={tableState?.actionTimer || 30}
              lastAction={player ? playerActions[player.playerId] : null}
            />
          ))}

          {/* Phase indicator */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white/70 text-[10px] uppercase tracking-wider">
                {tableState.phase}
              </span>
            </div>
          )}

          {/* Waiting for players */}
          {tableState?.playersNeeded && tableState.playersNeeded > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div 
                className="rounded-xl px-6 py-4 text-center"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(26,26,26,0.95) 100%)',
                  border: '1px solid rgba(255, 122, 0, 0.3)',
                  boxShadow: '0 0 30px rgba(0,0,0,0.8)'
                }}
              >
                <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#FF7A00' }} />
                <p className="text-white text-sm font-medium">
                  Ожидание игроков
                </p>
                <p className="text-white/60 text-xs mt-1">
                  Нужно ещё {tableState.playersNeeded} игрок(а)
                </p>
              </div>
            </div>
          )}

          {/* Auto-start countdown - PPPoker style */}
          {tableState?.phase === 'waiting' && tableState?.gameStartingCountdown && tableState.gameStartingCountdown > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-xl px-8 py-6 text-center"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(26,26,26,0.98) 100%)',
                  border: '2px solid rgba(255, 122, 0, 0.5)',
                  boxShadow: '0 0 40px rgba(255, 122, 0, 0.3), 0 0 80px rgba(0,0,0,0.9)'
                }}
              >
                <div 
                  className="text-5xl font-black mb-2"
                  style={{ 
                    color: '#FF7A00',
                    textShadow: '0 0 20px rgba(255, 122, 0, 0.5)'
                  }}
                >
                  <motion.span
                    key={tableState.gameStartingCountdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {tableState.gameStartingCountdown}
                  </motion.span>
                </div>
                <p className="text-white text-sm font-medium uppercase tracking-wider">
                  Раздача начнётся
                </p>
              </motion.div>
            </div>
          )}

          {/* Hero cards display at bottom - large cards for hero */}
          {myPlayer && myPlayer.holeCards && myPlayer.holeCards.length > 0 && !myPlayer.isFolded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {myPlayer.holeCards.map((card, idx) => (
                <SyndikatePPCard
                  key={`hero-${idx}-${card}`}
                  card={card}
                  size="lg"
                  delay={idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Syndikate Action panel */}
        <AnimatePresence>
          {isMyTurn && tableState && tableState.phase !== 'waiting' && myPlayer && (
            <StableActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={tableState.minRaise || tableState.bigBlindAmount || 40}
              maxBet={myPlayer.stack}
              currentPot={tableState.pot}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>

        {/* Winner overlay */}
        <AnimatePresence>
          {showdownResult && showdownResult.winners.length > 0 && (
            <WinnerOverlay
              winners={showdownResult.winners.map(w => ({
                name: w.name,
                amount: w.amount,
                handRank: w.handRank
              }))}
              onClose={clearShowdown}
            />
          )}
        </AnimatePresence>

        {/* Emoji reactions display */}
        <TableReactions
          reactions={reactions}
          seatPositions={SEAT_POSITIONS.map(p => ({ x: p.x, y: p.y }))}
          onReactionComplete={removeReaction}
        />

        {/* Table Chat */}
        {showChat && (
          <TableChat
            messages={chatMessages.map(m => ({
              id: m.id || `${m.playerId}-${m.timestamp}`,
              playerId: m.playerId,
              playerName: m.playerName || 'Игрок',
              message: m.text || m.message || '',
              timestamp: m.timestamp,
              type: m.type || 'chat',
              isModerated: m.isModerated
            }))}
            onSendMessage={sendChat}
            onMutePlayer={(pid, mute) => {
              mutePlayer(pid, mute);
              setMutedPlayers(prev => {
                const next = new Set(prev);
                if (mute) next.add(pid);
                else next.delete(pid);
                return next;
              });
            }}
            onTriggerBombPot={bombPotEnabled ? triggerBombPot : undefined}
            mutedPlayers={mutedPlayers}
            isChatEnabled={chatEnabled}
            isSlowMode={chatSlowMode}
            slowModeInterval={chatSlowModeInterval}
            currentPlayerId={playerId}
            bombPotEnabled={bombPotEnabled}
          />
        )}

        {/* Table Settings Panel */}
        <TableSettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={tableSettings}
          onSave={(newSettings) => setTableSettings(prev => ({ ...prev, ...newSettings }))}
          isHost={true}
        />
      </div>
    </PokerErrorBoundary>
  );
}

export default PPPokerProfessionalTable;
