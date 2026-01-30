// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// REFACTORED: Uses deadlineMs (timestamp) instead of remaining to avoid resync issues
// Supports Time Bank phase with distinct blue coloring and enhanced pulsation
import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
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
  // Current remaining is calculated locally via RAF; no external state updates cause re-renders.
  const [currentRemaining, setCurrentRemaining] = useState(() => {
    if (deadlineMs && deadlineMs > 0) {
      return Math.max(0, (deadlineMs - Date.now()) / 1000);
    }
    return remainingProp ?? total;
  });

  const animationRef = useRef<number | null>(null);
  // Store values to detect meaningful changes
  const prevDeadlineMsRef = useRef<number | null>(deadlineMs ?? null);
  const prevTotalRef = useRef<number>(total);
  const prevTimeBankPhaseRef = useRef<boolean>(isTimeBankPhase);
  // Store deadline in ref for stable animation loop closure
  const deadlineMsStableRef = useRef<number>(deadlineMs ?? 0);

  // Update stable ref when deadlineMs prop changes
  useEffect(() => {
    if (deadlineMs && deadlineMs > 0) {
      deadlineMsStableRef.current = deadlineMs;
    }
  }, [deadlineMs]);

  // Start/restart the 60fps animation loop - uses ref for deadline so it auto-follows updates
  const startAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      const dl = deadlineMsStableRef.current;
      if (dl > 0) {
        const newRemaining = Math.max(0, (dl - Date.now()) / 1000);
        setCurrentRemaining(newRemaining);
        if (newRemaining > 0) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Initial mount - start animation
  useEffect(() => {
    startAnimation();
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startAnimation]);

  // React ONLY to meaningful prop changes (deadline jump, total change, time bank phase change)
  // This effect decides IF we need to restart animation (not run the animation itself)
  useEffect(() => {
    const totalChanged = total !== prevTotalRef.current;
    const timeBankPhaseChanged = isTimeBankPhase !== prevTimeBankPhaseRef.current;

    // Deadline jump detection: only restart if difference > 2 seconds (new turn)
    let deadlineJumped = false;
    const prev = prevDeadlineMsRef.current;
    const curr = deadlineMs ?? 0;
    if (curr > 0 && prev !== null) {
      const diffMs = Math.abs(curr - prev);
      deadlineJumped = diffMs > 2000;
    } else if (curr > 0 && prev === null) {
      // First time getting a valid deadline
      deadlineJumped = true;
    }

    // Update refs
    prevDeadlineMsRef.current = curr > 0 ? curr : prev;
    prevTotalRef.current = total;
    prevTimeBankPhaseRef.current = isTimeBankPhase;

    // CRITICAL FIX: When deadline jumps (new turn), ALWAYS restart animation
    // Previously we only restarted if animationRef.current === null, but the animation
    // was still running with the OLD deadline, causing visual "jitter" instead of clean reset.
    if (deadlineJumped || totalChanged || timeBankPhaseChanged) {
      // Force update the stable ref immediately so the animation uses the new deadline
      if (curr > 0) {
        deadlineMsStableRef.current = curr;
      }
      
      // ALWAYS restart animation on new turn to reset from 100%
      // Cancel existing animation first to prevent overlap
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Immediately set currentRemaining to full value for instant visual reset
      if (curr > 0) {
        const newRemaining = Math.max(0, (curr - Date.now()) / 1000);
        setCurrentRemaining(newRemaining);
      }
      
      // Start fresh animation loop
      if (curr > Date.now()) {
        startAnimation();
      }
    }
  }, [deadlineMs, total, isTimeBankPhase, startAnimation]);

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
