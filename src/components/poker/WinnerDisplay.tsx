import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Winner {
  playerId: string;
  playerName?: string;
  seatNumber: number;
  amount: number;
  handRank?: string;
  cards?: string[];
}

interface WinnerDisplayProps {
  winners: Winner[];
  playerId: string;
  onClose?: () => void;
}

export function WinnerDisplay({ winners, playerId, onClose }: WinnerDisplayProps) {
  if (winners.length === 0) return null;

  const isMyWin = winners.some(w => w.playerId === playerId);

  const renderCard = (card: string) => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const isRed = suit === 'h' || suit === 'd';
    
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center w-8 h-10 rounded bg-white text-sm font-bold shadow',
          isRed ? 'text-red-500' : 'text-gray-900'
        )}
      >
        {rank}{suitSymbols[suit]}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        transition={{ type: 'spring', damping: 15 }}
        className={cn(
          "relative p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4",
          isMyWin 
            ? "bg-gradient-to-br from-amber-500/90 to-yellow-600/90" 
            : "bg-gradient-to-br from-slate-700/90 to-slate-800/90"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkles animation for winner */}
        {isMyWin && (
          <>
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 8, ease: 'linear' },
                scale: { repeat: Infinity, duration: 2 }
              }}
              className="absolute -top-6 -left-6"
            >
              <Sparkles className="h-12 w-12 text-yellow-300" />
            </motion.div>
            <motion.div
              animate={{ 
                rotate: -360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 8, ease: 'linear' },
                scale: { repeat: Infinity, duration: 2, delay: 0.5 }
              }}
              className="absolute -top-6 -right-6"
            >
              <Sparkles className="h-12 w-12 text-yellow-300" />
            </motion.div>
          </>
        )}

        {/* Trophy */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="flex justify-center mb-4"
        >
          <div className={cn(
            "p-4 rounded-full",
            isMyWin ? "bg-yellow-400/30" : "bg-slate-600/50"
          )}>
            <Trophy className={cn(
              "h-16 w-16",
              isMyWin ? "text-yellow-100" : "text-slate-400"
            )} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "text-2xl font-bold text-center mb-6",
            isMyWin ? "text-white" : "text-slate-200"
          )}
        >
          {isMyWin ? '🎉 Вы выиграли!' : 'Раздача завершена'}
        </motion.h2>

        {/* Winners list */}
        <div className="space-y-4">
          {winners.map((winner, index) => (
            <motion.div
              key={winner.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={cn(
                "p-4 rounded-xl",
                winner.playerId === playerId 
                  ? "bg-white/20" 
                  : "bg-black/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "font-semibold",
                  isMyWin ? "text-white" : "text-slate-200"
                )}>
                  {winner.playerId === playerId ? 'Вы' : winner.playerName || `Игрок ${winner.seatNumber}`}
                </span>
                <div className="flex items-center gap-1 text-lg font-bold text-white">
                  <Coins className="h-5 w-5" />
                  +{winner.amount.toLocaleString()}
                </div>
              </div>
              
              {/* Hand rank */}
              {winner.handRank && (
                <p className={cn(
                  "text-sm mb-2",
                  isMyWin ? "text-yellow-100" : "text-slate-400"
                )}>
                  {winner.handRank}
                </p>
              )}
              
              {/* Cards */}
              {winner.cards && winner.cards.length > 0 && (
                <div className="flex gap-1">
                  {winner.cards.map((card, i) => (
                    <div key={i}>{renderCard(card)}</div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Close hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={cn(
            "text-center mt-6 text-sm",
            isMyWin ? "text-yellow-100/70" : "text-slate-500"
          )}
        >
          Нажмите для продолжения
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
