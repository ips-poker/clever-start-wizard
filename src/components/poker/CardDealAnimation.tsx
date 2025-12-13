// ============================================
// CARD DEAL ANIMATION - Cards fly from dealer to players
// ============================================

import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DealingCard {
  id: string;
  targetX: number;
  targetY: number;
  delay: number;
}

interface CardDealAnimationProps {
  isDealing: boolean;
  dealerPosition: { x: number; y: number };
  playerPositions: Array<{ x: number; y: number; seatNumber: number }>;
  onComplete?: () => void;
}

export const CardDealAnimation = memo(function CardDealAnimation({
  isDealing,
  dealerPosition,
  playerPositions,
  onComplete
}: CardDealAnimationProps) {
  const [cards, setCards] = useState<DealingCard[]>([]);
  
  useEffect(() => {
    if (isDealing && playerPositions.length > 0) {
      // Create cards to deal - 2 cards per player
      const dealingCards: DealingCard[] = [];
      let delay = 0;
      
      // First round of cards
      playerPositions.forEach((pos, idx) => {
        dealingCards.push({
          id: `card-1-${pos.seatNumber}`,
          targetX: pos.x,
          targetY: pos.y,
          delay: delay
        });
        delay += 0.08;
      });
      
      // Second round of cards
      playerPositions.forEach((pos, idx) => {
        dealingCards.push({
          id: `card-2-${pos.seatNumber}`,
          targetX: pos.x,
          targetY: pos.y,
          delay: delay
        });
        delay += 0.08;
      });
      
      setCards(dealingCards);
      
      // Complete after all cards dealt
      const totalDuration = delay + 0.4;
      const timer = setTimeout(() => {
        setCards([]);
        onComplete?.();
      }, totalDuration * 1000);
      
      return () => clearTimeout(timer);
    } else {
      setCards([]);
    }
  }, [isDealing, playerPositions, onComplete]);
  
  if (!isDealing || cards.length === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {cards.map((card) => (
          <motion.div
            key={card.id}
            initial={{
              left: `${dealerPosition.x}%`,
              top: `${dealerPosition.y}%`,
              scale: 0.3,
              opacity: 0,
              rotateY: 180,
              x: '-50%',
              y: '-50%'
            }}
            animate={{
              left: `${card.targetX}%`,
              top: `${card.targetY}%`,
              scale: 1,
              opacity: [0, 1, 1, 0.8],
              rotateY: 0,
              x: '-50%',
              y: '-50%'
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              delay: card.delay,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="absolute"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Card back design */}
            <div 
              className="rounded-lg shadow-xl relative overflow-hidden"
              style={{
                width: 36,
                height: 50,
                background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 50%, #3b82f6cc 100%)',
                border: '2px solid #3b82f6',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.4)'
              }}
            >
              {/* Pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 40 40">
                <defs>
                  <pattern id="dealPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="white" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dealPattern)"/>
              </svg>
              {/* Shine effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ delay: card.delay + 0.1, duration: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default CardDealAnimation;