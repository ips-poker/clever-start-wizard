/**
 * Tournament Bust-Out Animation
 * PokerStars-style card explosion and rank reveal
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TournamentBustOutAnimationProps {
  isVisible: boolean;
  playerName: string;
  avatarUrl?: string;
  position?: number;
  prizeAmount?: number;
  isInTheMoney: boolean;
  eliminatorName?: string;
  seatPosition: { x: number; y: number };
  onComplete?: () => void;
}

export function TournamentBustOutAnimation({
  isVisible,
  playerName,
  avatarUrl,
  position,
  prizeAmount,
  isInTheMoney,
  eliminatorName,
  seatPosition,
  onComplete
}: TournamentBustOutAnimationProps) {
  const [phase, setPhase] = useState<'cards' | 'bust' | 'rank' | 'prize' | 'done'>('cards');

  useEffect(() => {
    if (!isVisible) {
      setPhase('cards');
      return;
    }

    const timeline = [
      { phase: 'cards' as const, delay: 0 },
      { phase: 'bust' as const, delay: 800 },
      { phase: 'rank' as const, delay: 2500 },
      { phase: 'prize' as const, delay: 4000 },
      { phase: 'done' as const, delay: isInTheMoney ? 6500 : 5000 }
    ];

    const timers = timeline.map(({ phase, delay }) =>
      setTimeout(() => {
        setPhase(phase);
        if (phase === 'done' && onComplete) {
          onComplete();
        }
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isVisible, isInTheMoney, onComplete]);

  if (!isVisible) return null;

  // Card explosion particles
  const cardParticles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    rotation: (360 / 8) * i,
    delay: i * 0.05
  }));

  return (
    <AnimatePresence>
      {/* Card Explosion Phase */}
      {phase === 'cards' && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {cardParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-8 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-sm border border-white/30"
              style={{
                left: `${seatPosition.x}%`,
                top: `${seatPosition.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{
                scale: [0, 1.2, 0],
                rotate: particle.rotation + 720,
                x: [0, Math.cos(particle.rotation * Math.PI / 180) * 150],
                y: [0, Math.sin(particle.rotation * Math.PI / 180) * 150 - 50],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 0.8,
                delay: particle.delay,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Bust Text Phase */}
      {phase === 'bust' && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <motion.div
              className="text-6xl font-black text-red-500 mb-2"
              style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}
              animate={{ 
                scale: [1, 1.1, 1],
                textShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                  '0 0 40px rgba(239, 68, 68, 0.8)',
                  '0 0 20px rgba(239, 68, 68, 0.5)'
                ]
              }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              BUSTED!
            </motion.div>
            
            <motion.div
              className="text-xl text-white/80"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {playerName}
              {eliminatorName && (
                <span className="text-slate-400">
                  {' '}eliminated by <span className="text-amber-400">{eliminatorName}</span>
                </span>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Rank Announcement Phase */}
      {phase === 'rank' && position && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center bg-black/60 backdrop-blur-sm px-12 py-8 rounded-2xl"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
          >
            {avatarUrl && (
              <motion.img
                src={avatarUrl}
                alt={playerName}
                className="w-16 h-16 rounded-full mx-auto mb-4 border-4 border-amber-500/50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              />
            )}
            
            <motion.div
              className="text-white text-xl mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {playerName}
            </motion.div>
            
            <motion.div
              className={cn(
                "text-5xl font-bold",
                position <= 3 ? "text-amber-400" : "text-slate-300"
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
            >
              {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : ''}
              {' '}{getOrdinal(position)} Place
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Prize Announcement Phase (ITM only) */}
      {phase === 'prize' && isInTheMoney && prizeAmount && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center bg-gradient-to-b from-amber-900/80 to-black/80 backdrop-blur-sm px-16 py-10 rounded-2xl border border-amber-500/30"
            initial={{ scale: 0.5, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 150 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              🏆
            </motion.div>
            
            <div className="text-white text-xl mb-2">You Won!</div>
            
            <motion.div
              className="text-5xl font-bold text-amber-400 flex items-center justify-center gap-2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <span>{prizeAmount.toLocaleString()}</span>
              <span className="text-3xl">💎</span>
            </motion.div>
            
            {/* Confetti particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#22c55e', '#ef4444'][i % 5],
                  left: '50%',
                  top: '50%'
                }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300 - 100,
                  opacity: 0,
                  rotate: Math.random() * 720
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.05,
                  ease: 'easeOut'
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default TournamentBustOutAnimation;
