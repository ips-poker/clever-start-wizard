/**
 * PrizePayoutOverlay - Shows payout animation when player wins prize
 * Professional celebration with confetti and prize reveal
 */
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Gem, Ticket, Award, Star, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrizePayoutData {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  tournamentName: string;
  finishPosition: number;
  totalPlayers: number;
  prizeAmount: number;
  prizeType: 'diamonds' | 'tickets' | 'rps';
  timestamp: number;
}

interface PrizePayoutOverlayProps {
  data: PrizePayoutData | null;
  onComplete?: () => void;
  className?: string;
}

// Confetti particle component
const Confetti = memo(function Confetti({ index }: { index: number }) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 2 + Math.random() * 2;
  const size = 6 + Math.random() * 6;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-5%',
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: '2px',
      }}
      initial={{ y: 0, rotate: rotation, opacity: 1 }}
      animate={{
        y: '120vh',
        rotate: rotation + 720,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeIn',
      }}
    />
  );
});

export const PrizePayoutOverlay = memo(function PrizePayoutOverlay({
  data,
  onComplete,
  className
}: PrizePayoutOverlayProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'reveal' | 'celebrate' | 'complete'>('reveal');

  useEffect(() => {
    if (!data) {
      setPhase('reveal');
      setShowConfetti(false);
      return;
    }

    // Start confetti immediately
    setShowConfetti(true);

    const timers = [
      setTimeout(() => setPhase('celebrate'), 1500),
      setTimeout(() => setPhase('complete'), 4000),
      setTimeout(() => onComplete?.(), 6000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [data, onComplete]);

  if (!data) return null;

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getPositionLabel = (pos: number): string => {
    if (pos === 1) return '1-е место';
    if (pos === 2) return '2-е место';
    if (pos === 3) return '3-е место';
    return `${pos}-е место`;
  };

  const getPrizeIcon = () => {
    switch (data.prizeType) {
      case 'diamonds':
        return <Gem className="h-10 w-10 text-cyan-400" />;
      case 'tickets':
        return <Ticket className="h-10 w-10 text-purple-400" />;
      case 'rps':
        return <Award className="h-10 w-10 text-amber-400" />;
      default:
        return <Trophy className="h-10 w-10 text-yellow-400" />;
    }
  };

  const getPrizeLabel = () => {
    switch (data.prizeType) {
      case 'diamonds':
        return 'алмазов';
      case 'tickets':
        return 'билетов';
      case 'rps':
        return 'RPS очков';
      default:
        return '';
    }
  };

  const getGradient = () => {
    if (data.finishPosition === 1) {
      return 'from-yellow-500/30 via-amber-600/20 to-yellow-500/30';
    }
    if (data.finishPosition === 2) {
      return 'from-slate-400/30 via-slate-500/20 to-slate-400/30';
    }
    if (data.finishPosition === 3) {
      return 'from-amber-700/30 via-amber-800/20 to-amber-700/30';
    }
    return 'from-emerald-500/20 via-emerald-600/15 to-emerald-500/20';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          className
        )}
      >
        {/* Background */}
        <motion.div
          className="absolute inset-0 backdrop-blur-md"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(20,30,40,0.92) 0%, rgba(10,15,20,0.98) 100%)'
          }}
        />

        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {[...Array(60)].map((_, i) => (
              <Confetti key={i} index={i} />
            ))}
          </div>
        )}

        {/* Glowing orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-30"
              style={{
                width: 100 + i * 50,
                height: 100 + i * 50,
                background: data.finishPosition === 1 
                  ? 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)',
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <motion.div
          className={cn(
            "relative z-20 text-center px-6 py-10 rounded-3xl max-w-lg w-full mx-4",
            "bg-gradient-to-b from-slate-800/90 to-slate-900/95",
            "border border-white/10 shadow-2xl backdrop-blur-xl"
          )}
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          {/* Animated gradient border */}
          <motion.div
            className={cn(
              "absolute -inset-[2px] rounded-3xl -z-10",
              `bg-gradient-to-r ${getGradient()}`
            )}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Top celebration icon */}
          <motion.div
            className="absolute -top-10 left-1/2 -translate-x-1/2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, delay: 0.2 }}
          >
            <div className={cn(
              "p-4 rounded-full shadow-xl",
              data.finishPosition === 1 && "bg-gradient-to-br from-yellow-400 to-amber-600",
              data.finishPosition === 2 && "bg-gradient-to-br from-slate-300 to-slate-500",
              data.finishPosition === 3 && "bg-gradient-to-br from-amber-600 to-amber-800",
              data.finishPosition > 3 && "bg-gradient-to-br from-emerald-500 to-emerald-700"
            )}>
              {data.finishPosition <= 3 ? (
                <Trophy className={cn(
                  "h-10 w-10",
                  data.finishPosition === 1 && "text-yellow-900",
                  data.finishPosition === 2 && "text-slate-700",
                  data.finishPosition === 3 && "text-amber-100"
                )} />
              ) : (
                <Award className="h-10 w-10 text-white" />
              )}
            </div>
          </motion.div>

          {/* Player avatar */}
          <motion.div
            className="mt-6 mb-4 flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-700 ring-4 ring-white/10">
                {data.playerAvatar ? (
                  <img 
                    src={data.playerAvatar} 
                    alt={data.playerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/60">
                    {data.playerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Position badge */}
              <motion.div
                className={cn(
                  "absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg",
                  data.finishPosition === 1 && "bg-gradient-to-br from-yellow-400 to-amber-600 text-yellow-900",
                  data.finishPosition === 2 && "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-800",
                  data.finishPosition === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
                  data.finishPosition > 3 && "bg-emerald-600 text-white"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
              >
                {data.finishPosition}
              </motion.div>
            </div>
          </motion.div>

          {/* Player name */}
          <motion.h2
            className="text-2xl font-bold text-white mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {data.playerName}
          </motion.h2>

          {/* Position */}
          <motion.p
            className={cn(
              "text-lg font-semibold mb-6",
              data.finishPosition === 1 && "text-yellow-400",
              data.finishPosition === 2 && "text-slate-300",
              data.finishPosition === 3 && "text-amber-500",
              data.finishPosition > 3 && "text-emerald-400"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {getPositionLabel(data.finishPosition)}
            <span className="text-white/40 text-sm ml-2">
              из {data.totalPlayers}
            </span>
          </motion.p>

          {/* Prize reveal */}
          <AnimatePresence mode="wait">
            {phase === 'reveal' && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <PartyPopper className="h-16 w-16 text-yellow-400" />
                </motion.div>
                <p className="text-white/60 mt-4">Поздравляем!</p>
              </motion.div>
            )}

            {(phase === 'celebrate' || phase === 'complete') && (
              <motion.div
                key="prize"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                  
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-1">Ваш выигрыш</p>
                    <motion.div
                      className="flex items-center justify-center gap-2"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {getPrizeIcon()}
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                        {formatNumber(data.prizeAmount)}
                      </span>
                    </motion.div>
                    <p className="text-white/50 text-sm mt-1">{getPrizeLabel()}</p>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: [0, -360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                </div>

                <p className="text-white/40 text-sm">
                  {data.tournamentName}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close button */}
          {phase === 'complete' && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className={cn(
                "mt-8 px-8 py-3 rounded-xl font-semibold",
                "bg-gradient-to-r from-emerald-500 to-teal-600",
                "text-white shadow-lg shadow-emerald-500/30",
                "hover:shadow-xl transition-all"
              )}
            >
              Отлично!
            </motion.button>
          )}

          {/* Floating stars decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.8, 1.2, 0.8],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                <Star className="h-4 w-4 text-yellow-400/30" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default PrizePayoutOverlay;
