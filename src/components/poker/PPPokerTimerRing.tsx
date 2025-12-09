// =====================================================
// PPPOKER-STYLE ANIMATED TIMER RING
// =====================================================
// Real-time circular countdown with smooth animation, 
// color transitions, and glowing effects like PPPoker

import React, { memo, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PPPokerTimerRingProps {
  /** Remaining time in seconds */
  remaining: number;
  /** Total duration in seconds */
  total: number;
  /** Ring size in pixels */
  size?: number;
  /** Whether to show the timer text */
  showText?: boolean;
  /** Callback when timer reaches zero */
  onTimeout?: () => void;
  /** Enable glow effect */
  enableGlow?: boolean;
  /** Stroke width */
  strokeWidth?: number;
}

export const PPPokerTimerRing = memo(function PPPokerTimerRing({
  remaining,
  total,
  size = 70,
  showText = false,
  onTimeout,
  enableGlow = true,
  strokeWidth = 4
}: PPPokerTimerRingProps) {
  const [localRemaining, setLocalRemaining] = useState(remaining);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastRemainingRef = useRef(remaining);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external remaining time
  useEffect(() => {
    if (Math.abs(remaining - lastRemainingRef.current) > 1) {
      setLocalRemaining(remaining);
    }
    lastRemainingRef.current = remaining;
  }, [remaining]);

  // Smooth local countdown for animation
  useEffect(() => {
    if (remaining > 0) {
      setIsAnimating(true);
      intervalRef.current = setInterval(() => {
        setLocalRemaining(prev => {
          const next = prev - 0.05; // Update every 50ms for smooth animation
          if (next <= 0) {
            onTimeout?.();
            return 0;
          }
          return next;
        });
      }, 50);
    } else {
      setIsAnimating(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [remaining > 0, onTimeout]);

  const progress = total > 0 ? Math.max(0, Math.min(1, localRemaining / total)) : 0;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  // PPPoker-style color transitions
  const isWarning = progress < 0.35;
  const isCritical = progress < 0.15;
  
  // Color scheme matching PPPoker
  const strokeColor = isCritical 
    ? '#ef4444' // Red
    : isWarning 
      ? '#f59e0b' // Amber
      : '#22c55e'; // Green (PPPoker signature)

  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.7)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.6)'
      : 'rgba(34, 197, 94, 0.6)';

  // PPPoker uses thick strokes with bright glow
  const glowFilter = enableGlow 
    ? `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`
    : 'none';

  return (
    <svg
      className="absolute pointer-events-none"
      width={size}
      height={size}
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(-90deg)',
        filter: glowFilter,
        zIndex: 25
      }}
    >
      {/* Background track - dark with subtle visibility */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0, 0, 0, 0.5)"
        strokeWidth={strokeWidth}
        opacity={0.6}
      />
      
      {/* Secondary background ring for depth */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth - 1}
      />

      {/* Main progress ring with smooth transition */}
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
        className={cn(
          "transition-colors duration-300",
          isCritical && isAnimating && "animate-[pulse_0.5s_ease-in-out_infinite]"
        )}
        style={{
          transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease'
        }}
      />

      {/* Inner glow effect overlay */}
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
        opacity={0.4}
        style={{
          transition: 'stroke-dashoffset 0.05s linear'
        }}
      />

      {/* Timer text in center (optional) */}
      {showText && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={strokeColor}
          fontSize={size / 4}
          fontWeight="bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {Math.ceil(localRemaining)}
        </text>
      )}
    </svg>
  );
});

// =====================================================
// PPPOKER TIMER BADGE - Digital timer display
// =====================================================
interface PPPokerTimerBadgeProps {
  remaining: number;
  total: number;
  position?: 'left' | 'right' | 'bottom';
  isMobile?: boolean;
}

export const PPPokerTimerBadge = memo(function PPPokerTimerBadge({
  remaining,
  total,
  position = 'left',
  isMobile = false
}: PPPokerTimerBadgeProps) {
  const progress = total > 0 ? remaining / total : 0;
  const isWarning = progress < 0.35;
  const isCritical = progress < 0.15;

  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Gradient backgrounds matching PPPoker style
  const bgGradient = isCritical
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : isWarning
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #22c55e, #16a34a)';

  const glowShadow = isCritical
    ? '0 0 20px rgba(220, 38, 38, 0.6)'
    : isWarning
      ? '0 0 20px rgba(245, 158, 11, 0.5)'
      : '0 0 20px rgba(34, 197, 94, 0.5)';

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    left: { left: isMobile ? -55 : -65, top: '50%', transform: 'translateY(-50%)' },
    right: { right: isMobile ? -55 : -65, top: '50%', transform: 'translateY(-50%)' },
    bottom: { bottom: isMobile ? -30 : -35, left: '50%', transform: 'translateX(-50%)' }
  };

  return (
    <div
      className={cn(
        "absolute z-30 flex items-center gap-1 rounded-full px-2 py-1",
        isCritical && "animate-pulse"
      )}
      style={{
        ...positionStyles[position],
        background: bgGradient,
        boxShadow: glowShadow,
        border: '1px solid rgba(255, 255, 255, 0.25)'
      }}
    >
      <span className={cn("text-white", isMobile ? "text-xs" : "text-sm")}>⏱️</span>
      <span className={cn(
        "font-bold tabular-nums text-white",
        isMobile ? "text-[11px]" : "text-sm"
      )}>
        {formattedTime}
      </span>
    </div>
  );
});

export default PPPokerTimerRing;
