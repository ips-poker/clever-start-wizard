import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, Users, Loader2, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Poker engine
import { 
  createDeck, 
  shuffleDeckSecure, 
  dealToPlayers, 
  dealCards,
  evaluateHand,
  Card as PokerEngineCard,
  RANK_NAMES
} from '@/utils/pokerEngine';

// Hooks
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { useReconnectManager } from '@/hooks/useReconnectManager';

// Error handling
import { PokerErrorBoundary } from '@/components/poker/PokerErrorBoundary';
import { ConnectionStatusBanner } from '@/components/poker/ConnectionStatusBanner';

// Helper
function cardToString(card: PokerEngineCard): string {
  const suitChar = card.suit.charAt(0).toLowerCase();
  return `${RANK_NAMES[card.rank]}${suitChar}`;
}

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
}

type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// PPPoker-style seat positions for mobile (6-max)
const SEAT_POSITIONS = [
  { x: 50, y: 88 },   // Hero - bottom center
  { x: 10, y: 62 },   // Left bottom
  { x: 10, y: 30 },   // Left top
  { x: 50, y: 10 },   // Top center
  { x: 90, y: 30 },   // Right top
  { x: 90, y: 62 },   // Right bottom
];

// ============= CARD COMPONENT =============
const TelegramCard = memo(function TelegramCard({
  card,
  faceDown = false,
  size = 'sm',
  delay = 0
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md';
  delay?: number;
}) {
  const sizeClasses = {
    xs: 'w-6 h-8 text-[8px]',
    sm: 'w-7 h-10 text-[9px]',
    md: 'w-9 h-13 text-[11px]'
  };

  const getSuitSymbol = (suit: string) => {
    const suits: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    return suits[suit.toLowerCase()] || suit;
  };

  const isRed = (suit: string) => ['h', 'd'].includes(suit.toLowerCase());

  if (faceDown) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: delay * 0.08 }}
        className={cn(
          sizeClasses[size],
          "rounded bg-gradient-to-br from-blue-800 to-blue-950",
          "border border-blue-600 shadow-md flex items-center justify-center"
        )}
      >
        <div className="w-1/2 h-1/2 rounded-sm border border-blue-400/30" />
      </motion.div>
    );
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: delay * 0.06 }}
      className={cn(
        sizeClasses[size],
        "rounded bg-white shadow-lg border border-gray-200",
        "flex flex-col items-center justify-center font-bold",
        isRed(suit) ? "text-red-500" : "text-gray-900"
      )}
    >
      <span className="leading-none">{rank}</span>
      <span className="leading-none">{getSuitSymbol(suit)}</span>
    </motion.div>
  );
});

// ============= TIMER RING =============
const TimerRing = memo(function TimerRing({ 
  remaining, 
  total, 
  size = 48 
}: { 
  remaining: number; 
  total: number; 
  size?: number;
}) {
  const progress = Math.max(0, remaining / total);
  const circumference = 2 * Math.PI * (size / 2 - 2);
  const offset = circumference * (1 - progress);
  const isWarning = progress < 0.25;

  return (
    <svg 
      className="absolute inset-0"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 2}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 2}
        fill="none"
        stroke={isWarning ? "#ef4444" : "#22c55e"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn("transition-all duration-500", isWarning && "animate-pulse")}
      />
    </svg>
  );
});

