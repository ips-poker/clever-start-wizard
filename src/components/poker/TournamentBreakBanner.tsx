/**
 * Tournament Break Banner
 * Displays break notifications on poker tables during tournaments
 * Shows: "Break starting after this hand" or "Break in progress"
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentBreakBannerProps {
  breakInfo: {
    type: 'break_starting' | 'break_started' | 'break_ended';
    tournamentId: string;
    tournamentName: string;
    durationMinutes: number;
    durationSeconds: number;
    timestamp: number;
  } | null;
  onDismiss?: () => void;
  className?: string;
}

export function TournamentBreakBanner({ 
  breakInfo, 
  onDismiss,
  className 
}: TournamentBreakBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate time remaining for break
  useEffect(() => {
    if (!breakInfo || breakInfo.type === 'break_ended') {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    if (breakInfo.type === 'break_started') {
      // Calculate remaining time based on duration and when break started
      const breakEndTime = breakInfo.timestamp + (breakInfo.durationSeconds * 1000);
      
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((breakEndTime - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Break ended
          setIsVisible(false);
          onDismiss?.();
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else if (breakInfo.type === 'break_starting') {
      // For break_starting, we just show the warning
      setTimeRemaining(null);
      
      // Auto-dismiss after 30 seconds if not replaced by break_started
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 30000);
      
      return () => clearTimeout(timeout);
    }
  }, [breakInfo, onDismiss]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!breakInfo || breakInfo.type === 'break_ended') {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-50',
            'max-w-md w-full mx-4',
            className
          )}
        >
          <div className={cn(
            'rounded-lg shadow-2xl border backdrop-blur-sm',
            breakInfo.type === 'break_starting' 
              ? 'bg-amber-500/90 border-amber-400/50'
              : 'bg-emerald-600/90 border-emerald-500/50'
          )}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
              <div className={cn(
                'p-2.5 rounded-full',
                breakInfo.type === 'break_starting'
                  ? 'bg-amber-400/30'
                  : 'bg-emerald-500/30'
              )}>
                {breakInfo.type === 'break_starting' ? (
                  <AlertTriangle className="h-6 w-6 text-white" />
                ) : (
                  <Coffee className="h-6 w-6 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg leading-tight">
                  {breakInfo.type === 'break_starting' 
                    ? 'Перерыв после этой раздачи'
                    : 'Перерыв'}
                </h3>
                <p className="text-white/80 text-sm">
                  {breakInfo.tournamentName}
                </p>
              </div>

              {/* Timer */}
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg">
                  <Clock className="h-4 w-4 text-white/70" />
                  <span className="text-white font-mono font-bold text-xl">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              <p className="text-white/90 text-sm">
                {breakInfo.type === 'break_starting' ? (
                  <>
                    Перерыв <span className="font-bold">{breakInfo.durationMinutes} мин</span> начнётся после завершения текущей раздачи
                  </>
                ) : (
                  <>
                    Раздачи возобновятся через <span className="font-bold">{timeRemaining !== null ? formatTime(timeRemaining) : `${breakInfo.durationMinutes} мин`}</span>
                  </>
                )}
              </p>
              
              {/* Synced indicator */}
              <div className="mt-2 flex items-center gap-1.5 text-white/60 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Синхронизировано на всех столах</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TournamentBreakBanner;