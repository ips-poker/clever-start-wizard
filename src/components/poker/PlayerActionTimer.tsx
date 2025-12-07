import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Timer, AlertTriangle } from 'lucide-react';

interface PlayerActionTimerProps {
  isActive: boolean;
  duration?: number;
  onTimeout?: () => void;
  className?: string;
}

export function PlayerActionTimer({ 
  isActive, 
  duration = 30, 
  onTimeout,
  className 
}: PlayerActionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(duration);
      setIsWarning(false);
    }
  }, [isActive, duration]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeout?.();
          return 0;
        }
        if (prev <= 10) {
          setIsWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeout]);

  if (!isActive) return null;

  const progress = timeLeft / duration;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={cn("relative w-20 h-20", className)}>
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
          stroke={isWarning ? "#ef4444" : "#22c55e"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>

      {/* Timer text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isWarning ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </motion.div>
        ) : (
          <Timer className="w-4 h-4 text-muted-foreground" />
        )}
        <span className={cn(
          "text-lg font-bold",
          isWarning ? "text-red-500" : "text-white"
        )}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
