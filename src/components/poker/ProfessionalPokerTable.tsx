import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/usePokerTable';
import { PokerCard, CardHand, CommunityCards } from './PokerCard';
import { Timer, Crown, Coins, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProfessionalPokerTableProps {
  tableState: {
    phase: string;
    pot: number;
    currentBet: number;
    currentPlayerSeat: number | null;
    communityCards: string[];
    dealerSeat: number;
    smallBlindSeat: number;
    bigBlindSeat: number;
    players: PokerPlayer[];
  } | null;
  myCards: string[];
  playerId: string;
  onSeatClick?: (seatNumber: number) => void;
}

// Seat positions around oval table (9 seats) - positioned as percentages
const SEAT_POSITIONS = [
  { x: 50, y: 95 },   // Seat 1 - bottom center (me)
  { x: 15, y: 80 },   // Seat 2 - bottom left
  { x: 5, y: 50 },    // Seat 3 - left center
  { x: 15, y: 20 },   // Seat 4 - top left
  { x: 35, y: 5 },    // Seat 5 - top
  { x: 65, y: 5 },    // Seat 6 - top
  { x: 85, y: 20 },   // Seat 7 - top right
  { x: 95, y: 50 },   // Seat 8 - right center
  { x: 85, y: 80 },   // Seat 9 - bottom right
];

// Bet chip positions (offset from player towards center)
const getBetPosition = (seatIndex: number) => {
  const seat = SEAT_POSITIONS[seatIndex];
  const centerX = 50;
  const centerY = 50;
  const offsetX = (centerX - seat.x) * 0.35;
  const offsetY = (centerY - seat.y) * 0.35;
  return { x: seat.x + offsetX, y: seat.y + offsetY };
};

export function ProfessionalPokerTable({ 
  tableState, 
  myCards, 
  playerId,
  onSeatClick 
}: ProfessionalPokerTableProps) {
  const [actionTimer, setActionTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Action timer logic
  useEffect(() => {
    if (tableState?.currentPlayerSeat !== null && tableState?.phase !== 'waiting') {
      setActionTimer(30);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  }, [tableState?.currentPlayerSeat, tableState?.phase]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setActionTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const getPlayerAtSeat = (seatNumber: number) => {
    return tableState?.players.find(p => p.seatNumber === seatNumber);
  };

  return (
    <div className="relative w-full aspect-[16/10] max-w-5xl mx-auto">
      {/* Outer table border/rim */}
      <div className="absolute inset-0 rounded-[50%/40%] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] shadow-2xl border-4 border-[#2d2d44]" />
      
      {/* Table felt */}
      <div className="absolute inset-[8px] rounded-[50%/40%] bg-gradient-to-br from-[#0d4f3c] via-[#0a3d2e] to-[#063223] shadow-inner overflow-hidden">
        {/* Felt texture pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%)`
        }} />
        
        {/* Table border line */}
        <div className="absolute inset-[12px] rounded-[50%/40%] border-2 border-[#1a5c46]/50" />
        
        {/* Center area with pot and community cards */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {/* Pot display */}
          <AnimatePresence>
            {tableState && tableState.pot > 0 && (
              <motion.div
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: -20 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-amber-500/30"
              >
                <div className="flex -space-x-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 shadow-lg"
                      style={{ zIndex: 3 - i }}
                    />
                  ))}
                </div>
                <span className="font-bold text-amber-400 text-lg drop-shadow-lg">
                  {tableState.pot.toLocaleString()}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Community cards */}
          <div className="flex gap-2">
            {tableState?.communityCards && tableState.communityCards.length > 0 ? (
              <CommunityCards cards={tableState.communityCards} size="lg" />
            ) : (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="w-14 h-20 rounded-lg border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Phase indicator */}
          {tableState && tableState.phase !== 'waiting' && (
            <Badge variant="secondary" className="bg-black/40 text-white/80 capitalize">
              {tableState.phase}
            </Badge>
          )}
        </div>
      </div>

      {/* Player seats */}
      {SEAT_POSITIONS.map((pos, index) => {
        const seatNumber = index + 1;
        const player = getPlayerAtSeat(seatNumber);
        const isDealer = tableState?.dealerSeat === seatNumber;
        const isSB = tableState?.smallBlindSeat === seatNumber;
        const isBB = tableState?.bigBlindSeat === seatNumber;
        const isCurrentPlayer = tableState?.currentPlayerSeat === seatNumber;
        const isMe = player?.oderId === playerId;
        const betPos = getBetPosition(index);

        return (
          <React.Fragment key={seatNumber}>
            {/* Player bet chips */}
            <AnimatePresence>
              {player && player.betAmount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute z-20"
                  style={{
                    left: `${betPos.x}%`,
                    top: `${betPos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                    <div className="flex -space-x-1">
                      {Array.from({ length: Math.min(3, Math.ceil(player.betAmount / 500)) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 border border-red-300"
                          style={{ zIndex: 3 - i }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-white">{player.betAmount}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player seat */}
            <motion.div
              className={cn(
                "absolute z-30 cursor-pointer",
                "transition-all duration-300"
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              whileHover={{ scale: player ? 1.05 : 1.1 }}
              onClick={() => !player && onSeatClick?.(seatNumber)}
            >
              {player ? (
                <div className={cn(
                  "relative flex flex-col items-center",
                  player.isFolded && "opacity-50"
                )}>
                  {/* Timer ring for current player */}
                  {isCurrentPlayer && (
                    <div className="absolute -inset-2 z-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgba(239, 68, 68, 0.3)"
                          strokeWidth="4"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="4"
                          strokeLinecap="round"
                          initial={{ pathLength: 1 }}
                          animate={{ pathLength: actionTimer / 30 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            strokeDasharray: '283',
                            strokeDashoffset: '0'
                          }}
                        />
                      </svg>
                    </div>
                  )}

                  {/* Player avatar */}
                  <div className={cn(
                    "relative w-16 h-16 rounded-full overflow-hidden",
                    "bg-gradient-to-br from-slate-700 to-slate-900",
                    "border-3 shadow-xl",
                    isCurrentPlayer ? "border-green-500 ring-2 ring-green-500/50" :
                    isMe ? "border-primary" : "border-slate-600",
                    player.isAllIn && "border-amber-500 ring-2 ring-amber-500/50"
                  )}>
                    {/* Avatar image placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>

                    {/* Fold overlay */}
                    {player.isFolded && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-white/80">FOLD</span>
                      </div>
                    )}

                    {/* All-in badge */}
                    {player.isAllIn && !player.isFolded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/80 to-orange-600/80"
                      >
                        <span className="text-xs font-bold text-white">ALL-IN</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Player info bar */}
                  <div className={cn(
                    "mt-1 px-3 py-1 rounded-lg min-w-20 text-center",
                    "bg-gradient-to-r shadow-lg",
                    isMe ? "from-primary/90 to-primary/70" : "from-slate-800 to-slate-900",
                    "border border-white/10"
                  )}>
                    <p className="text-xs font-semibold text-white truncate max-w-20">
                      {isMe ? 'Вы' : player.name || `Player ${seatNumber}`}
                    </p>
                    <p className="text-sm font-bold text-amber-400">
                      {player.stack.toLocaleString()}
                    </p>
                  </div>

                  {/* Position badges */}
                  <div className="absolute -top-2 -right-2 flex gap-0.5">
                    {isDealer && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black shadow-lg"
                      >
                        D
                      </motion.div>
                    )}
                  </div>
                  
                  {(isSB || isBB) && (
                    <div className="absolute -top-2 -left-2">
                      <div className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg",
                        isBB ? "bg-blue-500 text-white" : "bg-slate-500 text-white"
                      )}>
                        {isBB ? 'BB' : 'SB'}
                      </div>
                    </div>
                  )}

                  {/* Hole cards for current player (show for me) */}
                  {isMe && myCards.length > 0 && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute -bottom-12 left-1/2 -translate-x-1/2"
                    >
                      <CardHand cards={myCards} size="md" overlap />
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Empty seat */
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center hover:border-white/40 hover:bg-white/10 transition-all">
                  <span className="text-xs text-white/40">{seatNumber}</span>
                </div>
              )}
            </motion.div>
          </React.Fragment>
        );
      })}

      {/* My cards (large display at bottom) */}
      {myCards.length > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-16 z-40"
        >
          <div className="p-3 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
            <CardHand cards={myCards} size="lg" overlap={false} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
