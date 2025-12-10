// =====================================================
// PPPOKER-STYLE ENHANCED TIMER RING
// =====================================================
// Smooth, professional timer with no jerking animation
// Uses requestAnimationFrame for 60fps smoothness

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PPPokerEnhancedTimerProps {
  /** Remaining time in seconds from server */
  remaining: number;
  /** Total duration in seconds */
  total: number;
  /** Ring size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Show time text in center */
  showText?: boolean;
  /** Optional callback when timer reaches zero */
  onTimeout?: () => void;
}

export const PPPokerEnhancedTimer = memo(function PPPokerEnhancedTimer({
  remaining,
  total,
  size = 70,
  strokeWidth = 5,
  showText = false,
  onTimeout
}: PPPokerEnhancedTimerProps) {
  const [displayProgress, setDisplayProgress] = useState(1);
  const [displayTime, setDisplayTime] = useState(remaining);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startRemainingRef = useRef<number>(remaining);
  const lastServerRemainingRef = useRef<number>(remaining);

  // Sync with server time, but animate smoothly
  useEffect(() => {
    // If server time changed significantly, resync
    if (Math.abs(remaining - lastServerRemainingRef.current) > 2) {
      startTimeRef.current = performance.now();
      startRemainingRef.current = remaining;
    }
    lastServerRemainingRef.current = remaining;
  }, [remaining]);

  // Smooth animation loop using requestAnimationFrame
  useEffect(() => {
    if (remaining <= 0 || total <= 0) {
      setDisplayProgress(0);
      setDisplayTime(0);
      return;
    }

    startTimeRef.current = performance.now();
    startRemainingRef.current = remaining;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const currentRemaining = Math.max(0, startRemainingRef.current - elapsed);
      const progress = Math.max(0, Math.min(1, currentRemaining / total));
      
      setDisplayProgress(progress);
      setDisplayTime(currentRemaining);
      
      if (currentRemaining <= 0) {
        onTimeout?.();
        return;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remaining, total, onTimeout]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - displayProgress);
  
  // Color transitions - PPPoker style
  const isWarning = displayProgress < 0.35;
  const isCritical = displayProgress < 0.15;
  
  const strokeColor = isCritical 
    ? '#ef4444'   // Red
    : isWarning 
      ? '#f59e0b' // Amber
      : '#22c55e'; // Green
      
  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.6)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.5)'
      : 'rgba(34, 197, 94, 0.5)';

  // Pulsing animation for critical time
  const pulseOpacity = isCritical 
    ? 0.7 + 0.3 * Math.sin(Date.now() / 150)
    : 1;

  return (
    <div className="absolute pointer-events-none" style={{
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 25
    }}>
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`
        }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.5)"
          strokeWidth={strokeWidth}
        />
        
        {/* Secondary background for depth */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth - 1}
        />

        {/* Main progress ring */}
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
            opacity: pulseOpacity,
            transition: 'stroke 0.3s ease'
          }}
        />
        
        {/* Inner glow ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - 1}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          opacity={0.5}
        />
      </svg>

      {/* Timer text */}
      {showText && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: strokeColor }}
        >
          <span className="font-bold text-sm tabular-nums">
            {Math.ceil(displayTime)}
          </span>
        </div>
      )}
    </div>
  );
});

// Timer badge with digital display - positioned outside avatar
interface PPPokerTimerDisplayProps {
  remaining: number;
  total: number;
  position?: 'left' | 'right' | 'bottom';
  isMobile?: boolean;
}

export const PPPokerTimerDisplay = memo(function PPPokerTimerDisplay({
  remaining,
  total,
  position = 'left',
  isMobile = false
}: PPPokerTimerDisplayProps) {
  const [displayTime, setDisplayTime] = useState(remaining);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const startRemainingRef = useRef<number>(remaining);

  useEffect(() => {
    if (Math.abs(remaining - startRemainingRef.current) > 1) {
      startTimeRef.current = performance.now();
      startRemainingRef.current = remaining;
    }
  }, [remaining]);

  useEffect(() => {
    if (remaining <= 0) {
      setDisplayTime(0);
      return;
    }

    startTimeRef.current = performance.now();
    startRemainingRef.current = remaining;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const current = Math.max(0, startRemainingRef.current - elapsed);
      setDisplayTime(current);
      
      if (current > 0) {
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

  const progress = total > 0 ? displayTime / total : 0;
  const isWarning = progress < 0.35;
  const isCritical = progress < 0.15;

  const minutes = Math.floor(displayTime / 60);
  const seconds = Math.floor(displayTime % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const bgGradient = isCritical
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : isWarning
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #22c55e, #16a34a)';

  const positionStyles: Record<string, React.CSSProperties> = {
    left: { left: isMobile ? -58 : -68, top: '50%', transform: 'translateY(-50%)' },
    right: { right: isMobile ? -58 : -68, top: '50%', transform: 'translateY(-50%)' },
    bottom: { bottom: isMobile ? -32 : -38, left: '50%', transform: 'translateX(-50%)' }
  };

  return (
    <div
      className={cn("absolute z-30 flex items-center gap-1.5 rounded-full px-2.5 py-1", isCritical && "animate-pulse")}
      style={{
        ...positionStyles[position],
        background: bgGradient,
        boxShadow: `0 0 20px ${isCritical ? 'rgba(220,38,38,0.6)' : isWarning ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.5)'}`,
        border: '1px solid rgba(255,255,255,0.25)'
      }}
    >
      <span className="text-white/90 text-xs">⏱️</span>
      <span className={cn("font-bold tabular-nums text-white", isMobile ? "text-[11px]" : "text-sm")}>
        {formattedTime}
      </span>
    </div>
  );
});

export default PPPokerEnhancedTimer;
