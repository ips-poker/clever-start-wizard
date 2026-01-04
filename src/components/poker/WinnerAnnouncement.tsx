/**
 * Winner Announcement Component
 * Professional PokerStars-style winner display overlay
 * Shows winner name, hand, and amount won
 */
import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Winner {
  playerId: string;
  name: string;
  seatNumber: number;
  amount: number;
  handName?: string;
  holeCards?: string[];
}

interface WinnerAnnouncementProps {
  winners: Winner[];
  pot: number;
  isVisible: boolean;
  onComplete?: () => void;
  className?: string;
  /** Display duration in ms */
  duration?: number;
  /** Position as percentage {x, y} */
  position?: { x: number; y: number };
}

// Professional winner announcement at table center
export const WinnerAnnouncement = memo(function WinnerAnnouncement({
  winners,
  pot,
  isVisible,
  onComplete,
  className,
  duration = 3000,
  position = { x: 50, y: 40 }
}: WinnerAnnouncementProps) {
  const [phase, setPhase] = useState<'enter' | 'display' | 'exit'>('enter');

  useEffect(() => {
    if (!isVisible) {
      setPhase('enter');
      return;
    }

    // Enter phase
    setPhase('enter');
    
    // Display phase after entrance animation
    const displayTimer = setTimeout(() => {
      setPhase('display');
    }, 300);

    // Exit phase before completion
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, duration - 300);

    // Complete callback
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(displayTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible || winners.length === 0) return null;

  const mainWinner = winners[0];
  const isSplitPot = winners.length > 1;

  return (
    <AnimatePresence>
      <motion.div
        key="winner-announcement"
        initial={{ opacity: 0, scale: 0.5, y: 30 }}
        animate={{ 
          opacity: phase === 'exit' ? 0 : 1, 
          scale: phase === 'exit' ? 0.8 : 1,
          y: 0 
        }}
        exit={{ opacity: 0, scale: 0.5, y: 30 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 25 
        }}
        className={cn(
          'absolute z-50 pointer-events-none',
          className
        )}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Glow background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)'
          }}
        />

        {/* Main container */}
        <motion.div
          className="relative flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)',
            border: '2px solid rgba(251,191,36,0.5)',
            boxShadow: '0 0 40px rgba(251,191,36,0.3), 0 20px 60px rgba(0,0,0,0.5)'
          }}
        >
          {/* Sparkle decorations */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-3 -right-3"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-3 -left-3"
          >
            <Star className="w-5 h-5 text-yellow-400" />
          </motion.div>

          {/* Trophy icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            className="p-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600"
            style={{
              boxShadow: '0 0 20px rgba(251,191,36,0.5)'
            }}
          >
            <Trophy className="w-6 h-6 text-white" />
          </motion.div>

          {/* Winner name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-amber-400 font-bold text-lg">
              {isSplitPot ? 'Сплит пот!' : mainWinner.name}
            </p>
            {mainWinner.handName && (
              <p className="text-gray-400 text-sm">
                {mainWinner.handName}
              </p>
            )}
          </motion.div>

          {/* Amount won */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
              boxShadow: '0 4px 20px rgba(251,191,36,0.4)'
            }}
          >
            <span className="text-lg font-black text-black">
              +{pot.toLocaleString()}
            </span>
            <span className="text-black/80 font-bold">💎</span>
          </motion.div>

          {/* Split pot details */}
          {isSplitPot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-gray-400 text-center"
            >
              {winners.map(w => w.name).join(' и ')}
              <br />
              по {Math.floor(pot / winners.length).toLocaleString()} каждому
            </motion.div>
          )}
        </motion.div>

        {/* Chip cascade effect */}
        <ChipCascadeEffect isActive={phase !== 'exit'} />
      </motion.div>
    </AnimatePresence>
  );
});

// Chip cascade effect around winner announcement
const ChipCascadeEffect = memo(function ChipCascadeEffect({ 
  isActive 
}: { 
  isActive: boolean 
}) {
  if (!isActive) return null;

  const chips = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    angle: (i / 8) * 360,
    delay: i * 0.1,
    color: ['#f59e0b', '#22c55e', '#ef4444', '#1e1e1e'][i % 4]
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {chips.map(chip => (
        <motion.div
          key={chip.id}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: 0,
            y: 0
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.3],
            x: Math.cos(chip.angle * Math.PI / 180) * 60,
            y: Math.sin(chip.angle * Math.PI / 180) * 40
          }}
          transition={{
            duration: 1,
            delay: chip.delay,
            repeat: 2,
            repeatDelay: 0.5
          }}
          className="absolute left-1/2 top-1/2 w-4 h-4 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${chip.color} 0%, ${chip.color}aa 100%)`,
            border: '1px solid rgba(0,0,0,0.3)',
            boxShadow: `0 2px 4px rgba(0,0,0,0.3), 0 0 8px ${chip.color}50`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  );
});

export default WinnerAnnouncement;
