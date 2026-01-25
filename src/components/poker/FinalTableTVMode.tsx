/**
 * Final Table TV Mode - PokerStars-style broadcast display
 * Shows live pot, actions, hole cards, community cards, ICM
 */
import React, { useState, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getMaskedName } from '@/hooks/useMaskedPlayerName';

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
  holeCards?: string[];
  currentBet?: number;
  lastAction?: string;
  lastActionAmount?: number;
  handRank?: string;
  countryFlag?: string;
  vpip?: number;
  pfr?: number;
  af?: number;
}

interface RecentAction {
  id: string;
  playerId: string;
  playerName: string;
  actionType: string;
  amount: number | null;
  phase: string;
  timestamp: number;
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
  currentPhase?: string;
  recentActions?: RecentAction[];
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

// Card display component
const CardDisplay: React.FC<{ card: string; size?: 'sm' | 'md' | 'lg'; faceDown?: boolean }> = ({ 
  card, 
  size = 'md',
  faceDown = false 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-8 text-[10px]',
    md: 'w-10 h-14 text-sm',
    lg: 'w-14 h-20 text-lg'
  };

  if (faceDown) {
    return (
      <div className={cn(
        sizeClasses[size],
        "bg-gradient-to-br from-blue-800 to-blue-900 rounded border border-blue-600 flex items-center justify-center"
      )}>
        <div className="w-3/4 h-3/4 border border-blue-500/50 rounded-sm" />
      </div>
    );
  }

  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const isRed = suit === '♥' || suit === '♦' || suit === 'h' || suit === 'd';
  
  const suitSymbol = {
    'h': '♥', 'd': '♦', 'c': '♣', 's': '♠',
    '♥': '♥', '♦': '♦', '♣': '♣', '♠': '♠'
  }[suit.toLowerCase()] || suit;

  return (
    <div className={cn(
      sizeClasses[size],
      "bg-white rounded shadow-lg flex flex-col items-center justify-center font-bold",
      isRed ? "text-red-600" : "text-gray-900"
    )}>
      <span>{rank}</span>
      <span className="text-xs">{suitSymbol}</span>
    </div>
  );
};

// Action badge component
const ActionBadge: React.FC<{ action: string; amount?: number | null }> = ({ action, amount }) => {
  const actionConfig: Record<string, { bg: string; text: string; label: string }> = {
    fold: { bg: 'bg-gray-500/80', text: 'text-white', label: 'FOLD' },
    check: { bg: 'bg-blue-500/80', text: 'text-white', label: 'CHECK' },
    call: { bg: 'bg-green-500/80', text: 'text-white', label: 'CALL' },
    bet: { bg: 'bg-amber-500/80', text: 'text-black', label: 'BET' },
    raise: { bg: 'bg-orange-500/80', text: 'text-white', label: 'RAISE' },
    allin: { bg: 'bg-red-500/80', text: 'text-white', label: 'ALL-IN' },
    'all-in': { bg: 'bg-red-500/80', text: 'text-white', label: 'ALL-IN' }
  };

  const config = actionConfig[action.toLowerCase()] || { bg: 'bg-gray-500/80', text: 'text-white', label: action.toUpperCase() };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("px-2 py-0.5 rounded text-[10px] font-bold", config.bg, config.text)}
    >
      {config.label}
      {amount && amount > 0 && ` ${amount.toLocaleString()}`}
    </motion.div>
  );
};

