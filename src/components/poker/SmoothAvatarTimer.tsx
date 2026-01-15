// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// UNIFIED TIMER LOGIC:
// - Green: > 10 seconds remaining
// - Yellow (warning): 5-10 seconds remaining  
// - Red (critical + pulsing glow): ≤ 5 seconds remaining
import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// PokerStars-style timer thresholds (in seconds)
const POKERSTARS_TIMER = {
  WARNING_SECONDS: 10,   // Yellow warning starts at 10 seconds
  CRITICAL_SECONDS: 5,   // Red pulsing starts at 5 seconds
};

interface SmoothAvatarTimerProps {
  remaining: number;
  total: number;
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

  useEffect(() => {
    // Reset animation when remaining time changes significantly
    startTimeRef.current = Date.now();
    startRemainingRef.current = remaining;
    setCurrentRemaining(remaining);

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, startRemainingRef.current - elapsed);
      setCurrentRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remaining, total]);

  const progress = total > 0 ? Math.max(0, currentRemaining / total) : 0;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // PokerStars-style: use SECONDS-based thresholds, not percentages
  const isCritical = currentRemaining <= POKERSTARS_TIMER.CRITICAL_SECONDS;
  const isWarning = currentRemaining <= POKERSTARS_TIMER.WARNING_SECONDS && !isCritical;
  
  // Colors: Green → Yellow (10s) → Red (5s)
  const strokeColor = isCritical 
    ? '#ef4444'  // Red - critical (last 5 seconds)
    : isWarning 
      ? '#f59e0b' // Amber/Yellow - warning (5-10 seconds)
      : '#22c55e'; // Green - normal (> 10 seconds)

  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.8)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.6)'
      : 'rgba(34, 197, 94, 0.4)';

  // Enhanced glow filter for critical state
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
