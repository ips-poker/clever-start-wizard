import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PPPokerCard } from './PPPokerCard';
import { PPPokerChips } from './PPPokerChips';

interface Winner {
  playerId: string;
  playerName?: string;
  seatNumber: number;
  amount: number;
  handRank?: string;
  cards?: string[];
}

interface PPPokerWinnerDisplayProps {
  winners: Winner[];
  currentPlayerId: string;
  onComplete?: () => void;
  autoHideDuration?: number;
}

// Confetti particle component
const Confetti = memo(function Confetti({ delay }: { delay: number }) {
  const colors = [
    'hsl(45, 93%, 47%)', // Gold
    'hsl(0, 72%, 51%)',  // Red
    'hsl(217, 91%, 60%)', // Blue
    'hsl(142, 71%, 45%)', // Green
    'hsl(280, 87%, 50%)'  // Purple
  ];
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        left: `${Math.random() * 100}%`,
        top: -10
      }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{
        y: 400,
        rotate: 720,
        opacity: 0,
        x: (Math.random() - 0.5) * 200
      }}
      transition={{
        duration: 2 + Math.random(),
        delay,
        ease: 'easeOut'
      }}
    />
  );
});

// Animated coins rain
const CoinsRain = memo(function CoinsRain() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <Confetti key={i} delay={i * 0.1} />
      ))}
    </div>
  );
});

// Winner card component
const WinnerCard = memo(function WinnerCard({
  winner,
  isCurrentPlayer,
  index
}: {
  winner: Winner;
  isCurrentPlayer: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: 0.3 + index * 0.15,
        type: 'spring',
        stiffness: 200
      }}
      className={cn(
        'relative p-4 rounded-xl backdrop-blur-sm',
        isCurrentPlayer
          ? 'bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border border-amber-400/50'
          : 'bg-white/10 border border-white/20'
      )}
    >
      {/* Winner badge for current player */}
      {isCurrentPlayer && (
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="absolute -top-3 -right-3"
        >
          <div className="relative">
            <Crown className="w-8 h-8 text-amber-400 fill-amber-400/50" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Star className="w-3 h-3 text-white fill-white" />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Player info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            isCurrentPlayer
              ? 'bg-amber-500 text-white'
              : 'bg-white/20 text-white'
          )}>
            {winner.seatNumber}
          </div>
          <span className={cn(
            'font-semibold',
            isCurrentPlayer ? 'text-amber-100' : 'text-white'
          )}>
            {isCurrentPlayer ? 'Вы' : winner.playerName || `Игрок ${winner.seatNumber}`}
          </span>
        </div>
      </div>

      {/* Won amount with chips */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 + index * 0.1 }}
        className="flex items-center gap-3 mb-3"
      >
        <PPPokerChips amount={winner.amount} size="md" showValue={false} />
        <motion.span
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={cn(
            'text-xl font-bold',
            isCurrentPlayer ? 'text-amber-300' : 'text-green-400'
          )}
        >
          +{winner.amount.toLocaleString()}
        </motion.span>
      </motion.div>

      {/* Hand rank */}
      {winner.handRank && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 + index * 0.1 }}
          className={cn(
            'text-sm mb-3 font-medium',
            isCurrentPlayer ? 'text-amber-200' : 'text-white/70'
          )}
        >
          {winner.handRank}
        </motion.p>
      )}

      {/* Winning cards */}
      {winner.cards && winner.cards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + index * 0.1 }}
          className="flex gap-1"
        >
          {winner.cards.map((card, i) => (
            <PPPokerCard
              key={i}
              card={card}
              size="sm"
              delay={i}
              isWinning={true}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
});

export const PPPokerWinnerDisplay = memo(function PPPokerWinnerDisplay({
  winners,
  currentPlayerId,
  onComplete,
  autoHideDuration = 4000
}: PPPokerWinnerDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isMyWin = winners.some(w => w.playerId === currentPlayerId);

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onComplete?.(), 300);
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onComplete]);

  if (winners.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onComplete?.(), 300);
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Confetti for winner */}
          {isMyWin && <CoinsRain />}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.7, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            className={cn(
              'relative z-10 p-6 rounded-2xl max-w-md w-full mx-4',
              isMyWin
                ? 'bg-gradient-to-br from-amber-900/90 via-yellow-900/90 to-amber-900/90'
                : 'bg-gradient-to-br from-slate-800/95 to-slate-900/95'
            )}
            style={{
              boxShadow: isMyWin
                ? '0 0 60px 20px rgba(251, 191, 36, 0.3)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sparkles decoration */}
            {isMyWin && (
              <>
                <motion.div
                  animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                  transition={{ 
                    rotate: { repeat: Infinity, duration: 6, ease: 'linear' },
                    scale: { repeat: Infinity, duration: 1.5 }
                  }}
                  className="absolute -top-4 -left-4"
                >
                  <Sparkles className="w-10 h-10 text-amber-300" />
                </motion.div>
                <motion.div
                  animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                  transition={{ 
                    rotate: { repeat: Infinity, duration: 6, ease: 'linear' },
                    scale: { repeat: Infinity, duration: 1.5, delay: 0.5 }
                  }}
                  className="absolute -top-4 -right-4"
                >
                  <Sparkles className="w-10 h-10 text-amber-300" />
                </motion.div>
              </>
            )}

            {/* Trophy icon */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="flex justify-center mb-4"
            >
              <motion.div
                animate={isMyWin ? { 
                  rotateY: [0, 360],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  'p-4 rounded-full',
                  isMyWin
                    ? 'bg-gradient-to-br from-amber-400/40 to-yellow-500/40'
                    : 'bg-white/10'
                )}
              >
                <Trophy className={cn(
                  'w-12 h-12',
                  isMyWin ? 'text-amber-300' : 'text-slate-400'
                )} />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                'text-2xl font-bold text-center mb-6',
                isMyWin ? 'text-amber-100' : 'text-white'
              )}
            >
              {isMyWin ? '🎉 Победа!' : 'Раздача завершена'}
            </motion.h2>

            {/* Winners list */}
            <div className="space-y-3">
              {winners.map((winner, index) => (
                <WinnerCard
                  key={winner.playerId}
                  winner={winner}
                  isCurrentPlayer={winner.playerId === currentPlayerId}
                  index={index}
                />
              ))}
            </div>

            {/* Continue hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1 }}
              className="text-center mt-4 text-sm text-white/50"
            >
              Нажмите для продолжения
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PPPokerWinnerDisplay;