// ============= PLAYER SEAT =============
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  isHero,
  showCards,
  isDealer,
  isSB,
  isBB,
  isCurrentTurn,
  turnTimeRemaining,
  turnDuration = 30
}: {
  player: Player | null;
  position: { x: number; y: number };
  isHero: boolean;
  showCards: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isCurrentTurn: boolean;
  turnTimeRemaining?: number;
  turnDuration?: number;
}) {
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 
                        flex items-center justify-center text-white/30 text-xs">
          +
        </div>
      </div>
    );
  }

  const avatarSize = isHero ? 'w-12 h-12' : 'w-10 h-10';
  const showTimer = isCurrentTurn && !player.isFolded && !player.isAllIn;

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-10",
        isHero && "z-20"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {/* Cards */}
      {player.cards && player.cards.length > 0 && !player.isFolded && (
        <div className={cn(
          "absolute flex gap-0.5 z-5",
          isHero ? "-top-12 left-1/2 -translate-x-1/2" : "-top-9 left-1/2 -translate-x-1/2"
        )}>
          {player.cards.map((card, idx) => (
            <TelegramCard
              key={`${card}-${idx}`}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? 'sm' : 'xs'}
              delay={idx}
            />
          ))}
        </div>
      )}

      {/* Timer ring */}
      {showTimer && turnTimeRemaining !== undefined && (
        <TimerRing 
          remaining={turnTimeRemaining} 
          total={turnDuration} 
          size={isHero ? 52 : 44}
        />
      )}

      {/* Avatar */}
      <div className={cn(
        avatarSize,
        "relative rounded-full overflow-hidden border-2 transition-all",
        player.isFolded && "opacity-40 grayscale",
        player.isAllIn && "ring-2 ring-red-500",
        isCurrentTurn && !player.isFolded 
          ? "border-amber-400 shadow-lg shadow-amber-400/30" 
          : "border-white/30"
      )}>
        <div 
          className="absolute inset-0"
          style={{
            background: player.avatar 
              ? `url(${player.avatar}) center/cover` 
              : `linear-gradient(135deg, hsl(${player.seatNumber * 50}, 50%, 35%), hsl(${player.seatNumber * 50 + 30}, 50%, 25%))`
          }}
        />
        {!player.avatar && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[7px] text-white/70">FOLD</span>
          </div>
        )}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white 
                        text-gray-900 text-[7px] font-black flex items-center justify-center shadow">
          D
        </div>
      )}

      {/* SB/BB */}
      {(isSB || isBB) && (
        <div className={cn(
          "absolute -bottom-1 -left-1 w-4 h-4 rounded-full text-white text-[6px] font-bold",
          "flex items-center justify-center",
          isBB ? "bg-amber-500" : "bg-blue-500"
        )}>
          {isBB ? 'BB' : 'SB'}
        </div>
      )}

      {/* Name & Stack */}
      <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 text-center min-w-[50px]">
        <div className="text-white text-[8px] font-medium truncate max-w-[60px]">
          {isHero ? 'Вы' : player.name}
        </div>
        <div className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block",
          player.isAllIn ? "bg-red-600 text-white" : "bg-black/60 text-amber-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </div>
      </div>

      {/* Current bet */}
      {player.currentBet && player.currentBet > 0 && (
        <div className="absolute top-[80%] left-1/2 -translate-x-1/2">
          <div className="bg-black/70 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-amber-400 text-[8px] font-bold">{player.currentBet}</span>
          </div>
        </div>
      )}

      {/* Action badge */}
      {player.lastAction && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute -bottom-5 left-1/2 -translate-x-1/2",
            "px-1.5 py-0.5 rounded-full text-white text-[7px] font-bold uppercase",
            player.lastAction === 'fold' && "bg-gray-600",
            player.lastAction === 'check' && "bg-blue-600",
            player.lastAction === 'call' && "bg-green-600",
            player.lastAction === 'raise' && "bg-amber-600",
            player.lastAction === 'allin' && "bg-red-600"
          )}
        >
          {player.lastAction}
        </motion.div>
      )}
    </div>
  );
});

// ============= TABLE FELT =============
const TableFelt = memo(function TableFelt() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gray-900" />
      <div 
        className="absolute inset-[4%] rounded-[45%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, #2d8a52 0%, #1e6b3d 50%, #145530 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 15px 40px rgba(0,0,0,0.7)'
        }}
      >
        <div className="absolute inset-0 rounded-[45%] opacity-25"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />
        <div className="absolute inset-[15%] rounded-[50%] border border-white/5" />
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS =============
const CommunityCards = memo(function CommunityCards({
  cards,
  phase
}: {
  cards: string[];
  phase: GamePhase;
}) {
  const visibleCount = useMemo(() => {
    switch (phase) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  }, [phase]);

  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((idx) => {
        const card = cards[idx];
        const isVisible = idx < visibleCount;

        return (
          <div key={idx}>
            {isVisible && card ? (
              <TelegramCard card={card} size="sm" delay={idx} />
            ) : (
              <div className="w-7 h-10 rounded border border-white/10 bg-black/20" />
            )}
          </div>
        );
      })}
    </div>
  );
});

