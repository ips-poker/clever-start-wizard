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
  // Current remaining time in seconds (updated at 60fps)
  const [currentRemaining, setCurrentRemaining] = useState<number>(() => {
    const now = Date.now();
    return Math.max(0, (deadlineMs - now) / 1000);
  });

  // Refs for animation loop
  const animationRef = useRef<number | null>(null);
  
  // Store current props in refs for stable animation closure
  const deadlineRef = useRef<number>(deadlineMs);
  const totalRef = useRef<number>(total);

  // Update refs when props change
  useEffect(() => {
    deadlineRef.current = deadlineMs;
    totalRef.current = total;
  }, [deadlineMs, total]);

  // Main 60fps animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const remaining = Math.max(0, (deadlineRef.current - now) / 1000);
      setCurrentRemaining(remaining);

      // Continue animation while time remains
      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    // Always restart animation when deadline changes
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Immediately set current state to match new deadline
    const now = Date.now();
    const initialRemaining = Math.max(0, (deadlineMs - now) / 1000);
    setCurrentRemaining(initialRemaining);
    
    // Start animation loop
    if (initialRemaining > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [deadlineMs]); // Only restart on deadline change

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS CALCULATION - PokerStars Style
  // ═══════════════════════════════════════════════════════════════════════════
  // progress = 1.0 means full ring (timer just started)
  // progress = 0.0 means empty ring (timer expired)
  // We clamp to [0, 1] to handle edge cases
  const progress = total > 0 ? Math.min(1, Math.max(0, currentRemaining / total)) : 0;

  // SVG calculations
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  // strokeDashoffset = 0 means full circle, = circumference means empty circle
  // We want: progress=1 -> full circle, progress=0 -> empty
  const strokeDashoffset = circumference * (1 - progress);

  // Color thresholds from pokerTimerConfig
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
        transform: 'rotate(-90deg)', // Start from top
        filter: glowFilter
      }}
    >
      {/* Background track (always visible) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={strokeWidth}
      />

      {/* Progress arc (animated) */}
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