// Calculate ICM equity
const calculateICM = (stacks: number[], payouts: number[]): number[] => {
  const total = stacks.reduce((a, b) => a + b, 0);
  if (total === 0) return stacks.map(() => 0);
  
  return stacks.map((stack, idx) => {
    if (stack === 0) return 0;
    const stackPercent = stack / total;
    let icmEquity = stackPercent * payouts[0];
    
    for (let pos = 1; pos < payouts.length && pos < stacks.length; pos++) {
      const remainingEquity = (1 - stackPercent) * stackPercent * payouts[pos] / (stacks.length - 1);
      icmEquity += remainingEquity;
    }
    
    return icmEquity;
  });
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
  currentPhase = 'waiting',
  recentActions = [],
  onToggleFullscreen,
  isFullscreen = false,
  className
}) => {
  const [showStats, setShowStats] = useState(true);
  const [showICM, setShowICM] = useState(true);
  const [showCards, setShowCards] = useState(true);
  
  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => b.chips - a.chips),
    [players]
  );
  
  const totalChips = useMemo(() => 
    players.reduce((sum, p) => sum + p.chips, 0),
    [players]
  );
  
  const averageStack = useMemo(() => 
    totalChips / players.filter(p => p.chips > 0).length || 0,
    [totalChips, players]
  );
  
  const icmEquities = useMemo(() => {
    const stacks = sortedPlayers.map(p => p.chips);
    const payouts = payoutPositions.map(p => p.amount);
    return calculateICM(stacks, payouts);
  }, [sortedPlayers, payoutPositions]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const phaseLabels: Record<string, string> = {
    preflop: 'PREFLOP',
    flop: 'FLOP',
    turn: 'TURN',
    river: 'RIVER',
    showdown: 'SHOWDOWN',
    waiting: 'ОЖИДАНИЕ'
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
          {isHandInProgress && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <Zap className="h-3 w-3 mr-1" />
              {phaseLabels[currentPhase] || currentPhase.toUpperCase()}
            </Badge>
          )}
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
            onClick={() => setShowCards(!showCards)}
          >
            {showCards ? '🂠' : '🂡'} Cards
          </Button>
          
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
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
            <span className={cn(timeRemaining < 60 && "text-red-400 animate-pulse")}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          <span>Уровень {currentLevel}</span>
          <span>Блайнды: {blinds.small}/{blinds.big}</span>
          {blinds.ante && blinds.ante > 0 && <span>Анте: {blinds.ante}</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Left Panel - Chip Standings with Cards */}
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
                  player.isActing ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-400/50" : "border-white/10",
                  player.isFolded && "opacity-40"
                )}
                layout
                animate={player.isActing ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.5, repeat: player.isActing ? Infinity : 0 }}
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
                  
                  {/* Avatar + Hole Cards */}
                  <div className="relative">
                    <img 
                      src={player.avatarUrl || '/placeholder.svg'} 
                      alt={player.name}
                      className={cn(
                        "w-8 h-8 rounded-full object-cover border-2",
                        player.isActing ? "border-amber-400" : "border-white/20"
                      )}
                    />
                    {player.isDealer && (
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[8px] font-bold text-black">
                        D
                      </div>
                    )}
                  </div>
                  
                  {/* Hole Cards */}
                  {showCards && player.holeCards && player.holeCards.length === 2 && !player.isFolded && (
                    <div className="flex gap-0.5">
                      <CardDisplay card={player.holeCards[0]} size="sm" />
                      <CardDisplay card={player.holeCards[1]} size="sm" />
                    </div>
                  )}
                  {showCards && (!player.holeCards || player.holeCards.length === 0) && !player.isFolded && isHandInProgress && (
                    <div className="flex gap-0.5">
                      <CardDisplay card="" size="sm" faceDown />
                      <CardDisplay card="" size="sm" faceDown />
                    </div>
                  )}
                  
                  {/* Name & Chips */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "text-white text-sm font-medium truncate",
                        player.isFolded && "line-through"
                      )}>
                        {getMaskedName(player.id, player.name)}
                      </span>
                      {player.isAllIn && (
                        <Badge className="h-4 text-[8px] px-1 bg-red-500/30 text-red-300">
                          ALL-IN
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
                  
                  {/* Last Action */}
                  {player.lastAction && (
                    <ActionBadge action={player.lastAction} amount={player.lastActionAmount} />
                  )}
                  
                  {/* ICM Value */}
                  {showICM && (
                    <div className="text-right">
                      <div className="text-xs text-cyan-400">
                        {Math.round(icmValue).toLocaleString()} 💎
                      </div>
                      <div className="text-[10px] text-white/40">ICM</div>
                    </div>
                  )}
                </div>
                
                {/* Chip bar */}
                <div className="mt-1">
                  <Progress value={chipPercent} className="h-1 bg-white/10" />
                </div>
                
                {/* Current Bet */}
                {player.currentBet && player.currentBet > 0 && !player.isFolded && (
                  <div className="mt-1 text-[10px] text-amber-400">
                    Ставка: {player.currentBet.toLocaleString()}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Center - Pot & Cards & Actions */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {/* Pot Display */}
          <motion.div 
            className="bg-black/40 rounded-xl p-4 text-center mb-4 min-w-[200px]"
            animate={pot > 0 ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
            key={pot}
          >
            <div className="text-white/60 text-sm mb-1">Текущий банк</div>
            <motion.div 
              className="text-3xl font-bold text-amber-400"
              key={pot}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {pot.toLocaleString()}
            </motion.div>
            {isHandInProgress && (
              <div className="text-xs text-white/50 mt-1">
                {phaseLabels[currentPhase] || currentPhase}
              </div>
            )}
          </motion.div>
          
          {/* Community Cards */}
          <div className="flex gap-2 justify-center mb-4 min-h-[60px]">
            <AnimatePresence>
              {communityCards.length > 0 ? (
                communityCards.map((card, idx) => (
                  <motion.div
                    key={`${card}-${idx}`}
                    initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
                    animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring' }}
                  >
                    <CardDisplay card={card} size="md" />
                  </motion.div>
                ))
              ) : isHandInProgress ? (
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-10 h-14 rounded border-2 border-dashed",
                        i < 3 ? "border-white/20" : "border-white/10"
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </AnimatePresence>
          </div>
          
          {/* Recent Actions Feed */}
          {recentActions.length > 0 && (
            <div className="w-full bg-black/30 rounded-lg p-2">
              <h4 className="text-[10px] text-white/50 mb-1 uppercase">Последние действия</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {recentActions.slice(0, 5).map((action, idx) => (
                  <motion.div
                    key={action.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-white/70 truncate max-w-[80px]">{action.playerName}</span>
                    <ActionBadge action={action.actionType} amount={action.amount} />
                  </motion.div>
                ))}
              </div>
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
                {players.filter(p => p.chips > 0 && !p.isFolded).length}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Ticker */}
      <div className="bg-black/50 px-4 py-1.5 overflow-hidden">
        <motion.div
          className="flex gap-8 text-sm text-white/60 whitespace-nowrap"
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {players.map(p => (
            <span key={p.id} className="flex items-center gap-2">
              <span className={cn(p.isFolded && "text-white/30")}>
                {p.name}: {p.chips.toLocaleString()} ({Math.round(p.chips / blinds.big)} BB)
              </span>
              {p.lastAction && <ActionBadge action={p.lastAction} amount={p.lastActionAmount} />}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {players.map(p => (
            <span key={`dup-${p.id}`} className="flex items-center gap-2">
              <span className={cn(p.isFolded && "text-white/30")}>
                {p.name}: {p.chips.toLocaleString()} ({Math.round(p.chips / blinds.big)} BB)
              </span>
              {p.lastAction && <ActionBadge action={p.lastAction} amount={p.lastActionAmount} />}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FinalTableTVMode;
