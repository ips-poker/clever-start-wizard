// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Uses centralized timer configuration for consistency
import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { POKERSTARS_TIMER, isTimerCritical, isTimerWarning, getTimerColorHex, getTimerGlowColor } from '@/constants/pokerTimerConfig';

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

  // Use centralized timer configuration
  const isCritical = isTimerCritical(currentRemaining);
  const isWarning = isTimerWarning(currentRemaining);
  
  // Colors from centralized config
  const strokeColor = getTimerColorHex(currentRemaining);
  const glowColor = getTimerGlowColor(currentRemaining);

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
