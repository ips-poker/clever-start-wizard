// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Designed to stay visually smooth even when parent updates `remaining` every second.
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isTimerCritical, getTimerColorHex, getTimerGlowColor } from '@/constants/pokerTimerConfig';

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

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const startRemainingRef = useRef<number>(remaining);

  // Keep a ref in sync so we can measure drift vs. incoming props.
  const currentRemainingRef = useRef<number>(remaining);
  const lastTotalRef = useRef<number>(total);

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

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync only on *meaningful* changes.
  // This avoids restarting the animation every second (which causes “спешит/опаздывает”).
  useEffect(() => {
    const totalChanged = total !== lastTotalRef.current;
    const drift = Math.abs(remaining - currentRemainingRef.current);

    // IMPORTANT: parent often passes integer seconds (Math.ceil). That can be up to ~0.99s higher than
    // our smooth internal value and would look like a “jump up” even though time is decreasing.
    // So treat “jumped up” only when the prop increases by more than ~1.25s (new turn / time bank).
    const jumpedUp = remaining > currentRemainingRef.current + 1.25;

    // If server corrects the remaining time by more than ~1.25s, re-sync.
    const needsResync = totalChanged || jumpedUp || drift > 1.25;

    if (needsResync) {
      lastTotalRef.current = total;
      startAnimation(remaining);
    }
  }, [remaining, total]);

  const progress =
    total > 0 ? Math.min(1, Math.max(0, currentRemaining / total)) : 0;

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

