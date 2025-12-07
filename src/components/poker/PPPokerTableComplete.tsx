import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Settings, Users, Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  createDeck, 
  shuffleDeckSecure, 
  dealToPlayers, 
  dealCards,
  evaluateHand, 
  Card as PokerEngineCard,
  HandEvaluation,
  RANK_NAMES,
} from '@/utils/pokerEngine';
import { cn } from '@/lib/utils';

// PPPoker-style components
import { PPPokerCard } from './PPPokerCard';
import { PPPokerChips, FlyingChips } from './PPPokerChips';
import { PPPokerWinnerDisplay } from './PPPokerWinnerDisplay';
import { 
  AnimatedValue, 
  DealerButton, 
  ActionIndicator, 
  TimerRing,
  WinDistributionAnimation 
} from './PPPokerTableAnimations';
import { useStableState } from '@/hooks/useStableState';

// Types
interface Player {
  id: string;
  name: string;
  avatar?: string;
  stack: number;
  seatNumber: number;
  cards?: string[];
  isDealer?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isTurn?: boolean;
  currentBet?: number;
  lastAction?: string;
  timeBank?: number;
}

interface Winner {
  playerId: string;
  playerName?: string;
  seatNumber: number;
  amount: number;
  handRank?: string;
  cards?: string[];
}

type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

// Helper functions
function cardToString(card: PokerEngineCard): string {
  return `${RANK_NAMES[card.rank]}${card.suit.charAt(0)}`;
}

// Seat positions for 9-max table (PPPoker layout)
const SEAT_POSITIONS = [
  { x: 50, y: 88, angle: 0 },     // Seat 1 (bottom center - hero)
  { x: 15, y: 75, angle: 30 },    // Seat 2
  { x: 5, y: 50, angle: 60 },     // Seat 3
  { x: 15, y: 25, angle: 90 },    // Seat 4
  { x: 35, y: 10, angle: 120 },   // Seat 5
  { x: 65, y: 10, angle: 150 },   // Seat 6
  { x: 85, y: 25, angle: 180 },   // Seat 7
  { x: 95, y: 50, angle: 210 },   // Seat 8
  { x: 85, y: 75, angle: 240 },   // Seat 9
];