// ============= ACTION PANEL =============
const ActionPanel = memo(function ActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, callAmount * 2));
  }, [minRaise, callAmount]);

  if (!isVisible) return null;

  const presets = [
    { label: '½', amount: Math.floor(pot / 2) },
    { label: 'Pot', amount: pot },
    { label: '2x', amount: callAmount * 2 },
  ].filter(p => p.amount >= minRaise && p.amount <= maxBet);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-gray-950 via-gray-900/98 to-transparent"
    >
      {/* Presets */}
      <div className="flex justify-center gap-1 mb-2">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(p.amount)}
            className={cn(
              "h-6 text-[9px] px-2 border-white/20 bg-white/5 text-white/80",
              raiseAmount === p.amount && "bg-amber-600/30 border-amber-500"
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="mx-auto max-w-[250px] mb-2">
        <input
          type="range"
          min={minRaise}
          max={maxBet}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/20 cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-amber-500"
        />
        <div className="text-center text-amber-400 font-bold text-sm mt-0.5">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-1.5">
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[60px] h-10 bg-gradient-to-b from-red-600 to-red-700 
                     text-white font-bold text-[10px] rounded-lg"
        >
          Фолд
        </Button>

        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[60px] h-10 bg-gradient-to-b from-blue-600 to-blue-700 
                       text-white font-bold text-[10px] rounded-lg"
          >
            Чек
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[70px] h-10 bg-gradient-to-b from-green-600 to-green-700 
                       text-white font-bold text-[10px] rounded-lg"
          >
            <div className="flex flex-col items-center leading-tight">
              <span>Колл</span>
              <span className="text-[8px] opacity-80">{callAmount}</span>
            </div>
          </Button>
        )}

        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[70px] h-10 bg-gradient-to-b from-amber-600 to-amber-700 
                     text-white font-bold text-[10px] rounded-lg"
        >
          <div className="flex flex-col items-center leading-tight">
            <span>Рейз</span>
            <span className="text-[8px] opacity-80">{raiseAmount}</span>
          </div>
        </Button>

        <Button
          onClick={() => onAction('allin')}
          className="flex-1 max-w-[60px] h-10 bg-gradient-to-b from-purple-600 to-purple-700 
                     text-white font-bold text-[10px] rounded-lg"
        >
          All-in
        </Button>
      </div>
    </motion.div>
  );
});

// ============= MAIN COMPONENT =============
interface TelegramMobilePokerTableProps {
  tableId?: string;
  playerId?: string;
  playerName?: string;
  initialStack?: number;
  onLeave?: () => void;
  isDemoMode?: boolean;
}

