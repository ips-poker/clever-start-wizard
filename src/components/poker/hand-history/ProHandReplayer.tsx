import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Volume2, VolumeX, X, Coins, Trophy, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MiniCardGroup } from './MiniPokerCard';

// Types
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

interface ProHandReplayerProps {
  hand: HandReplay;
  onClose?: () => void;
  isFullscreen?: boolean;
}

// Professional seat positions (9-max layout)
const SEAT_POSITIONS: Record<number, { x: number; y: number; chipOffset: { x: number; y: number } }> = {
  0: { x: 50, y: 88, chipOffset: { x: 0, y: -45 } },   // Hero bottom center
  1: { x: 18, y: 75, chipOffset: { x: 50, y: -20 } },  // Left bottom
  2: { x: 8, y: 50, chipOffset: { x: 55, y: 0 } },     // Left middle
  3: { x: 18, y: 25, chipOffset: { x: 50, y: 20 } },   // Left top
  4: { x: 35, y: 10, chipOffset: { x: 20, y: 40 } },   // Top left
  5: { x: 65, y: 10, chipOffset: { x: -20, y: 40 } },  // Top right
  6: { x: 82, y: 25, chipOffset: { x: -50, y: 20 } },  // Right top
  7: { x: 92, y: 50, chipOffset: { x: -55, y: 0 } },   // Right middle
  8: { x: 82, y: 75, chipOffset: { x: -50, y: -20 } }, // Right bottom
};

// Action colors
const ACTION_COLORS: Record<string, string> = {
  fold: 'bg-slate-600 text-slate-200',
  check: 'bg-blue-600 text-white',
  call: 'bg-amber-600 text-white',
  bet: 'bg-green-600 text-white',
  raise: 'bg-orange-600 text-white',
  'all-in': 'bg-red-600 text-white animate-pulse'
};

const ACTION_LABELS: Record<string, string> = {
  fold: 'ФОЛД',
  check: 'ЧЕК',
  call: 'КОЛЛ',
  bet: 'СТАВКА',
  raise: 'РЕЙЗ',
  'all-in': 'ОЛЛ-ИН'
};

const PHASE_LABELS: Record<string, string> = {
  preflop: 'ПРЕФЛОП',
  flop: 'ФЛОП',
  turn: 'ТЁРН',
  river: 'РИВЕР',
  showdown: 'ШОУДАУН'
};

