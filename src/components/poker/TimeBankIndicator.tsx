import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeBankIndicatorProps {
  /** Remaining time bank in seconds */
  timeBankRemaining: number;
  /** Initial time bank amount */
  timeBankInitial: number;
  /** Time bank bonus per level */
  timeBankPerLevel?: number;
  /** Whether it's player's turn */
  isMyTurn: boolean;
  /** Whether time bank is currently active (being used) */
  isTimeBankActive?: boolean;
  /** Callback to activate time bank */
  onUseTimeBank?: () => void;
  /** Current action time remaining */
  actionTimeRemaining?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Position on screen */
  position?: 'top-right' | 'bottom-right' | 'inline';
  /** Show detailed view */
  showDetails?: boolean;
}

export const TimeBankIndicator = memo(function TimeBankIndicator({
  timeBankRemaining,
  timeBankInitial,
  timeBankPerLevel = 0,
  isMyTurn,
  isTimeBankActive = false,
  onUseTimeBank,
  actionTimeRemaining,
  size = 'md',
  position = 'inline',
  showDetails = false
}: TimeBankIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);
  const [previousTimeBank, setPreviousTimeBank] = useState(timeBankRemaining);

  // Detect time bank bonus
  useEffect(() => {
    if (timeBankRemaining > previousTimeBank && previousTimeBank > 0) {
      setShowBonusAnimation(true);
      setTimeout(() => setShowBonusAnimation(false), 2000);
    }
    setPreviousTimeBank(timeBankRemaining);
  }, [timeBankRemaining, previousTimeBank]);

  // Animation when time bank is active
  useEffect(() => {
    if (isTimeBankActive) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isTimeBankActive]);

  const progress = timeBankInitial > 0 ? timeBankRemaining / timeBankInitial : 0;
  const isCritical = progress < 0.25;
  const isWarning = progress < 0.5;
  const isEmpty = timeBankRemaining <= 0;

  // Size configurations
  const sizeConfig = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', container: 'px-2 py-1', ring: 36 },
    md: { icon: 'w-4 h-4', text: 'text-sm', container: 'px-3 py-1.5', ring: 44 },
    lg: { icon: 'w-5 h-5', text: 'text-base', container: 'px-4 py-2', ring: 56 }
  };
  const config = sizeConfig[size];

  // Position styles
  const positionStyles: Record<string, string> = {
    'top-right': 'absolute top-4 right-4',
    'bottom-right': 'absolute bottom-4 right-4',
    'inline': 'relative'
  };

  // Color based on state
  const getColors = () => {
    if (isEmpty) return { bg: 'bg-muted/50', text: 'text-muted-foreground', ring: '#6b7280' };
    if (isTimeBankActive) return { bg: 'bg-primary/20', text: 'text-primary', ring: 'hsl(var(--primary))' };
    if (isCritical) return { bg: 'bg-destructive/20', text: 'text-destructive', ring: '#ef4444' };
    if (isWarning) return { bg: 'bg-amber-500/20', text: 'text-amber-400', ring: '#f59e0b' };
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: '#22c55e' };
  };
  const colors = getColors();

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // Ring component for circular display
  const RingDisplay = () => {
    const ringSize = config.ring;
    const strokeWidth = 3;
    const radius = (ringSize - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg
          width={ringSize}
          height={ringSize}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {/* Progress ring */}
          <motion.circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            animate={{
              strokeDashoffset,
              opacity: isAnimating ? [1, 0.6, 1] : 1
            }}
            transition={{
              strokeDashoffset: { duration: 0.3 },
              opacity: isAnimating ? { duration: 0.5, repeat: Infinity } : { duration: 0 }
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className={cn(config.icon, colors.text)} />
          <span className={cn("font-bold tabular-nums", config.text, colors.text)}>
            {formatTime(timeBankRemaining)}
          </span>
        </div>
      </div>
    );
  };

  // Compact inline display
  const InlineDisplay = () => (
    <motion.div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/50 backdrop-blur-sm",
        config.container,
        colors.bg
      )}
      animate={isAnimating ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
    >
      <div className="relative">
        <Clock className={cn(config.icon, colors.text)} />
        {isTimeBankActive && (
          <motion.div
            className="absolute -inset-1 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      
      <div className="flex flex-col">
        <span className={cn("font-bold tabular-nums leading-none", config.text, colors.text)}>
          {formatTime(timeBankRemaining)}
        </span>
        <span className="text-[10px] text-muted-foreground leading-none">
          тайм-банк
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: colors.ring }}
          initial={{ width: '100%' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Use time bank button */}
      {isMyTurn && !isTimeBankActive && actionTimeRemaining !== undefined && actionTimeRemaining < 5 && onUseTimeBank && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={onUseTimeBank}
        >
          <Zap className="w-3 h-3 mr-1" />
          Использовать
        </Button>
      )}
    </motion.div>
  );

  // Detailed panel display
  const DetailedDisplay = () => (
    <motion.div
      className={cn(
        "rounded-xl border border-border/50 backdrop-blur-md p-4",
        colors.bg,
        positionStyles[position]
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center gap-4">
        <RingDisplay />
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Тайм-банк
            </span>
            {isTimeBankActive && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground animate-pulse">
                АКТИВЕН
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Осталось: <span className={cn("font-bold", colors.text)}>{formatTime(timeBankRemaining)}</span></span>
            <span>|</span>
            <span>Начальный: {formatTime(timeBankInitial)}</span>
          </div>
          
          {timeBankPerLevel > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Plus className="w-3 h-3" />
              <span>{timeBankPerLevel}с за уровень</span>
            </div>
          )}
        </div>
      </div>

      {/* Use button for detailed view */}
      {isMyTurn && !isTimeBankActive && !isEmpty && onUseTimeBank && (
        <Button
          className="w-full mt-3"
          size="sm"
          onClick={onUseTimeBank}
        >
          <Zap className="w-4 h-4 mr-2" />
          Использовать тайм-банк
        </Button>
      )}
    </motion.div>
  );

  return (
    <>
      {/* Bonus animation overlay */}
      <AnimatePresence>
        {showBonusAnimation && (
          <motion.div
            className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex items-center gap-2 bg-emerald-500/90 text-white px-4 py-2 rounded-xl shadow-lg"
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -20 }}
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold">+{timeBankPerLevel}с тайм-банка!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main display based on variant */}
      {showDetails ? <DetailedDisplay /> : <InlineDisplay />}
    </>
  );
});

// Compact badge for player seat
interface TimeBankBadgeProps {
  timeBankRemaining: number;
  timeBankInitial: number;
  isActive?: boolean;
}

export const TimeBankBadge = memo(function TimeBankBadge({
  timeBankRemaining,
  timeBankInitial,
  isActive = false
}: TimeBankBadgeProps) {
  const progress = timeBankInitial > 0 ? timeBankRemaining / timeBankInitial : 0;
  const isEmpty = timeBankRemaining <= 0;

  if (isEmpty) return null;

  const color = progress < 0.25 ? '#ef4444' : progress < 0.5 ? '#f59e0b' : '#22c55e';

  return (
    <motion.div
      className={cn(
        "absolute -bottom-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
        isActive ? "bg-primary text-primary-foreground" : "bg-background/90 border border-border"
      )}
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
    >
      <Clock className="w-2.5 h-2.5" style={{ color: isActive ? 'currentColor' : color }} />
      <span style={{ color: isActive ? 'currentColor' : color }}>{Math.floor(timeBankRemaining)}s</span>
    </motion.div>
  );
});

export default TimeBankIndicator;
