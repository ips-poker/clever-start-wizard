/**
 * ActionTimeIndicator - PokerStars-style action time display
 * Shows countdown timer with visual urgency progression
 * Includes TIME BANK activation indicator
 */
import React, { memo, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionTimeIndicatorProps {
  /** Remaining action time in seconds */
  timeRemaining: number;
  /** Total action time allowed */
  totalTime: number;
  /** Whether time bank is currently active */
  isTimeBankActive?: boolean;
  /** Remaining time bank seconds */
  timeBankRemaining?: number;
  /** Whether to show the large overlay warning */
  showOverlay?: boolean;
  /** Position on screen for overlay */
  position?: 'center' | 'bottom';
  /** Size variant */
  size?: 'compact' | 'normal' | 'large';
  /** Callback when time runs out */
  onTimeOut?: () => void;
  className?: string;
}

// Color stages based on urgency
const getUrgencyLevel = (progress: number): 'safe' | 'warning' | 'critical' | 'danger' => {
  if (progress > 0.6) return 'safe';
  if (progress > 0.4) return 'warning';
  if (progress > 0.2) return 'critical';
  return 'danger';
};

const urgencyColors = {
  safe: {
    primary: 'hsl(142, 76%, 36%)', // green
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/50'
  },
  warning: {
    primary: 'hsl(45, 93%, 47%)', // amber
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/50'
  },
  critical: {
    primary: 'hsl(25, 95%, 53%)', // orange
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/50'
  },
  danger: {
    primary: 'hsl(0, 84%, 60%)', // red
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    glow: 'shadow-red-500/50'
  }
};

const timeBankColors = {
  primary: 'hsl(258, 90%, 66%)', // purple for time bank
  bg: 'bg-violet-500/20',
  text: 'text-violet-400',
  glow: 'shadow-violet-500/50'
};

export const ActionTimeIndicator = memo(function ActionTimeIndicator({
  timeRemaining,
  totalTime,
  isTimeBankActive = false,
  timeBankRemaining = 0,
  showOverlay = false,
  position = 'bottom',
  size = 'normal',
  onTimeOut,
  className
}: ActionTimeIndicatorProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0);
  
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const urgency = getUrgencyLevel(progress);
  const colors = isTimeBankActive ? timeBankColors : urgencyColors[urgency];

  // Handle timeout
  useEffect(() => {
    if (timeRemaining <= 0 && !isTimeBankActive && onTimeOut) {
      onTimeOut();
    }
  }, [timeRemaining, isTimeBankActive, onTimeOut]);

  // Increase pulse intensity as time decreases
  useEffect(() => {
    if (urgency === 'danger') {
      setPulseIntensity(3);
    } else if (urgency === 'critical') {
      setPulseIntensity(2);
    } else if (urgency === 'warning') {
      setPulseIntensity(1);
    } else {
      setPulseIntensity(0);
    }
  }, [urgency]);

  // Size configurations
  const sizeConfig = useMemo(() => ({
    compact: { container: 'h-6', bar: 'h-1', text: 'text-xs', icon: 'w-3 h-3' },
    normal: { container: 'h-10', bar: 'h-2', text: 'text-sm', icon: 'w-4 h-4' },
    large: { container: 'h-14', bar: 'h-3', text: 'text-lg', icon: 'w-5 h-5' }
  }), []);

  const config = sizeConfig[size];

  // Format display time
  const displayTime = Math.ceil(isTimeBankActive ? timeBankRemaining : timeRemaining);
  const displayTimeFormatted = displayTime >= 60 
    ? `${Math.floor(displayTime / 60)}:${(displayTime % 60).toString().padStart(2, '0')}`
    : `${displayTime}`;

  // Circular progress for compact/normal
  const CircularProgress = () => {
    const radius = size === 'compact' ? 10 : size === 'normal' ? 14 : 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);
    const strokeWidth = size === 'compact' ? 2 : 3;

    return (
      <div className="relative" style={{ width: radius * 2 + strokeWidth * 2, height: radius * 2 + strokeWidth * 2 }}>
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {/* Progress circle */}
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ 
              strokeDashoffset,
              opacity: pulseIntensity > 0 ? [1, 0.6, 1] : 1
            }}
            transition={{
              strokeDashoffset: { duration: 0.3 },
              opacity: pulseIntensity > 0 
                ? { duration: 0.5 / pulseIntensity, repeat: Infinity } 
                : { duration: 0 }
            }}
          />
        </svg>
        
        {/* Center time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold tabular-nums", config.text, colors.text)}>
            {displayTimeFormatted}
          </span>
        </div>
      </div>
    );
  };

  // Horizontal bar progress
  const BarProgress = () => (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <div className={cn("flex-1 rounded-full overflow-hidden bg-muted/30", config.bar)}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: colors.primary }}
          initial={{ width: '100%' }}
          animate={{ 
            width: `${progress * 100}%`,
            opacity: pulseIntensity > 0 ? [1, 0.7, 1] : 1
          }}
          transition={{
            width: { duration: 0.3 },
            opacity: pulseIntensity > 0 
              ? { duration: 0.5 / pulseIntensity, repeat: Infinity } 
              : { duration: 0 }
          }}
        />
      </div>
      <span className={cn("font-bold tabular-nums min-w-[2ch]", config.text, colors.text)}>
        {displayTimeFormatted}
      </span>
    </div>
  );

  // Full overlay warning (PokerStars-style TIME display)
  const OverlayWarning = () => (
    <AnimatePresence>
      {showOverlay && urgency === 'danger' && (
        <motion.div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-50",
            position === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-32'
          )}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <motion.div
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl",
              "bg-gradient-to-r from-red-900/95 to-red-800/95",
              "border-2 border-red-500 shadow-2xl shadow-red-500/30"
            )}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                {isTimeBankActive ? 'TIME BANK' : 'TIME'}
              </span>
              <span className="text-white font-bold text-3xl tabular-nums">
                {displayTimeFormatted}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Time bank active indicator
  const TimeBankBadge = () => (
    <AnimatePresence>
      {isTimeBankActive && (
        <motion.div
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/50"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Zap className="w-3 h-3 text-violet-400" />
          </motion.div>
          <span className="text-[10px] font-bold text-violet-400 uppercase">
            Time Bank
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Time bank badge */}
        <TimeBankBadge />
        
        {/* Main timer display */}
        {size === 'compact' ? (
          <CircularProgress />
        ) : (
          <div className="flex items-center gap-2">
            <CircularProgress />
            {size === 'large' && <BarProgress />}
          </div>
        )}
      </div>

      {/* Danger overlay */}
      <OverlayWarning />

      {/* Audio/visual pulse effect at edges of screen when critical */}
      <AnimatePresence>
        {urgency === 'danger' && !isTimeBankActive && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 border-4 border-red-500/50 rounded-lg"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// Compact inline badge for player seat
interface ActionTimeBadgeProps {
  timeRemaining: number;
  totalTime: number;
  isTimeBankActive?: boolean;
  size?: 'xs' | 'sm';
}

export const ActionTimeBadge = memo(function ActionTimeBadge({
  timeRemaining,
  totalTime,
  isTimeBankActive = false,
  size = 'sm'
}: ActionTimeBadgeProps) {
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const urgency = getUrgencyLevel(progress);
  const colors = isTimeBankActive ? timeBankColors : urgencyColors[urgency];
  
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const textSize = size === 'xs' ? 'text-[8px]' : 'text-[10px]';

  return (
    <motion.div
      className={cn(
        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
        colors.bg,
        "border border-current/20"
      )}
      animate={urgency === 'danger' ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3, repeat: urgency === 'danger' ? Infinity : 0 }}
    >
      {isTimeBankActive ? (
        <Zap className={cn(iconSize, colors.text)} />
      ) : (
        <Clock className={cn(iconSize, colors.text)} />
      )}
      <span className={cn("font-bold tabular-nums", textSize, colors.text)}>
        {Math.ceil(timeRemaining)}s
      </span>
    </motion.div>
  );
});

export default ActionTimeIndicator;
