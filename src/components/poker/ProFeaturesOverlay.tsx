/**
 * Pro Features Overlay
 * Industry-style: Bomb Pot is automatic (no voting modal)
 * Only Run It Twice requires player decision
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Legacy interface for backwards compatibility
export interface BombPotProposal {
  multiplier: number;
  amount: number;
  timeoutSeconds: number;
  players: { playerId: string; name: string; seatNumber: number }[];
}

export interface RunItTwiceProposal {
  players: string[];
  timeoutSeconds: number;
}

interface ProFeaturesOverlayProps {
  tableId: string;
  playerId: string;
  playerStack: number;
  bombPotProposal: BombPotProposal | null; // Legacy - not used in industry mode
  runItTwiceProposal: RunItTwiceProposal | null;
  bigBlind: number;
  onBombPotVote: (accept: boolean) => void; // Legacy - not used in industry mode
  onRunItTwiceVote: (accept: boolean) => void;
}

export function ProFeaturesOverlay({
  tableId,
  playerId,
  playerStack,
  bombPotProposal, // Ignored in industry-style mode
  runItTwiceProposal,
  bigBlind,
  onBombPotVote, // Ignored in industry-style mode
  onRunItTwiceVote
}: ProFeaturesOverlayProps) {
  const [ritTimeLeft, setRitTimeLeft] = useState(10);
  const [hasVotedRit, setHasVotedRit] = useState(false);

  // Reset vote state when new RIT proposal comes in
  useEffect(() => {
    if (runItTwiceProposal) {
      setHasVotedRit(false);
      setRitTimeLeft(runItTwiceProposal.timeoutSeconds);
    }
  }, [runItTwiceProposal]);

  // Countdown timer for Run It Twice
  useEffect(() => {
    if (!runItTwiceProposal || hasVotedRit) return;
    const interval = setInterval(() => {
      setRitTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [runItTwiceProposal, hasVotedRit]);

  const handleRitAccept = useCallback(() => {
    setHasVotedRit(true);
    onRunItTwiceVote(true);
  }, [onRunItTwiceVote]);

  const handleRitDecline = useCallback(() => {
    setHasVotedRit(true);
    onRunItTwiceVote(false);
  }, [onRunItTwiceVote]);

  return (
    <>
      {/* 
        Bomb Pot Modal REMOVED - Industry-style automatic trigger
        Players are notified via BombPotIndicator component instead
      */}

      {/* Run It Twice Voting Modal */}
      <AnimatePresence>
        {runItTwiceProposal && runItTwiceProposal.players.includes(playerId) && !hasVotedRit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              className={cn(
                "bg-gradient-to-b from-gray-900 via-gray-900/98 to-gray-950",
                "border border-blue-500/30 rounded-xl p-6 max-w-md mx-4",
                "shadow-2xl shadow-blue-500/20"
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <Repeat2 className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Run It Twice?</h2>
                  <p className="text-sm text-white/60">Раздать борд дважды</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-white/80 text-sm">
                  Оба игрока олл-ин. Хотите раздать оставшиеся карты дважды?
                </p>
                <p className="text-white/60 text-xs">
                  • Банк делится на 2 части
                </p>
                <p className="text-white/60 text-xs">
                  • Каждая часть разыгрывается отдельно
                </p>
                <p className="text-white/60 text-xs">
                  • Снижает дисперсию
                </p>
              </div>

              {/* Timer */}
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
                  ritTimeLeft <= 3 ? "bg-red-500/30 text-red-400" : "bg-blue-500/30 text-blue-400"
                )}>
                  {ritTimeLeft}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRitDecline}
                  variant="outline"
                  className="flex-1 border-white/20 text-white/70 hover:text-white"
                >
                  Нет
                </Button>
                <Button
                  onClick={handleRitAccept}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold"
                >
                  Run It Twice
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ProFeaturesOverlay;
