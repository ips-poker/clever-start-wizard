/**
 * Professional Showdown Component
 * TDA-compliant sequential card reveal with winner highlighting
 * Based on PokerStars/PPPoker showdown presentation
 */
import React, { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Crown } from 'lucide-react';
import { MemoizedPokerCard } from './MemoizedPokerCard';

interface ShowdownPlayer {
  playerId: string;
  name: string;
  seatNumber: number;
  holeCards: string[];
  handName?: string;
  bestCards?: string[];
  isWinner?: boolean;
  wonAmount?: number;
}

interface ProfessionalShowdownProps {
  players: ShowdownPlayer[];
  communityCards: string[];
  pot: number;
  /** Delay per player reveal in ms */
  revealDelay?: number;
  /** Show order based on TDA rules (last aggressor first) */
  showdownOrder?: string[];
  onComplete?: () => void;
  className?: string;
}

// Professional timings
const TIMINGS = {
  playerRevealDelay: 500,    // Delay between each player's cards
  cardFlipDuration: 300,     // Time for card flip animation
  winnerHighlightDelay: 800, // Delay before showing winner highlight
  potCollectionDelay: 1500,  // Delay for pot collection after winner
};

// Card with flip animation
const FlippingCard = memo(function FlippingCard({
  card,
  delay,
  isWinningCard,
}: {
  card: string;
  delay: number;
  isWinningCard: boolean;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsFlipped(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="relative" style={{ perspective: 500 }}>
      <motion.div
        initial={{ rotateY: 180, scale: 0.9 }}
        animate={{ 
          rotateY: isFlipped ? 0 : 180,
          scale: isFlipped && isWinningCard ? 1.05 : 1
        }}
        transition={{ 
          duration: TIMINGS.cardFlipDuration / 1000,
          ease: 'easeOut'
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        <MemoizedPokerCard
          card={isFlipped ? card : '??'}
          faceDown={!isFlipped}
          size="md"
          animate={false}
        />
        
        {/* Winning card glow */}
        {isFlipped && isWinningCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-lg ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
});

// Single player's showdown row
const ShowdownPlayerRow = memo(function ShowdownPlayerRow({
  player,
  revealDelay,
  communityCards,
}: {
  player: ShowdownPlayer;
  revealDelay: number;
  communityCards: string[];
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    const revealTimer = setTimeout(() => setIsRevealed(true), revealDelay);
    const winnerTimer = setTimeout(
      () => setShowWinner(true),
      revealDelay + TIMINGS.winnerHighlightDelay
    );
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(winnerTimer);
    };
  }, [revealDelay]);

  // Determine which cards are part of winning hand
  const winningHoleCards = useMemo(() => {
    if (!player.bestCards) return new Set<string>();
    return new Set(
      player.bestCards.filter(c => player.holeCards.includes(c))
    );
  }, [player.bestCards, player.holeCards]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: revealDelay / 1000 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-colors',
        player.isWinner && showWinner
          ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30'
          : 'bg-black/20'
      )}
    >
      {/* Winner indicator */}
      {player.isWinner && showWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="p-1.5 rounded-full bg-amber-500"
        >
          <Crown className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* Player name */}
      <div className="flex-shrink-0 w-24">
        <p className={cn(
          'font-semibold text-sm truncate',
          player.isWinner && showWinner ? 'text-amber-400' : 'text-white'
        )}>
          {player.name}
        </p>
        {player.handName && isRevealed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-400 mt-0.5"
          >
            {player.handName}
          </motion.p>
        )}
      </div>

      {/* Hole cards */}
      <div className="flex gap-1">
        {player.holeCards.map((card, idx) => (
          <FlippingCard
            key={`${player.playerId}-${card}-${idx}`}
            card={card}
            delay={revealDelay + idx * 100}
            isWinningCard={winningHoleCards.has(card)}
          />
        ))}
      </div>

      {/* Won amount */}
      {player.isWinner && player.wonAmount && showWinner && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm"
        >
          <Trophy className="w-4 h-4" />
          +{player.wonAmount.toLocaleString()}
        </motion.div>
      )}
    </motion.div>
  );
});

export const ProfessionalShowdown = memo(function ProfessionalShowdown({
  players,
  communityCards,
  pot,
  revealDelay = TIMINGS.playerRevealDelay,
  showdownOrder,
  onComplete,
  className,
}: ProfessionalShowdownProps) {
  const [showComplete, setShowComplete] = useState(false);

  // Sort players by showdown order if provided, else by seat
  const orderedPlayers = useMemo(() => {
    // Guard against undefined/null players
    if (!players || players.length === 0) return [];
    
    if (!showdownOrder || showdownOrder.length === 0) {
      return [...players].sort((a, b) => a.seatNumber - b.seatNumber);
    }
    
    return showdownOrder
      .map(id => players.find(p => p.playerId === id))
      .filter(Boolean) as ShowdownPlayer[];
  }, [players, showdownOrder]);

  // Calculate total showdown duration
  useEffect(() => {
    const totalDuration = orderedPlayers.length * revealDelay + TIMINGS.potCollectionDelay;
    const timer = setTimeout(() => {
      setShowComplete(true);
      onComplete?.();
    }, totalDuration);
    
    return () => clearTimeout(timer);
  }, [orderedPlayers.length, revealDelay, onComplete]);

  if (players.length === 0) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm',
      className
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/50 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white">Showdown</h2>
          <p className="text-sm text-gray-400">
            Банк: <span className="text-amber-400 font-semibold">{pot.toLocaleString()}</span>
          </p>
        </div>

        {/* Community cards reminder */}
        <div className="flex justify-center gap-1 mb-4">
          {communityCards.map((card, idx) => (
            <MemoizedPokerCard
              key={`community-${card}-${idx}`}
              card={card}
              size="sm"
              animate={false}
            />
          ))}
        </div>

        {/* Players */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {orderedPlayers.map((player, index) => (
            <ShowdownPlayerRow
              key={player.playerId}
              player={player}
              revealDelay={index * revealDelay}
              communityCards={communityCards}
            />
          ))}
        </div>

        {/* Continue hint */}
        <AnimatePresence>
          {showComplete && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-gray-500 mt-4"
            >
              Следующая раздача начнётся автоматически...
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

export default ProfessionalShowdown;
