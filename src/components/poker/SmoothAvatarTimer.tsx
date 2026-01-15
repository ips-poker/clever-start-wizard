// Smooth 60fps Timer Ring Around Avatar - PokerStars Style
// Uses centralized timer configuration for consistency
// Single continuous ring - no reset when time bank activates
import React, { memo, useState, useEffect, useRef } from 'react';
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
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const startRemainingRef = useRef<number>(remaining);
  const lastRemainingRef = useRef<number>(remaining);
  const totalRef = useRef<number>(total);

  // Update total ref without resetting animation
  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    // Only reset animation when remaining changes significantly (new turn)
    // Small decrements from server updates should not reset
    const diff = Math.abs(remaining - lastRemainingRef.current);
    const isNewTurn = remaining > lastRemainingRef.current + 2; // Timer went up = new turn
    const isServerResync = diff < 2; // Small adjustment = just sync, don't reset
    
    lastRemainingRef.current = remaining;
    
    if (isNewTurn || !isServerResync) {
      // New turn started or significant change - reset animation
      startTimeRef.current = Date.now();
      startRemainingRef.current = remaining;
      setCurrentRemaining(remaining);
    }
    // If it's a small server resync, just update the reference without visual reset
    // The animation will smoothly continue

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, startRemainingRef.current - elapsed);
      setCurrentRemaining(newRemaining);

      if (newRemaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Cancel any existing animation before starting new one
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remaining]); // Only depend on remaining, not total

  // Use current total from ref for smooth transitions
  const currentTotal = totalRef.current;
  const progress = currentTotal > 0 ? Math.max(0, currentRemaining / currentTotal) : 0;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Use centralized timer configuration
  const isCritical = isTimerCritical(currentRemaining);
  
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
