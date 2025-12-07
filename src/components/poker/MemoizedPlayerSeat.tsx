import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Plus, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MemoizedPokerCard } from './MemoizedPokerCard';
import type { PokerPlayer, TableState } from '@/hooks/usePokerTable';

// Позиции для 6-max стола в стиле PPPoker (процентные)
const SEAT_POSITIONS_6MAX = [
  { top: '85%', left: '50%' },   // 1 - Hero (внизу по центру)
  { top: '65%', left: '5%' },    // 2 - Слева внизу
  { top: '25%', left: '5%' },    // 3 - Слева вверху
  { top: '8%', left: '50%' },    // 4 - Сверху по центру
  { top: '25%', left: '95%' },   // 5 - Справа вверху
  { top: '65%', left: '95%' },   // 6 - Справа внизу
];

interface PlayerSeatProps {
  seatNumber: number;
  player: PokerPlayer | undefined;
  mySeat: number | null;
  tableState: TableState | null;
  isWinner: boolean;
  timeRemaining: number;
  actionTime: number;
}

export const MemoizedPlayerSeat = memo(function MemoizedPlayerSeat({
  seatNumber,
  player,
  mySeat,
  tableState,
  isWinner,
  timeRemaining,
  actionTime
}: PlayerSeatProps) {
  const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
  const isHero = player?.seatNumber === mySeat;
  const isCurrentPlayer = tableState?.currentPlayerSeat === seatNumber;
  const isDealer = tableState?.dealerSeat === seatNumber;
  const isSB = tableState?.smallBlindSeat === seatNumber;
  const isBB = tableState?.bigBlindSeat === seatNumber;

  // Вычисляем позицию для карт и ставки
  const isLeft = seatNumber === 2 || seatNumber === 3;
  const isRight = seatNumber === 5 || seatNumber === 6;
  const isTop = seatNumber === 3 || seatNumber === 4 || seatNumber === 5;
  
  if (!player) {
    // Empty seat
    return (
      <div 
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/30 bg-black/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-white/30" />
        </div>
        <span className="text-[9px] text-white/40 mt-1">Seat {seatNumber}</span>
      </div>
    );
  }

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
        zIndex: isCurrentPlayer ? 20 : 10,
      }}
    >
      {/* Timer ring for current player - static SVG, no motion */}
      {isCurrentPlayer && (
        <svg 
          className="absolute w-16 h-16"
          style={{ top: -4, left: '50%', transform: 'translateX(-50%)' }}
          viewBox="0 0 64 64"
        >
          <circle 
            cx="32" cy="32" r="28" 
            fill="none" 
            stroke="rgba(251, 191, 36, 0.3)" 
            strokeWidth="3" 
          />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={176}
            strokeDashoffset={176 - (176 * timeRemaining) / actionTime}
            transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      )}

      {/* Avatar with status */}
      <div className="relative">
        {/* Avatar container */}
        <div 
          className={cn(
            "w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg",
            isWinner ? "border-yellow-400 ring-2 ring-yellow-400/50" :
            isCurrentPlayer ? "border-yellow-400" :
            player.isFolded ? "border-gray-600 opacity-50" :
            isHero ? "border-green-500" : "border-slate-500"
          )}
        >
          <Avatar className="w-full h-full">
            <AvatarImage src={player.avatarUrl || ''} />
            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-sm font-bold">
              {(player.name || 'P').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Position badge (D, SB, BB) */}
        {(isDealer || isSB || isBB) && (
          <div 
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg",
              isDealer ? "bg-white text-gray-900" :
              isSB ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
            )}
          >
            {isDealer ? 'D' : isSB ? 'SB' : 'BB'}
          </div>
        )}

        {/* Disconnected indicator */}
        {player.isDisconnected && (
          <div className="absolute -top-1 -right-1">
            <WifiOff className="w-3 h-3 text-red-500" />
          </div>
        )}

        {/* Winner crown */}
        {isWinner && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Crown className="w-5 h-5 text-yellow-400 drop-shadow-glow" />
          </div>
        )}

        {/* Action label (Fold/All-In) */}
        {(player.isFolded || player.isAllIn) && (
          <div 
            className={cn(
              "absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] font-bold shadow",
              player.isAllIn ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"
            )}
          >
            {player.isAllIn ? 'ALL-IN' : 'FOLD'}
          </div>
        )}
      </div>

      {/* Name plate with stack */}
      <div 
        className={cn(
          "mt-1 px-2.5 py-0.5 rounded-md min-w-[68px] text-center shadow-lg",
          isWinner ? "bg-yellow-500" :
          isHero ? "bg-green-700" : 
          player.isFolded ? "bg-gray-800/80" : "bg-slate-800"
        )}
      >
        <p className={cn(
          "text-[10px] font-medium truncate max-w-[68px]",
          isWinner ? "text-gray-900" : "text-white"
        )}>
          {isHero ? 'Вы' : player.name || `Player ${seatNumber}`}
        </p>
        <p className={cn(
          "text-[11px] font-bold",
          isWinner ? "text-gray-800" : "text-amber-400"
        )}>
          {player.stack.toLocaleString()}
        </p>
      </div>

      {/* Current bet chip */}
      {(player.betAmount || 0) > 0 && !player.isFolded && (
        <div
          className={cn(
            "absolute flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-lg",
            "bg-gradient-to-r from-amber-600 to-amber-500"
          )}
          style={{
            top: isTop ? '100%' : isHero ? '-35%' : '50%',
            left: isLeft ? '110%' : isRight ? '-10%' : '50%',
            transform: isLeft || isRight ? 'translateY(-50%)' : 'translateX(-50%)',
          }}
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white/30" />
          <span className="text-[10px] font-bold text-white">{player.betAmount}</span>
        </div>
      )}

      {/* Hole cards - show for hero or during showdown */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
        <div 
          className={cn(
            "absolute flex gap-0.5",
            isTop ? "-bottom-10" : "-top-10",
            isLeft ? "left-full ml-2" : isRight ? "right-full mr-2" : "left-1/2 -translate-x-1/2"
          )}
          style={{
            transform: (isLeft || isRight) ? 'translateY(-50%)' : isTop ? undefined : 'translateX(-50%)',
            top: isLeft || isRight ? '50%' : isTop ? '100%' : undefined,
            bottom: !isTop && !isLeft && !isRight ? '100%' : undefined,
          }}
        >
          {player.holeCards.map((card, idx) => (
            <MemoizedPokerCard 
              key={`${seatNumber}-${idx}-${card}`} 
              card={isHero || tableState?.phase === 'showdown' ? card : '??'} 
              faceDown={!isHero && tableState?.phase !== 'showdown'} 
              size="sm"
              animate={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.seatNumber === nextProps.seatNumber &&
    prevProps.mySeat === nextProps.mySeat &&
    prevProps.isWinner === nextProps.isWinner &&
    prevProps.timeRemaining === nextProps.timeRemaining &&
    prevProps.tableState?.phase === nextProps.tableState?.phase &&
    prevProps.tableState?.currentPlayerSeat === nextProps.tableState?.currentPlayerSeat &&
    prevProps.tableState?.dealerSeat === nextProps.tableState?.dealerSeat &&
    prevProps.player?.oderId === nextProps.player?.oderId &&
    prevProps.player?.stack === nextProps.player?.stack &&
    prevProps.player?.betAmount === nextProps.player?.betAmount &&
    prevProps.player?.isFolded === nextProps.player?.isFolded &&
    prevProps.player?.isAllIn === nextProps.player?.isAllIn &&
    JSON.stringify(prevProps.player?.holeCards) === JSON.stringify(nextProps.player?.holeCards)
  );
});
