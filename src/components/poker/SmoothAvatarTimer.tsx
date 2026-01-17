// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Uses deadlineMs from server as absolute anchor for perfect sync across all clients.
// The component calculates remaining time locally at 60fps without external updates.
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isTimerCritical, getTimerColorHex, getTimerGlowColor } from '@/constants/pokerTimerConfig';

interface SmoothAvatarTimerProps {
  /** Absolute deadline timestamp (ms) - when timer expires */
  deadlineMs: number;
  /** Total time for this timer slice (seconds) - for progress calculation */
  total: number;
  size: number;
  strokeWidth?: number;
  className?: string;
}

export const SmoothAvatarTimer = memo(function SmoothAvatarTimer({
  deadlineMs,
  total,
  size,
  strokeWidth = 4,
  className
}: SmoothAvatarTimerProps) {
  const [currentRemaining, setCurrentRemaining] = useState(() => 
    Math.max(0, (deadlineMs - Date.now()) / 1000)
  );

  const animationRef = useRef<number | null>(null);
  const lastDeadlineRef = useRef<number>(deadlineMs);
  const lastTotalRef = useRef<number>(total);

  // Main animation loop - runs at 60fps
  useEffect(() => {
    // Check if deadline changed significantly (new turn or server correction)
    const deadlineChanged = Math.abs(deadlineMs - lastDeadlineRef.current) > 100; // 100ms threshold
    const totalChanged = total !== lastTotalRef.current;
    
    if (deadlineChanged || totalChanged) {
      lastDeadlineRef.current = deadlineMs;
      lastTotalRef.current = total;
    }

    const animate = () => {
      const now = Date.now();
      const remaining = Math.max(0, (lastDeadlineRef.current - now) / 1000);
      setCurrentRemaining(remaining);

      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    // Start animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [deadlineMs, total]);

  const progress = total > 0 ? Math.min(1, Math.max(0, currentRemaining / total)) : 0;

  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isCritical = isTimerCritical(currentRemaining);

  const strokeColor = getTimerColorHex(currentRemaining);
  const glowColor = getTimerGlowColor(currentRemaining);

  const glowFilter = isCritical
    ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor})`
    : `drop-shadow(0 0 8px ${glowColor})`;

  return (
    <svg
      width={size}
      height={size}
      className={cn('pointer-events-none', className)}
      style={{
        transform: 'rotate(-90deg)',
        filter: glowFilter
      }}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={strokeWidth}
      />

      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn(isCritical && 'animate-[pulse_0.4s_ease-in-out_infinite]')}
        style={{ transition: 'stroke 0.3s ease' }}
      />

      {/* Outer glow ring when critical - PokerStars pulsing effect */}
      {isCritical && (() => {
        const outerRadius = radius + 2;
        const outerCircumference = 2 * Math.PI * outerRadius;
        const outerOffset = outerCircumference * (1 - progress);

        return (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerOffset}
            opacity={0.4}
            className="animate-[pulse_0.4s_ease-in-out_infinite]"
          />
        );
      })()}
    </svg>
  );
});

export default SmoothAvatarTimer;
