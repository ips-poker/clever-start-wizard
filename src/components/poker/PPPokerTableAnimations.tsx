import React, { memo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

// Animated number counter for chips/pot
interface AnimatedValueProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedValue = memo(function AnimatedValue({
  value,
  duration = 0.5,
  className,
  prefix = '',
  suffix = ''
}: AnimatedValueProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v).toLocaleString())
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, color: 'hsl(142, 71%, 45%)' }}
      animate={{ scale: 1, color: 'inherit' }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
});

// Dealer button animation
interface DealerButtonProps {
  position: { x: number; y: number };
  size?: 'sm' | 'md' | 'lg';
}

export const DealerButton = memo(function DealerButton({
  position,
  size = 'md'
}: DealerButtonProps) {
  const sizeConfig = {
    sm: 'w-6 h-6 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-10 h-10 text-xs'
  };

  return (
    <motion.div
      className={cn(
        'absolute rounded-full flex items-center justify-center font-bold',
        'bg-gradient-to-br from-white via-gray-100 to-gray-200',
        'border-2 border-gray-300 shadow-lg',
        sizeConfig[size]
      )}
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
      initial={false}
      animate={{
        x: position.x,
        y: position.y
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
    >
      <span className="text-gray-700 font-black">D</span>
    </motion.div>
  );
});

// Action indicator (Check, Call, Raise, Fold, All-in)
interface ActionIndicatorProps {
  action: 'check' | 'call' | 'raise' | 'fold' | 'allin' | 'bet';
  amount?: number;
  position: { x: number; y: number };
}

const ACTION_STYLES = {
  check: { bg: 'from-blue-500 to-blue-600', text: 'Check' },
  call: { bg: 'from-green-500 to-green-600', text: 'Call' },
  raise: { bg: 'from-amber-500 to-orange-600', text: 'Raise' },
  bet: { bg: 'from-amber-500 to-orange-600', text: 'Bet' },
  fold: { bg: 'from-gray-500 to-gray-600', text: 'Fold' },
  allin: { bg: 'from-red-500 to-red-600', text: 'All-in' }
};

export const ActionIndicator = memo(function ActionIndicator({
  action,
  amount,
  position
}: ActionIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const style = ACTION_STYLES[action];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute pointer-events-none z-30"
          style={{ left: position.x, top: position.y }}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className={cn(
            'px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-lg',
            'bg-gradient-to-r',
            style.bg
          )}>
            {style.text}
            {amount !== undefined && amount > 0 && (
              <span className="ml-1">{amount.toLocaleString()}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Pot collection animation
interface PotCollectionProps {
  from: { x: number; y: number }[];
  to: { x: number; y: number };
  onComplete?: () => void;
}

export const PotCollectionAnimation = memo(function PotCollectionAnimation({
  from,
  to,
  onComplete
}: PotCollectionProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {from.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-40"
          initial={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
          animate={{ x: to.x, y: to.y, scale: 0.5, opacity: 0 }}
          transition={{
            duration: 0.5,
            delay: i * 0.05,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <div 
            className="w-6 h-6 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, hsl(45, 93%, 65%), hsl(45, 93%, 47%))',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
});

// Win distribution animation
interface WinDistributionProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount: number;
  onComplete?: () => void;
}

export const WinDistributionAnimation = memo(function WinDistributionAnimation({
  from,
  to,
  amount,
  onComplete
}: WinDistributionProps) {
  const chipCount = Math.min(12, Math.max(4, Math.floor(amount / 200)));

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {Array.from({ length: chipCount }).map((_, i) => {
        const angle = (i / chipCount) * Math.PI * 0.5 - Math.PI * 0.25;
        const radius = 20;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none z-40"
            initial={{ 
              x: from.x, 
              y: from.y, 
              scale: 0.8, 
              opacity: 0 
            }}
            animate={{ 
              x: to.x + offsetX, 
              y: to.y + offsetY, 
              scale: 1, 
              opacity: [0, 1, 1, 0.8]
            }}
            transition={{
              duration: 0.6,
              delay: i * 0.03,
              ease: 'easeOut'
            }}
          >
            <div 
              className="w-5 h-5 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, hsl(45, 93%, 65%), hsl(45, 93%, 47%))',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3), 0 0 10px rgba(251, 191, 36, 0.5)'
              }}
            />
          </motion.div>
        );
      })}
    </>
  );
});

// Timer ring for player turn
interface TimerRingProps {
  duration: number;
  remaining: number;
  size?: number;
  className?: string;
}

export const TimerRing = memo(function TimerRing({
  duration,
  remaining,
  size = 60,
  className
}: TimerRingProps) {
  const progress = remaining / duration;
  const circumference = (size - 4) * Math.PI;
  const strokeDashoffset = circumference * (1 - progress);

  const color = progress > 0.5 
    ? 'hsl(142, 71%, 45%)' 
    : progress > 0.25 
      ? 'hsl(45, 93%, 47%)' 
      : 'hsl(0, 72%, 51%)';

  return (
    <svg 
      className={cn('absolute -inset-1 -rotate-90', className)}
      width={size} 
      height={size}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 4) / 2}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        opacity="0.3"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 4) / 2}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={false}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.3, ease: 'linear' }}
        style={{
          filter: progress < 0.25 ? 'drop-shadow(0 0 4px hsl(0, 72%, 51%))' : undefined
        }}
      />
    </svg>
  );
});

// Card dealing animation from deck
interface CardDealAnimationProps {
  deckPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  delay?: number;
  onComplete?: () => void;
}

export const CardDealAnimation = memo(function CardDealAnimation({
  deckPosition,
  targetPosition,
  delay = 0,
  onComplete
}: CardDealAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 400 + delay * 100);
    return () => clearTimeout(timer);
  }, [delay, onComplete]);

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      initial={{ 
        x: deckPosition.x, 
        y: deckPosition.y,
        rotateZ: -5,
        scale: 0.9
      }}
      animate={{ 
        x: targetPosition.x, 
        y: targetPosition.y,
        rotateZ: 0,
        scale: 1
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: delay * 0.1
      }}
    >
      <div 
        className="w-10 h-14 rounded-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        {/* Grid pattern */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,122,0,0.12) 3px, rgba(255,122,0,0.12) 4px),
              repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,122,0,0.12) 3px, rgba(255,122,0,0.12) 4px)
            `
          }}
        />
        {/* Border frame */}
        <div className="absolute inset-0.5 rounded-sm border border-orange-400/30" />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black text-xs" style={{ color: '#ff7a00', opacity: 0.5 }}>S</span>
        </div>
      </div>
    </motion.div>
  );
});

export default {
  AnimatedValue,
  DealerButton,
  ActionIndicator,
  PotCollectionAnimation,
  WinDistributionAnimation,
  TimerRing,
  CardDealAnimation
};
