/**
 * Disconnect Action Timeout Indicator
 * Phase 4.2 - Shows countdown before auto-action for disconnected player
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisconnectActionTimeout } from '@/hooks/usePokerWebSocket';

interface DisconnectTimeoutIndicatorProps {
  timeout: DisconnectActionTimeout | null;
  playerName?: string;
  className?: string;
  isCurrentPlayer?: boolean;
}

export function DisconnectTimeoutIndicator({
  timeout,
  playerName,
  className,
  isCurrentPlayer = false
}: DisconnectTimeoutIndicatorProps) {
  const [remainingMs, setRemainingMs] = useState(0);
  const [startMs, setStartMs] = useState(0);

  useEffect(() => {
    if (!timeout) {
      setRemainingMs(0);
      return;
    }

    setRemainingMs(timeout.remainingMs);
    setStartMs(timeout.remainingMs);

    // Countdown timer
    const interval = setInterval(() => {
      setRemainingMs(prev => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [timeout]);

  if (!timeout || remainingMs <= 0) {
    return null;
  }

  const progress = (remainingMs / startMs) * 100;
  const seconds = Math.ceil(remainingMs / 1000);
  const actionText = timeout.willAutoAction === 'check' ? 'Авто-чек' : 'Авто-фолд';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'pointer-events-none z-10',
          className
        )}
      >
        <div className={cn(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-lg',
          'bg-red-500/90 text-white shadow-lg',
          isCurrentPlayer && 'ring-2 ring-yellow-400'
        )}>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-xs font-medium">
              {playerName ? `${playerName} отключён` : 'Отключён'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="text-sm font-bold tabular-nums">
              {seconds}s
            </span>
            <span className="text-xs opacity-80">
              → {actionText}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-red-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
              className="h-full bg-white"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Badge version for player seat
export function DisconnectTimeoutBadge({
  timeout,
  className
}: {
  timeout: DisconnectActionTimeout | null;
  className?: string;
}) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!timeout) {
      setRemainingMs(0);
      return;
    }

    setRemainingMs(timeout.remainingMs);
    const interval = setInterval(() => {
      setRemainingMs(prev => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [timeout]);

  if (!timeout || remainingMs <= 0) {
    return null;
  }

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-red-500 text-white text-xs font-medium',
        'animate-pulse',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      <span className="tabular-nums">{seconds}s</span>
    </motion.div>
  );
}

export default DisconnectTimeoutIndicator;