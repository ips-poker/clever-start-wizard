// Simple 60fps Timer Ring Around Avatar
// SIMPLIFIED V4: No time bank, just a simple countdown timer
import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SmoothAvatarTimerProps {
  remaining: number;        // Remaining seconds from server
  total: number;            // Total time allocated (actionTimeSeconds)
  mainTimerDuration?: number; // Kept for compatibility but ignored
  timeBankDuration?: number;  // Kept for compatibility but ignored
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

  // Simple progress calculation: remaining / total
  const progress = Math.max(0, Math.min(1, currentRemaining / total));
  
  // Warning threshold: less than 25% of time remaining
  const isWarning = currentRemaining <= total * 0.25;
  // Critical threshold: less than 10% of time remaining
  const isCritical = currentRemaining <= total * 0.10;

  useEffect(() => {
    // Reset animation when remaining time changes significantly
    startTimeRef.current = Date.now();
    startRemainingRef.current = remaining;

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
  }, [remaining]);

  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Design tokens - colors based on time remaining
  const trackColor = 'hsla(var(--background), 0.35)';
  
  // Color progression: green → yellow → red
  let strokeColor: string;
  let glowColor: string;
  
  if (isCritical) {
    strokeColor = 'hsl(0, 85%, 55%)'; // Red
    glowColor = 'hsla(0, 85%, 55%, 0.5)';
  } else if (isWarning) {
    strokeColor = 'hsl(40, 95%, 55%)'; // Yellow/Orange
    glowColor = 'hsla(40, 95%, 55%, 0.4)';
  } else {
    strokeColor = 'hsl(140, 75%, 50%)'; // Green
    glowColor = 'hsla(140, 75%, 50%, 0.35)';
  }

  const glowSpread = isCritical ? 10 : isWarning ? 8 : 6;

  return (
    <div 
      className={cn("relative pointer-events-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Main SVG ring */}
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          filter: `drop-shadow(0 0 ${glowSpread}px ${glowColor})`
        }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
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
          style={{
            transition: 'stroke 0.3s ease'
          }}
        />
      </svg>
    </div>
  );
});

export default SmoothAvatarTimer;