// PPPoker-style table felt
const PPPokerTableFelt = memo(function PPPokerTableFelt() {
  return (
    <div className="absolute inset-0">
      {/* Outer frame */}
      <div 
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #2d1810 0%, #1a0f0a 50%, #2d1810 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}
      />
      {/* Inner felt */}
      <div 
        className="absolute inset-[3%] rounded-[50%]"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, #2d7a4a 0%, #1a5a3a 40%, #0d3d28 100%)
          `,
          boxShadow: `
            inset 0 0 100px rgba(0,0,0,0.5),
            inset 0 4px 20px rgba(255,255,255,0.05)
          `
        }}
      >
        {/* Felt texture */}
        <div 
          className="absolute inset-0 rounded-[50%] opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        {/* Center line decoration */}
        <div className="absolute inset-[15%] rounded-[50%] border border-white/5" />
        <div className="absolute inset-[25%] rounded-[50%] border border-white/3" />
      </div>
      {/* Rail */}
      <div 
        className="absolute inset-[-2%] rounded-[50%] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
          border: '8px solid transparent',
          borderImage: 'linear-gradient(180deg, #4a3020 0%, #2d1810 50%, #4a3020 100%) 1'
        }}
      />
    </div>
  );
});

// Player seat component (PPPoker style)
const PPPokerSeat = memo(function PPPokerSeat({
  player,
  position,
  isHero,
  showCards,
  turnTimeRemaining,
  turnDuration = 30
}: {
  player: Player | null;
  position: { x: number; y: number; angle: number };
  isHero: boolean;
  showCards: boolean;
  turnTimeRemaining?: number;
  turnDuration?: number;
}) {
  if (!player) {
    // Empty seat
    return (
      <motion.div
        className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-xs">Sit</span>
        </div>
      </motion.div>
    );
  }

  const isTurn = player.isTurn && !player.isFolded && !player.isAllIn;

  return (
    <motion.div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-10",
        isHero ? "w-20 h-20" : "w-16 h-16"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Turn timer ring */}
      {isTurn && turnTimeRemaining !== undefined && (
        <TimerRing 
          duration={turnDuration} 
          remaining={turnTimeRemaining} 
          size={isHero ? 84 : 68}
        />
      )}

      {/* Avatar container */}
      <div 
        className={cn(
          "relative w-full h-full rounded-full overflow-hidden",
          "border-2 transition-all duration-300",
          player.isFolded && "opacity-50 grayscale",
          player.isAllIn && "ring-2 ring-red-500 ring-offset-2 ring-offset-transparent",
          isTurn ? "border-amber-400 shadow-lg shadow-amber-400/30" : "border-white/30"
        )}
        style={{
          background: player.avatar 
            ? `url(${player.avatar}) center/cover` 
            : `linear-gradient(135deg, hsl(${(player.seatNumber * 40) % 360}, 60%, 40%), hsl(${(player.seatNumber * 40 + 30) % 360}, 60%, 30%))`
        }}
      >
        {!player.avatar && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Dealer button */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-gray-900 text-[10px] font-black flex items-center justify-center shadow-md">
            D
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center min-w-[80px]">
        <div className="text-white text-xs font-medium truncate max-w-[80px]">
          {player.name}
        </div>
        <div className={cn(
          "text-xs font-bold px-2 py-0.5 rounded-full mt-0.5",
          player.isAllIn 
            ? "bg-red-600 text-white" 
            : "bg-black/60 text-amber-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : <AnimatedValue value={player.stack} />}
        </div>
      </div>

      {/* Action badge */}
      <AnimatePresence>
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2"
          >
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg",
              player.lastAction.includes('FOLD') && "bg-gray-600",
              player.lastAction.includes('CHECK') && "bg-blue-600",
              player.lastAction.includes('CALL') && "bg-green-600",
              player.lastAction.includes('RAISE') && "bg-amber-600",
              player.lastAction.includes('ALL-IN') && "bg-red-600"
            )}>
              {player.lastAction}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player cards */}
      {player.cards && player.cards.length > 0 && (
        <div 
          className={cn(
            "absolute flex gap-0.5",
            isHero ? "-top-14 left-1/2 -translate-x-1/2" : "-top-10 left-1/2 -translate-x-1/2"
          )}
        >
          {player.cards.map((card, idx) => (
            <PPPokerCard
              key={idx}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? "md" : "sm"}
              delay={idx}
              isDealing={true}
              isWinning={false}
            />
          ))}
        </div>
      )}

      {/* Current bet */}
      {player.currentBet && player.currentBet > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-full mt-10 left-1/2 -translate-x-1/2"
        >
          <PPPokerChips amount={player.currentBet} size="sm" />
        </motion.div>
      )}
    </motion.div>
  );
}, (prev, next) => {
  // Custom comparison for memoization
  return (
    prev.player?.id === next.player?.id &&
    prev.player?.stack === next.player?.stack &&
    prev.player?.isFolded === next.player?.isFolded &&
    prev.player?.isAllIn === next.player?.isAllIn &&
    prev.player?.isTurn === next.player?.isTurn &&
    prev.player?.currentBet === next.player?.currentBet &&
    prev.player?.lastAction === next.player?.lastAction &&
    prev.showCards === next.showCards &&
    prev.turnTimeRemaining === next.turnTimeRemaining
  );
});

// Community cards display
const PPPokerCommunityCards = memo(function PPPokerCommunityCards({
  cards,
  phase,
  winningCards = []
}: {
  cards: string[];
  phase: GamePhase;
  winningCards?: string[];
}) {
  const placeholders = [0, 1, 2, 3, 4];

  return (
    <div className="flex items-center justify-center gap-1.5">
      {placeholders.map((idx) => {
        const card = cards[idx];
        const isWinning = card && winningCards.includes(card);

        return (
          <div key={idx} className="relative">
            {card ? (
              <PPPokerCard
                card={card}
                size="md"
                delay={idx}
                isDealing={true}
                isWinning={isWinning}
                isHighlighted={isWinning}
              />
            ) : (
              <div 
                className="w-12 h-[68px] rounded-md border border-white/10 bg-white/5"
                style={{
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

// Action panel (PPPoker style)
const PPPokerActionPanel = memo(function PPPokerActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  playerStack,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  playerStack: number;
  onAction: (action: ActionType, amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const presets = useMemo(() => {
    const pot = callAmount * 2; // Simplified pot calculation
    return [
      { label: '1/2', amount: Math.floor(pot * 0.5) },
      { label: '3/4', amount: Math.floor(pot * 0.75) },
      { label: 'Pot', amount: pot },
      { label: '2x', amount: pot * 2 }
    ].filter(p => p.amount <= playerStack && p.amount >= minRaise);
  }, [callAmount, minRaise, playerStack]);

  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent"
    >
      {/* Raise presets */}
      <div className="flex justify-center gap-2 mb-3">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(preset.amount)}
            className={cn(
              "text-xs px-3 py-1 border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
              raiseAmount === preset.amount && "bg-amber-600/30 border-amber-500"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Raise slider */}
      <div className="mx-auto max-w-xs mb-3">
        <input
          type="range"
          min={minRaise}
          max={playerStack}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(45, 93%, 47%) 0%, hsl(45, 93%, 47%) ${((raiseAmount - minRaise) / (playerStack - minRaise)) * 100}%, rgba(255,255,255,0.2) ${((raiseAmount - minRaise) / (playerStack - minRaise)) * 100}%, rgba(255,255,255,0.2) 100%)`
          }}
        />
        <div className="text-center text-amber-400 font-bold text-sm mt-1">
          <AnimatedValue value={raiseAmount} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[100px] h-12 bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl shadow-lg"
        >
          Fold
        </Button>
        
        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[100px] h-12 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg"
          >
            Check
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[100px] h-12 bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-xl shadow-lg"
          >
            <div className="flex flex-col items-center">
              <span>Call</span>
              <span className="text-[10px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[100px] h-12 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg"
        >
          <div className="flex flex-col items-center">
            <span>Raise</span>
            <span className="text-[10px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        {playerStack <= callAmount * 3 && (
          <Button
            onClick={() => onAction('allin')}
            className="flex-1 max-w-[100px] h-12 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl shadow-lg animate-pulse"
          >
            <div className="flex flex-col items-center">
              <span>All-in</span>
              <span className="text-[10px] opacity-80">{playerStack.toLocaleString()}</span>
            </div>
          </Button>
        )}
      </div>
    </motion.div>
  );
});

