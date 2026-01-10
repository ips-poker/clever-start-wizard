// Smooth 60fps Timer Ring Around Avatar with Pulsing Effect
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
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
  const [pulsePhase, setPulsePhase] = useState(0);
  const animationRef = useRef<number>();
  const pulseRef = useRef<number>();
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

  // Separate pulse animation for critical state - smooth 60fps pulsing
  useEffect(() => {
    const isCritical = progress < 0.2;
    
    if (isCritical) {
      const startTime = Date.now();
      const pulseDuration = 400; // ms for one pulse cycle - faster for urgency
      
      const animatePulse = () => {
        const elapsed = Date.now() - startTime;
        // Sin wave for smooth pulsing (0 to 1 to 0)
        const phase = (Math.sin((elapsed / pulseDuration) * Math.PI * 2) + 1) / 2;
        setPulsePhase(phase);
        pulseRef.current = requestAnimationFrame(animatePulse);
      };
      
      pulseRef.current = requestAnimationFrame(animatePulse);
      
      return () => {
        if (pulseRef.current) {
          cancelAnimationFrame(pulseRef.current);
        }
      };
    } else {
      setPulsePhase(0);
    }
  }, [progress < 0.2]);

  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Color and style based on progress
  const isCritical = progress < 0.2;
  const isWarning = progress < 0.4;
  
  const strokeColor = isCritical 
    ? '#ef4444' 
    : isWarning 
      ? '#f59e0b' 
      : '#22c55e';

  // Dynamic glow intensity based on pulse phase when critical
  const glowIntensity = isCritical ? 0.4 + (pulsePhase * 0.6) : isWarning ? 0.5 : 0.4;
  const glowSpread = isCritical ? 8 + (pulsePhase * 12) : 8;
  
  const glowColor = isCritical
    ? `rgba(239, 68, 68, ${glowIntensity})`
    : isWarning
      ? 'rgba(245, 158, 11, 0.5)'
      : 'rgba(34, 197, 94, 0.4)';

  // Dynamic stroke width when pulsing
  const dynamicStrokeWidth = isCritical 
    ? strokeWidth + (pulsePhase * 2) 
    : strokeWidth;

  // Outer ring scale for pulsing effect
  const outerRingScale = isCritical ? 1 + (pulsePhase * 0.08) : 1;
  const outerRingOpacity = isCritical ? 0.15 + (pulsePhase * 0.35) : 0;

  return (
    <div 
      className={cn("relative pointer-events-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer pulsing ring for critical state */}
      {isCritical && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: `scale(${outerRingScale})`,
            boxShadow: `0 0 ${glowSpread}px ${glowSpread / 2}px rgba(239, 68, 68, ${outerRingOpacity})`,
            border: `2px solid rgba(239, 68, 68, ${outerRingOpacity})`,
            transition: 'none' // No CSS transition - we control with JS for 60fps
          }}
        />
      )}
      
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
          strokeWidth={dynamicStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Inner glow circle when critical - follows pulse */}
        {isCritical && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={dynamicStrokeWidth + 6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            opacity={0.2 + (pulsePhase * 0.15)}
          />
        )}
      </svg>
      
      {/* Additional outer glow rings for dramatic effect when critical */}
      {isCritical && (
        <>
          <div
            className="absolute inset-[-4px] rounded-full pointer-events-none"
            style={{
              boxShadow: `inset 0 0 ${4 + pulsePhase * 4}px rgba(239, 68, 68, ${0.1 + pulsePhase * 0.2})`,
            }}
          />
          <div
            className="absolute inset-[-8px] rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 ${12 + pulsePhase * 8}px rgba(239, 68, 68, ${0.1 + pulsePhase * 0.15})`,
            }}
          />
        </>
      )}
    </div>
  );
});

export default SmoothAvatarTimer;
