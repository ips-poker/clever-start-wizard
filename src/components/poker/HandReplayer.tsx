import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  ChevronLeft, ChevronRight, Volume2, VolumeX,
  Maximize2, X, Clock, Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { PokerCard, CommunityCards } from './PokerCard';

// Types for hand history
export interface ReplayAction {
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  playerId: string;
  playerName?: string;
  seatNumber: number;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount?: number;
  potAfter: number;
  timestamp: number;
}

export interface ReplayPlayer {
  id: string;
  name: string;
  seatNumber: number;
  stackStart: number;
  stackEnd: number;
  holeCards?: string[];
  isWinner?: boolean;
  amountWon?: number;
  handRank?: string;
}

export interface HandReplay {
  handId: string;
  handNumber: number;
  timestamp: number;
  players: ReplayPlayer[];
  communityCards: string[];
  actions: ReplayAction[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  potTotal: number;
  winners: Array<{
    playerId: string;
    amount: number;
    handRank?: string;
  }>;
}

interface HandReplayerProps {
  hand: HandReplay;
  onClose?: () => void;
  isFullscreen?: boolean;
}

// Seat positions (simplified for replayer view)
const REPLAY_SEAT_POSITIONS = [
  { x: 50, y: 85 },   // 1
  { x: 20, y: 70 },   // 2
  { x: 10, y: 45 },   // 3
  { x: 20, y: 20 },   // 4
  { x: 40, y: 10 },   // 5
  { x: 60, y: 10 },   // 6
  { x: 80, y: 20 },   // 7
  { x: 90, y: 45 },   // 8
  { x: 80, y: 70 },   // 9
];

export function HandReplayer({ hand, onClose, isFullscreen = false }: HandReplayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCards, setShowCards] = useState<Record<string, boolean>>({});

  // Calculate state at current step
  const currentState = useMemo(() => {
    const state = {
      phase: 'preflop' as ReplayAction['phase'],
      communityCards: [] as string[],
      pot: hand.smallBlindAmount + hand.bigBlindAmount,
      playerBets: {} as Record<string, number>,
      playerStacks: {} as Record<string, number>,
      foldedPlayers: new Set<string>(),
      lastAction: null as ReplayAction | null,
      currentPlayer: null as string | null
    };

    // Initialize stacks
    hand.players.forEach(p => {
      state.playerStacks[p.id] = p.stackStart;
    });

    // Process blinds
    const sbPlayer = hand.players.find(p => p.seatNumber === hand.smallBlindSeat);
    const bbPlayer = hand.players.find(p => p.seatNumber === hand.bigBlindSeat);
    if (sbPlayer) {
      state.playerBets[sbPlayer.id] = hand.smallBlindAmount;
      state.playerStacks[sbPlayer.id] -= hand.smallBlindAmount;
    }
    if (bbPlayer) {
      state.playerBets[bbPlayer.id] = hand.bigBlindAmount;
      state.playerStacks[bbPlayer.id] -= hand.bigBlindAmount;
    }

    // Process actions up to current step
    for (let i = 0; i <= currentStep && i < hand.actions.length; i++) {
      const action = hand.actions[i];
      state.phase = action.phase;
      state.lastAction = action;
      state.pot = action.potAfter;

      // Update community cards based on phase
      if (action.phase === 'flop') {
        state.communityCards = hand.communityCards.slice(0, 3);
      } else if (action.phase === 'turn') {
        state.communityCards = hand.communityCards.slice(0, 4);
      } else if (action.phase === 'river' || action.phase === 'showdown') {
        state.communityCards = hand.communityCards;
      }

      // Process player action
      if (action.action === 'fold') {
        state.foldedPlayers.add(action.playerId);
      } else if (action.amount) {
        const currentBet = state.playerBets[action.playerId] || 0;
        const additionalBet = action.amount - currentBet;
        state.playerBets[action.playerId] = action.amount;
        state.playerStacks[action.playerId] -= additionalBet;
      }
    }

    // Next player
    if (currentStep < hand.actions.length - 1) {
      state.currentPlayer = hand.actions[currentStep + 1]?.playerId || null;
    }

    return state;
  }, [hand, currentStep]);

