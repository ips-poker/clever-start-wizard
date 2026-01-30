// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// REFACTORED: Uses deadlineMs (timestamp) instead of remaining to avoid resync issues
// Supports Time Bank phase with distinct blue coloring and enhanced pulsation
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isTimerCritical, getTimerColorHex, getTimerGlowColor, POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';

interface SmoothAvatarTimerProps {
  /** DEPRECATED: Use deadlineMs instead. Kept for backward compatibility */
  remaining?: number;
  /** Timestamp (ms) when the timer expires. Primary prop for smooth animation */
  deadlineMs?: number;
  /** Total duration in seconds for progress calculation */
  total: number;
  size: number;
  strokeWidth?: number;
  className?: string;
  /** Whether we're in time bank phase - changes color to blue with enhanced pulsation */
  isTimeBankPhase?: boolean;
  /** Current player's total time bank (for secondary indicator) */
  timeBankRemaining?: number;
}

export const SmoothAvatarTimer = memo(function SmoothAvatarTimer({
  remaining: remainingProp,
  deadlineMs,
  total,
  size,
  strokeWidth = 4,
  className,
  isTimeBankPhase = false,
  timeBankRemaining
}: SmoothAvatarTimerProps) {
  const [currentRemaining, setCurrentRemaining] = useState(() => {
    if (deadlineMs) {
      return Math.max(0, (deadlineMs - Date.now()) / 1000);
    }
    return remainingProp ?? total;
  });

  const animationRef = useRef<number | null>(null);
  const lastDeadlineMsRef = useRef<number | null>(deadlineMs ?? null);
  const lastTotalRef = useRef<number>(total);
  const lastTimeBankPhaseRef = useRef<boolean>(isTimeBankPhase);
  // For backward compatibility with remaining prop
  const lastRemainingPropRef = useRef<number | undefined>(remainingProp);

  // Start/restart the 60fps animation loop
  const startAnimation = (initialRemaining: number) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = Date.now();
    const startRemaining = initialRemaining;

    const animate = () => {
      let newRemaining: number;
      
      if (deadlineMs && deadlineMs > 0) {
        // PRIMARY: Calculate from deadline timestamp (most accurate)
        newRemaining = Math.max(0, (deadlineMs - Date.now()) / 1000);
      } else {
        // FALLBACK: Calculate from elapsed time since animation start
        const elapsed = (Date.now() - startTime) / 1000;
        newRemaining = Math.max(0, startRemaining - elapsed);
      }

      setCurrentRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Initial mount
  useEffect(() => {
    const initialRemaining = deadlineMs 
      ? Math.max(0, (deadlineMs - Date.now()) / 1000)
      : (remainingProp ?? total);
    
    startAnimation(initialRemaining);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to meaningful changes
  useEffect(() => {
    const totalChanged = total !== lastTotalRef.current;
    const timeBankPhaseChanged = isTimeBankPhase !== lastTimeBankPhaseRef.current;
    
    // Deadline-based detection (primary)
    let deadlineChanged = false;
    if (deadlineMs !== undefined && deadlineMs !== null) {
      const prevDeadline = lastDeadlineMsRef.current;
      // New deadline is significantly different (more than 2 seconds)
      deadlineChanged = prevDeadline === null || Math.abs(deadlineMs - prevDeadline) > 2000;
      lastDeadlineMsRef.current = deadlineMs;
    }
    
    // Backward compatibility: remaining prop jump detection
    let remainingJumped = false;
    if (remainingProp !== undefined && !deadlineMs) {
      const prevRemaining = lastRemainingPropRef.current ?? 0;
      // Remaining jumped up by more than 2 seconds (new turn)
      remainingJumped = remainingProp > prevRemaining + 2;
      lastRemainingPropRef.current = remainingProp;
    }

    const needsRestart = totalChanged || timeBankPhaseChanged || deadlineChanged || remainingJumped;

    if (needsRestart) {
      lastTotalRef.current = total;
      lastTimeBankPhaseRef.current = isTimeBankPhase;
      
      const newRemaining = deadlineMs 
        ? Math.max(0, (deadlineMs - Date.now()) / 1000)
        : (remainingProp ?? total);
      
      startAnimation(newRemaining);
    }
  }, [deadlineMs, remainingProp, total, isTimeBankPhase]);

  const progress = total > 0 ? Math.min(1, Math.max(0, currentRemaining / total)) : 0;

  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isCritical = isTimerCritical(currentRemaining);
  const isWarning = currentRemaining <= POKERSTARS_TIMER.WARNING_SECONDS && !isCritical;

  // Use time bank aware color functions
  const strokeColor = getTimerColorHex(currentRemaining, isTimeBankPhase);
  const glowColor = getTimerGlowColor(currentRemaining, isTimeBankPhase);

  // Enhanced glow for critical state or time bank activation
  const glowFilter = isCritical
    ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor})`
    : isTimeBankPhase
      ? `drop-shadow(0 0 14px ${glowColor}) drop-shadow(0 0 28px ${glowColor})`
      : isWarning
        ? `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor})`
        : `drop-shadow(0 0 8px ${glowColor})`;

  // Enhanced pulse animation class for time bank
  const pulseClass = isCritical
    ? 'animate-[pulse_0.4s_ease-in-out_infinite]'
    : isTimeBankPhase
      ? 'animate-[pulse_0.6s_ease-in-out_infinite]'
      : '';

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
        className={pulseClass}
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

      {/* Time Bank indicator - enhanced inner ring when in time bank phase */}
      {isTimeBankPhase && (() => {
        const innerRadius = radius - 3;
        const innerCircumference = 2 * Math.PI * innerRadius;
        const innerOffset = innerCircumference * (1 - progress);

        return (
          <>
            {/* Inner progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerRadius}
              fill="none"
              stroke={isCritical ? '#ef4444' : POKERSTARS_TIMER.TIME_BANK_COLORS.ACTIVE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
              opacity={0.8}
              className={isCritical ? 'animate-[pulse_0.3s_ease-in-out_infinite]' : 'animate-[pulse_0.7s_ease-in-out_infinite]'}
            />
            {/* Additional outer glow for time bank */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + 3}
              fill="none"
              stroke={isCritical ? '#ef4444' : POKERSTARS_TIMER.TIME_BANK_COLORS.ACTIVE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={circumference * 1.1}
              strokeDashoffset={strokeDashoffset * 1.1}
              opacity={0.3}
              className="animate-[pulse_0.8s_ease-in-out_infinite]"
            />
          </>
        );
      })()}
    </svg>
  );
});

export default SmoothAvatarTimer;
