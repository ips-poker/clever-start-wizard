// Smooth 60fps Timer Ring Around Avatar with Time Bank Pulsing Effect
// Main timer (30 sec, GREEN) → Time bank (15 sec, RED pulsing)
import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SmoothAvatarTimerProps {
  remaining: number;        // Remaining seconds from server
  total: number;            // Total time allocated (main + timebank = 45 sec)
  mainTimerDuration?: number; // Main timer duration (default 30 sec)
  timeBankDuration?: number;  // Time bank duration (default 15 sec)
  size: number;
  strokeWidth?: number;
  className?: string;
}

export const SmoothAvatarTimer = memo(function SmoothAvatarTimer({
  remaining,
  total,
  mainTimerDuration = 30,
  timeBankDuration = 15,
  size,
  strokeWidth = 4,
  className
}: SmoothAvatarTimerProps) {
  const [currentRemaining, setCurrentRemaining] = useState(remaining);
  const [pulsePhase, setPulsePhase] = useState(0);
  const animationRef = useRef<number>();
  const pulseRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const startRemainingRef = useRef<number>(remaining);

  // POKERSTARS TIMER LOGIC:
  // Total time = mainTimerDuration (30 sec) + timeBankDuration (15 sec) = 45 sec
  // 
  // remaining > 15 sec → MAIN TIMER (GREEN ring, not pulsing)
  //   Example: remaining=40 → main timer, green
  //   Example: remaining=20 → main timer, green  
  //
  // remaining ≤ 15 sec → TIME BANK (RED pulsing ring)
  //   Example: remaining=15 → time bank starts, red pulsing
  //   Example: remaining=5 → time bank, red pulsing
  //
  const isInTimeBank = currentRemaining <= timeBankDuration;
  
  // Calculate progress (0 to 1) for the ring display
  let progress: number;
  if (isInTimeBank) {
    // TIME BANK phase: 15 sec → progress=1, 0 sec → progress=0
    progress = Math.max(0, currentRemaining / timeBankDuration);
  } else {
    // MAIN TIMER phase: 45 sec → progress=1, 15 sec → progress=0
    progress = Math.max(0, (currentRemaining - timeBankDuration) / mainTimerDuration);
  }

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

  // Pulse animation for time bank phase - smooth 60fps pulsing
  useEffect(() => {
    if (isInTimeBank) {
      const startTime = Date.now();
      const pulseDuration = 350; // ms for one pulse cycle - urgent
      
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
  }, [isInTimeBank]);

  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  // Color based on phase: GREEN for main timer, RED for time bank
  const strokeColor = isInTimeBank ? '#ef4444' : '#22c55e';

  // Dynamic glow intensity based on pulse phase when in time bank
  const glowIntensity = isInTimeBank ? 0.4 + (pulsePhase * 0.6) : 0.4;
  const glowSpread = isInTimeBank ? 8 + (pulsePhase * 12) : 6;
  
  const glowColor = isInTimeBank
    ? `rgba(239, 68, 68, ${glowIntensity})`
    : 'rgba(34, 197, 94, 0.4)';

  // Dynamic stroke width when pulsing in time bank
  const dynamicStrokeWidth = isInTimeBank 
    ? strokeWidth + (pulsePhase * 3) 
    : strokeWidth;

  // Outer ring scale for pulsing effect
  const outerRingScale = isInTimeBank ? 1 + (pulsePhase * 0.1) : 1;
  const outerRingOpacity = isInTimeBank ? 0.2 + (pulsePhase * 0.4) : 0;

  return (
    <div 
      className={cn("relative pointer-events-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer pulsing ring for time bank */}
      {isInTimeBank && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: `scale(${outerRingScale})`,
            boxShadow: `0 0 ${glowSpread}px ${glowSpread / 2}px rgba(239, 68, 68, ${outerRingOpacity})`,
            border: `2px solid rgba(239, 68, 68, ${outerRingOpacity})`,
            transition: 'none'
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

        {/* Inner glow circle when in time bank - follows pulse */}
        {isInTimeBank && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={dynamicStrokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            opacity={0.15 + (pulsePhase * 0.2)}
          />
        )}
      </svg>
      
      {/* Additional outer glow rings for dramatic effect during time bank */}
      {isInTimeBank && (
        <>
          <div
            className="absolute inset-[-4px] rounded-full pointer-events-none"
            style={{
              boxShadow: `inset 0 0 ${6 + pulsePhase * 6}px rgba(239, 68, 68, ${0.15 + pulsePhase * 0.25})`,
            }}
          />
          <div
            className="absolute inset-[-10px] rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 ${16 + pulsePhase * 12}px rgba(239, 68, 68, ${0.12 + pulsePhase * 0.18})`,
            }}
          />
        </>
      )}
    </div>
  );
});

export default SmoothAvatarTimer;
