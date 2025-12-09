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
import { useNodePokerTable, PokerPlayer, TableState } from '@/hooks/useNodePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { TableSettingsPanel, TableSettings } from './TableSettingsPanel';
import { resolveAvatarUrl } from '@/utils/avatarResolver';

// PPPoker-style components
import { PPPokerTimerRing, PPPokerTimerBadge } from './PPPokerTimerRing';
import { PPPokerChips3D, PPPokerBetDisplay, PPPokerPotDisplay } from './PPPokerChips3D';
import { PPPokerDealerButton, PPPokerBlindButton } from './PPPokerDealerButton';
import { PPPokerTournamentInfo } from './PPPokerTournamentInfo';
import { 
  WinnerGlow, 
  Confetti, 
  TablePulse, 
  CountdownPulse 
} from './PPPokerAnimations';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// ============= CONSTANTS =============
// PPPoker style 6-max positions - optimized for octagonal table
// Hero always at bottom center (position 0), opponents arranged around table edge
// Positions are tuned so players visually overlap the table rail like in PPPoker
const SEAT_POSITIONS_6MAX_MOBILE = [
  { x: 50, y: 85 },  // Seat 0 - Hero (bottom center, partial overlap with table)
  { x: 3, y: 56 },   // Seat 1 - Left middle (on table edge)
  { x: 3, y: 22 },   // Seat 2 - Left top (on table edge)
  { x: 50, y: 4 },   // Seat 3 - Top center
  { x: 97, y: 22 },  // Seat 4 - Right top (on table edge)
  { x: 97, y: 56 },  // Seat 5 - Right middle (on table edge)
];

const SEAT_POSITIONS_6MAX_DESKTOP = [
  { x: 50, y: 82 },  // Seat 0 - Hero (bottom center)
  { x: 5, y: 55 },   // Seat 1 - Left middle
  { x: 5, y: 20 },   // Seat 2 - Left top
  { x: 50, y: 3 },   // Seat 3 - Top center
  { x: 95, y: 20 },  // Seat 4 - Right top
  { x: 95, y: 55 },  // Seat 5 - Right middle
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

  // PPPoker-style card back - blue with diamond pattern
  if (faceDown) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: delay * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded-md shadow-lg relative overflow-hidden"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)',
          border: '2px solid #60a5fa',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
        }}
      >
        {/* Diamond pattern like PPPoker */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 20 20">
          <defs>
            <pattern id="ppCardPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect x="2" y="2" width="2" height="2" fill="white" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ppCardPattern)"/>
        </svg>
        {/* Center glow */}
        <div className="absolute inset-[15%] rounded-full" style={{ 
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 70%)'
        }}/>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-md shadow-lg relative flex flex-col p-0.5"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        border: isWinning ? '2px solid #22c55e' : '1.5px solid #d1d5db',
        boxShadow: isWinning ? '0 0 20px rgba(34,197,94,0.6)' : '0 4px 12px rgba(0,0,0,0.25)'
      }}
    >
      <div className="flex flex-col items-center leading-none ml-0.5 mt-0.5">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color }}>{rank}</span>
        <span className={cfg.suit} style={{ color }}>{symbol}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color, opacity: 0.2 }}>{symbol}</span>
      </div>
    </motion.div>
  );
});

// ============= TIMER RING - Using PPPoker Premium Component =============
// Replaced with imported PPPokerTimerRing from ./PPPokerTimerRing.tsx

