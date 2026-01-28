/**
 * PPPoker-Style Time Bank Alarm Badge
 * 
 * A professional animated alarm clock badge that appears during the time bank phase.
 * Features:
 * - Animated alarm clock icon with pulsating glow
 * - Backwards countdown showing remaining time bank seconds
 * - Positioned at the player's avatar (hero position)
 * - Smooth animations synced with timer countdown
 */
import React, { memo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlarmClock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';

interface TimeBankAlarmBadgeProps {
  /** Whether time bank is currently active */
  isActive: boolean;
  /** Remaining seconds in time bank (full time bank, not just current slice) */
  remainingSeconds: number;
  /** Total time bank seconds (for reference) */
  totalSeconds?: number;
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Position relative to avatar */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  /** Custom class name */
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'w-10 h-10',
    icon: 16,
    text: 'text-[10px]',
    padding: 'p-1',
  },
  md: {
    container: 'w-12 h-12',
    icon: 20,
    text: 'text-xs',
    padding: 'p-1.5',
  },
  lg: {
    container: 'w-14 h-14',
    icon: 24,
    text: 'text-sm',
    padding: 'p-2',
  },
};

const positionConfig = {
  'top-right': '-top-1 -right-1',
  'bottom-right': '-bottom-1 -right-1',
  'top-left': '-top-1 -left-1',
  'bottom-left': '-bottom-1 -left-1',
};

export const TimeBankAlarmBadge = memo(function TimeBankAlarmBadge({
  isActive,
  remainingSeconds,
  totalSeconds = 30,
  size = 'md',
  position = 'top-right',
  className,
}: TimeBankAlarmBadgeProps) {
  const [displaySeconds, setDisplaySeconds] = useState(Math.ceil(remainingSeconds));
  const startTimeRef = useRef<number>(Date.now());
  const startValueRef = useRef<number>(remainingSeconds);
  const animationRef = useRef<number | null>(null);

  // Start countdown animation when active
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Reset refs when time bank activates or remaining changes significantly
    const drift = Math.abs(remainingSeconds - startValueRef.current);
    if (drift > 1.5) {
      startTimeRef.current = Date.now();
      startValueRef.current = remainingSeconds;
    }

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const current = Math.max(0, startValueRef.current - elapsed);
      setDisplaySeconds(Math.ceil(current));

      if (current > 0 && isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, remainingSeconds]);

  // Sync with incoming remainingSeconds
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      startValueRef.current = remainingSeconds;
      setDisplaySeconds(Math.ceil(remainingSeconds));
    }
  }, [remainingSeconds, isActive]);

  const config = sizeConfig[size];
  const posClass = positionConfig[position];

  // Determine color based on remaining time
  const isCritical = displaySeconds <= POKERSTARS_TIMER.CRITICAL_SECONDS;
  const isWarning = displaySeconds <= POKERSTARS_TIMER.WARNING_SECONDS && !isCritical;

  const bgColor = isCritical
    ? 'bg-red-600/90'
    : isWarning
    ? 'bg-amber-500/90'
    : 'bg-blue-600/90';

  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.8)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.6)'
    : 'rgba(59, 130, 246, 0.6)';

  const ringColor = isCritical
    ? 'ring-red-400'
    : isWarning
    ? 'ring-amber-400'
    : 'ring-blue-400';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'absolute z-50',
            posClass,
            className
          )}
        >
          {/* Outer pulsing glow ring */}
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              bgColor
            )}
            style={{
              boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 0.4, 0.8],
            }}
            transition={{
              duration: isCritical ? 0.4 : 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Main badge container */}
          <motion.div
            className={cn(
              'relative flex flex-col items-center justify-center rounded-full',
              config.container,
              config.padding,
              bgColor,
              'ring-2',
              ringColor,
              'backdrop-blur-sm'
            )}
            animate={isCritical ? {
              scale: [1, 1.05, 1],
            } : undefined}
            transition={isCritical ? {
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            } : undefined}
          >
            {/* Alarm clock icon with shake animation */}
            <motion.div
              animate={{
                rotate: isCritical ? [-5, 5, -5] : [-2, 2, -2],
              }}
              transition={{
                duration: isCritical ? 0.15 : 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <AlarmClock
                size={config.icon}
                className="text-white drop-shadow-md"
                strokeWidth={2.5}
              />
            </motion.div>

            {/* Countdown text */}
            <motion.span
              key={displaySeconds}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                config.text,
                'font-bold text-white tabular-nums leading-none mt-0.5 drop-shadow-md'
              )}
            >
              {displaySeconds}s
            </motion.span>
          </motion.div>

          {/* "TIME BANK" label (only for lg size) */}
          {size === 'lg' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400 drop-shadow-lg">
                Time Bank
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default TimeBankAlarmBadge;
