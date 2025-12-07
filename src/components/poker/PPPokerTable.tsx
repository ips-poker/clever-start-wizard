import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { MemoizedPokerCard } from './MemoizedPokerCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Crown } from 'lucide-react';

interface PPPokerTableProps {
  communityCards: string[];
  pot: number;
  phase: string;
  isBombPot?: boolean;
  winners?: Array<{ seatNumber: number; amount: number; handRank?: string }>;
  nextHandCountdown?: number;
}

export const PPPokerTable = memo(function PPPokerTable({
  communityCards,
  pot,
  phase,
  isBombPot = false,
  winners,
  nextHandCountdown = 0
}: PPPokerTableProps) {
  const hasWinners = winners && winners.length > 0;
  const totalWin = winners?.reduce((sum, w) => sum + w.amount, 0) || 0;
  const winningHand = winners?.[0]?.handRank || '';

  return (
    <div 
      className="absolute inset-4 md:inset-8 rounded-[100px] overflow-hidden"
      style={{
        background: isBombPot 
          ? 'radial-gradient(ellipse 80% 60% at 50% 50%, #5a3d2a 0%, #3d2819 40%, #261a0f 70%, #1a1108 100%)' 
          : 'radial-gradient(ellipse 80% 60% at 50% 50%, #1f8f52 0%, #157a43 30%, #0d5c33 60%, #073d22 100%)',
        boxShadow: isBombPot
          ? 'inset 0 0 100px rgba(0,0,0,0.6), inset 0 2px 8px rgba(255,255,255,0.05), 0 0 0 8px #3d2819, 0 0 0 12px #261a0f, 0 12px 48px rgba(0,0,0,0.6)'
          : 'inset 0 0 100px rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.03), 0 0 0 8px #0d5c33, 0 0 0 12px #073d22, 0 12px 48px rgba(0,0,0,0.6)',
      }}
    >
      {/* Inner rail/border */}
      <div 
        className="absolute inset-3 rounded-[88px] pointer-events-none"
        style={{
          border: isBombPot 
            ? '2px solid rgba(255, 165, 0, 0.25)' 
            : '2px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
        }}
      />

      {/* Table logo/branding */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
        <div className="text-4xl font-bold text-white tracking-widest">SYNDIKATE</div>
      </div>

      {/* Center content - pot, community cards, winner */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        
        {/* Winner announcement overlay */}
        <AnimatePresence>
          {hasWinners && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute -top-16 flex flex-col items-center z-30"
            >
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 px-5 py-2 rounded-full shadow-2xl shadow-yellow-500/50">
                <Crown className="w-5 h-5 text-yellow-900" />
                <span className="text-yellow-900 font-bold text-lg">
                  +{totalWin.toLocaleString()}
                </span>
              </div>
              {winningHand && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2 px-3 py-1 bg-black/60 rounded-lg"
                >
                  <span className="text-amber-400 text-sm font-medium">{winningHand}</span>
                </motion.div>
              )}
              {nextHandCountdown > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-white/60 text-xs"
                >
                  Следующая раздача через {nextHandCountdown}с
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pot display */}
        {pot > 0 && !hasWinners && (
          <motion.div 
            className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-lg">
              {pot.toLocaleString()}
            </span>
          </motion.div>
        )}

        {/* Community cards */}
        {communityCards.length > 0 && (
          <div className="flex gap-1.5">
            {communityCards.map((card, idx) => (
              <motion.div
                key={`${card}-${idx}`}
                initial={{ rotateY: 180, scale: 0.5 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ 
                  delay: idx * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
              >
                <MemoizedPokerCard 
                  card={card} 
                  size="md" 
                  animate={false}
                />
              </motion.div>
            ))}
            {/* Placeholder cards for remaining */}
            {phase !== 'showdown' && phase !== 'river' && (
              <>
                {Array.from({ length: 5 - communityCards.length }).map((_, idx) => (
                  <div 
                    key={`placeholder-${idx}`}
                    className="w-11 h-[62px] rounded-md border border-white/10 bg-black/20"
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Phase waiting - show card placeholders */}
        {phase === 'preflop' && communityCards.length === 0 && (
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div 
                key={`empty-${idx}`}
                className="w-11 h-[62px] rounded-md border border-white/10 bg-black/20"
              />
            ))}
          </div>
        )}
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-8 left-8 w-3 h-3 rounded-full bg-white/5" />
      <div className="absolute top-8 right-8 w-3 h-3 rounded-full bg-white/5" />
      <div className="absolute bottom-8 left-8 w-3 h-3 rounded-full bg-white/5" />
      <div className="absolute bottom-8 right-8 w-3 h-3 rounded-full bg-white/5" />
    </div>
  );
});
