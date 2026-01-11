/**
 * Winner Announcement Component
 * Compact banner-style winner display
 * Shows winner name, hand, and amount won
 */
import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Winner {
  playerId: string;
  name?: string;
  playerName?: string;
  seatNumber: number;
  amount: number;
  handName?: string;
  holeCards?: string[];
  newStack?: number;
}

interface WinnerAnnouncementProps {
  winners: Winner[];
  pot: number;
  isVisible?: boolean;
  isSplitPot?: boolean;
  onComplete?: () => void;
  className?: string;
  duration?: number;
  position?: { x: number; y: number };
  potSlideDelay?: number;
  highlightDuration?: number;
  celebrationDuration?: number;
}

export const WinnerAnnouncement = memo(function WinnerAnnouncement({
  winners,
  pot,
  isVisible = true,
  isSplitPot = false,
  onComplete,
  className,
  duration = 1200,
  highlightDuration,
  celebrationDuration
}: WinnerAnnouncementProps) {
  const totalDuration = highlightDuration || celebrationDuration || duration;
  const [isShowing, setIsShowing] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      setIsShowing(true);
      return;
    }

    setIsShowing(true);

    const timer = setTimeout(() => {
      setIsShowing(false);
      setTimeout(() => onComplete?.(), 300);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [isVisible, totalDuration, onComplete]);

  if (!isVisible || winners.length === 0) return null;

  const mainWinner = winners[0];
  const displaySplitPot = isSplitPot || winners.length > 1;
  const winnerName = mainWinner.name || mainWinner.playerName || 'Победитель';

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          key="winner-banner"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 bottom-[15%] z-40 pointer-events-none',
            className
          )}
        >
          <div 
            className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)',
              border: '1px solid rgba(251,191,36,0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(251,191,36,0.15)'
            }}
          >
            {/* Trophy icon */}
            <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600">
              <Trophy className="w-4 h-4 text-white" />
            </div>

            {/* Winner info */}
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">
                {displaySplitPot ? 'Сплит' : winnerName}
              </span>
              {mainWinner.handName && (
                <span className="text-gray-400 text-xs">
                  {mainWinner.handName}
                </span>
              )}
            </div>

            {/* Amount */}
            <div 
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              }}
            >
              <span className="text-black">+{pot.toLocaleString()}</span>
              <span className="text-black/70">💎</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default WinnerAnnouncement;
