/**
 * Final Table TV Mode - Broadcast-quality display for final table
 * 5.1 - Final Table TV Mode with spectator view, chip counts, ICM
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, 
  Users, 
  Trophy, 
  TrendingUp, 
  Eye, 
  Clock, 
  Diamond,
  BarChart3,
  Maximize2,
  Minimize2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FinalTablePlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  chips: number;
  seatNumber: number;
  isDealer?: boolean;
  isBigBlind?: boolean;
  isSmallBlind?: boolean;
  isActing?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  handRank?: string;
  countryFlag?: string;
  vpip?: number;
  pfr?: number;
  af?: number;
}

interface FinalTableTVModeProps {
  players: FinalTablePlayer[];
  tournamentName: string;
  prizePool: number;
  currentLevel: number;
  blinds: { small: number; big: number; ante?: number };
  timeRemaining: number;
  spectatorCount: number;
  pot: number;
  communityCards?: string[];
  payoutPositions: { position: number; amount: number; percentage: number }[];
  isHandInProgress?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

// Calculate ICM equity for each player
const calculateICM = (
  stacks: number[], 
  payouts: number[]
): number[] => {
  const total = stacks.reduce((a, b) => a + b, 0);
  if (total === 0) return stacks.map(() => 0);
  
  // Simplified ICM - proportional to stack with position weighting
  const equities: number[] = [];
  const sortedStacks = [...stacks].sort((a, b) => b - a);
  
  stacks.forEach((stack, idx) => {
    if (stack === 0) {
      equities.push(0);
      return;
    }
    
    const stackPercent = stack / total;
    let icmEquity = 0;
    
    // First place equity
    icmEquity += stackPercent * payouts[0];
    
    // Approximate equity for other positions
    for (let pos = 1; pos < payouts.length && pos < stacks.length; pos++) {
      const remainingEquity = (1 - stackPercent) * stackPercent * payouts[pos] / (stacks.length - 1);
      icmEquity += remainingEquity;
    }
    
    equities.push(icmEquity);
  });
  
  return equities;
};

export const FinalTableTVMode: React.FC<FinalTableTVModeProps> = ({
  players,
  tournamentName,
  prizePool,
  currentLevel,
  blinds,
  timeRemaining,
  spectatorCount,
  pot,
  communityCards = [],
  payoutPositions,
  isHandInProgress = false,
  onToggleFullscreen,
  isFullscreen = false,
  className
}) => {
  const [showStats, setShowStats] = useState(true);
  const [showICM, setShowICM] = useState(true);
  
  // Sort players by chips
  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => b.chips - a.chips),
    [players]
  );
  
  const totalChips = useMemo(() => 
    players.reduce((sum, p) => sum + p.chips, 0),
    [players]
  );
  
  const averageStack = useMemo(() => 
    totalChips / players.filter(p => p.chips > 0).length,
    [totalChips, players]
  );
  
  // ICM calculations
  const icmEquities = useMemo(() => {
    const stacks = sortedPlayers.map(p => p.chips);
    const payouts = payoutPositions.map(p => p.amount);
    return calculateICM(stacks, payouts);
  }, [sortedPlayers, payoutPositions]);
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      className={cn(
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-amber-500/30 overflow-hidden shadow-2xl",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* TV Header */}
      <div className="bg-gradient-to-r from-amber-600/90 to-amber-700/90 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-white" />
            <span className="font-bold text-white text-lg">FINAL TABLE</span>
          </div>
          <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30 animate-pulse">
            ● LIVE
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/80">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{spectatorCount.toLocaleString()}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-white/80 hover:text-white"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Stats
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-white/80 hover:text-white"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Tournament Info Bar */}
      <div className="bg-black/50 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-medium">{tournamentName}</span>
          <div className="flex items-center gap-2 text-white/70">
            <Diamond className="h-4 w-4 text-cyan-400" />
            <span>{prizePool.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-white/70">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
          <span>Уровень {currentLevel}</span>
          <span>Блайнды: {blinds.small}/{blinds.big}</span>
          {blinds.ante && <span>Анте: {blinds.ante}</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Left Panel - Chip Standings */}
        <div className="col-span-1 space-y-2">
          <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Chip Leader Board
          </h3>
          
          {sortedPlayers.map((player, idx) => {
            const chipPercent = (player.chips / totalChips) * 100;
            const stackBBs = Math.round(player.chips / blinds.big);
            const icmValue = icmEquities[idx] || 0;
            
            return (
              <motion.div
                key={player.id}
                className={cn(
                  "bg-black/30 rounded-lg p-2 border transition-all",
                  player.isActing ? "border-amber-500 bg-amber-500/10" : "border-white/10",
                  player.isFolded && "opacity-50"
                )}
                layout
              >
                <div className="flex items-center gap-2">
                  {/* Position */}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    idx === 0 ? "bg-amber-500 text-black" : 
                    idx === 1 ? "bg-slate-400 text-black" :
                    idx === 2 ? "bg-amber-700 text-white" :
                    "bg-slate-700 text-white"
                  )}>
                    {idx + 1}
                  </div>
                  
                  {/* Avatar */}
                  <div className="relative">
                    <img 
                      src={player.avatarUrl || '/placeholder.svg'} 
                      alt={player.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                    />
                    {player.countryFlag && (
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {player.countryFlag}
                      </span>
                    )}
                  </div>
                  
                  {/* Name & Chips */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-sm font-medium truncate">
                        {player.name}
                      </span>
                      {player.isDealer && (
                        <Badge variant="outline" className="h-4 text-[9px] px-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                          D
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400">
                        {player.chips.toLocaleString()}
                      </span>
                      <span className="text-white/50">
                        ({stackBBs} BB)
                      </span>
                    </div>
                  </div>
                  
                  {/* ICM Value */}
                  {showICM && (
                    <div className="text-right">
                      <div className="text-xs text-cyan-400">
                        ${Math.round(icmValue).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-white/40">
                        ICM
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chip bar */}
                <div className="mt-1">
                  <Progress value={chipPercent} className="h-1 bg-white/10" />
                </div>
                
                {/* Stats */}
                {showStats && player.vpip !== undefined && (
                  <div className="flex gap-2 mt-1 text-[10px] text-white/50">
                    <span>VPIP: {player.vpip}%</span>
                    <span>PFR: {player.pfr}%</span>
                    <span>AF: {player.af?.toFixed(1)}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Center - Pot & Cards */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {/* Pot Display */}
          <div className="bg-black/40 rounded-xl p-4 text-center mb-4 min-w-[200px]">
            <div className="text-white/60 text-sm mb-1">Текущий банк</div>
            <div className="text-3xl font-bold text-amber-400">
              {pot.toLocaleString()}
            </div>
          </div>
          
          {/* Community Cards */}
          {communityCards.length > 0 && (
            <div className="flex gap-2 justify-center">
              {communityCards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ rotateY: 180, scale: 0.8 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="w-12 h-16 bg-white rounded-lg shadow-lg flex items-center justify-center text-lg font-bold"
                >
                  {card}
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Average Stack Info */}
          <div className="mt-4 text-center text-white/60 text-sm">
            <div>Средний стек: {Math.round(averageStack).toLocaleString()}</div>
            <div className="text-xs">({Math.round(averageStack / blinds.big)} BB)</div>
          </div>
        </div>
        
        {/* Right Panel - Payouts */}
        <div className="col-span-1 space-y-2">
          <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Призовые места
          </h3>
          
          {payoutPositions.slice(0, 6).map((payout) => (
            <div 
              key={payout.position}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                payout.position <= players.length ? 
                  "bg-emerald-500/10 border border-emerald-500/20" : 
                  "bg-white/5 border border-white/10"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  payout.position === 1 ? "bg-amber-500 text-black" :
                  payout.position === 2 ? "bg-slate-400 text-black" :
                  payout.position === 3 ? "bg-amber-700 text-white" :
                  "bg-slate-600 text-white"
                )}>
                  {payout.position}
                </div>
                <span className="text-white/70 text-sm">место</span>
              </div>
              
              <div className="text-right">
                <div className="text-emerald-400 font-medium">
                  {payout.amount.toLocaleString()} 💎
                </div>
                <div className="text-[10px] text-white/50">
                  {payout.percentage}%
                </div>
              </div>
            </div>
          ))}
          
          {/* Remaining Players */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Осталось игроков:</span>
              <span className="text-white font-medium flex items-center gap-1">
                <Users className="h-4 w-4" />
                {players.filter(p => p.chips > 0).length}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Ticker */}
      <div className="bg-black/50 px-4 py-1.5 overflow-hidden">
        <motion.div
          className="flex gap-8 text-sm text-white/60 whitespace-nowrap"
          animate={{ x: [0, -500] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {players.map(p => (
            <span key={p.id}>
              {p.name}: {p.chips.toLocaleString()} ({Math.round(p.chips / blinds.big)} BB)
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FinalTableTVMode;
