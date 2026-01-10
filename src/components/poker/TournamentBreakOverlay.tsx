/**
 * Tournament Break Overlay
 * Full-screen overlay displayed on poker table during tournament breaks
 * PokerStars-style professional break display
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Clock, Users, Trophy, Pause } from 'lucide-react';

interface TournamentBreakOverlayProps {
  breakInfo: {
    type: 'break_starting' | 'break_started' | 'break_ended';
    tournamentId: string;
    tournamentName: string;
    durationMinutes: number;
    durationSeconds: number;
    timestamp: number;
  } | null;
  tournamentInfo?: {
    playersRemaining?: number;
    averageStack?: number;
    currentLevel?: number;
    nextBlindsSB?: number;
    nextBlindsBB?: number;
    nextAnte?: number;
  };
}

export function TournamentBreakOverlay({ 
  breakInfo,
  tournamentInfo
}: TournamentBreakOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!breakInfo || breakInfo.type !== 'break_started') {
      setTimeRemaining(0);
      return;
    }

    const breakEndTime = breakInfo.timestamp + (breakInfo.durationSeconds * 1000);
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((breakEndTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [breakInfo]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Only show for active break (not break_starting or break_ended)
  if (!breakInfo || breakInfo.type !== 'break_started') {
    return null;
  }

  const isEnding = timeRemaining <= 30;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)'
        }}
      >
        {/* Central break card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative max-w-lg w-full mx-4"
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute -inset-4 rounded-3xl opacity-30"
            animate={{ 
              boxShadow: isEnding 
                ? ['0 0 30px rgba(251,191,36,0.5)', '0 0 60px rgba(251,191,36,0.3)', '0 0 30px rgba(251,191,36,0.5)']
                : ['0 0 30px rgba(34,197,94,0.3)', '0 0 50px rgba(34,197,94,0.2)', '0 0 30px rgba(34,197,94,0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-white/10 ${isEnding ? 'bg-amber-500/20' : 'bg-emerald-500/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${isEnding ? 'bg-amber-500/30' : 'bg-emerald-500/20'}`}>
                  {isEnding ? (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Pause className="h-7 w-7 text-amber-400" />
                    </motion.div>
                  ) : (
                    <Coffee className="h-7 w-7 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isEnding ? 'Перерыв заканчивается!' : 'Перерыв'}
                  </h2>
                  <p className="text-white/60 text-sm truncate max-w-[200px]">
                    {breakInfo.tournamentName}
                  </p>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="px-6 py-8 flex flex-col items-center">
              <div className="flex items-center gap-3 mb-2">
                <Clock className={`h-6 w-6 ${isEnding ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-white/60 uppercase tracking-wider text-sm font-medium">
                  До начала раздач
                </span>
              </div>
              
              <motion.div
                className={`text-6xl font-mono font-bold tracking-wider ${
                  isEnding ? 'text-amber-400' : 'text-emerald-400'
                }`}
                animate={isEnding ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {formatTime(timeRemaining)}
              </motion.div>

              {isEnding && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-amber-400/80 text-sm font-medium"
                >
                  Приготовьтесь к продолжению игры
                </motion.p>
              )}
            </div>

            {/* Tournament info */}
            {tournamentInfo && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-3 gap-3">
                  {tournamentInfo.playersRemaining && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <Users className="h-4 w-4 text-white/40 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">{tournamentInfo.playersRemaining}</p>
                      <p className="text-[10px] text-white/50 uppercase">Игроков</p>
                    </div>
                  )}
                  
                  {tournamentInfo.averageStack && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <Trophy className="h-4 w-4 text-white/40 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">
                        {Math.round(tournamentInfo.averageStack).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-white/50 uppercase">Avg Stack</p>
                    </div>
                  )}
                  
                  {tournamentInfo.currentLevel && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="h-4 w-4 mx-auto mb-1 text-white/40 flex items-center justify-center text-xs font-bold">
                        LVL
                      </div>
                      <p className="text-lg font-bold text-white">{tournamentInfo.currentLevel}</p>
                      <p className="text-[10px] text-white/50 uppercase">Уровень</p>
                    </div>
                  )}
                </div>

                {/* Next blinds info */}
                {(tournamentInfo.nextBlindsSB || tournamentInfo.nextBlindsBB) && (
                  <div className="mt-3 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                    <p className="text-amber-400/80 text-xs uppercase tracking-wider mb-1 text-center">
                      Блайнды после перерыва
                    </p>
                    <p className="text-center text-white font-bold">
                      {tournamentInfo.nextBlindsSB?.toLocaleString()} / {tournamentInfo.nextBlindsBB?.toLocaleString()}
                      {tournamentInfo.nextAnte ? ` (ante ${tournamentInfo.nextAnte})` : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom indicator */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Все столы синхронизированы</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating coffee cups animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/10"
              initial={{ 
                x: Math.random() * 100 - 50 + '%', 
                y: '110%',
                rotate: Math.random() * 40 - 20
              }}
              animate={{ 
                y: '-10%',
                rotate: Math.random() * 40 - 20
              }}
              transition={{ 
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                delay: i * 3,
                ease: 'linear'
              }}
            >
              <Coffee className="h-8 w-8" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TournamentBreakOverlay;
