import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Plus, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemoizedPokerCard } from './MemoizedPokerCard';
import { CircularTimer } from './PlayerActionTimer';
import { PlayerBet } from './AnimatedChips';
import type { PokerPlayer, TableState } from '@/hooks/usePokerTable';

// PPPoker-style 6-max seat positions (percentage-based, oval layout)
export const SEAT_POSITIONS_6MAX = [
  { top: '82%', left: '50%' },   // 1 - Hero (bottom center)
  { top: '60%', left: '8%' },    // 2 - Left bottom
  { top: '22%', left: '8%' },    // 3 - Left top
  { top: '5%', left: '50%' },    // 4 - Top center
  { top: '22%', left: '92%' },   // 5 - Right top
  { top: '60%', left: '92%' },   // 6 - Right bottom
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
    // Empty seat - PPPoker style
    return (
      <div 
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Plus className="w-5 h-5 text-white/30" />
        </div>
        <div className="mt-1.5 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
          <span className="text-[9px] text-white/40 font-medium">Seat {seatNumber}</span>
        </div>
      </div>
    );
  }

  // Timer progress (0 to 1)
  const timerProgress = timeRemaining / actionTime;
  const timerColor = timerProgress > 0.5 ? '#22c55e' : timerProgress > 0.25 ? '#fbbf24' : '#ef4444';

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
      {/* Timer ring for current player - using CircularTimer */}
      {isCurrentPlayer && (
        <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
          <CircularTimer 
            timeRemaining={timeRemaining} 
            maxTime={actionTime} 
            size={72}
            strokeWidth={4}
          />
        </div>
      )}

      {/* Avatar with status - PPPoker style */}
      <div className="relative">
        {/* Avatar glow for current player */}
        {isCurrentPlayer && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${timerColor}40 0%, transparent 70%)`,
              transform: 'scale(1.5)',
            }}
          />
        )}

        {/* Avatar container */}
        <div 
          className={cn(
            "w-14 h-14 rounded-full overflow-hidden shadow-xl transition-all duration-300",
            isWinner ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-black" :
            isCurrentPlayer ? "ring-2 ring-green-400" :
            player.isFolded ? "opacity-40 grayscale" :
            isHero ? "ring-2 ring-emerald-500" : "ring-1 ring-white/20"
          )}
          style={{
            boxShadow: isCurrentPlayer 
              ? `0 0 20px ${timerColor}60, 0 4px 12px rgba(0,0,0,0.5)` 
              : isWinner 
                ? '0 0 30px rgba(250,204,21,0.6), 0 4px 12px rgba(0,0,0,0.5)'
                : '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          <Avatar className="w-full h-full">
            <AvatarImage src={player.avatarUrl || ''} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-base font-bold">
              {(player.name || 'P').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Position badge (D, SB, BB) - PPPoker style */}
        {(isDealer || isSB || isBB) && (
          <div 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg border-2 border-black",
              isDealer ? "bg-gradient-to-br from-white to-gray-200 text-gray-900" :
              isSB ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white" : 
              "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
            )}
          >
            {isDealer ? 'D' : isSB ? 'SB' : 'BB'}
          </div>
        )}

        {/* Disconnected indicator */}
        {player.isDisconnected && (
          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
            <WifiOff className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Winner crown - animated */}
        {isWinner && (
          <div 
            className="absolute -top-4 left-1/2 -translate-x-1/2"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
            }}
          >
            <Crown className="w-6 h-6 text-yellow-400" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.8))' }} />
          </div>
        )}

        {/* Action label (Fold/All-In) - PPPoker style */}
        {(player.isFolded || player.isAllIn) && (
          <div 
            className={cn(
              "absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide shadow-lg",
              player.isAllIn 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                : "bg-gray-700/90 text-gray-400"
            )}
          >
            {player.isAllIn ? 'ALL-IN' : 'FOLD'}
          </div>
        )}
      </div>

      {/* Name plate with stack - PPPoker style */}
      <div 
        className={cn(
          "mt-1.5 px-3 py-1 rounded-lg min-w-[75px] text-center shadow-xl backdrop-blur-sm transition-all duration-300",
          isWinner 
            ? "bg-gradient-to-r from-yellow-400 to-amber-500" 
            : isHero 
              ? "bg-gradient-to-r from-emerald-700 to-emerald-800" 
              : player.isFolded 
                ? "bg-gray-800/60" 
                : "bg-slate-800/90"
        )}
        style={{
          boxShadow: isWinner 
            ? '0 0 20px rgba(250,204,21,0.4), 0 4px 8px rgba(0,0,0,0.3)'
            : '0 4px 8px rgba(0,0,0,0.3)'
        }}
      >
        <p className={cn(
          "text-[10px] font-semibold truncate max-w-[70px]",
          isWinner ? "text-yellow-900" : player.isFolded ? "text-gray-500" : "text-white"
        )}>
          {isHero ? 'Вы' : player.name || `Player ${seatNumber}`}
        </p>
        <p className={cn(
          "text-[12px] font-black",
          isWinner ? "text-yellow-900" : "text-amber-400"
        )}>
          {player.stack.toLocaleString()}
        </p>
      </div>

      {/* Current bet chip - using PlayerBet component */}
      {(player.betAmount || 0) > 0 && !player.isFolded && (
        <div
          className="absolute"
          style={{
            top: isTop ? '110%' : isHero ? '-45%' : '50%',
            left: isLeft ? '120%' : isRight ? '-20%' : '50%',
            transform: isLeft || isRight ? 'translateY(-50%)' : 'translateX(-50%)',
          }}
        >
          <PlayerBet amount={player.betAmount} />
        </div>
      )}

      {/* Hole cards - PPPoker style positioning */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
        <div 
          className="absolute flex gap-0.5"
          style={{
            top: isTop ? 'calc(100% + 8px)' : isHero ? undefined : '50%',
            bottom: !isTop && !isHero ? undefined : isHero ? 'calc(100% + 8px)' : undefined,
            left: isLeft ? 'calc(100% + 8px)' : isRight ? undefined : '50%',
            right: isRight ? 'calc(100% + 8px)' : undefined,
            transform: isLeft ? 'translateY(-50%)' : isRight ? 'translateY(-50%)' : 'translateX(-50%)',
          }}
        >
          {player.holeCards.map((card, idx) => (
            <MemoizedPokerCard 
              key={`${seatNumber}-${idx}-${card}`} 
              card={isHero || tableState?.phase === 'showdown' ? card : '??'} 
              faceDown={!isHero && tableState?.phase !== 'showdown'} 
              size={isHero ? 'md' : 'sm'}
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
