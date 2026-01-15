/**
 * ServerSyncTimer - PokerStars-Style Timer Ring
 * 
 * ARCHITECTURE (CORRECT - MATCHES SERVER):
 * - Server logic: TWO SEPARATE PHASES (not one continuous timer)
 *   1. Base phase (15s cash / 30s tournament) - green ring
 *   2. Time bank phase (30s cash / 60s tournament) - starts fresh when base expires
 * - When time bank activates: server RESETS actionStartTime = Date.now()
 * - Client receives: timeRemaining (current phase only), totalTime (current phase)
 * 
 * SYNC STRATEGY:
 * - Use server's timeRemaining as authoritative source
 * - Interpolate locally between server updates for smooth animation
 * - On phase change (base→timebank): ring resets to full, new color scheme
 * 
 * CRITICAL: Do NOT try to show "one ring for base+timebank" - that's not how server works!
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ServerSyncTimerProps {
  /** Remaining time in seconds - from server (authoritative, CURRENT PHASE ONLY) */
  timeRemaining: number;
  /** Total time for this phase in seconds (base: 15s cash/30s tournament, timebank: 30s/60s) */
  totalTime: number;
  /** Unix timestamp (ms) when last server update was received - for smooth interpolation */
  lastUpdateTime?: number;
  /** Visual size of the ring in pixels */
  size: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Is time bank phase active? (changes color scheme) */
  isTimeBankPhase?: boolean;
  className?: string;
}

// Color thresholds (seconds)
const WARNING_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 5;

export const ServerSyncTimer = memo(function ServerSyncTimer({
  timeRemaining,
  totalTime,
  lastUpdateTime,
  size,
  strokeWidth = 3,
  isTimeBankPhase = false,
  className
}: ServerSyncTimerProps) {
  // Current displayed remaining time - updated every frame
  const [displayRemaining, setDisplayRemaining] = useState(timeRemaining);
  const animationRef = useRef<number | null>(null);
  
  // Track when we last received server data for interpolation
  const lastServerTimeRef = useRef<number>(Date.now());
  const lastServerRemainingRef = useRef<number>(timeRemaining);

  // When server sends new timeRemaining, recalibrate
  useEffect(() => {
    lastServerTimeRef.current = lastUpdateTime || Date.now();
    lastServerRemainingRef.current = timeRemaining;
    
    // Immediately set to server value
    setDisplayRemaining(timeRemaining);
  }, [timeRemaining, lastUpdateTime]);

  // Animation loop - interpolate from last server value
  useEffect(() => {
    const animate = () => {
      // Calculate how much time has passed since last server update
      const now = Date.now();
      const elapsedSinceUpdate = (now - lastServerTimeRef.current) / 1000;
      
      // Interpolate: server's timeRemaining minus local elapsed
      const interpolated = Math.max(0, lastServerRemainingRef.current - elapsedSinceUpdate);
      
      setDisplayRemaining(interpolated);

      if (interpolated > 0) {
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
  }, [timeRemaining]); // Restart animation when server value changes

  // Calculate ring geometry
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, displayRemaining / totalTime)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining time AND phase
  // Base phase: always green (player has time bank backup)
  // Time bank phase: yellow→red (this is the last reserve)
  let strokeColor: string;
  let glowColor: string;
  let isCritical = false;

  if (isTimeBankPhase) {
    // Time bank colors: more urgent
    if (displayRemaining <= CRITICAL_THRESHOLD) {
      strokeColor = '#ef4444'; // Red - critical!
      glowColor = 'rgba(239, 68, 68, 0.8)';
      isCritical = true;
    } else if (displayRemaining <= WARNING_THRESHOLD) {
      strokeColor = '#f59e0b'; // Amber - warning
      glowColor = 'rgba(245, 158, 11, 0.6)';
    } else {
      strokeColor = '#f59e0b'; // Start amber for time bank (urgent feel)
      glowColor = 'rgba(245, 158, 11, 0.5)';
    }
  } else {
    // Base phase: green (player still has time bank reserve)
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
