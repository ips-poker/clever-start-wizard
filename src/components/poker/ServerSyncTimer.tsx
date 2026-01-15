/**
 * ServerSyncTimer - Timer Ring synchronized with server's actionStartTime
 * 
 * ARCHITECTURE:
 * - Server is the ONLY source of truth (PokerStars-style)
 * - Server sends actionStartTime (Unix ms) when turn starts
 * - Client calculates: remaining = totalTime - (now - actionStartTime)
 * - Ring progress = remaining / totalTime
 * - Full reset happens when actionStartTime changes (new turn)
 * 
 * NO LOCAL STATE - pure calculation from server time on every frame
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ServerSyncTimerProps {
  /** Unix timestamp (ms) when this turn started - from server */
  actionStartTime: number;
  /** Total time for this phase in seconds (15s base or 30s time bank) */
  totalTime: number;
  /** Visual size of the ring in pixels */
  size: number;
  /** Ring stroke width */
  strokeWidth?: number;
  className?: string;
}

// Color thresholds (seconds)
const WARNING_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 5;

export const ServerSyncTimer = memo(function ServerSyncTimer({
  actionStartTime,
  totalTime,
  size,
  strokeWidth = 3,
  className
}: ServerSyncTimerProps) {
  // Current remaining time - updated every frame
  const [remaining, setRemaining] = useState(totalTime);
  const animationRef = useRef<number | null>(null);
  const lastActionStartRef = useRef<number>(0);

  useEffect(() => {
    // Detect new turn by actionStartTime change
    if (actionStartTime !== lastActionStartRef.current) {
      lastActionStartRef.current = actionStartTime;
      // Reset to full on new turn
      setRemaining(totalTime);
    }

    // Animation loop - calculate remaining from server time on every frame
    const animate = () => {
      const now = Date.now();
      const elapsed = (now - actionStartTime) / 1000;
      const newRemaining = Math.max(0, totalTime - elapsed);
      setRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [actionStartTime, totalTime]);

  // Calculate ring geometry
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, remaining / totalTime)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining time
  let strokeColor: string;
  let glowColor: string;
  let isCritical = false;

  if (remaining <= CRITICAL_THRESHOLD) {
    strokeColor = '#ef4444'; // Red
    glowColor = 'rgba(239, 68, 68, 0.8)';
    isCritical = true;
  } else if (remaining <= WARNING_THRESHOLD) {
    strokeColor = '#f59e0b'; // Yellow/Amber
    glowColor = 'rgba(245, 158, 11, 0.6)';
  } else {
    strokeColor = '#22c55e'; // Green
    glowColor = 'rgba(34, 197, 94, 0.4)';
  }

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
    </svg>
  );
});

export default ServerSyncTimer;