// Header
const PPPokerHeader = memo(function PPPokerHeader({
  onLeave,
  soundEnabled,
  onToggleSound,
  playerCount,
  blinds,
  tableName
}: {
  onLeave: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playerCount: number;
  blinds: string;
  tableName: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/95 to-gray-900/80 z-20 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onLeave}
        className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="text-center flex-1">
        <h1 className="text-sm font-semibold text-white">{tableName}</h1>
        <div className="flex items-center justify-center gap-2 text-[10px] text-white/60">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {playerCount}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>{blinds}</span>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSound}
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// Main table component
interface PPPokerTableProps {
  tableId?: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerStack?: number;
  onLeave: () => void;
}

export function PPPokerTableComplete({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  playerStack = 10000,
  onLeave
}: PPPokerTableProps) {
  // Stable state for frequently updated values
  const [pot, setPot, setPotImmediate] = useStableState(0, 100);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Game state
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentBet, setCurrentBet] = useState(0);
  const [minRaise, setMinRaise] = useState(40);
  const [myStack, setMyStack] = useState(playerStack);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  
  // UI state
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Refs
  const deckRef = useRef<PokerEngineCard[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize demo players
  useEffect(() => {
    if (!tableId) {
      const demoPlayers: Player[] = [
        { id: playerId || '1', name: playerName, avatar: playerAvatar, stack: myStack, seatNumber: 0, isDealer: true },
        { id: '2', name: 'Viktor_Pro', stack: 15420, seatNumber: 1 },
        { id: '3', name: 'PokerKing', stack: 8750, seatNumber: 3 },
        { id: '4', name: 'LuckyAce', stack: 12300, seatNumber: 5 },
        { id: '5', name: 'CardShark', stack: 9800, seatNumber: 7 },
      ];
      setPlayers(demoPlayers);
    }
  }, [tableId, playerId, playerName, playerAvatar, myStack, setPlayers]);

  // Turn timer
  useEffect(() => {
    if (isMyTurn) {
      setTimeRemaining(30);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAction('fold');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn]);

  // Start new hand
  const startNewHand = useCallback(() => {
    const deck = shuffleDeckSecure(createDeck());
    deckRef.current = deck;
    
    const activePlayers = players.filter(p => p.stack > 0);
    const { playerHands, remainingDeck } = dealToPlayers(deck, activePlayers.length, 2);
    deckRef.current = remainingDeck;
    
    const heroIndex = activePlayers.findIndex(p => p.id === playerId);
    
    setPlayers(players.map((p, idx) => {
      const activeIdx = activePlayers.findIndex(ap => ap.id === p.id);
      return {
        ...p,
        cards: activeIdx >= 0 ? playerHands[activeIdx]?.map(cardToString) : undefined,
        isFolded: false,
        isAllIn: false,
        currentBet: 0,
        lastAction: undefined,
        isTurn: p.id === playerId
      };
    }));
    
    if (heroIndex >= 0) {
      setMyCards(playerHands[heroIndex]?.map(cardToString) || []);
    }
    
    setCommunityCards([]);
    setPotImmediate(30); // Small + Big blind
    setCurrentBet(20);
    setMinRaise(40);
    setGamePhase('preflop');
    setIsMyTurn(true);
    setWinners([]);
    setShowWinner(false);
  }, [players, playerId, setPotImmediate, setPlayers]);

  // Handle player action
  const handleAction = useCallback((action: ActionType, amount?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const myPlayer = players.find(p => p.id === playerId);
    if (!myPlayer) return;

    let betAmount = 0;
    let newStack = myStack;

    switch (action) {
      case 'fold':
        break;
      case 'check':
        break;
      case 'call':
        betAmount = currentBet;
        newStack = myStack - betAmount;
        break;
      case 'raise':
        betAmount = amount || minRaise;
        newStack = myStack - betAmount;
        setCurrentBet(betAmount);
        setMinRaise(betAmount * 2);
        break;
      case 'allin':
        betAmount = myStack;
        newStack = 0;
        break;
    }

    setMyStack(newStack);
    setPot(p => p + betAmount);

    setPlayers(players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          stack: newStack,
          currentBet: betAmount,
          isFolded: action === 'fold',
          isAllIn: action === 'allin',
          lastAction: action.toUpperCase() + (betAmount > 0 ? ` ${betAmount}` : ''),
          isTurn: false
        };
      }
      return { ...p, isTurn: false };
    }));

    setIsMyTurn(false);
    
    // Simulate opponents
    setTimeout(() => simulateOpponents(), 500);
  }, [players, playerId, currentBet, minRaise, myStack, setPot, setPlayers]);

  // Simulate opponent actions
  const simulateOpponents = useCallback(() => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId && !p.isFolded && !p.isAllIn) {
        const actions = ['CALL', 'CHECK', 'FOLD', 'RAISE 60'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        return { 
          ...p, 
          lastAction: randomAction, 
          isFolded: randomAction === 'FOLD',
          currentBet: randomAction.includes('CALL') ? currentBet : randomAction.includes('RAISE') ? 60 : 0
        };
      }
      return p;
    }));
    
    setTimeout(() => advancePhase(), 800);
  }, [playerId, currentBet, setPlayers]);

  // Advance game phase
  const advancePhase = useCallback(() => {
    const deck = deckRef.current.length > 0 ? deckRef.current : shuffleDeckSecure(createDeck());
    
    // Clear last actions
    setPlayers(prev => prev.map(p => ({ ...p, lastAction: undefined, currentBet: 0 })));
    
    switch (gamePhase) {
      case 'preflop':
        const flop = dealCards(deck, 3);
        deckRef.current = flop.remainingDeck;
        setCommunityCards(flop.dealtCards.map(cardToString));
        setGamePhase('flop');
        break;
      case 'flop':
        const turn = dealCards(deck, 1);
        deckRef.current = turn.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(turn.dealtCards[0])]);
        setGamePhase('turn');
        break;
      case 'turn':
        const river = dealCards(deck, 1);
        deckRef.current = river.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(river.dealtCards[0])]);
        setGamePhase('river');
        break;
      case 'river':
        // Determine winner
        const activePlayers = players.filter(p => !p.isFolded);
        if (activePlayers.length > 0) {
          const winnerId = activePlayers[Math.floor(Math.random() * activePlayers.length)].id;
          const winnerPlayer = activePlayers.find(p => p.id === winnerId);
          
          setWinners([{
            playerId: winnerId,
            playerName: winnerPlayer?.name,
            seatNumber: winnerPlayer?.seatNumber || 0,
            amount: pot,
            handRank: 'Two Pair, Aces and Kings',
            cards: winnerPlayer?.cards
          }]);
          setShowWinner(true);
          
          if (winnerId === playerId) {
            setMyStack(prev => prev + pot);
          }
        }
        setGamePhase('showdown');
        return;
    }
    
    setIsMyTurn(true);
  }, [gamePhase, players, playerId, pot, setPlayers]);

  // Handle winner display close
  const handleWinnerClose = useCallback(() => {
    setShowWinner(false);
    // Reset for new hand after delay
    setTimeout(() => {
      setGamePhase('waiting');
      setCommunityCards([]);
      setMyCards([]);
      setPotImmediate(0);
      setCurrentBet(0);
      setPlayers(prev => prev.map(p => ({
        ...p,
        cards: undefined,
        isFolded: false,
        isAllIn: false,
        currentBet: 0,
        lastAction: undefined
      })));
    }, 500);
  }, [setPotImmediate, setPlayers]);

  const canCheck = currentBet === 0 || players.find(p => p.id === playerId)?.currentBet === currentBet;

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <PPPokerHeader
        onLeave={onLeave}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        playerCount={players.filter(p => !p.isFolded).length}
        blinds="10/20"
        tableName="Texas Hold'em"
      />

      {/* Main Table */}
      <div className="flex-1 relative">
        <div className="absolute inset-4 md:inset-8 lg:inset-12">
          {/* Table felt */}
          <PPPokerTableFelt />

          {/* Pot display */}
          <motion.div
            className="absolute top-[28%] left-1/2 -translate-x-1/2 z-20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="flex flex-col items-center gap-2">
              <PPPokerChips amount={pot} size="md" />
              <div className="px-3 py-1 rounded-full bg-black/60 text-amber-400 font-bold text-sm">
                Pot: <AnimatedValue value={pot} />
              </div>
            </div>
          </motion.div>

          {/* Community cards */}
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 z-20">
            <PPPokerCommunityCards 
              cards={communityCards} 
              phase={gamePhase}
            />
          </div>

          {/* Player seats */}
          {SEAT_POSITIONS.map((pos, idx) => {
            const player = players.find(p => p.seatNumber === idx);
            const isHero = player?.id === playerId;
            
            return (
              <PPPokerSeat
                key={idx}
                player={player || null}
                position={pos}
                isHero={isHero}
                showCards={gamePhase === 'showdown'}
                turnTimeRemaining={isHero && isMyTurn ? timeRemaining : undefined}
              />
            );
          })}

          {/* Hero cards (larger display) */}
          {myCards.length > 0 && (
            <motion.div
              className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-30 flex gap-1"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {myCards.map((card, idx) => (
                <PPPokerCard
                  key={idx}
                  card={card}
                  size="lg"
                  delay={idx}
                  isDealing={true}
                />
              ))}
            </motion.div>
          )}

          {/* Start game button */}
          {gamePhase === 'waiting' && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Button
                onClick={startNewHand}
                className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl shadow-xl"
              >
                Start Game
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action panel */}
      <AnimatePresence>
        {isMyTurn && gamePhase !== 'waiting' && gamePhase !== 'showdown' && (
          <PPPokerActionPanel
            isVisible={true}
            canCheck={canCheck}
            callAmount={currentBet}
            minRaise={minRaise}
            maxBet={myStack}
            playerStack={myStack}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>

      {/* Winner display */}
      <AnimatePresence>
        {showWinner && winners.length > 0 && (
          <PPPokerWinnerDisplay
            winners={winners}
            currentPlayerId={playerId || ''}
            onComplete={handleWinnerClose}
            autoHideDuration={4000}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PPPokerTableComplete;