export function TelegramMobilePokerTable({
  tableId = 'demo-table',
  playerId = 'hero',
  playerName = 'Вы',
  initialStack = 10000,
  onLeave,
  isDemoMode = true
}: TelegramMobilePokerTableProps) {
  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [dealerSeat, setDealerSeat] = useState(0);
  const [currentPlayerSeat, setCurrentPlayerSeat] = useState<number | null>(null);
  const [currentBet, setCurrentBet] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);

  const deckRef = useRef<PokerEngineCard[]>([]);
  const sounds = usePokerSounds();
  
  const SB = 10;
  const BB = 20;

  // Initialize demo players
  useEffect(() => {
    if (isDemoMode) {
      const demoPlayers: Player[] = [
        { id: playerId, name: playerName, stack: initialStack, seatNumber: 0 },
        { id: 'bot-1', name: 'Alex', stack: 8500, seatNumber: 1 },
        { id: 'bot-2', name: 'Maria', stack: 12000, seatNumber: 2 },
        { id: 'bot-3', name: 'John', stack: 9500, seatNumber: 3 },
        { id: 'bot-4', name: 'Lisa', stack: 11000, seatNumber: 4 },
        { id: 'bot-5', name: 'Mike', stack: 7800, seatNumber: 5 },
      ];
      setPlayers(demoPlayers);
      setIsConnected(true);
    }
  }, [isDemoMode, playerId, playerName, initialStack]);

  // Sound effects
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Turn timer
  useEffect(() => {
    const hero = players.find(p => p.id === playerId);
    if (hero && currentPlayerSeat === hero.seatNumber && phase !== 'waiting' && phase !== 'showdown') {
      setTurnTimeRemaining(30);
      const interval = setInterval(() => {
        setTurnTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            // Auto-fold on timeout
            handleAction('fold');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTurnTimeRemaining(null);
    }
  }, [currentPlayerSeat, phase, players, playerId]);

  // Start new hand
  const startNewHand = useCallback(() => {
    if (players.length < 2) return;

    // Reset players
    const resetPlayers = players.map(p => ({
      ...p,
      cards: undefined,
      isFolded: false,
      isAllIn: false,
      isTurn: false,
      currentBet: 0,
      lastAction: undefined
    }));

    // Create and shuffle deck
    deckRef.current = shuffleDeckSecure(createDeck());

    // Deal cards
    const dealtResult = dealToPlayers(deckRef.current, resetPlayers.length, 2);
    const dealtCards = dealtResult.playerHands;
    const playersWithCards = resetPlayers.map((p, i) => ({
      ...p,
      cards: dealtCards[i].map(cardToString),
      isDealer: p.seatNumber === dealerSeat
    }));

    // Post blinds
    const sbSeat = (dealerSeat + 1) % players.length;
    const bbSeat = (dealerSeat + 2) % players.length;

    playersWithCards[sbSeat].stack -= SB;
    playersWithCards[sbSeat].currentBet = SB;
    playersWithCards[bbSeat].stack -= BB;
    playersWithCards[bbSeat].currentBet = BB;

    const firstToAct = (dealerSeat + 3) % players.length;
    playersWithCards[firstToAct].isTurn = true;

    setPlayers(playersWithCards);
    setCommunityCards([]);
    setPot(SB + BB);
    setCurrentBet(BB);
    setCurrentPlayerSeat(firstToAct);
    setPhase('preflop');

    sounds.playDeal();
  }, [players, dealerSeat, sounds]);

  // Handle player action
  const handleAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => {
    const heroIdx = players.findIndex(p => p.id === playerId);
    if (heroIdx === -1 || currentPlayerSeat !== players[heroIdx].seatNumber) return;

    const updatedPlayers = [...players];
    const hero = { ...updatedPlayers[heroIdx] };

    switch (action) {
      case 'fold':
        hero.isFolded = true;
        hero.lastAction = 'fold';
        sounds.playFold();
        break;
      case 'check':
        hero.lastAction = 'check';
        sounds.playCheck();
        break;
      case 'call':
        const callAmt = currentBet - (hero.currentBet || 0);
        hero.stack -= callAmt;
        hero.currentBet = currentBet;
        hero.lastAction = 'call';
        setPot(p => p + callAmt);
        sounds.playCall();
        break;
      case 'raise':
        const raiseAmt = (amount || currentBet * 2) - (hero.currentBet || 0);
        hero.stack -= raiseAmt;
        hero.currentBet = (hero.currentBet || 0) + raiseAmt;
        setCurrentBet(hero.currentBet);
        hero.lastAction = 'raise';
        setPot(p => p + raiseAmt);
        sounds.playRaise();
        break;
      case 'allin':
        const allinAmt = hero.stack;
        hero.currentBet = (hero.currentBet || 0) + allinAmt;
        if (hero.currentBet > currentBet) setCurrentBet(hero.currentBet);
        hero.stack = 0;
        hero.isAllIn = true;
        hero.lastAction = 'allin';
        setPot(p => p + allinAmt);
        sounds.playAllIn();
        break;
    }

    hero.isTurn = false;
    updatedPlayers[heroIdx] = hero;
    setPlayers(updatedPlayers);

    // Move to next player or phase
    setTimeout(() => advanceGame(updatedPlayers), 500);
  }, [players, playerId, currentPlayerSeat, currentBet, sounds]);

  // Advance game
  const advanceGame = useCallback((currentPlayers: Player[]) => {
    const activePlayers = currentPlayers.filter(p => !p.isFolded && !p.isAllIn);
    
    if (activePlayers.length <= 1) {
      // Winner found
      const winner = currentPlayers.find(p => !p.isFolded);
      if (winner) {
        const updatedPlayers = currentPlayers.map(p => 
          p.id === winner.id ? { ...p, stack: p.stack + pot } : p
        );
        setPlayers(updatedPlayers);
        setPhase('showdown');
        sounds.playWin();
        
        // Start next hand after delay
        setTimeout(() => {
          setDealerSeat(d => (d + 1) % currentPlayers.length);
          setPhase('waiting');
        }, 3000);
      }
      return;
    }

    // Find next player
    const currentIdx = currentPlayers.findIndex(p => p.seatNumber === currentPlayerSeat);
    let nextIdx = (currentIdx + 1) % currentPlayers.length;
    let attempts = 0;

    while (attempts < currentPlayers.length) {
      if (!currentPlayers[nextIdx].isFolded && !currentPlayers[nextIdx].isAllIn) {
        break;
      }
      nextIdx = (nextIdx + 1) % currentPlayers.length;
      attempts++;
    }

    // Check if round is complete
    const allMatched = activePlayers.every(p => 
      (p.currentBet || 0) === currentBet || p.isAllIn
    );

    if (allMatched && nextIdx === currentIdx) {
      // Advance phase
      advancePhase(currentPlayers);
    } else {
      // Bot action simulation
      if (currentPlayers[nextIdx].id !== playerId) {
        setCurrentPlayerSeat(currentPlayers[nextIdx].seatNumber);
        
        setTimeout(() => {
          const botPlayers = [...currentPlayers];
          const bot = { ...botPlayers[nextIdx] };
          
          // Simple bot logic
          const rand = Math.random();
          if (rand < 0.3) {
            bot.isFolded = true;
            bot.lastAction = 'fold';
          } else if (rand < 0.7 && (bot.currentBet || 0) === currentBet) {
            bot.lastAction = 'check';
          } else {
            const callAmt = currentBet - (bot.currentBet || 0);
            bot.stack -= callAmt;
            bot.currentBet = currentBet;
            bot.lastAction = 'call';
            setPot(p => p + callAmt);
          }
          
          botPlayers[nextIdx] = bot;
          setPlayers(botPlayers);
          
          setTimeout(() => advanceGame(botPlayers), 300);
        }, 800);
      } else {
        setCurrentPlayerSeat(currentPlayers[nextIdx].seatNumber);
      }
    }
  }, [currentPlayerSeat, currentBet, pot, playerId, sounds]);

  // Advance phase
  const advancePhase = useCallback((currentPlayers: Player[]) => {
    const burnAndDeal = (count: number) => {
      deckRef.current.shift(); // Burn
      const dealt = dealCards(deckRef.current, count);
      return dealt.dealtCards.map(cardToString);
    };

    // Reset bets for new round
    const resetPlayers = currentPlayers.map(p => ({
      ...p,
      currentBet: 0,
      lastAction: undefined
    }));
    setCurrentBet(0);

    if (phase === 'preflop') {
      setCommunityCards(burnAndDeal(3));
      setPhase('flop');
      sounds.playDeal();
    } else if (phase === 'flop') {
      setCommunityCards(prev => [...prev, ...burnAndDeal(1)]);
      setPhase('turn');
      sounds.playDeal();
    } else if (phase === 'turn') {
      setCommunityCards(prev => [...prev, ...burnAndDeal(1)]);
      setPhase('river');
      sounds.playDeal();
    } else if (phase === 'river') {
      // Showdown
      setPhase('showdown');
      sounds.playWin();
      
      setTimeout(() => {
        setDealerSeat(d => (d + 1) % currentPlayers.length);
        setPhase('waiting');
      }, 4000);
      return;
    }

    // First to act after flop is left of dealer
    const firstToAct = (dealerSeat + 1) % resetPlayers.length;
    setPlayers(resetPlayers);
    setCurrentPlayerSeat(firstToAct);
    
    // If first player is bot, simulate action
    if (resetPlayers[firstToAct].id !== playerId) {
      setTimeout(() => advanceGame(resetPlayers), 600);
    }
  }, [phase, dealerSeat, playerId, sounds]);

  // Computed values
  const heroPlayer = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);
  const isMyTurn = heroPlayer && currentPlayerSeat === heroPlayer.seatNumber && phase !== 'waiting' && phase !== 'showdown';
  const canCheck = (heroPlayer?.currentBet || 0) >= currentBet;

  // Reconnect manager (for real mode)
  const reconnectManager = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    onReconnect: () => setIsConnected(true),
    onMaxRetriesReached: () => console.log('Max retries')
  });

  return (
    <PokerErrorBoundary onReset={() => window.location.reload()} onGoHome={onLeave}>
      <div className="relative w-full min-h-[420px] bg-gray-950 rounded-xl overflow-hidden">
        {/* Connection status */}
        {!isDemoMode && (
          <ConnectionStatusBanner
            status={reconnectManager.status}
            retryCount={reconnectManager.retryCount}
            nextRetryIn={reconnectManager.nextRetryIn}
            onReconnectNow={reconnectManager.reconnectNow}
            onCancel={reconnectManager.cancelReconnect}
          />
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className="h-7 text-white/70 hover:text-white hover:bg-white/10 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Выйти
          </Button>
          
          <div className="flex items-center gap-1.5 text-[10px] text-white/60">
            <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
            {SB}/{BB}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Table */}
        <div className="relative w-full aspect-[4/3]">
          <TableFelt />

          {/* Pot */}
          {pot > 0 && (
            <div className="absolute left-1/2 top-[28%] -translate-x-1/2 z-10">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-amber-700 -ml-1 first:ml-0"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                    />
                  ))}
                </div>
                <span className="bg-black/60 rounded-full px-2 py-0.5 text-amber-400 font-bold text-[10px]">
                  Pot: {pot.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Blinds info */}
          {phase !== 'waiting' && (
            <div className="absolute left-1/2 top-[55%] -translate-x-1/2 z-10">
              <span className="text-white/40 text-[9px]">Блайнды: {SB}/{BB}</span>
            </div>
          )}

          {/* Community cards */}
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-10">
            <CommunityCards cards={communityCards} phase={phase} />
          </div>

          {/* Players */}
          {players.map((player, idx) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={SEAT_POSITIONS[idx]}
              isHero={player.id === playerId}
              showCards={phase === 'showdown'}
              isDealer={idx === dealerSeat}
              isSB={idx === (dealerSeat + 1) % players.length}
              isBB={idx === (dealerSeat + 2) % players.length}
              isCurrentTurn={currentPlayerSeat === player.seatNumber}
              turnTimeRemaining={player.id === playerId ? turnTimeRemaining || undefined : undefined}
            />
          ))}

          {/* Phase indicator */}
          {phase !== 'waiting' && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
              <span className="px-2 py-0.5 rounded-full bg-black/50 text-white/60 text-[9px] uppercase">
                {phase}
              </span>
            </div>
          )}

          {/* Waiting overlay */}
          {phase === 'waiting' && players.length >= 2 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
              <Button 
                onClick={startNewHand}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Начать раздачу
              </Button>
            </div>
          )}
        </div>

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && heroPlayer && (
            <ActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={currentBet - (heroPlayer.currentBet || 0)}
              minRaise={currentBet * 2}
              maxBet={heroPlayer.stack}
              pot={pot}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>
      </div>
    </PokerErrorBoundary>
  );
}

// Re-export with old name for compatibility
export const TelegramStablePokerTable = TelegramMobilePokerTable;
export default TelegramMobilePokerTable;
