/**
 * FinalTableOverlay - Professional final table transition animation
 * PokerStars/GGPoker style with dramatic entrance
 */
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Trophy, Star, Sparkles, ChevronRight, Users, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinalTablePlayer {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  stack: number;
  rank: number;
}

export interface FinalTableTransition {
  tournamentId: string;
  tournamentName: string;
  players: FinalTablePlayer[];
  prizePool: number;
  firstPrize: number;
  timestamp: number;
}

interface FinalTableOverlayProps {
  data: FinalTableTransition | null;
  onComplete?: () => void;
  className?: string;
}

export const FinalTableOverlay = memo(function FinalTableOverlay({
  data,
  onComplete,
  className
}: FinalTableOverlayProps) {
  const [phase, setPhase] = useState<'intro' | 'players' | 'prizes' | 'complete'>('intro');
  const [visiblePlayers, setVisiblePlayers] = useState<number>(0);

  useEffect(() => {
    if (!data) {
      setPhase('intro');
      setVisiblePlayers(0);
      return;
    }

    // Animation sequence
    const timeline = [
      { phase: 'intro' as const, delay: 0 },
      { phase: 'players' as const, delay: 2500 },
      { phase: 'prizes' as const, delay: 2500 + data.players.length * 400 + 1000 },
      { phase: 'complete' as const, delay: 2500 + data.players.length * 400 + 4000 },
    ];

    const timers: NodeJS.Timeout[] = [];

    timeline.forEach(({ phase: p, delay }) => {
      timers.push(setTimeout(() => setPhase(p), delay));
    });

    // Reveal players one by one
    data.players.forEach((_, index) => {
      timers.push(setTimeout(() => setVisiblePlayers(index + 1), 2500 + index * 400));
    });

    // Auto close
    timers.push(setTimeout(() => {
      onComplete?.();
    }, 2500 + data.players.length * 400 + 5000));

    return () => timers.forEach(clearTimeout);
  }, [data, onComplete]);

  const formatChips = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  if (!data) return null;

  const sortedPlayers = [...data.players].sort((a, b) => a.rank - b.rank);

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
        {/* Dramatic background */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.3) 0%, rgba(15,15,30,0.98) 70%)'
          }}
        />

        {/* Animated spotlight beams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-40 h-[200%] opacity-10"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.3), transparent)',
                left: `${20 + i * 20}%`,
                top: '-50%',
                transformOrigin: 'top center',
              }}
              animate={{
                rotate: [i % 2 === 0 ? -15 : 15, i % 2 === 0 ? 15 : -15, i % 2 === 0 ? -15 : 15],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        {/* Sparkle particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [-20, 20],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-4xl w-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          {/* Intro Phase - Big announcement */}
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                transition={{ type: 'spring', damping: 12 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Crown className="h-24 w-24 text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                </motion.div>
                
                <motion.h1
                  className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 mb-4"
                  style={{ textShadow: '0 0 60px rgba(250,204,21,0.4)' }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ФИНАЛЬНЫЙ СТОЛ
                </motion.h1>
                
                <motion.p
                  className="text-xl text-yellow-100/80 mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {data.tournamentName}
                </motion.p>
                
                <motion.div
                  className="flex items-center gap-4 text-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Users className="h-5 w-5" />
                    <span>{data.players.length} игроков</span>
                  </div>
                  <div className="text-white/40">•</div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <Trophy className="h-5 w-5" />
                    <span>Призовой фонд: {formatCurrency(data.prizePool)} 💎</span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Players Phase - Reveal each player */}
            {phase === 'players' && (
              <motion.div
                key="players"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <motion.h2
                  className="text-3xl font-bold text-white/90 mb-8"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Финалисты
                </motion.h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50, scale: 0.8 }}
                      animate={index < visiblePlayers ? { 
                        opacity: 1, 
                        x: 0, 
                        scale: 1 
                      } : {}}
                      transition={{ type: 'spring', damping: 15 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border",
                        "bg-gradient-to-r from-slate-800/80 to-slate-900/80",
                        "border-white/10 backdrop-blur-sm",
                        index === 0 && "ring-2 ring-yellow-500/50 from-yellow-900/20"
                      )}
                    >
                      {/* Rank badge */}
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                        index === 0 && "bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-900",
                        index === 1 && "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900",
                        index === 2 && "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
                        index > 2 && "bg-slate-700 text-white/70"
                      )}>
                        {player.rank}
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-slate-700 ring-2 ring-white/10">
                        {player.playerAvatar ? (
                          <img 
                            src={player.playerAvatar} 
                            alt={player.playerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/60">
                            {player.playerName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-white truncate">
                          {player.playerName}
                        </p>
                        <p className="text-sm text-emerald-400 font-mono">
                          {formatChips(player.stack)} фишек
                        </p>
                      </div>
                      
                      {index === 0 && (
                        <Star className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Prizes Phase - Show what's at stake */}
            {(phase === 'prizes' || phase === 'complete') && (
              <motion.div
                key="prizes"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="mb-4"
                  >
                    <Award className="h-16 w-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white/90 mb-2">
                    На кону
                  </h2>
                  
                  <motion.div
                    className="flex items-center gap-2 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                    {formatCurrency(data.firstPrize)} 💎
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                  </motion.div>
                  
                  <p className="text-lg text-white/60 mt-2">
                    За первое место
                  </p>
                </div>

                <motion.div
                  className="flex items-center justify-center gap-3 text-white/70"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span>Удачи всем финалистам!</span>
                  <ChevronRight className="h-5 w-5 animate-pulse" />
                </motion.div>

                {phase === 'complete' && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onComplete}
                    className={cn(
                      "px-8 py-3 rounded-xl font-semibold text-lg",
                      "bg-gradient-to-r from-yellow-500 to-amber-600",
                      "text-slate-900 shadow-lg shadow-yellow-500/30",
                      "hover:shadow-xl hover:shadow-yellow-500/40 transition-all"
                    )}
                  >
                    Начать игру
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default FinalTableOverlay;
