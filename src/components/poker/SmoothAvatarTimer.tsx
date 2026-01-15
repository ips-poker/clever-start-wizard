// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Shows current phase timer (base OR time bank) - server authoritative
// Colors change based on remaining time: green > yellow > red
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';

interface SmoothAvatarTimerProps {
  remaining: number;  // Current remaining time (server authoritative)
  total: number;      // Total time for current phase (set when phase starts)
  size: number;
  strokeWidth?: number;
  className?: string;
}

export const SmoothAvatarTimer = memo(function SmoothAvatarTimer({
  remaining,
  total,
  size,
  strokeWidth = 4,
  className
}: SmoothAvatarTimerProps) {
  const [currentRemaining, setCurrentRemaining] = useState(remaining);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const startRemainingRef = useRef<number>(remaining);
  const lastRemainingRef = useRef<number>(remaining);
  const currentTotalRef = useRef<number>(total);

  useEffect(() => {
    // Detect phase change: remaining went up OR total changed significantly
    const isNewPhase = remaining > lastRemainingRef.current + 2 || 
                       Math.abs(total - currentTotalRef.current) > 2;
    const diff = Math.abs(remaining - lastRemainingRef.current);
    const isServerResync = diff < 2;
    
    lastRemainingRef.current = remaining;
    
    if (isNewPhase) {
      // New turn/phase - full reset with new total
      startTimeRef.current = Date.now();
      startRemainingRef.current = remaining;
      currentTotalRef.current = total;
      setCurrentRemaining(remaining);
    } else if (!isServerResync && diff >= 2) {
      // Significant change but not new phase - resync
      startTimeRef.current = Date.now();
      startRemainingRef.current = remaining;
      setCurrentRemaining(remaining);
    }
    // Small resync (<2s diff) = continue smooth animation

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, startRemainingRef.current - elapsed);
      setCurrentRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remaining, total]);

  // Use the stable total for progress calculation
  const stableTotal = currentTotalRef.current;
  const progress = stableTotal > 0 ? Math.max(0, currentRemaining / stableTotal) : 0;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining seconds (from centralized config)
  const { strokeColor, glowColor, isCritical } = useMemo(() => {
    const remaining = currentRemaining;
    
    if (remaining <= POKERSTARS_TIMER.CRITICAL_SECONDS) {
      return {
        strokeColor: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.8)',
        isCritical: true
      };
    }
    if (remaining <= POKERSTARS_TIMER.WARNING_SECONDS) {
      return {
        strokeColor: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.6)',
        isCritical: false
      };
    }
    return {
      strokeColor: '#22c55e',
      glowColor: 'rgba(34, 197, 94, 0.4)',
      isCritical: false
    };
  }, [currentRemaining]);

  const glowFilter = isCritical 
    ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor})`
    : `drop-shadow(0 0 8px ${glowColor})`;

  return (
    <svg
      width={size}
      height={size}
      className={cn("pointer-events-none", className)}
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
      
      {/* Progress arc - single continuous ring */}
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
        className={cn(isCritical && "animate-[pulse_0.4s_ease-in-out_infinite]")}
        style={{
          transition: 'stroke 0.3s ease'
        }}
      />
    </svg>
  );
});

export default SmoothAvatarTimer;
