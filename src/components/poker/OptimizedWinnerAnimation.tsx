/**
 * Optimized Winner Animation
 * Uses CSS transforms and minimal DOM elements for smooth mobile performance
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { LightweightChip } from './LightweightChip';

interface OptimizedWinnerAnimationProps {
  isActive: boolean;
  fromPosition: { x: number; y: number }; // Pot position (%)
  toPosition: { x: number; y: number };   // Winner position (%)
  amount: number;
  onComplete?: () => void;
}

interface FlyingChipData {
  id: number;
  delay: number;
  offsetX: number;
  offsetY: number;
  bbValue: number;
}

// Single flying chip with CSS animation
const FlyingChipCSS = memo(function FlyingChipCSS({
  fromX,
  fromY,
  toX,
  toY,
  delay,
  bbValue,
  onComplete
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay: number;
  bbValue: number;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<'start' | 'flying' | 'done'>('start');
  
  useEffect(() => {
    const startTimer = setTimeout(() => setPhase('flying'), delay);
    const endTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, delay + 500);
    
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [delay, onComplete]);

  if (phase === 'done') return null;

  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${fromX}%`,
        top: `${fromY}%`,
        transform: phase === 'flying' 
          ? `translate(calc(-50% + ${deltaX}vw), calc(-50% + ${deltaY}vh)) scale(0.7)`
          : 'translate(-50%, -50%) scale(1)',
        opacity: phase === 'flying' ? 0.3 : 1,
        transition: 'transform 500ms ease-out, opacity 500ms ease-out',
        willChange: 'transform, opacity',
        zIndex: 9999,
        backfaceVisibility: 'hidden'
      }}
    >
      <LightweightChip size={20} bbValue={bbValue} />
    </div>
  );
});

export const OptimizedWinnerAnimation = memo(function OptimizedWinnerAnimation({
  isActive,
  fromPosition,
  toPosition,
  amount,
  onComplete
}: OptimizedWinnerAnimationProps) {
  const [chips, setChips] = useState<FlyingChipData[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showAmount, setShowAmount] = useState(false);

  // Generate chips when active
  useEffect(() => {
    if (!isActive) {
      setChips([]);
      setCompletedCount(0);
      setShowAmount(false);
      return;
    }

    // Limited chips for performance (5-6 max)
    const chipCount = Math.min(6, Math.max(4, Math.floor(amount / 100)));
    
    const newChips: FlyingChipData[] = Array.from({ length: chipCount }, (_, i) => ({
      id: i,
      delay: i * 30, // Small stagger
      offsetX: (Math.random() - 0.5) * 4,
      offsetY: (Math.random() - 0.5) * 4,
      bbValue: [1, 5, 10, 20, 50][Math.min(i, 4)]
    }));

    setChips(newChips);
    
    // Show amount after chips start flying
    setTimeout(() => setShowAmount(true), 200);
  }, [isActive, amount]);

  // Track completion
  useEffect(() => {
    if (chips.length > 0 && completedCount >= chips.length) {
      setTimeout(() => onComplete?.(), 100);
    }
  }, [completedCount, chips.length, onComplete]);

  const handleChipComplete = useCallback(() => {
    setCompletedCount(prev => prev + 1);
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Flying chips */}
      {chips.map((chip) => (
        <FlyingChipCSS
          key={chip.id}
          fromX={fromPosition.x + chip.offsetX}
          fromY={fromPosition.y + chip.offsetY}
          toX={toPosition.x}
          toY={toPosition.y}
          delay={chip.delay}
          bbValue={chip.bbValue}
          onComplete={handleChipComplete}
        />
      ))}

      {/* Floating amount - CSS animation */}
      {showAmount && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${toPosition.x}%`,
            top: `${toPosition.y}%`,
            transform: 'translate(-50%, -150%)',
            zIndex: 10000,
            animation: 'floatUp 1s ease-out forwards',
            willChange: 'transform, opacity'
          }}
        >
          <div 
            className="px-2 py-0.5 rounded-md font-bold text-sm whitespace-nowrap"
            style={{
              background: 'rgba(0,0,0,0.85)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)'
            }}
          >
            +{amount.toLocaleString()}
          </div>
        </div>
      )}

      {/* Winner glow - simple CSS */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${toPosition.x}%`,
          top: `${toPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
          animation: showAmount ? 'pulseGlow 600ms ease-out' : 'none',
          willChange: 'transform, opacity'
        }}
      />

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          20% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(-50%, -180%); opacity: 0; }
        }
        @keyframes pulseGlow {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
});

export default OptimizedWinnerAnimation;
