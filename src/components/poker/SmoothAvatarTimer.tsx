// Smooth 60fps Timer Ring Around Avatar
import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  const [progress, setProgress] = useState(remaining / total);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const startProgressRef = useRef<number>(remaining / total);

  useEffect(() => {
    // Reset animation when remaining time changes
    startTimeRef.current = Date.now();
    startProgressRef.current = remaining / total;

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newProgress = Math.max(0, startProgressRef.current - (elapsed / total));
      setProgress(newProgress);

      if (newProgress > 0) {
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

  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on progress
  const isCritical = progress < 0.2;
  const isWarning = progress < 0.4;
  
  const strokeColor = isCritical 
    ? '#ef4444' 
    : isWarning 
      ? '#f59e0b' 
      : '#22c55e';

  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.6)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.5)'
      : 'rgba(34, 197, 94, 0.4)';

  return (
    <svg
      width={size}
      height={size}
      className={cn("pointer-events-none", className)}
      style={{
        transform: 'rotate(-90deg)',
        filter: `drop-shadow(0 0 8px ${glowColor})`
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
        className={cn(isCritical && "animate-pulse")}
      />

      {/* Glow effect when critical */}
      {isCritical && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          opacity={0.3}
          className="animate-pulse"
        />
      )}
    </svg>
  );
});

export default SmoothAvatarTimer;
