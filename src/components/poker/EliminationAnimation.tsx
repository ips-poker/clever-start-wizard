/**
 * EliminationAnimation - Professional elimination animation like PokerStars
 * Shows when a player is eliminated from a tournament with prize info
 */
import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Trophy, Award, DollarSign, ChevronRight, Medal, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EliminationData {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  finishPosition: number;
  totalPlayers: number;
  prizeAmount?: number;
  prizeType?: 'diamonds' | 'tickets' | 'rps';
  tournamentName: string;
  eliminatedBy?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  timestamp: number;
}

interface EliminationAnimationProps {
  elimination: EliminationData | null;
  currentPlayerId: string;
  onComplete?: () => void;
  onViewResults?: () => void;
  className?: string;
}

const positionColors: Record<number, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  1: {
    bg: 'from-amber-500/90 via-yellow-400/90 to-amber-600/90',
    border: 'border-amber-300',
    text: 'text-amber-100',
    icon: <Trophy className="w-10 h-10 text-amber-200" />
  },
  2: {
    bg: 'from-slate-400/90 via-gray-300/90 to-slate-500/90',
    border: 'border-gray-300',
    text: 'text-gray-100',
    icon: <Medal className="w-10 h-10 text-gray-200" />
  },
  3: {
    bg: 'from-amber-700/90 via-orange-600/90 to-amber-800/90',
    border: 'border-amber-500',
    text: 'text-amber-200',
    icon: <Award className="w-10 h-10 text-amber-300" />
  }
};

const defaultColors = {
  bg: 'from-red-900/90 via-red-800/90 to-black/90',
  border: 'border-red-500/50',
  text: 'text-red-200',
  icon: <Skull className="w-10 h-10 text-red-300" />
};

export const EliminationAnimation = memo(function EliminationAnimation({
  elimination,
  currentPlayerId,
  onComplete,
  onViewResults,
  className
}: EliminationAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<'entrance' | 'details' | 'exit'>('entrance');

  useEffect(() => {
    if (elimination) {
      setIsVisible(true);
      setPhase('entrance');
      
      // Transition to details phase
      const detailsTimer = setTimeout(() => setPhase('details'), 800);
      
      // Auto dismiss after 8 seconds (unless in money)
      const autoClose = elimination.prizeAmount && elimination.prizeAmount > 0 ? 12000 : 6000;
      const exitTimer = setTimeout(() => {
        setPhase('exit');
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 500);
      }, autoClose);
      
      return () => {
        clearTimeout(detailsTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [elimination, onComplete]);

  if (!elimination || !isVisible) return null;

  const isCurrentPlayer = elimination.playerId === currentPlayerId;
  const inMoney = elimination.prizeAmount && elimination.prizeAmount > 0;
  const colors = positionColors[elimination.finishPosition] || defaultColors;
  
  // Format position with ordinal
  const getPositionText = (pos: number) => {
    if (pos === 1) return '1-е место';
    if (pos === 2) return '2-е место';
    if (pos === 3) return '3-е место';
    return `${pos}-е место`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop with particles */}
          <motion.div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Animated particles for in-money finishes */}
            {inMoney && (
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "absolute w-2 h-2 rounded-full",
                      elimination.finishPosition === 1 ? "bg-amber-400" :
                      elimination.finishPosition === 2 ? "bg-gray-300" :
                      elimination.finishPosition === 3 ? "bg-orange-400" : "bg-green-400"
                    )}
                    initial={{
                      x: `${50 + (Math.random() - 0.5) * 20}%`,
                      y: `100%`,
                      scale: Math.random() * 0.5 + 0.5,
                      opacity: 1
                    }}
                    animate={{
                      y: `-20%`,
                      x: `${50 + (Math.random() - 0.5) * 100}%`,
                      opacity: 0,
                      rotate: Math.random() * 360
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Main card */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-w-md mx-4",
              "rounded-2xl border-2 shadow-2xl overflow-hidden",
              `bg-gradient-to-br ${colors.bg} ${colors.border}`,
              className
            )}
            initial={{ scale: 0.5, y: 100, rotateX: 45 }}
            animate={{ 
              scale: phase === 'exit' ? 0.9 : 1, 
              y: phase === 'exit' ? -50 : 0,
              rotateX: 0,
              opacity: phase === 'exit' ? 0 : 1
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* Glow effect for winners */}
            {inMoney && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Header */}
            <div className="relative p-6 text-center">
              {/* Icon */}
              <motion.div
                className="mx-auto mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              >
                <div className={cn(
                  "inline-flex items-center justify-center w-20 h-20 rounded-full",
                  inMoney ? "bg-white/20" : "bg-black/30"
                )}>
                  {colors.icon}
                  {inMoney && (
                    <motion.div
                      className="absolute"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-24 h-24 text-white/30" />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-white mb-1">
                  {isCurrentPlayer ? (
                    inMoney ? 'Поздравляем!' : 'Вы выбыли'
                  ) : (
                    `${elimination.playerName} выбыл`
                  )}
                </h2>
                <p className={cn("text-lg font-medium", colors.text)}>
                  {getPositionText(elimination.finishPosition)} из {elimination.totalPlayers}
                </p>
              </motion.div>
            </div>

            {/* Tournament info */}
            <motion.div
              className="px-6 py-3 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-center text-white/70 text-sm">
                {elimination.tournamentName}
              </p>
            </motion.div>

            {/* Prize section */}
            {inMoney && (
              <motion.div
                className="px-6 py-5 bg-black/10"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    {elimination.prizeType === 'tickets' ? (
                      <Award className="w-6 h-6 text-green-400" />
                    ) : (
                      <DollarSign className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Ваш приз</p>
                    <p className="text-2xl font-bold text-green-400">
                      {elimination.prizeType === 'diamonds' && '💎 '}
                      {elimination.prizeAmount?.toLocaleString()}
                      {elimination.prizeType === 'tickets' && ' билетов'}
                      {elimination.prizeType === 'rps' && ' RPS'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Eliminated by section (if applicable) */}
            {elimination.eliminatedBy && !inMoney && (
              <motion.div
                className="px-6 py-4 border-t border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-center text-white/60 text-sm">
                  Выбил: <span className="text-white font-medium">{elimination.eliminatedBy.name}</span>
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              className="p-4 flex gap-3 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {isCurrentPlayer && (
                <>
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      setPhase('exit');
                      setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                      }, 300);
                    }}
                  >
                    Закрыть
                  </Button>
                  {onViewResults && (
                    <Button
                      className="bg-white text-black hover:bg-white/90"
                      onClick={() => {
                        onViewResults();
                        setPhase('exit');
                        setTimeout(() => {
                          setIsVisible(false);
                          onComplete?.();
                        }, 300);
                      }}
                    >
                      Результаты
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </>
              )}
            </motion.div>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default EliminationAnimation;
