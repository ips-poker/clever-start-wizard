import React, { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Timer, AlertTriangle } from 'lucide-react';

interface PlayerActionTimerProps {
  isActive?: boolean;
  duration?: number;
  timeRemaining?: number | null;
  onTimeout?: () => void;
  isMyTurn?: boolean;
  showWarning?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlayerActionTimer = memo(function PlayerActionTimer({ 
  isActive, 
  duration = 15, 
  timeRemaining: externalTimeRemaining,
  onTimeout,
  isMyTurn = false,
  showWarning = true,
  size = 'md',
  className 
}: PlayerActionTimerProps) {
  const [internalTimeLeft, setInternalTimeLeft] = useState(duration);
  const [isFlashing, setIsFlashing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use external time if provided, otherwise internal
  const timeLeft = externalTimeRemaining !== undefined && externalTimeRemaining !== null 
    ? externalTimeRemaining 
    : internalTimeLeft;

  // Internal timer (when no external time provided)
  useEffect(() => {
    if (externalTimeRemaining !== undefined) return;
    if (!isActive) return;

    setInternalTimeLeft(duration);
    
    intervalRef.current = setInterval(() => {
      setInternalTimeLeft(prev => {
        if (prev <= 1) {
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, duration, onTimeout, externalTimeRemaining]);

  // Reset on active change
  useEffect(() => {
    if (isActive && externalTimeRemaining === undefined) {
      setInternalTimeLeft(duration);
    }
  }, [isActive, duration, externalTimeRemaining]);

  // Flash effect for critical time
  useEffect(() => {
    if (timeLeft <= 5 && showWarning) {
      setIsFlashing(true);
    } else {
      setIsFlashing(false);
    }
  }, [timeLeft, showWarning]);

  if (!isActive && externalTimeRemaining === null) return null;

  const progress = timeLeft / duration;
  const isCritical = timeLeft <= 5;
  const isWarning = timeLeft <= 10;
  
  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-sm', icon: 'w-3 h-3' },
    md: { container: 'w-16 h-16', text: 'text-lg', icon: 'w-4 h-4' },
    lg: { container: 'w-20 h-20', text: 'text-xl', icon: 'w-5 h-5' }
  };

  const currentSize = sizeClasses[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={cn("relative", currentSize.container, className)}>
      {/* Background circle */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.3 }}
        />
      </svg>

      {/* Timer content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {isWarning ? (
            <motion.div
              key="warning"
              initial={{ scale: 0.8 }}
              animate={{ scale: isFlashing ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: isFlashing ? Infinity : 0, duration: 0.5 }}
            >
              <AlertTriangle className={cn(currentSize.icon, "text-red-500")} />
            </motion.div>
          ) : (
            <motion.div key="timer" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <Timer className={cn(currentSize.icon, "text-muted-foreground")} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.span 
          className={cn(
            currentSize.text,
            "font-bold",
            isCritical ? "text-red-500" : isWarning ? "text-amber-400" : "text-white"
          )}
          animate={isFlashing ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: isFlashing ? Infinity : 0, duration: 0.5 }}
        >
          {Math.ceil(timeLeft)}
        </motion.span>
      </div>

      {/* Critical pulse ring */}
      <AnimatePresence>
        {isCritical && isMyTurn && (
          <motion.div
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-red-500"
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// Circular timer for player seat overlay
interface CircularTimerProps {
  timeRemaining: number;
  maxTime: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularTimer = memo(function CircularTimer({
  timeRemaining,
  maxTime,
  size = 72,
  strokeWidth = 4
}: CircularTimerProps) {
  const progress = timeRemaining / maxTime;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const timerColor = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';

  return (
    <svg 
      width={size} 
      height={size}
      style={{ filter: `drop-shadow(0 0 8px ${timerColor}40)` }}
    >
      {/* Background ring */}
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={radius}
        fill="none" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth={strokeWidth} 
      />
      {/* Progress ring */}
      <circle
        cx={size / 2} 
        cy={size / 2} 
        r={radius}
        fill="none"
        stroke={timerColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (circumference * progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease' }}
      />
    </svg>
  );
});

// Compact timer bar for inline display
interface TimerBarProps {
  timeRemaining: number | null;
  totalTime?: number;
  className?: string;
}

export const TimerBar = memo(function TimerBar({
  timeRemaining,
  totalTime = 15,
  className
}: TimerBarProps) {
  if (timeRemaining === null) return null;

  const progress = (timeRemaining / totalTime) * 100;
  const isCritical = timeRemaining <= 5;
  const isWarning = timeRemaining <= 10;

  return (
    <div className={cn("relative h-1.5 bg-white/10 rounded-full overflow-hidden", className)}>
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
        )}
        initial={{ width: "100%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
});