  // Playback control
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= hand.actions.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, hand.actions.length]);

  const handleStepBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setCurrentStep(prev => Math.min(hand.actions.length - 1, prev + 1));
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const formatAction = (action: ReplayAction) => {
    const player = hand.players.find(p => p.id === action.playerId);
    const name = player?.name || `Seat ${action.seatNumber}`;
    
    switch (action.action) {
      case 'fold': return `${name} folds`;
      case 'check': return `${name} checks`;
      case 'call': return `${name} calls ${action.amount}`;
      case 'bet': return `${name} bets ${action.amount}`;
      case 'raise': return `${name} raises to ${action.amount}`;
      case 'all-in': return `${name} ALL-IN ${action.amount}`;
      default: return `${name} ${action.action}`;
    }
  };

  return (
    <div className={cn(
      "bg-slate-900 rounded-xl overflow-hidden",
      isFullscreen ? "fixed inset-4 z-50" : "relative"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">
            Hand #{hand.handNumber}
          </h3>
          <Badge variant="outline" className="text-xs">
            {new Date(hand.timestamp).toLocaleString()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={cn(
            "capitalize",
            currentState.phase === 'showdown' ? "bg-amber-500" : "bg-slate-700"
          )}>
            {currentState.phase}
          </Badge>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table view */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-[#0d4f3c] via-[#0a3d2e] to-[#063223] m-4 rounded-[50%/40%] overflow-hidden">
        {/* Table felt pattern */}
        <div className="absolute inset-4 rounded-[50%/40%] border-2 border-[#1a5c46]/50" />

        {/* Center - Pot and community cards */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {/* Pot */}
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold">
              {currentState.pot.toLocaleString()}
            </span>
          </div>

          {/* Community cards */}
          <div className="flex gap-2">
            {currentState.communityCards.length > 0 ? (
              <CommunityCards cards={currentState.communityCards} size="md" />
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-10 h-14 rounded-lg border border-white/10 bg-white/5" />
              ))
            )}
          </div>
        </div>

        {/* Players */}
        {hand.players.map((player) => {
          const pos = REPLAY_SEAT_POSITIONS[player.seatNumber - 1];
          if (!pos) return null;

          const isFolded = currentState.foldedPlayers.has(player.id);
          const isDealer = player.seatNumber === hand.dealerSeat;
          const isSB = player.seatNumber === hand.smallBlindSeat;
          const isBB = player.seatNumber === hand.bigBlindSeat;
          const isCurrentPlayer = currentState.currentPlayer === player.id;
          const bet = currentState.playerBets[player.id] || 0;
          const stack = currentState.playerStacks[player.id] || 0;
          const isShowdown = currentState.phase === 'showdown';

          return (
            <div
              key={player.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2",
                isFolded && "opacity-40"
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className={cn(
                  "w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center",
                  "border-2",
                  isCurrentPlayer ? "border-green-500 ring-2 ring-green-500/50" :
                  player.isWinner ? "border-amber-500" : "border-slate-600"
                )}>
                  <span className="text-white font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Position badge */}
                {(isDealer || isSB || isBB) && (
                  <div className="absolute -top-1 -right-1">
                    <div className={cn(
                      "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                      isDealer ? "bg-amber-500 text-black" :
                      isBB ? "bg-blue-500 text-white" : "bg-slate-500 text-white"
                    )}>
                      {isDealer ? 'D' : isBB ? 'BB' : 'SB'}
                    </div>
                  </div>
                )}

                {/* Info bar */}
                <div className="mt-1 px-2 py-1 bg-slate-800 rounded text-center min-w-16">
                  <p className="text-[10px] text-white/80 truncate">{player.name}</p>
                  <p className="text-xs font-bold text-amber-400">{stack.toLocaleString()}</p>
                </div>

                {/* Bet */}
                <AnimatePresence>
                  {bet > 0 && !isFolded && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -bottom-6 px-2 py-0.5 bg-black/60 rounded-full"
                    >
                      <span className="text-xs text-white font-medium">{bet}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hole cards */}
                {(isShowdown || showCards[player.id]) && player.holeCards && (
                  <div className="absolute -bottom-10 flex gap-0.5">
                    {player.holeCards.map((card, i) => (
                      <PokerCard key={i} card={card} size="sm" />
                    ))}
                  </div>
                )}

                {/* Winner badge */}
                {player.isWinner && isShowdown && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-6 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded"
                  >
                    +{player.amountWon?.toLocaleString()}
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action log */}
      <div className="mx-4 mb-4 p-3 bg-black/30 rounded-lg max-h-24 overflow-y-auto">
        {currentState.lastAction ? (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-white"
          >
            <span className="text-amber-400 mr-2">[{currentState.phase}]</span>
            {formatAction(currentState.lastAction)}
          </motion.div>
        ) : (
          <p className="text-sm text-white/60">Blinds posted. Action begins...</p>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 w-12">
            {currentStep + 1}/{hand.actions.length}
          </span>
          <Slider
            value={[currentStep]}
            max={hand.actions.length - 1}
            step={1}
            onValueChange={([value]) => setCurrentStep(value)}
            className="flex-1"
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleStepBack}>
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="w-10 h-10"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleStepForward}>
            <SkipForward className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 ml-4">
            {[0.5, 1, 2].map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                className="text-xs px-2"
              >
                {speed}x
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="ml-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
