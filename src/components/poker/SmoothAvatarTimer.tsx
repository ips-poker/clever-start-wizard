// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Designed to stay visually smooth even when parent updates `remaining` every second.
// Supports Time Bank phase with distinct blue coloring and enhanced pulsation
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isTimerCritical, getTimerColorHex, getTimerGlowColor, POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';

interface SmoothAvatarTimerProps {
  remaining: number;
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
  remaining,
  total,
  size,
  strokeWidth = 4,
  className,
  isTimeBankPhase = false,
  timeBankRemaining
}: SmoothAvatarTimerProps) {
  const [currentRemaining, setCurrentRemaining] = useState(remaining);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const startRemainingRef = useRef<number>(remaining);

  // Keep a ref in sync so we can measure drift vs. incoming props.
  const currentRemainingRef = useRef<number>(remaining);
  const lastTotalRef = useRef<number>(total);
  const lastTimeBankPhaseRef = useRef<boolean>(isTimeBankPhase);
  const lastRemainingRef = useRef<number>(remaining);

  const startAnimation = (startRemaining: number) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    startTimeRef.current = Date.now();
    startRemainingRef.current = startRemaining;
    currentRemainingRef.current = startRemaining;
    setCurrentRemaining(startRemaining);

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, startRemainingRef.current - elapsed);

      currentRemainingRef.current = newRemaining;
      setCurrentRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Start once on mount.
  useEffect(() => {
    startAnimation(remaining);
    lastTotalRef.current = total;
    lastTimeBankPhaseRef.current = isTimeBankPhase;
    lastRemainingRef.current = remaining;

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync only on *meaningful* changes.
  // This avoids restarting the animation every second (which causes "спешит/опаздывает").
  useEffect(() => {
    const totalChanged = total !== lastTotalRef.current;
    const timeBankPhaseChanged = isTimeBankPhase !== lastTimeBankPhaseRef.current;
    const drift = Math.abs(remaining - currentRemainingRef.current);
    const jumpedUp = remaining > currentRemainingRef.current + 0.75; // new turn / time bank
    
    // CRITICAL FIX: Also detect when remaining jumped significantly (new turn started)
    // This ensures timer resets properly after each player action
    const significantRemainingChange = Math.abs(remaining - lastRemainingRef.current) > 2;
    
    lastRemainingRef.current = remaining;

    // If server corrects the remaining time by more than ~1.25s, re-sync.
    // Also resync when time bank phase changes (important visual transition)
    // Also resync on significant remaining time changes (new turn)
    const needsResync = totalChanged || timeBankPhaseChanged || jumpedUp || drift > 1.25 || significantRemainingChange;

    if (needsResync) {
      lastTotalRef.current = total;
      lastTimeBankPhaseRef.current = isTimeBankPhase;
      startAnimation(remaining);
    }
  }, [remaining, total, isTimeBankPhase]);

  const progress =
    total > 0 ? Math.min(1, Math.max(0, currentRemaining / total)) : 0;

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
