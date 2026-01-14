// Simple Timer Ring Around Avatar
// OPTIMIZED: no requestAnimationFrame re-renders (prevents lag)
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SmoothAvatarTimerProps {
  /** Remaining seconds from server */
  remaining: number;
  /** Total seconds for action timer */
  total: number;
  /** Kept for compatibility but ignored */
  mainTimerDuration?: number;
  /** Kept for compatibility but ignored */
  timeBankDuration?: number;
  size: number;
  strokeWidth?: number;
  className?: string;
}

export const SmoothAvatarTimer = memo(function SmoothAvatarTimer({
  remaining,
  total,
  size,
  strokeWidth = 4,
  className,
}: SmoothAvatarTimerProps) {
  const safeTotal = Math.max(1, total);
  const safeRemaining = Math.max(0, Math.min(safeTotal, remaining));

  const progress = safeRemaining / safeTotal;

  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = useMemo(() => {
    return circumference * (1 - progress);
  }, [circumference, progress]);

  const trackColor = 'hsl(var(--muted-foreground) / 0.25)';

  const { strokeColor, glowColor } = useMemo(() => {
    const isWarning = safeRemaining <= safeTotal * 0.25;
    const isCritical = safeRemaining <= safeTotal * 0.10;

    if (isCritical) {
      return {
        strokeColor: 'hsl(var(--destructive))',
        glowColor: 'hsl(var(--destructive) / 0.45)',
      };
    }

    if (isWarning) {
      return {
        strokeColor: 'hsl(var(--accent))',
        glowColor: 'hsl(var(--accent) / 0.35)',
      };
    }

    return {
      strokeColor: 'hsl(var(--primary))',
      glowColor: 'hsl(var(--primary) / 0.30)',
    };
  }, [safeRemaining, safeTotal]);

  return (
    <div
      className={cn('relative pointer-events-none', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          filter: `drop-shadow(0 0 8px ${glowColor})`,
        }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.25, ease: 'linear' }}
          style={{ strokeDashoffset }}
        />
      </svg>
    </div>
  );
});

export default SmoothAvatarTimer;
