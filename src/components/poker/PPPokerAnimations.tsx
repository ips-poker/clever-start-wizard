// =====================================================
// PPPOKER-STYLE PROFESSIONAL ANIMATIONS
// =====================================================
// Card dealing, chip movements, win effects

import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

// =====================================================
// CARD DEALING ANIMATION
// =====================================================
interface DealingCardProps {
  targetX: number;
  targetY: number;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
  children?: React.ReactNode;
}

export const DealingCard = memo(function DealingCard({
  targetX,
  targetY,
  delay = 0,
  duration = 0.4,
  onComplete,
  children
}: DealingCardProps) {
  return (
    <motion.div
      initial={{ 
        x: '50vw', 
        y: '-20vh', 
        scale: 0.3, 
        rotateZ: -30,
        opacity: 0 
      }}
      animate={{ 
        x: targetX, 
        y: targetY, 
        scale: 1, 
        rotateZ: 0,
        opacity: 1 
      }}
      transition={{ 
        delay,
        duration,
        type: 'spring',
        stiffness: 120,
        damping: 14
      }}
      onAnimationComplete={onComplete}
      className="absolute"
    >
      {children}
    </motion.div>
  );
});

// =====================================================
// CHIP FLYING ANIMATION  
// =====================================================
interface FlyingChipsProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  amount: number;
  delay?: number;
  onComplete?: () => void;
}

export const FlyingChips = memo(function FlyingChips({
  fromX,
  fromY,
  toX,
  toY,
  amount,
  delay = 0,
  onComplete
}: FlyingChipsProps) {
  const chipCount = Math.min(Math.ceil(amount / 100), 8);
  
  return (
    <>
      {Array.from({ length: chipCount }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: fromX + (Math.random() - 0.5) * 20, 
            y: fromY + (Math.random() - 0.5) * 20,
            scale: 0,
            opacity: 0
          }}
          animate={{ 
            x: toX + (Math.random() - 0.5) * 30, 
            y: toY + (Math.random() - 0.5) * 30,
            scale: 1,
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            delay: delay + i * 0.05,
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1]
          }}
          onAnimationComplete={i === chipCount - 1 ? onComplete : undefined}
          className="absolute w-4 h-4 rounded-full pointer-events-none z-50"
          style={{
            background: `radial-gradient(circle at 30% 30%, 
              ${i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#22c55e' : '#3b82f6'} 0%, 
              ${i % 3 === 0 ? '#b91c1c' : i % 3 === 1 ? '#15803d' : '#1d4ed8'} 100%)`,
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        />
      ))}
    </>
  );
});

// =====================================================
// POT COLLECTION ANIMATION
// =====================================================
interface PotCollectionProps {
  winnerPositions: Array<{ x: number; y: number; amount: number }>;
  potX: number;
  potY: number;
  onComplete?: () => void;
}

export const PotCollection = memo(function PotCollection({
  winnerPositions,
  potX,
  potY,
  onComplete
}: PotCollectionProps) {
  const [active, setActive] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {winnerPositions.map((winner, idx) => (
        <FlyingChips
          key={idx}
          fromX={potX}
          fromY={potY}
          toX={winner.x}
          toY={winner.y}
          amount={winner.amount}
          delay={idx * 0.2}
        />
      ))}
    </div>
  );
});

// =====================================================
// WINNER HIGHLIGHT EFFECT
// =====================================================
interface WinnerGlowProps {
  isActive: boolean;
  color?: string;
  children: React.ReactNode;
}

export const WinnerGlow = memo(function WinnerGlow({
  isActive,
  color = '#22c55e',
  children
}: WinnerGlowProps) {
  return (
    <div className="relative">
      <AnimatePresence>
        {isActive && (
          <>
            {/* Outer glow rings */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1.5],
                opacity: [0.6, 0.3, 0]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ 
                border: `3px solid ${color}`,
                boxShadow: `0 0 30px ${color}`
              }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: [1, 1.2, 1.4],
                opacity: [0.5, 0.2, 0]
              }}
              transition={{ 
                duration: 1.5,
                delay: 0.3,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ 
                border: `2px solid ${color}`,
                boxShadow: `0 0 20px ${color}`
              }}
            />
          </>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
});

// =====================================================
// CONFETTI EFFECT FOR BIG WINS
// =====================================================
interface ConfettiProps {
  isActive: boolean;
  duration?: number;
}

export const Confetti = memo(function Confetti({
  isActive,
  duration = 3000
}: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
    size: number;
  }>>([]);

  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.5,
        size: 4 + Math.random() * 8
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), duration);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [isActive, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.x}vw`, 
            y: -20, 
            rotate: 0,
            opacity: 1
          }}
          animate={{ 
            y: '110vh', 
            rotate: 720,
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: 2 + Math.random(),
            delay: p.delay,
            ease: 'linear'
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0'
          }}
        />
      ))}
    </div>
  );
});

// =====================================================
// ACTION BURST EFFECT
// =====================================================
interface ActionBurstProps {
  type: 'check' | 'call' | 'raise' | 'fold' | 'allin';
  x: number;
  y: number;
}

const ACTION_COLORS = {
  check: '#3b82f6',
  call: '#22c55e',
  raise: '#f59e0b',
  fold: '#6b7280',
  allin: '#ef4444'
};

export const ActionBurst = memo(function ActionBurst({
  type,
  x,
  y
}: ActionBurstProps) {
  const color = ACTION_COLORS[type];
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 60,
        height: 60,
        marginLeft: -30,
        marginTop: -30,
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}`
      }}
    />
  );
});

// =====================================================
// CARD REVEAL ANIMATION (for showdown)
// =====================================================
interface CardRevealProps {
  isRevealing: boolean;
  children: React.ReactNode;
}

export const CardReveal = memo(function CardReveal({
  isRevealing,
  children
}: CardRevealProps) {
  return (
    <motion.div
      animate={isRevealing ? {
        rotateY: [180, 0],
        scale: [0.8, 1.1, 1]
      } : {}}
      transition={{
        duration: 0.6,
        times: [0, 0.6, 1],
        ease: 'easeOut'
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
});

// =====================================================
// TABLE PULSE EFFECT
// =====================================================
interface TablePulseProps {
  isActive: boolean;
  color?: string;
}

export const TablePulse = memo(function TablePulse({
  isActive,
  color = 'rgba(34, 197, 94, 0.3)'
}: TablePulseProps) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.5, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`
      }}
    />
  );
});

// =====================================================
// COUNTDOWN PULSE
// =====================================================
interface CountdownPulseProps {
  seconds: number;
  isWarning: boolean;
}

export const CountdownPulse = memo(function CountdownPulse({
  seconds,
  isWarning
}: CountdownPulseProps) {
  if (!isWarning || seconds > 10) return null;

  return (
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{ 
        duration: seconds <= 5 ? 0.5 : 1,
        repeat: Infinity
      }}
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        background: seconds <= 5 
          ? 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)'
      }}
    />
  );
});

export default {
  DealingCard,
  FlyingChips,
  PotCollection,
  WinnerGlow,
  Confetti,
  ActionBurst,
  CardReveal,
  TablePulse,
  CountdownPulse
};