export function ProHandReplayer({ hand, onClose, isFullscreen = false }: ProHandReplayerProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = initial state (blinds)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Total steps including initial blinds state
  const totalSteps = hand.actions.length;

  // Calculate state at current step
  const currentState = useMemo(() => {
    const state = {
      phase: 'preflop' as ReplayAction['phase'],
      communityCards: [] as string[],
      pot: hand.smallBlindAmount + hand.bigBlindAmount,
      playerBets: {} as Record<string, number>,
      playerStacks: {} as Record<string, number>,
      foldedPlayers: new Set<string>(),
      allInPlayers: new Set<string>(),
      lastAction: null as ReplayAction | null,
      currentPlayer: null as string | null,
      isShowdown: false
    };

    // Initialize stacks from starting values
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
        state.playerBets[action.playerId] = 0;
      } else if (action.action === 'all-in') {
        state.allInPlayers.add(action.playerId);
        if (action.amount) {
          const currentBet = state.playerBets[action.playerId] || 0;
          const additionalBet = action.amount - currentBet;
          state.playerBets[action.playerId] = action.amount;
          state.playerStacks[action.playerId] = 0;
        }
      } else if (action.amount) {
        const currentBet = state.playerBets[action.playerId] || 0;
        const additionalBet = action.amount - currentBet;
        state.playerBets[action.playerId] = action.amount;
        state.playerStacks[action.playerId] -= additionalBet;
      }

      // Check for showdown
      if (action.phase === 'showdown') {
        state.isShowdown = true;
      }
    }

    // Determine next player
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
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalSteps]);

  // Sound effects
  useEffect(() => {
    if (isMuted || currentStep < 0) return;
    
    // Play sound based on action type
    const action = hand.actions[currentStep];
    if (!action) return;

    // Could integrate with existing sound system here
  }, [currentStep, isMuted, hand.actions]);

  const handleStepBack = () => {
    setCurrentStep(prev => Math.max(-1, prev - 1));
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentStep(-1);
    setIsPlaying(false);
  };

  const handleSliderChange = (value: number[]) => {
    setCurrentStep(value[0] - 1);
    setIsPlaying(false);
  };

  return (
    <div className={cn(
      "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-xl overflow-hidden flex flex-col",
      isFullscreen ? "fixed inset-4 z-50" : "relative h-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-bold text-lg">
            Hand #{hand.handNumber}
          </h3>
          <Badge variant="outline" className="text-xs border-white/20 text-white/70">
            {new Date(hand.timestamp).toLocaleString('ru-RU')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={cn(
            "text-xs font-bold uppercase tracking-wide",
            currentState.isShowdown 
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black" 
              : "bg-slate-700"
          )}>
            {PHASE_LABELS[currentState.phase]}
          </Badge>
          
          <div className="flex items-center gap-1 text-white/70 text-sm">
            <Users className="w-4 h-4" />
            {hand.players.length}
          </div>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Table View */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div 
          className="relative w-full h-full rounded-[50%/40%] overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #0d5a3c 0%, #094d32 50%, #063d28 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)'
          }}
        >
          {/* Felt pattern overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.2) 100%)'
            }}
          />
          
          {/* Table rail */}
          <div className="absolute inset-3 rounded-[50%/40%] border-2 border-[#2a7a56]/40" />
          <div className="absolute inset-5 rounded-[50%/40%] border border-[#1a5a3e]/30" />

          {/* Center: Pot and Community Cards */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {/* Pot Display */}
            <motion.div 
              className="flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10"
              animate={{ scale: currentState.lastAction ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="text-white font-bold text-xl tabular-nums">
                {currentState.pot.toLocaleString()}
              </span>
            </motion.div>

            {/* Community Cards */}
            <div className="flex gap-2 min-h-16">
              <AnimatePresence mode="popLayout">
                {currentState.communityCards.length > 0 ? (
                  currentState.communityCards.map((card, i) => (
                    <motion.div
                      key={`${card}-${i}`}
                      initial={{ opacity: 0, y: -30, rotateY: 180 }}
                      animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: i * 0.1,
                        type: 'spring',
                        stiffness: 200
                      }}
                    >
                      <CommunityCard card={card} index={i} />
                    </motion.div>
                  ))
                ) : (
                  // Placeholder cards
                  [...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-12 h-[68px] rounded-lg border border-white/10 bg-white/5"
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Players */}
          {hand.players.map((player) => {
            const seatIndex = player.seatNumber % 9;
            const pos = SEAT_POSITIONS[seatIndex];
            if (!pos) return null;

            const isFolded = currentState.foldedPlayers.has(player.id);
            const isAllIn = currentState.allInPlayers.has(player.id);
            const isDealer = player.seatNumber === hand.dealerSeat;
            const isSB = player.seatNumber === hand.smallBlindSeat;
            const isBB = player.seatNumber === hand.bigBlindSeat;
            const isCurrentPlayer = currentState.currentPlayer === player.id;
            const isLastActor = currentState.lastAction?.playerId === player.id;
            const bet = currentState.playerBets[player.id] || 0;
            const stack = currentState.playerStacks[player.id] ?? 0;
            const isWinner = player.isWinner && currentState.isShowdown;
            const showCards = currentState.isShowdown || showAllCards;

            return (
              <div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {/* Player Container */}
                <motion.div 
                  className={cn(
                    "flex flex-col items-center transition-opacity duration-300",
                    isFolded && "opacity-40"
                  )}
                  animate={isWinner ? {
                    scale: [1, 1.1, 1],
                    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 }
                  } : {}}
                >
                  {/* Avatar with Timer Ring */}
                  <div className="relative">
                    <motion.div
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg",
                        "border-3 transition-all duration-300",
                        isCurrentPlayer ? "border-green-400 ring-4 ring-green-400/30" :
                        isWinner ? "border-amber-400 ring-4 ring-amber-400/30" :
                        isAllIn ? "border-red-500" :
                        "border-slate-600"
                      )}
                      style={{
                        background: isWinner 
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                          : 'linear-gradient(135deg, #374151, #1f2937)'
                      }}
                      animate={isLastActor ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </motion.div>

                    {/* Position Badge (D/SB/BB) */}
                    {(isDealer || isSB || isBB) && (
                      <div className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold",
                        "flex items-center justify-center shadow-lg",
                        isDealer ? "bg-amber-500 text-black" :
                        isBB ? "bg-blue-500 text-white" : "bg-slate-500 text-white"
                      )}>
                        {isDealer ? 'D' : isBB ? 'BB' : 'SB'}
                      </div>
                    )}

                    {/* All-in Badge */}
                    {isAllIn && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded"
                      >
                        ALL-IN
                      </motion.div>
                    )}
                  </div>

                  {/* Name & Stack */}
                  <div className={cn(
                    "mt-1 px-2 py-1 rounded text-center min-w-20",
                    "bg-black/60 backdrop-blur-sm border border-white/10"
                  )}>
                    <p className="text-[11px] text-white/80 truncate max-w-20">{player.name}</p>
                    <p className={cn(
                      "text-sm font-bold tabular-nums",
                      stack === 0 ? "text-red-400" : "text-amber-400"
                    )}>
                      {stack.toLocaleString()}
                    </p>
                  </div>

                  {/* Hole Cards */}
                  <AnimatePresence>
                    {showCards && player.holeCards && player.holeCards.length > 0 && !isFolded && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -bottom-12 flex gap-0.5"
                      >
                        <MiniCardGroup cards={player.holeCards} size="xs" overlap={false} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Winner Amount */}
                  {isWinner && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute -top-8 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold rounded shadow-lg"
                    >
                      <Trophy className="w-3 h-3 inline mr-1" />
                      +{player.amountWon?.toLocaleString()}
                    </motion.div>
                  )}
                </motion.div>

                {/* Bet Chips */}
                <AnimatePresence>
                  {bet > 0 && !isFolded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0, y: -20 }}
                      className="absolute px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full border border-white/20"
                      style={{
                        left: `${50 + pos.chipOffset.x}%`,
                        top: `${50 + pos.chipOffset.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <span className="text-xs text-white font-medium tabular-nums">
                        {bet.toLocaleString()}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Last Action Bubble */}
                <AnimatePresence>
                  {isLastActor && currentState.lastAction && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className={cn(
                        "absolute -top-14 left-1/2 -translate-x-1/2",
                        "px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg",
                        ACTION_COLORS[currentState.lastAction.action]
                      )}
                    >
                      {ACTION_LABELS[currentState.lastAction.action]}
                      {currentState.lastAction.amount && currentState.lastAction.action !== 'fold' && (
                        <span className="ml-1">{currentState.lastAction.amount.toLocaleString()}</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Log */}
      <div className="mx-4 mb-3 p-3 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
        <AnimatePresence mode="wait">
          {currentStep >= 0 && currentState.lastAction ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3"
            >
              <Badge variant="outline" className="text-[10px] border-white/20">
                {PHASE_LABELS[currentState.lastAction.phase]}
              </Badge>
              <span className="text-white font-medium">
                {hand.players.find(p => p.id === currentState.lastAction!.playerId)?.name || 'Игрок'}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold",
                ACTION_COLORS[currentState.lastAction.action]
              )}>
                {ACTION_LABELS[currentState.lastAction.action]}
                {currentState.lastAction.amount && ` ${currentState.lastAction.amount}`}
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/60 text-sm"
            >
              Блайнды поставлены. Нажмите Play для воспроизведения...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/10 space-y-4 shrink-0 bg-black/30">
        {/* Progress Slider */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60 w-16 text-center tabular-nums">
            {currentStep + 1}/{totalSteps}
          </span>
          <Slider
            value={[currentStep + 1]}
            min={0}
            max={totalSteps}
            step={1}
            onValueChange={handleSliderChange}
            className="flex-1"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleReset} className="text-white/70 hover:text-white">
            <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleStepBack} className="text-white/70 hover:text-white">
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full",
              isPlaying 
                ? "bg-amber-500 hover:bg-amber-600" 
                : "bg-green-500 hover:bg-green-600"
            )}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleStepForward} className="text-white/70 hover:text-white">
            <SkipForward className="w-5 h-5" />
          </Button>

          {/* Speed Controls */}
          <div className="flex items-center gap-1 ml-4 bg-white/10 rounded-lg p-1">
            {[0.5, 1, 2, 3].map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  "h-7 px-2 text-xs",
                  playbackSpeed === speed ? "bg-white/20" : "text-white/60 hover:text-white"
                )}
              >
                {speed}x
              </Button>
            ))}
          </div>

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/70 hover:text-white ml-2"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          {/* Show All Cards Toggle */}
          <Button
            variant={showAllCards ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowAllCards(!showAllCards)}
            className={cn(
              "text-xs ml-2",
              showAllCards ? "bg-white/20" : "text-white/60"
            )}
          >
            Показать карты
          </Button>
        </div>
      </div>
    </div>
  );
}

// Community Card Component with realistic styling
function CommunityCard({ card, index }: { card: string; index: number }) {
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  
  const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
  const suitColors: Record<string, string> = { 
    h: 'text-red-500', 
    d: 'text-blue-500', 
    c: 'text-emerald-600', 
    s: 'text-slate-800' 
  };

  return (
    <div 
      className="w-12 h-[68px] bg-white rounded-lg shadow-lg flex flex-col items-center justify-center"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      <span className={cn('text-lg font-bold leading-none', suitColors[suit])}>
        {rank}
      </span>
      <span className={cn('text-xl leading-none', suitColors[suit])}>
        {suitSymbols[suit]}
      </span>
    </div>
  );
}

// Export is declared with the function definition above
