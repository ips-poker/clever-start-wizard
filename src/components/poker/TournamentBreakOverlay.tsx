/**
 * TournamentBreakOverlay - Professional full-screen break overlay
 * PokerStars-style with countdown, tournament info, and animations
 */
import React, { useEffect, useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Clock, Users, Trophy, Pause, Play, TrendingUp, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    totalPlayers?: number;
    averageStack?: number;
    biggestStack?: number;
    currentLevel?: number;
    nextBlindsSB?: number;
    nextBlindsBB?: number;
    nextAnte?: number;
  };
}

export const TournamentBreakOverlay = memo(function TournamentBreakOverlay({ 
  breakInfo,
  tournamentInfo
}: TournamentBreakOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isEnding, setIsEnding] = useState(false);

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
      setIsEnding(remaining <= 30 && remaining > 0);
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

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  // Progress for circular timer
  const progress = useMemo(() => {
    if (!breakInfo) return 100;
    return Math.max(0, Math.min(100, (timeRemaining / breakInfo.durationSeconds) * 100));
  }, [timeRemaining, breakInfo]);

  // Timer color based on remaining time
  const timerColor = useMemo(() => {
    if (timeRemaining <= 10) return { stroke: '#ef4444', text: 'text-red-400' };
    if (timeRemaining <= 30) return { stroke: '#f59e0b', text: 'text-amber-400' };
    return { stroke: '#22c55e', text: 'text-emerald-400' };
  }, [timeRemaining]);

  // Only show for active break
  if (!breakInfo || breakInfo.type !== 'break_started') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 flex items-center justify-center"
      >
        {/* Gradient background with blur */}
        <div 
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(16,40,32,0.92) 0%, rgba(10,20,20,0.96) 100%)'
          }}
        />

        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Main content container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative max-w-xl w-full mx-4"
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute -inset-4 rounded-3xl pointer-events-none"
            animate={{ 
              boxShadow: isEnding 
                ? ['0 0 40px rgba(251,191,36,0.4)', '0 0 80px rgba(251,191,36,0.2)', '0 0 40px rgba(251,191,36,0.4)']
                : ['0 0 40px rgba(34,197,94,0.25)', '0 0 70px rgba(34,197,94,0.15)', '0 0 40px rgba(34,197,94,0.25)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/98 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className={cn(
              "px-6 py-5 border-b border-white/10 text-center",
              isEnding ? "bg-amber-500/15" : "bg-emerald-500/10"
            )}>
              <motion.div
                className={cn(
                  "inline-flex items-center justify-center w-16 h-16 rounded-full mb-3",
                  isEnding ? "bg-amber-500/20" : "bg-emerald-500/15"
                )}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isEnding ? (
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Play className={cn("h-8 w-8", timerColor.text)} />
                  </motion.div>
                ) : (
                  <Coffee className="h-8 w-8 text-emerald-400" />
                )}
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-1">
                {isEnding ? 'Перерыв заканчивается!' : 'Перерыв'}
              </h2>
              <p className="text-white/60 text-sm truncate">
                {breakInfo.tournamentName}
              </p>
            </div>

            {/* Circular Timer */}
            <div className="px-6 py-8 flex flex-col items-center">
              <div className="relative w-44 h-44">
                {/* SVG circular progress */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="5"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={timerColor.stroke}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    animate={{
                      strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}`
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Clock className={cn("w-5 h-5 mb-1", timerColor.text)} />
                  <motion.span
                    className={cn("text-5xl font-bold font-mono tabular-nums", timerColor.text)}
                    animate={isEnding ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: isEnding ? Infinity : 0 }}
                  >
                    {formatTime(timeRemaining)}
                  </motion.span>
                  <span className="text-white/40 text-xs mt-1">осталось</span>
                </div>

                {/* Pulsing ring when ending */}
                {isEnding && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-amber-500/50"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>

              {isEnding && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-amber-400/90 text-sm font-medium"
                >
                  Приготовьтесь к продолжению игры
                </motion.p>
              )}
            </div>

            {/* Tournament stats */}
            {tournamentInfo && (
              <div className="px-6 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tournamentInfo.playersRemaining !== undefined && (
                    <StatCard
                      icon={<Users className="h-4 w-4 text-blue-400" />}
                      label="Игроков"
                      value={tournamentInfo.totalPlayers 
                        ? `${tournamentInfo.playersRemaining}/${tournamentInfo.totalPlayers}`
                        : tournamentInfo.playersRemaining.toString()
                      }
                    />
                  )}
                  
                  {tournamentInfo.averageStack !== undefined && (
                    <StatCard
                      icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                      label="Avg Stack"
                      value={formatNumber(tournamentInfo.averageStack)}
                    />
                  )}
                  
                  {tournamentInfo.biggestStack !== undefined && (
                    <StatCard
                      icon={<Trophy className="h-4 w-4 text-amber-400" />}
                      label="Лидер"
                      value={formatNumber(tournamentInfo.biggestStack)}
                    />
                  )}
                  
                  {tournamentInfo.currentLevel !== undefined && (
                    <StatCard
                      icon={<Timer className="h-4 w-4 text-purple-400" />}
                      label="Уровень"
                      value={tournamentInfo.currentLevel.toString()}
                    />
                  )}
                </div>

                {/* Next level blinds */}
                {(tournamentInfo.nextBlindsSB || tournamentInfo.nextBlindsBB) && (
                  <motion.div
                    className="mt-4 bg-amber-500/10 rounded-lg p-4 border border-amber-500/20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-amber-400/70 text-xs uppercase tracking-wider mb-2 text-center font-medium">
                      После перерыва — Следующий уровень
                    </p>
                    <p className="text-center text-white font-bold text-lg">
                      {formatNumber(tournamentInfo.nextBlindsSB || 0)} / {formatNumber(tournamentInfo.nextBlindsBB || 0)}
                      {tournamentInfo.nextAnte ? (
                        <span className="text-amber-400 ml-2">
                          (ante {formatNumber(tournamentInfo.nextAnte)})
                        </span>
                      ) : null}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Bottom sync indicator */}
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                {isEnding ? (
                  <>
                    <Play className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400">Игра скоро возобновится</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Все столы синхронизированы</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating coffee cups */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/5"
              initial={{ 
                x: `${10 + Math.random() * 80}%`, 
                y: '110%',
                rotate: Math.random() * 30 - 15
              }}
              animate={{ 
                y: '-10%',
                rotate: Math.random() * 30 - 15
              }}
              transition={{ 
                duration: 18 + Math.random() * 12,
                repeat: Infinity,
                delay: i * 4,
                ease: 'linear'
              }}
            >
              <Coffee className="h-10 w-10" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// Stat card mini component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard = memo(function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className="text-white/40 text-[10px] uppercase">{label}</span>
      </div>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
});

export default TournamentBreakOverlay;