// ============= PLAYER SEAT - PPPoker Premium Style =============
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  seatIndex,
  seatNumber,
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
  onPlayerClick,
  onSeatClick,
  gamePhase = 'waiting',
  heroCards,
  canJoin = false
}: {
  player: PokerPlayer | null;
  position: { x: number; y: number };
  seatIndex: number;
  seatNumber: number;
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
  onSeatClick?: (seatNumber: number) => void;
  gamePhase?: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  heroCards?: string[];
  canJoin?: boolean;
}) {
  const avatarSize = isMobile ? (isHero ? 52 : 40) : (isHero ? 58 : 46);
  const showTurnTimer = isCurrentTurn && !player?.isFolded && !player?.isAllIn;
  
  // Calculate bet position towards center of table
  const betOffset = useMemo(() => {
    const cx = 50, cy = 40;
    const dx = cx - position.x, dy = cy - position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const multiplier = isMobile ? 18 : 25;
    return { x: (dx/dist) * multiplier, y: (dy/dist) * multiplier };
  }, [position.x, position.y, isMobile]);

  // Cards position based on seat - PPPoker style: cards RIGHT of avatar for hero
  const cardsPosition = useMemo(() => {
    // Hero (bottom) - cards to the right of avatar
    if (isHero) return 'right';
    // Left side players - cards to the right
    if (position.x < 25) return 'right';
    // Right side players - cards to the left
    if (position.x > 75) return 'left';
    // Top center player - cards below
    if (position.y < 15) return 'below';
    return 'right';
  }, [position.x, position.y, isHero]);

  // Empty seat - PPPoker Premium style (clickable for joining)
  if (!player) {
    const handleEmptySeatClick = () => {
      console.log('[PlayerSeat] Empty seat clicked:', seatNumber, 'canJoin:', canJoin);
      if (canJoin && onSeatClick) {
        onSeatClick(seatNumber);
      }
    };
    
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <motion.div 
          whileHover={{ scale: 1.08, borderColor: 'rgba(34,197,94,0.8)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEmptySeatClick}
          className={cn(
            "rounded-full flex items-center justify-center relative overflow-hidden transition-all",
            isMobile ? "w-11 h-11" : "w-14 h-14",
            canJoin ? "cursor-pointer" : "cursor-default"
          )}
          style={{
            background: canJoin 
              ? 'radial-gradient(ellipse at 30% 30%, rgba(34,197,94,0.2), rgba(20,20,20,0.9))'
              : 'radial-gradient(ellipse at 30% 30%, rgba(60,60,60,0.6), rgba(20,20,20,0.9))',
            border: canJoin 
              ? '2px dashed rgba(34,197,94,0.6)' 
              : '2px dashed rgba(100,100,100,0.4)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
          }}
        >
          <span className={cn(
            "font-semibold", 
            isMobile ? "text-[9px]" : "text-[10px]",
            canJoin ? "text-emerald-400/80" : "text-gray-500/70"
          )}>
            {canJoin ? 'Сесть' : 'Empty'}
          </span>
          {/* Glow on hover for available seats */}
          {canJoin && (
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)' }}
            />
          )}
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

      {/* Timer ring around avatar - PPPoker Premium style with smooth animation */}
      {showTurnTimer && turnTimeRemaining !== undefined && (
        <PPPokerTimerRing 
          remaining={turnTimeRemaining} 
          total={turnDuration} 
          size={avatarSize + 16}
          enableGlow={true}
          strokeWidth={5}
        />
      )}
      
      {/* Timer badge - PPPoker Premium style with digital display (for hero only) */}
      {isHero && isCurrentTurn && turnTimeRemaining !== undefined && turnTimeRemaining > 0 && (
        <PPPokerTimerBadge 
          remaining={turnTimeRemaining}
          total={turnDuration}
          position="left"
          isMobile={isMobile}
        />
      )}

      {/* Avatar container with enhanced turn indicator */}
      <div 
        className={cn("relative rounded-full overflow-hidden cursor-pointer transition-all duration-200", player.isFolded && "opacity-40 grayscale")}
        style={{
          width: avatarSize,
          height: avatarSize,
          border: isCurrentTurn && !player.isFolded
            ? '4px solid #22c55e'
            : player.isAllIn
              ? '3px solid #ef4444'
              : '2px solid rgba(100,100,100,0.8)',
          boxShadow: isCurrentTurn && !player.isFolded
            ? '0 0 25px rgba(34,197,94,0.8), 0 0 50px rgba(34,197,94,0.4), inset 0 0 15px rgba(34,197,94,0.3)'
            : player.isAllIn
              ? '0 0 20px rgba(239,68,68,0.6)'
              : '0 4px 15px rgba(0,0,0,0.5)',
          background: '#2a2a2a',
          animation: isCurrentTurn && !player.isFolded ? 'pulse-glow 1.5s ease-in-out infinite' : undefined
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
        
        {/* Current turn pulsing indicator overlay */}
        {isCurrentTurn && !player.isFolded && (
          <div className="absolute inset-0 rounded-full pointer-events-none animate-pulse"
            style={{ 
              border: '3px solid rgba(34,197,94,0.6)',
              boxShadow: 'inset 0 0 20px rgba(34,197,94,0.4)'
            }}
          />
        )}
      </div>

      {/* Dealer button - PPPoker Premium 3D Style */}
      {isDealer && (
        <PPPokerDealerButton 
          size={isMobile ? 'sm' : 'md'} 
          position="top-right" 
          animated={true}
        />
      )}

      {/* SB/BB indicator - PPPoker Premium Style */}
      {(isSB || isBB) && (
        <div className={cn("absolute z-20", 
          isMobile ? "-left-1 -bottom-1" : "-left-1 bottom-0"
        )}>
          <PPPokerBlindButton 
            type={isBB ? 'BB' : 'SB'} 
            size={isMobile ? 'sm' : 'md'} 
            animated={true}
          />
        </div>
      )}

      {/* Player name plate - PPPoker Premium Style */}
      <div className={cn("absolute z-10", 
        isHero ? "top-full mt-0.5 left-1/2 -translate-x-1/2" : "top-full mt-0.5 left-1/2 -translate-x-1/2"
      )}>
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          {/* Name row with flag (like PPPoker) */}
          <div 
            className={cn("flex items-center gap-1 rounded-t-md px-2 py-0.5",
              isMobile ? "min-w-[56px]" : "min-w-[68px]"
            )}
            style={{
              background: 'linear-gradient(180deg, rgba(20,25,30,0.95) 0%, rgba(10,12,15,0.98) 100%)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              borderRight: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <span className={cn("text-white font-medium truncate max-w-[50px]", 
              isMobile ? "text-[9px]" : "text-[11px]"
            )}>
              {isHero ? 'Вы' : (player.name?.slice(0, 7) || 'Игрок')}
            </span>
            {/* Country flag placeholder - PPPoker style */}
            <span className="text-[8px]">🇷🇺</span>
          </div>
          
          {/* Stack row - PPPoker green/red style */}
          <div 
            className={cn("flex items-center justify-center rounded-b-md px-2 py-0.5 w-full",
              isMobile ? "min-w-[56px]" : "min-w-[68px]"
            )}
            style={{ 
              background: player.isAllIn 
                ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(180deg, rgba(5,8,10,0.98) 0%, rgba(0,0,0,0.98) 100%)',
              borderBottom: `2px solid ${player.isAllIn ? '#ef4444' : '#22c55e'}`,
              borderLeft: '1px solid rgba(255,255,255,0.03)',
              borderRight: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <span className={cn("font-bold tabular-nums",
              isMobile ? "text-[10px]" : "text-xs",
              player.isAllIn ? "text-white" : "text-emerald-400"
            )}>
              {player.isAllIn ? 'ALL-IN' : `${(player.stack / 20).toFixed(1)} BB`}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Cards beside avatar - PPPoker style positioning */}
      {/* Hero cards - shown to the right of avatar */}
      {isHero && heroCards && heroCards.length > 0 && !player.isFolded && (
        <div className={cn("absolute flex z-15",
          "left-full ml-2 top-1/2 -translate-y-1/2"
        )}>
          {heroCards.map((card, idx) => (
            <div key={`hero-card-${idx}`} style={{ marginLeft: idx > 0 ? '-8px' : 0 }}>
              <PPPokerCard 
                card={card} 
                faceDown={false} 
                size={isMobile ? "sm" : "md"} 
                delay={idx} 
                isWinning={gamePhase === 'showdown'}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Opponent cards - show card backs during active game */}
      {!isHero && !player.isFolded && gamePhase !== 'waiting' && (
        <div className={cn("absolute flex z-5",
          cardsPosition === 'right' && "left-full ml-1 top-1/2 -translate-y-1/2",
          cardsPosition === 'left' && "right-full mr-1 top-1/2 -translate-y-1/2",
          cardsPosition === 'below' && "top-full mt-8 left-1/2 -translate-x-1/2"
        )}>
          {/* Always show 2 cards for active opponents - faceDown unless showdown */}
          {[0, 1].map((idx) => (
            <div key={`opp-card-${idx}`} style={{ marginLeft: idx > 0 ? '-10px' : 0 }}>
              <PPPokerCard 
                card={showCards && player.holeCards?.[idx] ? player.holeCards[idx] : 'XX'} 
                faceDown={!showCards} 
                size="xs"
                delay={idx} 
                isWinning={showCards}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bet chip + amount - PPPoker Premium 3D Chips */}
      {player.betAmount > 0 && (
        <motion.div
          className="absolute z-15"
          style={{ 
            left: `calc(50% + ${betOffset.x}px)`, 
            top: `calc(50% + ${betOffset.y}px)`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <PPPokerChips3D 
            amount={player.betAmount} 
            size={isMobile ? 'xs' : 'sm'} 
            showLabel={true}
            animated={true}
            maxChips={4}
          />
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
  if (prev.gamePhase !== next.gamePhase) return false;
  if (prev.isHero !== next.isHero) return false;
  if (JSON.stringify(prev.heroCards) !== JSON.stringify(next.heroCards)) return false;
  return true;
});

// ============= TABLE FELT - PPPoker Premium Octagon Style =============
const PPPokerTableFelt = memo(function PPPokerTableFelt({ isMobile = false }: { isMobile?: boolean }) {
  // PPPoker-style octagonal table shape - more pronounced octagon
  const octagonPath = "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)";
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark outer background - space/cyber themed like PPPoker */}
      <div className="absolute inset-0" style={{ 
        background: 'radial-gradient(ellipse at 50% 20%, #1a2940 0%, #0f1825 30%, #080c12 60%, #050709 100%)'
      }}/>
      
      {/* Ambient glow effects - subtle cyan/green like PPPoker */}
      <div className="absolute top-0 left-0 w-full h-32 opacity-30" 
        style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, transparent 100%)' }}/>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-60 h-20 rounded-full opacity-20" 
        style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(30px)' }}/>
      
      {/* Metallic outer rail - PPPoker dark chrome style */}
      <div 
        className="absolute"
        style={{
          top: isMobile ? '6%' : '5%',
          left: isMobile ? '2%' : '3%',
          right: isMobile ? '2%' : '3%',
          bottom: isMobile ? '28%' : '25%',
          clipPath: octagonPath,
          background: 'linear-gradient(180deg, #3a4552 0%, #252d38 20%, #1a2028 50%, #252d38 80%, #3a4552 100%)',
          boxShadow: 'inset 0 2px 15px rgba(255,255,255,0.08), 0 15px 50px rgba(0,0,0,0.9)'
        }}
      />
      
      {/* Inner chrome ring */}
      <div 
        className="absolute"
        style={{
          top: isMobile ? '7%' : '6%',
          left: isMobile ? '3%' : '4%',
          right: isMobile ? '3%' : '4%',
          bottom: isMobile ? '29%' : '26%',
          clipPath: octagonPath,
          background: 'linear-gradient(180deg, #2d3540 0%, #1e252d 50%, #161b22 100%)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)'
        }}
      />
      
      {/* Premium green felt - PPPoker signature */}
      <div 
        className="absolute"
        style={{
          top: isMobile ? '8%' : '7%',
          left: isMobile ? '4%' : '5%',
          right: isMobile ? '4%' : '5%',
          bottom: isMobile ? '30%' : '27%',
          clipPath: octagonPath,
          background: 'radial-gradient(ellipse at 50% 35%, #1e7a45 0%, #187a3d 20%, #127035 40%, #0c6030 60%, #085028 80%, #054020 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35), inset 0 -30px 80px rgba(0,0,0,0.25)'
        }}
      >
        {/* Felt texture overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            clipPath: octagonPath
          }}
        />
        
        {/* Subtle inner border glow */}
        <div 
          className="absolute"
          style={{
            top: '3%',
            left: '3%',
            right: '3%',
            bottom: '3%',
            clipPath: octagonPath,
            border: '1px solid rgba(255,255,255,0.04)',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)'
          }}
        />
        
        {/* Center NLH watermark like PPPoker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="text-white/[0.025] font-black tracking-[0.3em] select-none"
              style={{ fontSize: isMobile ? '2.5rem' : '4rem' }}
            >
              NLH
            </div>
          </div>
        </div>
        
        {/* Center Syndikate logo - very subtle */}
        <div className="absolute inset-[25%] flex items-center justify-center pointer-events-none">
          <img src={syndikateLogo} alt="" className="w-full h-auto opacity-[0.05]"/>
        </div>
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS - PPPoker Premium Style =============
const CommunityCards = memo(function CommunityCards({ 
  cards, 
  phase,
  isMobile = false,
  winningCards = []
}: { 
  cards: string[]; 
  phase: string;
  isMobile?: boolean;
  winningCards?: string[];
}) {
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  const cardSize = isMobile ? 'sm' : 'md';
  const [revealedCards, setRevealedCards] = useState(0);

  // Animate card reveals one by one
  useEffect(() => {
    if (visibleCount > revealedCards) {
      const timer = setTimeout(() => {
        setRevealedCards(prev => Math.min(prev + 1, visibleCount));
      }, 150);
      return () => clearTimeout(timer);
    } else if (visibleCount < revealedCards) {
      setRevealedCards(visibleCount);
    }
  }, [visibleCount, revealedCards]);

  return (
    <div className="relative">
      {/* Glow behind cards during showdown */}
      {phase === 'showdown' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-[-20px] rounded-xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(34,197,94,0.2) 0%, transparent 70%)',
            filter: 'blur(10px)'
          }}
        />
      )}
      
      <div className={cn("flex items-center justify-center relative", isMobile ? "gap-1" : "gap-1.5")}>
        {[0, 1, 2, 3, 4].map((idx) => {
          const isRevealed = idx < revealedCards;
          const isWinning = winningCards.includes(cards[idx]);
          
          return (
            <motion.div 
              key={`card-slot-${idx}`}
              initial={{ y: -50, opacity: 0, rotateX: 90 }}
              animate={isRevealed ? { 
                y: 0, 
                opacity: 1, 
                rotateX: 0,
                scale: isWinning && phase === 'showdown' ? [1, 1.1, 1] : 1
              } : { y: 0, opacity: 0.3, rotateX: 0 }}
              transition={{ 
                delay: isRevealed ? idx * 0.12 : 0, 
                type: 'spring', 
                stiffness: 300, 
                damping: 20 
              }}
              className="relative"
            >
              {isRevealed && cards[idx] ? (
                <>
                  <PPPokerCard 
                    card={cards[idx]} 
                    size={cardSize} 
                    delay={0}
                    isWinning={isWinning && phase === 'showdown'}
                  />
                  {/* Winning card highlight */}
                  {isWinning && phase === 'showdown' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-md pointer-events-none"
                      style={{
                        border: '2px solid #22c55e',
                        boxShadow: '0 0 15px rgba(34,197,94,0.6)'
                      }}
                    />
                  )}
                </>
              ) : (
                <div 
                  className={cn(
                    "rounded-md border",
                    isMobile ? "w-9 h-[50px]" : "w-12 h-[68px]"
                  )}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

// ============= POT DISPLAY - Using PPPoker Premium 3D Chips =============
const PotDisplay = memo(function PotDisplay({ 
  pot, 
  bigBlind, 
  isMobile = false 
}: { 
  pot: number; 
  bigBlind: number; 
  isMobile?: boolean;
}) {
  if (pot <= 0) return null;

  return (
    <PPPokerPotDisplay 
      amount={pot} 
      isMobile={isMobile}
      animated={true}
    />
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

// ============= ACTION PANEL - PPPoker 3-Button Style with Enhanced UX =============
const ActionPanel = memo(function ActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  bigBlind,
  currentBet,
  myBetAmount,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  bigBlind: number;
  currentBet?: number;
  myBetAmount?: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaisePanel, setShowRaisePanel] = useState(false);

  useEffect(() => {
    // Set default raise to 2x current bet or 2.5x BB
    const defaultRaise = Math.max(
      minRaise, 
      (currentBet || 0) + (currentBet || bigBlind), // min raise over current bet
      bigBlind * 2.5
    );
    setRaiseAmount(Math.min(defaultRaise, maxBet));
  }, [minRaise, currentBet, bigBlind, maxBet]);

  if (!isVisible) return null;

  // Show actual amounts for clarity
  const callAmountDisplay = callAmount.toLocaleString();
  const raiseAmountDisplay = raiseAmount.toLocaleString();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Current bet indicator - shows what you need to match */}
      {currentBet && currentBet > 0 && (
        <div className="mx-3 mb-2 flex justify-center">
          <div className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ 
              background: 'rgba(0,0,0,0.8)', 
              border: '1px solid rgba(251,191,36,0.5)',
              color: '#fbbf24'
            }}
          >
            Ставка: {currentBet.toLocaleString()} {myBetAmount ? `(вы: ${myBetAmount.toLocaleString()})` : ''}
          </div>
        </div>
      )}
      
      {/* Raise panel */}
      <AnimatePresence>
        {showRaisePanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-3 mb-2 p-4 rounded-xl"
            style={{ background: 'rgba(20,25,32,0.98)', border: '1px solid rgba(34,197,94,0.4)' }}
          >
            {/* Quick presets - PPPoker style */}
            <div className="flex justify-center gap-2 mb-4">
              {[
                { label: '2×', mult: 2 },
                { label: '2.5×', mult: 2.5 },
                { label: '3×', mult: 3 },
                { label: 'Пот', mult: -1 }, // Special: pot-sized bet
              ].map((preset, i) => {
                const amount = preset.mult === -1 
                  ? Math.min(pot + callAmount, maxBet)
                  : Math.min(Math.max((currentBet || bigBlind) * preset.mult, minRaise), maxBet);
                const isActive = Math.abs(raiseAmount - amount) < bigBlind / 2;
                return (
                  <button
                    key={i}
                    onClick={() => setRaiseAmount(Math.floor(amount))}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-bold transition-all border",
                      isActive 
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30" 
                        : "bg-transparent text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            
            {/* All-in button */}
            <button
              onClick={() => { onAction('allin'); setShowRaisePanel(false); }}
              className="w-full mb-4 py-3 rounded-xl font-bold text-white text-base"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow: '0 4px 15px rgba(220,38,38,0.4)'
              }}
            >
              ВА-БАНК ({maxBet.toLocaleString()})
            </button>
            
            {/* Slider with value display */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-emerald-400/60 text-sm font-medium">{minRaise.toLocaleString()}</span>
              <input
                type="range"
                min={minRaise}
                max={maxBet}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((raiseAmount - minRaise) / (maxBet - minRaise)) * 100}%, rgba(255,255,255,0.15) ${((raiseAmount - minRaise) / (maxBet - minRaise)) * 100}%, rgba(255,255,255,0.15) 100%)`
                }}
              />
              <span className="text-emerald-400/60 text-sm font-medium">{maxBet.toLocaleString()}</span>
            </div>
            
            {/* Confirm raise - shows exact amount */}
            <button
              onClick={() => { onAction('raise', raiseAmount); setShowRaisePanel(false); }}
              className="w-full py-4 font-bold rounded-xl text-white text-lg"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 15px rgba(245,158,11,0.4)'
              }}
            >
              РЕЙЗ {raiseAmountDisplay}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main action buttons - PPPoker 3-button style with CLEAR labels */}
      <div className="flex gap-2 px-3 pb-safe pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', background: 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(0,0,0,0.8), transparent)' }}>
        {/* Fold */}
        <button
          onClick={() => onAction('fold')}
          className="flex-1 py-4 rounded-xl font-bold text-base shadow-lg active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
          }}
        >
          ФОЛД
        </button>
        
        {/* Call / Check - CLEAR indication of action */}
        <button
          onClick={() => canCheck ? onAction('check') : onAction('call')}
          className="flex-1 py-4 rounded-xl font-bold text-base shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center"
          style={{
            background: canCheck 
              ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white',
            boxShadow: canCheck 
              ? '0 4px 15px rgba(59,130,246,0.3)'
              : '0 4px 15px rgba(245,158,11,0.3)'
          }}
        >
          <span>{canCheck ? 'ЧЕК' : 'КОЛЛ'}</span>
          {!canCheck && callAmount > 0 && (
            <span className="text-xs opacity-90">{callAmountDisplay}</span>
          )}
        </button>
        
        {/* Raise */}
        <button
          onClick={() => setShowRaisePanel(!showRaisePanel)}
          className="flex-1 py-4 rounded-xl font-bold text-base shadow-lg active:scale-95 transition-transform"
          style={{
            background: showRaisePanel 
              ? 'linear-gradient(135deg, #16a34a, #15803d)' 
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(34,197,94,0.3)'
          }}
        >
          РЕЙЗ
        </button>
      </div>
    </motion.div>
  );
});

// ============= WINNER OVERLAY - PPPoker Premium Style =============
const WinnerOverlay = memo(function WinnerOverlay({
  winners, onClose
}: { winners: Array<{ name?: string; amount: number; handRank?: string; avatarUrl?: string; playerId?: string }>; onClose: () => void; }) {
  const [countdown, setCountdown] = useState(4);
  const [showChipsAnimation, setShowChipsAnimation] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
    const timer = setTimeout(onClose, 4000);
    const chipsTimer = setTimeout(() => setShowChipsAnimation(false), 1500);
    return () => { clearInterval(interval); clearTimeout(timer); clearTimeout(chipsTimer); };
  }, [onClose]);

  if (!winners.length) return null;
  const winner = winners[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
    >
      {/* Flying chips animation - PPPoker style */}
      <AnimatePresence>
        {showChipsAnimation && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`chip-${i}`}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0,
                  rotate: Math.random() * 360
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 150 - 50,
                  scale: [0, 1.2, 0.8],
                  rotate: Math.random() * 720
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 1, 
                  delay: i * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute z-50"
                style={{ 
                  left: '50%', 
                  top: '50%',
                  width: 24,
                  height: 24
                }}
              >
                <div 
                  className="w-full h-full rounded-full shadow-lg"
                  style={{
                    background: i % 3 === 0 
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                      : i % 3 === 1
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: '2px solid rgba(255,255,255,0.5)'
                  }}
                />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Winner card - PPPoker premium style */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden text-center max-w-[320px] w-[90%] pointer-events-auto"
        style={{
          background: 'linear-gradient(180deg, #1e2530 0%, #12171f 100%)',
          border: '2px solid rgba(34,197,94,0.6)',
          boxShadow: '0 0 60px rgba(34,197,94,0.4), 0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`conf-${i}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ 
                y: [0, 200],
                opacity: [0, 1, 1, 0],
                x: [0, (Math.random() - 0.5) * 100]
              }}
              transition={{ 
                duration: 3, 
                delay: 0.5 + i * 0.1,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
              className="absolute w-2 h-2"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'][i % 5],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>

        {/* Winner header with glow */}
        <div className="relative pt-5 pb-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-5xl mb-2"
          >
            🏆
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-black tracking-wider"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(34,197,94,0.5)'
            }}
          >
            ПОБЕДА!
          </motion.div>
        </div>

        {/* Winner info */}
        <div className="px-6 pb-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white font-bold text-xl mb-1"
          >
            {winner.name || 'Игрок'}
          </motion.div>
          
          {/* Winning amount with animation */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 400 }}
            className="flex items-center justify-center gap-2 mb-3"
          >
            <div className="flex">
              <div className="w-5 h-5 rounded-full" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '1.5px solid rgba(255,255,255,0.4)' }}/>
              <div className="w-5 h-5 rounded-full -ml-2" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', border: '1.5px solid rgba(255,255,255,0.4)' }}/>
            </div>
            <span className="text-4xl font-black text-emerald-400">
              +{winner.amount.toLocaleString()}
            </span>
          </motion.div>
          
          {/* Hand rank badge */}
          {winner.handRank && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))',
                border: '1px solid rgba(139,92,246,0.5)'
              }}
            >
              <span className="text-white/90 font-semibold text-sm">{winner.handRank}</span>
            </motion.div>
          )}
        </div>

        {/* Countdown footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="px-6 py-4 border-t border-white/10"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="text-white/50 text-xs mb-1">Следующая раздача через</div>
          <motion.div 
            key={countdown} 
            initial={{ scale: 1.5, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="text-3xl font-black text-emerald-400"
          >
            {countdown}
          </motion.div>
        </motion.div>
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<string | null>(null);
  
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

  // Use Node.js WebSocket server
  const pokerTable = useNodePokerTable({ tableId, playerId, buyIn });
  
  const {
    isConnected, isConnecting, error, tableState, myCards, mySeat, myPlayer, isMyTurn, canCheck, callAmount, lastAction, showdownResult,
    connect, disconnect, joinTable, fold, check, call, raise, allIn
  } = pokerTable;
  
  // Check if player can join (not yet seated)
  const canJoinTable = useMemo(() => {
    const canJoin = isConnected && !myPlayer && mySeat === null;
    console.log('[Poker] canJoinTable:', { canJoin, isConnected, hasMyPlayer: !!myPlayer, mySeat });
    return canJoin;
  }, [isConnected, myPlayer, mySeat]);

  const hasConnectedRef = useRef(false);

  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  // Timer effect - sync with server time and auto-fold on timeout
  useEffect(() => {
    const actionTimer = tableState?.actionTimer || 30;
    
    // Use server-calculated timeRemaining if available, otherwise calculate locally
    if (tableState?.timeRemaining !== null && tableState?.timeRemaining !== undefined) {
      setTurnTimeRemaining(Math.ceil(tableState.timeRemaining));
    } else if (tableState?.currentPlayerSeat !== null) {
      setTurnTimeRemaining(actionTimer);
    } else {
      setTurnTimeRemaining(null);
      return;
    }
    
    if (isMyTurn) {
      sounds.playTurn();
    }
    
    // Countdown interval
    const interval = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev === null || prev <= 0) return null;
        const newTime = prev - 1;
        
        // Auto-fold when time runs out
        if (newTime <= 0) {
          if (isMyTurn) {
            console.log('⏰ Time expired, auto-folding...');
            fold();
          }
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMyTurn, tableState?.currentPlayerSeat, tableState?.timeRemaining, tableState?.actionTimer, fold, sounds]);

  // Sound effects for actions with enhanced sounds
  useEffect(() => {
    if (lastAction?.playerId) {
      setPlayerActions(prev => ({ ...prev, [lastAction.playerId]: { action: lastAction.action, amount: lastAction.amount }}));
      setTimeout(() => setPlayerActions(prev => { const next = { ...prev }; delete next[lastAction.playerId]; return next; }), 2000);
      
      // Play appropriate sound with chip sounds for bets
      switch (lastAction.action) {
        case 'fold': 
          sounds.playFold(); 
          break;
        case 'check': 
          sounds.playCheck(); 
          break;
        case 'call': 
          sounds.playCall();
          if (lastAction.amount && lastAction.amount > 0) {
            setTimeout(() => sounds.playChipStack(), 100);
          }
          break;
        case 'bet':
          sounds.playBet();
          setTimeout(() => sounds.playChipStack(), 100);
          break;
        case 'raise': 
          sounds.playRaise();
          setTimeout(() => sounds.playChipStack(), 100);
          break;
        case 'allin': 
          sounds.playAllIn();
          setTimeout(() => sounds.playChipStack(), 150);
          break;
      }
    }
  }, [lastAction, sounds]);
  
  // Timer warning sounds
  useEffect(() => {
    if (isMyTurn && turnTimeRemaining !== null) {
      if (turnTimeRemaining === 10) {
        sounds.playTimerWarning();
      } else if (turnTimeRemaining <= 5 && turnTimeRemaining > 0) {
        sounds.playTimerCritical();
      } else if (turnTimeRemaining === 0) {
        sounds.playTimerExpired();
      }
    }
  }, [turnTimeRemaining, isMyTurn, sounds]);
  
  // Phase change sounds and effects
  useEffect(() => {
    const phase = tableState?.phase;
    if (phase && phase !== previousPhase) {
      setPreviousPhase(phase);
      
      // Play sounds based on phase transitions
      if (phase === 'preflop' && previousPhase !== 'preflop') {
        // Cards being dealt
        sounds.playShuffle();
        setTimeout(() => sounds.playDeal(), 300);
        setTimeout(() => sounds.playDeal(), 450);
      } else if (['flop', 'turn', 'river'].includes(phase)) {
        // Community cards
        sounds.playCardFlip();
      } else if (phase === 'showdown') {
        sounds.playShowdown();
      }
    }
  }, [tableState?.phase, previousPhase, sounds]);
  
  // Winner effects
  useEffect(() => {
    if (showdownResult && showdownResult.winners.length > 0) {
      sounds.playWin();
      sounds.playPotWin();
      
      // Check if hero won
      const heroWon = showdownResult.winners.some(w => w.playerId === playerId);
      if (heroWon) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [showdownResult, playerId, sounds]);

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
  
  // Handle seat click to join table
  const handleSeatClick = useCallback((seatNumber: number) => {
    console.log('[Poker] Seat click attempt:', { seatNumber, canJoinTable, isConnected, myPlayer: !!myPlayer });
    if (isConnected) {
      console.log('[Poker] Joining table at seat', seatNumber);
      joinTable(seatNumber);
    } else {
      console.warn('[Poker] Cannot join - not connected');
    }
  }, [isConnected, joinTable, myPlayer]);

  const handleSettingsSave = useCallback((settings: Partial<TableSettings>) => {
    // Settings will be handled via WebSocket in future update
    console.log('Settings saved:', settings);
    setShowSettings(false);
  }, []);

  // Rotate seats so Hero (mySeat) is always at position 0 (bottom center)
  // This matches PPPoker where you always see yourself at the bottom
  // Server uses 0-based seat numbering (0-5), positions array also 0-based
  const players = useMemo(() => {
    if (!tableState) return [];
    
    const totalSeats = 6;
    // IMPORTANT: mySeat can be 0 which is valid! Use null check instead of falsy check
    const heroSeat = mySeat !== null && mySeat !== undefined ? mySeat : 0;
    
    console.log('[Poker] Building players array:', { mySeat, heroSeat, playersCount: tableState.players.length });
    
    // Create array of seat numbers rotated so hero is at visual position 0 (bottom)
    const rotatedSeats: { position: { x: number; y: number }; seatNumber: number; player: PokerPlayer | undefined }[] = [];
    
    for (let i = 0; i < totalSeats; i++) {
      // Calculate actual seat number by rotating (0-based)
      const actualSeatNumber = (heroSeat + i) % totalSeats;
      const player = tableState.players.find(p => p.seatNumber === actualSeatNumber);
      
      if (player) {
        console.log('[Poker] Player at seat', actualSeatNumber, '→ position', i, player.name);
      }
      
      rotatedSeats.push({
        position: SEAT_POSITIONS[i],
        seatNumber: actualSeatNumber,
        player
      });
    }
    
    return rotatedSeats;
  }, [tableState?.players, SEAT_POSITIONS, mySeat]);

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
        {/* Connection status - simplified */}
        {!isConnected && !isConnecting && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white text-center py-2 text-sm">
            Соединение потеряно. <button onClick={connect} className="underline">Переподключиться</button>
          </div>
        )}
        {isConnecting && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-2 text-sm">
            Подключение...
          </div>
        )}

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
          <PPPokerTableFelt isMobile={isMobile}/>

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

          {/* Tournament info OR Blinds info */}
          {tableState && (
            <div className={cn("absolute left-1/2 -translate-x-1/2 z-20", isMobile ? "top-[48%]" : "top-[52%]")}>
              {isTournament ? (
                <PPPokerTournamentInfo
                  name="Tournament"
                  status="running"
                  currentLevel={1}
                  smallBlind={smallBlind}
                  bigBlind={bigBlind}
                  ante={tableState.anteAmount}
                  nextSmallBlind={smallBlind * 2}
                  nextBigBlind={bigBlind * 2}
                  timeToNextLevel={tableState.timeRemaining || 600}
                  totalPlayers={tableState.players.length}
                  remainingPlayers={tableState.players.filter(p => !p.isFolded && p.stack > 0).length}
                  averageStack={Math.round(tableState.players.reduce((sum, p) => sum + p.stack, 0) / Math.max(1, tableState.players.length))}
                  prizePool={tableState.pot || 0}
                  buyIn={buyIn || 0}
                  isMobile={isMobile}
                />
              ) : (
                <div 
                  className={cn("rounded-full px-3 py-1", isMobile ? "text-[8px]" : "text-[10px]")}
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <span className="text-white/60 font-medium tracking-wide">
                    Блайнды: {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
                    {tableState.anteAmount ? ` анте: ${tableState.anteAmount.toLocaleString()}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Player seats */}
          {players.map(({ position, seatNumber, player }, idx) => {
            const isHeroSeat = player?.playerId === playerId;
            return (
              <PlayerSeat
                key={seatNumber}
                player={player || null}
                position={position}
                seatIndex={idx}
                seatNumber={seatNumber}
                isHero={isHeroSeat}
                showCards={tableState?.phase === 'showdown'}
                isDealer={tableState?.dealerSeat === seatNumber}
                isSB={tableState?.smallBlindSeat === seatNumber}
                isBB={tableState?.bigBlindSeat === seatNumber}
                isCurrentTurn={tableState?.currentPlayerSeat === seatNumber}
                turnTimeRemaining={tableState?.currentPlayerSeat === seatNumber ? turnTimeRemaining || undefined : undefined}
                turnDuration={tableState?.actionTimer || 30}
                lastAction={player ? playerActions[player.playerId] : null}
                isMobile={isMobile}
                onPlayerClick={setSelectedPlayer}
                onSeatClick={handleSeatClick}
                gamePhase={tableState?.phase}
                heroCards={isHeroSeat ? myCards : undefined}
                canJoin={canJoinTable && !player}
              />
            );
          })}

          {/* Winner overlay */}
          <AnimatePresence>
            {showdownResult && showdownResult.winners.length > 0 && (
              <WinnerOverlay winners={showdownResult.winners.map(w => ({ name: w.name, amount: w.amount, handRank: w.handRank }))} onClose={() => {}}/>
            )}
          </AnimatePresence>
          
          {/* Confetti for big wins */}
          <Confetti isActive={showConfetti} duration={4000} />
          
          {/* Table pulse during active game */}
          <TablePulse isActive={tableState?.phase !== 'waiting' && tableState?.phase !== 'showdown'} />
        </div>

        {/* NOTE: Hero cards now shown next to avatar in PlayerSeat component - PPPoker style */}

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
              minRaise={Math.max(tableState.currentBet * 2, bigBlind * 2)}
              maxBet={myPlayer?.stack || 0}
              pot={tableState.pot}
              bigBlind={bigBlind}
              currentBet={tableState.currentBet}
              myBetAmount={myPlayer?.betAmount || 0}
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
