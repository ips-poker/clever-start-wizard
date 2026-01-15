// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// SINGLE RING that shows full time (base + time bank) as one continuous animation
// Colors change based on remaining time: green > yellow > red
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';

interface SmoothAvatarTimerProps {
  remaining: number;  // Current remaining time (server authoritative)
  total: number;      // Total time for this turn (base + time bank, set at turn start)
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
  
  // Store the initial total for this turn - never changes mid-animation
  const initialTotalRef = useRef<number>(total);

  // Update initial total only when turn resets (remaining goes up significantly)
  useEffect(() => {
    const isNewTurn = remaining > lastRemainingRef.current + 2;
    if (isNewTurn) {
      initialTotalRef.current = total;
    }
  }, [remaining, total]);

  useEffect(() => {
    // Detect new turn: remaining went up = reset animation
    const isNewTurn = remaining > lastRemainingRef.current + 2;
    const diff = Math.abs(remaining - lastRemainingRef.current);
    const isServerResync = diff < 2;
    
    lastRemainingRef.current = remaining;
    
    if (isNewTurn) {
      // New turn - full reset
      startTimeRef.current = Date.now();
      startRemainingRef.current = remaining;
      initialTotalRef.current = total;
      setCurrentRemaining(remaining);
    } else if (!isServerResync) {
      // Significant change but not new turn - update start point
      startTimeRef.current = Date.now();
      startRemainingRef.current = remaining;
      setCurrentRemaining(remaining);
    }
    // Small resync = continue smooth animation

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

  // Use the stable total from turn start
  const stableTotal = initialTotalRef.current;
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

      {/* Outer glow ring when critical - PokerStars pulsing effect */}
      {isCritical && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 2}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference * 1.1}
          strokeDashoffset={strokeDashoffset * 1.1}
          opacity={0.4}
          className="animate-[pulse_0.4s_ease-in-out_infinite]"
        />
      )}
    </svg>
  );
});

export default SmoothAvatarTimer;
