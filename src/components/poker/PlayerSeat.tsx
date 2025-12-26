import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartChipDisplay } from './CasinoChip';
import { UltraRealisticCard } from './UltraRealisticCard';
import { cn } from '@/lib/utils';

// Helper to convert suit/rank to card string
const toCardString = (suit: string, rank: string): string => {
  const suitMap: Record<string, string> = { hearts: 'h', diamonds: 'd', clubs: 'c', spades: 's' };
  return `${rank}${suitMap[suit] || 's'}`;
};

export interface PlayerData {
  id: string;
  name: string;
  avatar?: string;
  stack: number;
  bet: number;
  cards?: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; rank: string }[];
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isWinner?: boolean;
  lastAction?: string;
  timeBank?: number;
  timeRemaining?: number;
}

interface PlayerSeatProps {
  player?: PlayerData;
  position: number;
  totalSeats?: number;
  isEmpty?: boolean;
  isCurrentPlayer?: boolean;
  showCards?: boolean;
  onSeatClick?: () => void;
  className?: string;
}

const POSITION_LABELS = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO'];

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  totalSeats = 9,
  isEmpty = false,
  isCurrentPlayer = false,
  showCards = false,
  onSeatClick,
  className
}) => {
  if (isEmpty || !player) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        onClick={onSeatClick}
        className={cn(
          'relative w-32 h-40 rounded-xl cursor-pointer',
          'bg-gradient-to-b from-gray-800/50 to-gray-900/50',
          'border-2 border-dashed border-gray-600/50',
          'flex items-center justify-center',
          'transition-all duration-300 hover:border-casino-gold/50',
          className
        )}
      >
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-1">+</div>
          <div className="text-xs font-roboto-condensed">Seat {position + 1}</div>
        </div>
      </motion.div>
    );
  }

  const timerProgress = player.timeRemaining && player.timeBank 
    ? (player.timeRemaining / player.timeBank) * 100 
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative w-36 flex flex-col items-center',
        player.isFolded && 'opacity-50',
        className
      )}
    >
      {/* Timer ring for active player */}
      <AnimatePresence>
        {player.isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-2 z-0"
          >
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,215,0,0.2)"
                strokeWidth="4"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${timerProgress * 2.83} 283`}
                transform="rotate(-90 50 50)"
                animate={{ strokeDasharray: `${timerProgress * 2.83} 283` }}
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FFA500" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {player.cards && player.cards.length > 0 && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {player.cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0, rotateY: 180 }}
              animate={{ y: 0, opacity: 1, rotateY: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <UltraRealisticCard
                card={toCardString(card.suit, card.rank)}
                faceDown={!(showCards || isCurrentPlayer)}
                size="sm"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Player info card */}
      <div
        className={cn(
          'relative z-10 rounded-xl overflow-hidden',
          'bg-gradient-to-b from-gray-800 to-gray-900',
          'border-2 transition-all duration-300',
          player.isActive ? 'border-casino-gold shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'border-gray-700',
          player.isWinner && 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]',
          isCurrentPlayer && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
        )}
      >
        {/* Avatar section */}
        <div className="relative p-2 pb-1">
          <div className="relative w-16 h-16 mx-auto">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="w-full h-full rounded-full object-cover border-2 border-gray-600"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-2xl font-bebas text-white">
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Position badges */}
            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
              {player.isDealer && (
                <div className="w-5 h-5 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center shadow-lg">
                  D
                </div>
              )}
              {player.isSmallBlind && (
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  SB
                </div>
              )}
              {player.isBigBlind && (
                <div className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  BB
                </div>
              )}
            </div>

            {/* All-in badge */}
            {player.isAllIn && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold"
              >
                ALL IN
              </motion.div>
            )}
          </div>

          {/* Name */}
          <div className="text-center mt-1.5">
            <div className="text-white font-roboto-condensed text-sm truncate max-w-[80px] mx-auto">
              {player.name}
            </div>
          </div>
        </div>

        {/* Stack */}
        <div className="bg-black/50 px-2 py-1.5">
          <div className="text-center">
            <span className="text-casino-gold font-orbitron text-sm font-bold">
              {player.stack.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Last action */}
        <AnimatePresence>
          {player.lastAction && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <div className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold',
                player.lastAction.toLowerCase().includes('fold') && 'bg-gray-600 text-gray-300',
                player.lastAction.toLowerCase().includes('check') && 'bg-green-600 text-white',
                player.lastAction.toLowerCase().includes('call') && 'bg-blue-600 text-white',
                player.lastAction.toLowerCase().includes('raise') && 'bg-orange-600 text-white',
                player.lastAction.toLowerCase().includes('bet') && 'bg-yellow-600 text-black',
                player.lastAction.toLowerCase().includes('all') && 'bg-red-600 text-white'
              )}>
                {player.lastAction}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bet chips */}
      {player.bet > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2"
        >
          <SmartChipDisplay amount={player.bet} maxStacks={2} />
        </motion.div>
      )}
    </motion.div>
  );
};

// Compact version for mobile
export const CompactPlayerSeat: React.FC<{
  player?: PlayerData;
  isActive?: boolean;
  className?: string;
}> = ({ player, isActive, className }) => {
  if (!player) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      'bg-gray-800/80 border',
      isActive ? 'border-casino-gold' : 'border-gray-700',
      player.isFolded && 'opacity-50',
      className
    )}>
      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white">
        {player.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm truncate">{player.name}</div>
        <div className="text-casino-gold text-xs font-orbitron">{player.stack.toLocaleString()}</div>
      </div>
      {player.bet > 0 && (
        <div className="text-orange-400 text-xs font-bold">{player.bet}</div>
      )}
    </div>
  );
};

export default PlayerSeat;
