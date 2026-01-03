/**
 * KnockoutNotification - Animated notification when player knocks out opponent
 * Shows bounty amount won
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, DollarSign, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KnockoutEvent {
  eliminatedPlayerId: string;
  eliminatedPlayerName: string;
  eliminatorPlayerId: string;
  eliminatorPlayerName: string;
  bountyAmount: number;
  timestamp: number;
}

interface KnockoutNotificationProps {
  event: KnockoutEvent | null;
  currentPlayerId: string;
  onComplete?: () => void;
  className?: string;
}

export function KnockoutNotification({
  event,
  currentPlayerId,
  onComplete,
  className
}: KnockoutNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [event, onComplete]);

  if (!event) return null;

  const isMyKnockout = event.eliminatorPlayerId === currentPlayerId;
  const wasEliminated = event.eliminatedPlayerId === currentPlayerId;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={cn(
            "fixed top-20 left-1/2 -translate-x-1/2 z-[100]",
            className
          )}
        >
          <div className={cn(
            "relative px-6 py-4 rounded-xl border-2 shadow-2xl",
            "backdrop-blur-md overflow-hidden",
            isMyKnockout 
              ? "bg-gradient-to-r from-amber-900/90 to-red-900/90 border-amber-500" 
              : wasEliminated
                ? "bg-gradient-to-r from-red-900/90 to-black/90 border-red-500"
                : "bg-gradient-to-r from-gray-900/90 to-black/90 border-white/20"
          )}>
            {/* Animated background particles */}
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    isMyKnockout ? "bg-amber-400" : "bg-red-400"
                  )}
                  initial={{ 
                    x: "50%", 
                    y: "50%",
                    opacity: 1 
                  }}
                  animate={{ 
                    x: `${Math.random() * 100}%`, 
                    y: `${Math.random() * 100}%`,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 1,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>

            <div className="relative flex items-center gap-4">
              {/* Icon */}
              <motion.div
                initial={{ rotate: -45, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full",
                  isMyKnockout 
                    ? "bg-gradient-to-br from-amber-500 to-red-500" 
                    : "bg-gradient-to-br from-red-500 to-red-800"
                )}
              >
                {isMyKnockout ? (
                  <Trophy className="h-7 w-7 text-white" />
                ) : (
                  <Skull className="h-7 w-7 text-white" />
                )}
              </motion.div>

              {/* Content */}
              <div className="flex flex-col">
                {isMyKnockout ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-400 font-bold text-lg">
                        НОКАУТ!
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/80 text-sm"
                    >
                      Вы выбили {event.eliminatedPlayerName}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="flex items-center gap-2 mt-1"
                    >
                      <DollarSign className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-bold text-xl">
                        +{event.bountyAmount.toLocaleString()} 💎
                      </span>
                    </motion.div>
                  </>
                ) : wasEliminated ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-red-400 font-bold text-lg"
                    >
                      ВЫ ВЫБЫЛИ
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/60 text-sm"
                    >
                      Вас выбил {event.eliminatorPlayerName}
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/80 text-sm"
                    >
                      <span className="text-amber-400 font-bold">{event.eliminatorPlayerName}</span>
                      {' '}выбил{' '}
                      <span className="text-red-400">{event.eliminatedPlayerName}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/50 text-xs"
                    >
                      Баунти: {event.bountyAmount.toLocaleString()} 💎
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KnockoutNotification;
