import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Trophy, Coins, AlertTriangle, Gift, Sparkles,
  Crown, Zap, Users, Clock, TrendingUp, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Jackpot types
export type JackpotType = 'bad-beat' | 'royal-flush' | 'hand-of-day' | 'high-hand' | 'mystery';

export interface JackpotInfo {
  id: string;
  type: JackpotType;
  name: string;
  description: string;
  amount: number;
  currency: 'chips' | 'usd';
  contributionPerHand: number;
  qualifyingCondition: string;
  lastWinner?: {
    playerId: string;
    playerName: string;
    amount: number;
    hand?: string;
    timestamp: number;
  };
  progress?: number; // For progressive jackpots
  nextMilestone?: number;
}

export interface JackpotTriggerEvent {
  type: JackpotType;
  winners: Array<{
    playerId: string;
    playerName: string;
    amount: number;
    share: number; // percentage
    role: 'loser' | 'winner' | 'table'; // For bad beat: loser gets most, winner second, table shares rest
    hand?: string;
  }>;
  totalAmount: number;
  hand: {
    board: string[];
    losingHand?: string[];
    winningHand?: string[];
    handRank: string;
  };
}

// Jackpot configurations
const JACKPOT_CONFIGS: Record<JackpotType, { icon: any; color: string; bgColor: string }> = {
  'bad-beat': { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'royal-flush': { icon: Crown, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'hand-of-day': { icon: Trophy, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'high-hand': { icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'mystery': { icon: Gift, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

// Jackpot display widget
interface JackpotWidgetProps {
  jackpots: JackpotInfo[];
  onInfoClick?: (jackpot: JackpotInfo) => void;
}

export function JackpotWidget({ jackpots, onInfoClick }: JackpotWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalJackpot = useMemo(() => 
    jackpots.reduce((sum, j) => sum + j.amount, 0),
    [jackpots]
  );

  if (jackpots.length === 0) return null;

  return (
    <div className="relative">
      {/* Compact view */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-gradient-to-r from-amber-500/20 to-purple-500/20",
          "border border-amber-500/30 hover:border-amber-500/50",
          "transition-colors"
        )}
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-400">
          Jackpot: {formatAmount(totalJackpot)}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="ml-1"
        >
          <Info className="w-3 h-3 text-amber-400/60" />
        </motion.div>
      </motion.button>

      {/* Expanded view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className={cn(
              "absolute top-full left-0 right-0 mt-2 z-50",
              "bg-slate-900/95 backdrop-blur-lg rounded-xl",
              "border border-white/10 shadow-2xl",
              "overflow-hidden"
            )}
          >
            <div className="p-3 space-y-2">
              {jackpots.map((jackpot) => {
                const config = JACKPOT_CONFIGS[jackpot.type];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={jackpot.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      config.bgColor
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <div>
                        <p className="text-sm font-medium text-white">{jackpot.name}</p>
                        <p className="text-xs text-white/60">{jackpot.qualifyingCondition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold", config.color)}>
                        {formatAmount(jackpot.amount)}
                      </p>
                      {jackpot.progress !== undefined && (
                        <Progress value={jackpot.progress} className="w-16 h-1 mt-1" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Jackpot win celebration overlay
interface JackpotWinOverlayProps {
  event: JackpotTriggerEvent;
  onClose: () => void;
  currentPlayerId: string;
}

export function JackpotWinOverlay({ event, onClose, currentPlayerId }: JackpotWinOverlayProps) {
  const config = JACKPOT_CONFIGS[event.type];
  const Icon = config.icon;
  const isCurrentPlayerWinner = event.winners.some(w => w.playerId === currentPlayerId);
  const currentPlayerWin = event.winners.find(w => w.playerId === currentPlayerId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className={cn(
          "relative max-w-md w-full mx-4 p-6 rounded-2xl",
          "bg-gradient-to-br from-slate-800 to-slate-900",
          "border-2 border-amber-500/50 shadow-2xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti/sparkles background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 - 50, 
                y: -20,
                rotate: 0,
                opacity: 1 
              }}
              animate={{ 
                y: 400, 
                rotate: 360,
                opacity: 0 
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="absolute w-2 h-2 bg-amber-400"
              style={{ 
                left: `${Math.random() * 100}%`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0'
              }}
            />
          ))}
        </div>

        <div className="relative text-center space-y-4">
          {/* Icon */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
              config.bgColor
            )}
          >
            <Icon className={cn("w-10 h-10", config.color)} />
          </motion.div>

          {/* Title */}
          <div>
            <motion.h2
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-3xl font-bold text-amber-400"
            >
              🎰 JACKPOT! 🎰
            </motion.h2>
            <p className="text-lg text-white/80 mt-1">
              {getJackpotTypeName(event.type)}
            </p>
          </div>

          {/* Hand info */}
          {event.hand.handRank && (
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-sm text-white/60">Выигрышная комбинация</p>
              <p className="text-xl font-bold text-white">{event.hand.handRank}</p>
            </div>
          )}

          {/* Total amount */}
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-lg p-4">
            <p className="text-sm text-amber-400/80">Общий выигрыш</p>
            <p className="text-4xl font-bold text-amber-400">
              {formatAmount(event.totalAmount)}
            </p>
          </div>

          {/* Winners list */}
          <div className="space-y-2">
            <p className="text-sm text-white/60">Распределение выигрыша</p>
            {event.winners.map((winner, index) => (
              <div
                key={winner.playerId}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  winner.playerId === currentPlayerId ? "bg-primary/20" : "bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {winner.role === 'loser' ? '💔' : winner.role === 'winner' ? '🏆' : '🎲'}
                  </span>
                  <div className="text-left">
                    <p className={cn(
                      "text-sm font-medium",
                      winner.playerId === currentPlayerId ? "text-primary" : "text-white"
                    )}>
                      {winner.playerName}
                      {winner.playerId === currentPlayerId && ' (Вы)'}
                    </p>
                    <p className="text-xs text-white/50">
                      {winner.role === 'loser' ? 'Bad Beat' : 
                       winner.role === 'winner' ? 'Победитель руки' : 'За столом'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">
                    +{formatAmount(winner.amount)}
                  </p>
                  <p className="text-xs text-white/50">{winner.share}%</p>
                </div>
              </div>
            ))}
          </div>

          {/* Your win highlight */}
          {isCurrentPlayerWinner && currentPlayerWin && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30"
            >
              <p className="text-green-400 font-bold text-xl">
                🎉 Вы выиграли {formatAmount(currentPlayerWin.amount)}! 🎉
              </p>
            </motion.div>
          )}

          {/* Close button */}
          <Button onClick={onClose} className="w-full">
            Продолжить игру
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Bad Beat Jackpot qualification check
export function checkBadBeatQualification(
  losingHand: string,
  board: string[],
  minQualifyingHand: string = 'four-of-a-kind-jacks' // Minimum: quads Jacks
): boolean {
  // Hand rank hierarchy for bad beat
  const qualifyingRanks = [
    'royal-flush',
    'straight-flush', 
    'four-of-a-kind-aces',
    'four-of-a-kind-kings',
    'four-of-a-kind-queens',
    'four-of-a-kind-jacks',
    'four-of-a-kind-tens',
    'four-of-a-kind',
  ];
  
  const minIndex = qualifyingRanks.indexOf(minQualifyingHand);
  if (minIndex === -1) return false;
  
  const handIndex = qualifyingRanks.findIndex(r => losingHand.toLowerCase().includes(r.replace(/-/g, ' ')));
  
  return handIndex !== -1 && handIndex <= minIndex;
}

// Jackpot distribution calculator for Bad Beat
export function calculateBadBeatDistribution(
  totalJackpot: number,
  loserId: string,
  winnerId: string,
  tablePlayerIds: string[]
): Array<{ playerId: string; amount: number; share: number; role: 'loser' | 'winner' | 'table' }> {
  // Standard distribution: 50% loser, 25% winner, 25% table split
  const loserShare = 0.50;
  const winnerShare = 0.25;
  const tableShare = 0.25;
  
  const tablePlayers = tablePlayerIds.filter(id => id !== loserId && id !== winnerId);
  const perPlayerShare = tablePlayers.length > 0 ? tableShare / tablePlayers.length : 0;
  
  const distribution: Array<{ playerId: string; amount: number; share: number; role: 'loser' | 'winner' | 'table' }> = [
    { playerId: loserId, amount: Math.floor(totalJackpot * loserShare), share: 50, role: 'loser' },
    { playerId: winnerId, amount: Math.floor(totalJackpot * winnerShare), share: 25, role: 'winner' },
  ];
  
  tablePlayers.forEach(playerId => {
    distribution.push({
      playerId,
      amount: Math.floor(totalJackpot * perPlayerShare),
      share: Math.round((perPlayerShare * 100) * 10) / 10,
      role: 'table'
    });
  });
  
  return distribution;
}

// Helper functions
function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}

function getJackpotTypeName(type: JackpotType): string {
  const names: Record<JackpotType, string> = {
    'bad-beat': 'Bad Beat Jackpot',
    'royal-flush': 'Royal Flush Jackpot',
    'hand-of-day': 'Рука дня',
    'high-hand': 'High Hand Bonus',
    'mystery': 'Mystery Jackpot',
  };
  return names[type] || type;
}

// Hook for managing jackpots
export function useJackpotSystem(tableId: string) {
  const [jackpots, setJackpots] = useState<JackpotInfo[]>([]);
  const [currentEvent, setCurrentEvent] = useState<JackpotTriggerEvent | null>(null);

  const triggerJackpot = useCallback((event: JackpotTriggerEvent) => {
    setCurrentEvent(event);
  }, []);

  const dismissEvent = useCallback(() => {
    setCurrentEvent(null);
  }, []);

  const contributeToJackpot = useCallback((jackpotId: string, amount: number) => {
    setJackpots(prev => prev.map(j => 
      j.id === jackpotId 
        ? { ...j, amount: j.amount + amount }
        : j
    ));
  }, []);

  return {
    jackpots,
    currentEvent,
    triggerJackpot,
    dismissEvent,
    contributeToJackpot,
  };
}
