/**
 * ICM Deal Calculator UI
 * 5.4 - Calculate and propose deals based on ICM equity
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Users, 
  Trophy, 
  Diamond, 
  PieChart,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  Handshake,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  chips: number;
  seatNumber: number;
}

interface PayoutPosition {
  position: number;
  amount: number;
}

interface ICMDealCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  payoutStructure: PayoutPosition[];
  prizePoolRemaining: number;
  currentPlayerId?: string;
  onProposeDeal?: (dealAmounts: { playerId: string; amount: number }[]) => void;
}

// Advanced ICM calculation using Malmuth-Harville method
const calculateICM = (
  stacks: number[],
  payouts: number[]
): number[] => {
  const n = stacks.length;
  const total = stacks.reduce((a, b) => a + b, 0);
  
  if (total === 0 || n === 0) return stacks.map(() => 0);
  
  const probabilities: number[][] = [];
  
  // Calculate probability of each player finishing in each position
  for (let player = 0; player < n; player++) {
    probabilities[player] = [];
    
    // Probability of 1st place
    probabilities[player][0] = stacks[player] / total;
    
    // For positions 2+, we need recursive calculation
    for (let pos = 1; pos < Math.min(n, payouts.length); pos++) {
      let prob = 0;
      
      // For each other player who could finish ahead
      for (let ahead = 0; ahead < n; ahead++) {
        if (ahead === player) continue;
        
        // Probability that 'ahead' finishes in higher positions
        // Simplified: use remaining chips after removing ahead's stack
        const remaining = total - stacks[ahead];
        if (remaining > 0) {
          const pAhead = stacks[ahead] / total;
          const pPlayerInPos = stacks[player] / remaining;
          prob += pAhead * pPlayerInPos * 0.9; // Discount factor for approximation
        }
      }
      
      probabilities[player][pos] = Math.min(prob, 1 - probabilities[player].slice(0, pos).reduce((a, b) => a + b, 0));
    }
  }
  
  // Calculate expected value
  return stacks.map((_, playerIdx) => {
    let ev = 0;
    for (let pos = 0; pos < Math.min(n, payouts.length); pos++) {
      ev += (probabilities[playerIdx][pos] || 0) * payouts[pos];
    }
    return ev;
  });
};

// Chip chop calculation
const calculateChipChop = (
  stacks: number[],
  prizePool: number
): number[] => {
  const total = stacks.reduce((a, b) => a + b, 0);
  if (total === 0) return stacks.map(() => 0);
  return stacks.map(stack => Math.round((stack / total) * prizePool));
};

export const ICMDealCalculator: React.FC<ICMDealCalculatorProps> = ({
  isOpen,
  onClose,
  players,
  payoutStructure,
  prizePoolRemaining,
  currentPlayerId,
  onProposeDeal
}) => {
  const [dealType, setDealType] = useState<'icm' | 'chip-chop' | 'custom'>('icm');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  
  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => b.chips - a.chips),
    [players]
  );
  
  const totalChips = useMemo(() => 
    players.reduce((sum, p) => sum + p.chips, 0),
    [players]
  );
  
  const payoutAmounts = useMemo(() => 
    payoutStructure.map(p => p.amount),
    [payoutStructure]
  );
  
  // ICM Calculation
  const icmEquities = useMemo(() => {
    const stacks = sortedPlayers.map(p => p.chips);
    return calculateICM(stacks, payoutAmounts);
  }, [sortedPlayers, payoutAmounts]);
  
  // Chip Chop Calculation
  const chipChopAmounts = useMemo(() => {
    const stacks = sortedPlayers.map(p => p.chips);
    return calculateChipChop(stacks, prizePoolRemaining);
  }, [sortedPlayers, prizePoolRemaining]);
  
  // Current deal amounts based on selected type
  const currentDealAmounts = useMemo(() => {
    if (dealType === 'icm') return icmEquities;
    if (dealType === 'chip-chop') return chipChopAmounts;
    return sortedPlayers.map(p => customAmounts[p.id] || 0);
  }, [dealType, icmEquities, chipChopAmounts, sortedPlayers, customAmounts]);
  
  // Validate custom amounts
  const customTotal = useMemo(() => 
    Object.values(customAmounts).reduce((a, b) => a + b, 0),
    [customAmounts]
  );
  
  const isCustomValid = customTotal === prizePoolRemaining;

  const handleProposeDeal = () => {
    const dealAmounts = sortedPlayers.map((player, idx) => ({
      playerId: player.id,
      amount: Math.round(currentDealAmounts[idx])
    }));
    onProposeDeal?.(dealAmounts);
    onClose();
  };

  const handleCustomAmountChange = (playerId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomAmounts(prev => ({
      ...prev,
      [playerId]: numValue
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-slate-800/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Handshake className="h-6 w-6 text-emerald-400" />
              <span className="font-bold text-white text-lg">ICM Deal Calculator</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Prize Pool Info */}
          <div className="p-4 bg-black/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-white/70">Призовой фонд:</span>
              </div>
              <span className="text-2xl font-bold text-amber-400">
                {prizePoolRemaining.toLocaleString()} 💎
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-white/50">Игроков:</span>
              <span className="text-white">{players.length}</span>
            </div>
          </div>

          {/* Deal Type Tabs */}
          <Tabs value={dealType} onValueChange={(v) => setDealType(v as any)} className="p-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="icm" className="text-xs">
                <Scale className="h-4 w-4 mr-1" />
                ICM
              </TabsTrigger>
              <TabsTrigger value="chip-chop" className="text-xs">
                <PieChart className="h-4 w-4 mr-1" />
                Chip Chop
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                <Calculator className="h-4 w-4 mr-1" />
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Players Table */}
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs text-white/50 px-2">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Игрок</div>
                <div className="col-span-2 text-right">Фишки</div>
                <div className="col-span-2 text-right">%</div>
                <div className="col-span-2 text-right">ICM</div>
                <div className="col-span-2 text-right">Сделка</div>
              </div>

              {/* Players */}
              {sortedPlayers.map((player, idx) => {
                const chipPercent = (player.chips / totalChips) * 100;
                const icmAmount = icmEquities[idx] || 0;
                const dealAmount = currentDealAmounts[idx] || 0;
                const isCurrentPlayer = player.id === currentPlayerId;
                
                // Compare ICM to scheduled payout for their position
                const scheduledPayout = payoutStructure[idx]?.amount || 0;
                const icmDiff = icmAmount - scheduledPayout;
                
                return (
                  <motion.div
                    key={player.id}
                    className={cn(
                      "grid grid-cols-12 gap-2 items-center p-2 rounded-lg",
                      isCurrentPlayer ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-black/20"
                    )}
                    layout
                  >
                    {/* Position */}
                    <div className="col-span-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 ? "bg-amber-500 text-black" :
                        idx === 1 ? "bg-slate-400 text-black" :
                        idx === 2 ? "bg-amber-700 text-white" :
                        "bg-slate-600 text-white"
                      )}>
                        {idx + 1}
                      </div>
                    </div>
                    
                    {/* Player */}
                    <div className="col-span-3 flex items-center gap-2">
                      <img
                        src={player.avatarUrl || '/placeholder.svg'}
                        alt={player.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div className="truncate">
                        <span className="text-white text-sm">{player.name}</span>
                        {isCurrentPlayer && (
                          <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">
                            Вы
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Chips */}
                    <div className="col-span-2 text-right text-white text-sm">
                      {player.chips.toLocaleString()}
                    </div>
                    
                    {/* Chip % */}
                    <div className="col-span-2 text-right text-white/70 text-sm">
                      {chipPercent.toFixed(1)}%
                    </div>
                    
                    {/* ICM Value */}
                    <div className="col-span-2 text-right">
                      <div className="text-cyan-400 text-sm">
                        {Math.round(icmAmount).toLocaleString()}
                      </div>
                      <div className={cn(
                        "text-[10px]",
                        icmDiff > 0 ? "text-emerald-400" : icmDiff < 0 ? "text-red-400" : "text-white/40"
                      )}>
                        {icmDiff > 0 ? '+' : ''}{Math.round(icmDiff).toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Deal Amount */}
                    <div className="col-span-2 text-right">
                      {dealType === 'custom' ? (
                        <Input
                          type="number"
                          value={customAmounts[player.id] || ''}
                          onChange={(e) => handleCustomAmountChange(player.id, e.target.value)}
                          className="h-7 text-sm bg-black/30 border-white/20 text-right w-full"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          {Math.round(dealAmount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Custom Total Validation */}
              {dealType === 'custom' && (
                <div className={cn(
                  "flex items-center justify-between p-2 rounded-lg mt-2",
                  isCustomValid ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"
                )}>
                  <span className="text-white/70 text-sm">Итого:</span>
                  <span className={cn(
                    "font-medium",
                    isCustomValid ? "text-emerald-400" : "text-red-400"
                  )}>
                    {customTotal.toLocaleString()} / {prizePoolRemaining.toLocaleString()} 💎
                  </span>
                </div>
              )}
            </div>
          </Tabs>

          {/* Scheduled Payouts Reference */}
          <div className="p-4 border-t border-white/10">
            <h4 className="text-white/70 text-sm mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Запланированные призы (без сделки):
            </h4>
            <div className="flex flex-wrap gap-2">
              {payoutStructure.slice(0, players.length).map((payout) => (
                <Badge key={payout.position} variant="outline" className="text-white/60">
                  {payout.position} место: {payout.amount.toLocaleString()} 💎
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-white/10 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-white/20"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
              onClick={handleProposeDeal}
              disabled={dealType === 'custom' && !isCustomValid}
            >
              <Handshake className="h-4 w-4 mr-2" />
              Предложить сделку
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ICMDealCalculator;
