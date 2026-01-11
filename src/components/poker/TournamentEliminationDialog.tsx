/**
 * Tournament Elimination Dialog
 * PokerStars-style professional bust-out animation with rebuy/reentry options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy, Skull, RefreshCw, DoorOpen, X, Timer, Coins } from 'lucide-react';

export interface EliminationDialogData {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  position?: number;
  prizeAmount?: number;
  isInTheMoney: boolean;
  eliminatorName?: string;
  graceDeadline?: number;
  rebuyAvailable: boolean;
  reentryAvailable: boolean;
  rebuyCost?: number;
  reentryCost?: number;
  rebuyChips?: number;
  reentryChips?: number;
  state: 'busted' | 'rebuy_pending' | 'reentry_pending' | 'eliminated';
  tournamentName?: string;
  totalPlayers?: number;
}

interface TournamentEliminationDialogProps {
  data: EliminationDialogData | null;
  isOpen: boolean;
  onClose: () => void;
  onRebuy?: () => void;
  onReentry?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
}

export function TournamentEliminationDialog({
  data,
  isOpen,
  onClose,
  onRebuy,
  onReentry,
  onDecline,
  isProcessing = false
}: TournamentEliminationDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [animationPhase, setAnimationPhase] = useState<'bust' | 'rank' | 'prize' | 'options'>('bust');

  // Timer countdown
  useEffect(() => {
    if (!data?.graceDeadline) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((data.graceDeadline! - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [data?.graceDeadline]);

  // Animation sequence
  useEffect(() => {
    if (!isOpen || !data) return;

    setAnimationPhase('bust');
    
    const phases: { phase: typeof animationPhase; delay: number }[] = [
      { phase: 'bust', delay: 0 },
      { phase: 'rank', delay: 2500 },
      { phase: 'prize', delay: 4500 },
      { phase: 'options', delay: data.isInTheMoney ? 7500 : 5500 }
    ];

    const timers = phases.map(({ phase, delay }) => 
      setTimeout(() => setAnimationPhase(phase), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isOpen, data]);

  if (!data) return null;

  const hasOptions = data.rebuyAvailable || data.reentryAvailable;
  const showTimer = hasOptions && timeRemaining > 0;

  // Position ordinal formatting
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-amber-500/30">
        <AnimatePresence mode="wait">
          {/* Bust Animation Phase */}
          {animationPhase === 'bust' && (
            <motion.div
              key="bust"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <Skull className="w-24 h-24 mx-auto text-red-500" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">BUSTED!</h2>
              
              {data.eliminatorName && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-400"
                >
                  Eliminated by <span className="text-amber-400">{data.eliminatorName}</span>
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Rank Announcement Phase */}
          {animationPhase === 'rank' && data.position && (
            <motion.div
              key="rank"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 text-center"
            >
              <div className="mb-4">
                {data.avatarUrl ? (
                  <img 
                    src={data.avatarUrl} 
                    alt={data.playerName}
                    className="w-20 h-20 rounded-full mx-auto border-4 border-amber-500/50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto bg-slate-700 flex items-center justify-center border-4 border-amber-500/50">
                    <span className="text-2xl text-white">
                      {data.playerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">{data.playerName}</h2>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="text-4xl font-bold text-amber-400 mb-2"
              >
                {getOrdinal(data.position)} Place
              </motion.div>
              
              {data.totalPlayers && (
                <p className="text-slate-400 text-sm">
                  out of {data.totalPlayers} players
                </p>
              )}
            </motion.div>
          )}

          {/* Prize Announcement Phase (ITM only) */}
          {animationPhase === 'prize' && data.isInTheMoney && data.prizeAmount && (
            <motion.div
              key="prize"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center bg-gradient-to-b from-amber-900/30 to-transparent"
            >
              <motion.div
                animate={{ 
                  rotateY: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 1, repeat: 2 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-amber-400 mb-4" />
              </motion.div>
              
              <h2 className="text-xl text-white mb-2">In The Money!</h2>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                <Coins className="w-8 h-8 text-amber-400" />
                <span className="text-4xl font-bold text-amber-400">
                  {data.prizeAmount.toLocaleString()}
                </span>
                <span className="text-xl text-amber-400/70">💎</span>
              </motion.div>
              
              <p className="text-slate-400 mt-2 text-sm">
                Congratulations! Your prize has been credited.
              </p>
            </motion.div>
          )}

          {/* Options Phase */}
          {animationPhase === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6"
            >
              {/* Summary */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {hasOptions ? 'Continue Playing?' : 'Tournament Finished'}
                </h2>
                
                {data.position && !hasOptions && (
                  <p className="text-amber-400 text-lg mt-1">
                    Final Position: {getOrdinal(data.position)}
                  </p>
                )}
                
                {data.prizeAmount && (
                  <p className="text-green-400 mt-1">
                    Prize: {data.prizeAmount.toLocaleString()} 💎
                  </p>
                )}
              </div>

              {/* Timer */}
              {showTimer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-center gap-2 mb-4 p-3 rounded-lg",
                    timeRemaining <= 10 ? "bg-red-500/20 text-red-400" : "bg-slate-700/50 text-slate-300"
                  )}
                >
                  <Timer className="w-5 h-5" />
                  <span className="font-mono text-lg">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-sm">to decide</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              {hasOptions && (
                <div className="space-y-3">
                  {data.rebuyAvailable && (
                    <Button
                      onClick={onRebuy}
                      disabled={isProcessing}
                      className="w-full h-14 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold"
                    >
                      <RefreshCw className={cn("w-5 h-5 mr-2", isProcessing && "animate-spin")} />
                      <div className="flex flex-col items-start">
                        <span>Rebuy</span>
                        <span className="text-xs opacity-80">
                          {data.rebuyCost?.toLocaleString()} 💎 → {data.rebuyChips?.toLocaleString()} chips
                        </span>
                      </div>
                    </Button>
                  )}

                  {data.reentryAvailable && (
                    <Button
                      onClick={onReentry}
                      disabled={isProcessing}
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold"
                    >
                      <DoorOpen className={cn("w-5 h-5 mr-2", isProcessing && "animate-spin")} />
                      <div className="flex flex-col items-start">
                        <span>Re-entry</span>
                        <span className="text-xs opacity-80">
                          {data.reentryCost?.toLocaleString()} 💎 → {data.reentryChips?.toLocaleString()} chips
                        </span>
                      </div>
                    </Button>
                  )}

                  <Button
                    onClick={onDecline}
                    disabled={isProcessing}
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    No Thanks - Exit Tournament
                  </Button>
                </div>
              )}

              {/* Final exit for eliminated players */}
              {!hasOptions && (
                <Button
                  onClick={onClose}
                  className="w-full bg-slate-700 hover:bg-slate-600"
                >
                  Return to Lobby
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default TournamentEliminationDialog;
