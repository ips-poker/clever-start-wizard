// ==========================================
// ULTIMATE PPPOKER TABLE - NO FLICKER VERSION
// ==========================================
// Professional poker table with stable rendering
// Optimized for smooth 60fps performance

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { usePokerTimer } from '@/hooks/usePokerTimer';

// ============= TYPES =============
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  seatNumber: number;
  stack: number;
  cards: string[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer?: boolean;
  lastAction?: { type: string; amount?: number };
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface UltimatePPPokerTableProps {
  tableId: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  balance: number;
  onLeave: () => void;
}

// ============= SEAT POSITIONS (6-MAX) =============
const SEAT_POSITIONS = [
  { x: 50, y: 88, label: 'hero' },     // Seat 0 - Hero (bottom)
  { x: 8, y: 62, label: 'left-bot' },  // Seat 1
  { x: 8, y: 28, label: 'left-top' },  // Seat 2
  { x: 50, y: 8, label: 'top' },       // Seat 3
  { x: 92, y: 28, label: 'right-top' }, // Seat 4
  { x: 92, y: 62, label: 'right-bot' }, // Seat 5
];

// ============= STABLE CARD COMPONENT =============
const StableCard = memo(function StableCard({
  card,
  faceDown = false,
  size = 'md',
  index = 0,
  isWinner = false
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  index?: number;
  isWinner?: boolean;
}) {
  const sizeMap = {
    xs: 'w-6 h-9 text-[8px]',
    sm: 'w-8 h-11 text-[10px]',
    md: 'w-10 h-14 text-xs',
    lg: 'w-12 h-16 text-sm'
  };

  const getSuitSymbol = (s: string) => {
    const map: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠', H: '♥', D: '♦', C: '♣', S: '♠' };
    return map[s] || s;
  };

  const isRed = (s: string) => ['h', 'd', 'H', 'D'].includes(s);

  if (faceDown) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -15, rotateY: 180 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.25, delay: index * 0.08 }}
        className={cn(
          sizeMap[size],
          'rounded-md bg-gradient-to-br from-blue-900 to-blue-950',
          'border border-blue-700 shadow-lg flex items-center justify-center'
        )}
      >
        <div className="w-1/2 h-1/2 rounded border border-blue-500/30" />
      </motion.div>
    );
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: -10 }}
      animate={{ 
        opacity: 1, 
        scale: isWinner ? 1.05 : 1, 
        y: 0 
      }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      className={cn(
        sizeMap[size],
        'rounded-md bg-white shadow-xl border border-gray-200',
        'flex flex-col items-center justify-center font-bold',
        isRed(suit) ? 'text-red-500' : 'text-gray-900',
        isWinner && 'ring-2 ring-yellow-400 shadow-yellow-400/50'
      )}
    >
      <span className="leading-none">{rank}</span>
      <span className="leading-none text-lg">{getSuitSymbol(suit)}</span>
    </motion.div>
  );
});

// ============= CHIP DISPLAY =============
const ChipStack = memo(function ChipStack({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' }) {
  if (amount <= 0) return null;

  const format = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1';

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(sizeClass, 'bg-black/80 rounded-full text-amber-400 font-bold flex items-center gap-1')}
    >
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      {format(amount)}
    </motion.div>
  );
});

// ============= TIMER RING =============
const TimerRing = memo(function TimerRing({ 
  progress, 
  size = 56 
}: { 
  progress: number; 
  size?: number 
}) {
  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  
  const color = progress < 0.1 ? '#ef4444' : progress < 0.25 ? '#f59e0b' : '#22c55e';

  return (
    <svg
      className="absolute inset-0 pointer-events-none -rotate-90"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn(progress < 0.1 && 'animate-pulse')}
      />
    </svg>
  );
});

// ============= ACTION BADGE =============
const ActionBadge = memo(function ActionBadge({ action, amount }: { action: string; amount?: number }) {
  const config: Record<string, { bg: string; text: string }> = {
    fold: { bg: 'bg-gray-600', text: 'FOLD' },
    check: { bg: 'bg-blue-600', text: 'CHECK' },
    call: { bg: 'bg-green-600', text: amount ? `CALL ${amount}` : 'CALL' },
    bet: { bg: 'bg-amber-600', text: amount ? `BET ${amount}` : 'BET' },
    raise: { bg: 'bg-orange-600', text: amount ? `RAISE ${amount}` : 'RAISE' },
    allin: { bg: 'bg-red-600', text: 'ALL-IN' },
  };

  const c = config[action.toLowerCase()] || { bg: 'bg-gray-500', text: action };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(c.bg, 'px-2 py-0.5 rounded-full text-white text-[8px] font-bold shadow-lg')}
    >
      {c.text}
    </motion.div>
  );
});

// ============= PLAYER SEAT =============
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  isHero,
  showCards,
  isCurrentTurn,
  timerProgress,
  dealerSeat,
  sbSeat,
  bbSeat
}: {
  player: Player | null;
  position: { x: number; y: number };
  isHero: boolean;
  showCards: boolean;
  isCurrentTurn: boolean;
  timerProgress?: number;
  dealerSeat: number;
  sbSeat: number;
  bbSeat: number;
}) {
  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-lg">
          +
        </div>
      </div>
    );
  }

  const isDealer = player.seatNumber === dealerSeat;
  const isSB = player.seatNumber === sbSeat;
  const isBB = player.seatNumber === bbSeat;
  const avatarSize = isHero ? 'w-14 h-14' : 'w-11 h-11';
  const showTimer = isCurrentTurn && !player.isFolded && !player.isAllIn;

  return (
    <div
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 z-10',
        isHero && 'z-20'
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {/* Player cards */}
      {player.cards.length > 0 && !player.isFolded && (
        <div className={cn(
          'absolute flex gap-0.5',
          isHero ? '-top-16 left-1/2 -translate-x-1/2' : '-top-12 left-1/2 -translate-x-1/2'
        )}>
          {player.cards.map((card, idx) => (
            <StableCard
              key={`${player.id}-card-${idx}`}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? 'md' : 'sm'}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Timer ring */}
      {showTimer && timerProgress !== undefined && (
        <TimerRing progress={timerProgress} size={isHero ? 64 : 52} />
      )}

      {/* Avatar */}
      <div
        className={cn(
          avatarSize,
          'relative rounded-full overflow-hidden border-2 transition-all',
          player.isFolded && 'opacity-40 grayscale',
          player.isAllIn && 'ring-2 ring-red-500 ring-offset-1 ring-offset-black',
          isCurrentTurn && !player.isFolded
            ? 'border-amber-400 shadow-lg shadow-amber-400/40'
            : 'border-white/30'
        )}
      >
        {player.avatar ? (
          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{
              background: `linear-gradient(135deg, hsl(${player.seatNumber * 60}, 50%, 35%), hsl(${player.seatNumber * 60 + 40}, 50%, 25%))`
            }}
          >
            {(player.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}
        
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[8px] text-white/80 font-medium">FOLD</span>
          </div>
        )}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-gray-900 text-[8px] font-black flex items-center justify-center shadow-lg">
          D
        </div>
      )}

      {/* SB/BB badge */}
      {(isSB || isBB) && !isDealer && (
        <div className={cn(
          'absolute -bottom-1 -left-1 w-5 h-5 rounded-full text-white text-[7px] font-bold flex items-center justify-center',
          isBB ? 'bg-amber-500' : 'bg-blue-500'
        )}>
          {isBB ? 'BB' : 'SB'}
        </div>
      )}

      {/* Name & Stack */}
      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-center min-w-[60px]">
        <div className="text-white text-[9px] font-medium truncate max-w-[70px]">
          {isHero ? 'Вы' : player.name}
        </div>
        <div className={cn(
          'text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block',
          player.isAllIn ? 'bg-red-600 text-white animate-pulse' : 'bg-black/70 text-amber-400'
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </div>
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className={cn(
          'absolute',
          isHero ? 'top-[85%]' : 'top-[80%]',
          position.x > 50 ? 'left-[-40%]' : position.x < 50 ? 'left-[140%] -translate-x-full' : 'left-1/2 -translate-x-1/2'
        )}>
          <ChipStack amount={player.currentBet} size="sm" />
        </div>
      )}

      {/* Last action */}
      <AnimatePresence>
        {player.lastAction && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <ActionBadge action={player.lastAction.type} amount={player.lastAction.amount} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}, (prev, next) => {
  // Custom equality check for stable rendering
  const playerEqual = (
    prev.player?.id === next.player?.id &&
    prev.player?.stack === next.player?.stack &&
    prev.player?.currentBet === next.player?.currentBet &&
    prev.player?.isFolded === next.player?.isFolded &&
    prev.player?.isAllIn === next.player?.isAllIn &&
    prev.player?.cards?.join(',') === next.player?.cards?.join(',') &&
    prev.player?.lastAction?.type === next.player?.lastAction?.type
  );
  
  return (
    playerEqual &&
    prev.isHero === next.isHero &&
    prev.showCards === next.showCards &&
    prev.isCurrentTurn === next.isCurrentTurn &&
    Math.abs((prev.timerProgress || 0) - (next.timerProgress || 0)) < 0.02 &&
    prev.dealerSeat === next.dealerSeat &&
    prev.sbSeat === next.sbSeat &&
    prev.bbSeat === next.bbSeat
  );
});

// ============= TABLE FELT =============
const TableFelt = memo(function TableFelt() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gray-900" />
      <div
        className="absolute inset-[5%] rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #1a5a38 0%, #0d3020 50%, #1a5a38 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 15px 50px rgba(0,0,0,0.7)'
        }}
      >
        <div className="absolute inset-0 rounded-[50%] border-4 border-amber-900/20" />
        <div className="absolute inset-[25%] rounded-[50%] border border-white/5" />
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
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div key={idx}>
          {idx < visibleCount && cards[idx] ? (
            <StableCard card={cards[idx]} size="md" index={idx} />
          ) : (
            <div className="w-10 h-14 rounded-md border border-white/10 bg-black/30" />
          )}
        </div>
      ))}
    </div>
  );
});

// ============= POT DISPLAY =============
const PotDisplay = memo(function PotDisplay({ pot }: { pot: number }) {
  if (pot <= 0) return null;

  const format = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <motion.div
      key={pot}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative w-8 h-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-5 h-5 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-amber-700"
            style={{ left: `${i * 5}px`, top: `${-i * 2}px`, boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
          />
        ))}
      </div>
      <div className="px-3 py-1 bg-black/70 rounded-full">
        <span className="text-amber-400 font-bold text-sm">POT: {format(pot)}</span>
      </div>
    </motion.div>
  );
});

// ============= ACTION PANEL =============
const ActionPanel = memo(function ActionPanel({
  visible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  onAction
}: {
  visible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  onAction: (action: string, amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, callAmount * 2));
  }, [minRaise, callAmount]);

  if (!visible) return null;

  const presets = [
    { label: '½', amount: Math.floor(pot / 2) },
    { label: 'POT', amount: pot },
    { label: '2x', amount: callAmount * 2 },
  ].filter(p => p.amount >= minRaise && p.amount <= maxBet);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-gray-950 via-gray-900/95 to-transparent safe-area-pb"
    >
      {/* Presets */}
      <div className="flex justify-center gap-1.5 mb-2">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(p.amount)}
            className={cn(
              'h-6 text-[9px] px-2 border-white/20 bg-white/5 text-white/80',
              raiseAmount === p.amount && 'bg-amber-600/30 border-amber-500 text-amber-400'
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="mx-auto max-w-[260px] mb-2">
        <input
          type="range"
          min={minRaise}
          max={maxBet}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg"
        />
        <div className="text-center text-amber-400 font-bold text-base mt-0.5">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[70px] h-11 bg-gradient-to-b from-red-600 to-red-700 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95"
        >
          FOLD
        </Button>

        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[70px] h-11 bg-gradient-to-b from-blue-600 to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95"
          >
            CHECK
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[85px] h-11 bg-gradient-to-b from-green-600 to-green-700 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95"
          >
            <div className="flex flex-col items-center leading-tight">
              <span>CALL</span>
              <span className="text-[9px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[85px] h-11 bg-gradient-to-b from-amber-600 to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95"
        >
          <div className="flex flex-col items-center leading-tight">
            <span>RAISE</span>
            <span className="text-[9px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        <Button
          onClick={() => onAction('allin')}
          className="flex-1 max-w-[70px] h-11 bg-gradient-to-b from-purple-600 to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95"
        >
          ALL-IN
        </Button>
      </div>
    </motion.div>
  );
});

// ============= MAIN TABLE COMPONENT =============
export function UltimatePPPokerTable({
  tableId,
  playerId,
  playerName,
  playerAvatar,
  balance,
  onLeave
}: UltimatePPPokerTableProps) {
  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [currentPlayerSeat, setCurrentPlayerSeat] = useState<number | null>(null);
  const [dealerSeat, setDealerSeat] = useState(0);
  const [mySeat, setMySeat] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimer, setTurnTimer] = useState(30);
  const [turnProgress, setTurnProgress] = useState(1);
  
  const SB = 50;
  const BB = 100;
  const TURN_DURATION = 30;
  
  const pokerSounds = usePokerSounds();
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const turnStartRef = useRef<number>(Date.now());

  // Initialize demo game
  useEffect(() => {
    const demoPlayers: Player[] = [
      { id: playerId, name: playerName, avatar: playerAvatar, seatNumber: 0, stack: balance, cards: [], currentBet: 0, isFolded: false, isAllIn: false },
      { id: 'bot1', name: 'Alex', seatNumber: 1, stack: 15000, cards: [], currentBet: 0, isFolded: false, isAllIn: false },
      { id: 'bot2', name: 'Maria', seatNumber: 3, stack: 12000, cards: [], currentBet: 0, isFolded: false, isAllIn: false },
      { id: 'bot3', name: 'Viktor', seatNumber: 4, stack: 8500, cards: [], currentBet: 0, isFolded: false, isAllIn: false },
    ];
    setPlayers(demoPlayers);
    setMySeat(0);
  }, [playerId, playerName, playerAvatar, balance]);

  // Turn timer logic
  useEffect(() => {
    if (currentPlayerSeat === null || phase === 'waiting' || phase === 'showdown') {
      setTurnProgress(1);
      return;
    }

    turnStartRef.current = Date.now();
    setTurnProgress(1);

    const tick = () => {
      const elapsed = (Date.now() - turnStartRef.current) / 1000;
      const remaining = Math.max(0, TURN_DURATION - elapsed);
      setTurnProgress(remaining / TURN_DURATION);
      setTurnTimer(remaining);

      if (remaining <= 0) {
        // Auto-fold on timeout
        if (currentPlayerSeat === mySeat) {
          handleAction('fold');
        } else {
          simulateBotAction();
        }
      }
    };

    turnTimerRef.current = setInterval(tick, 100);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [currentPlayerSeat, phase]);

  // Start new hand
  const startNewHand = useCallback(() => {
    if (players.length < 2) return;

    const newDealerSeat = (dealerSeat + 1) % players.length;
    const activePlayers = players.filter(p => p.stack > 0);
    if (activePlayers.length < 2) return;

    // Reset players
    const newPlayers = players.map((p, i) => ({
      ...p,
      cards: generateCards(2),
      currentBet: 0,
      isFolded: false,
      isAllIn: false,
      lastAction: undefined,
      isDealer: i === newDealerSeat
    }));

    // Post blinds
    const sbIdx = (newDealerSeat + 1) % players.length;
    const bbIdx = (newDealerSeat + 2) % players.length;
    
    newPlayers[sbIdx].currentBet = SB;
    newPlayers[sbIdx].stack -= SB;
    newPlayers[bbIdx].currentBet = BB;
    newPlayers[bbIdx].stack -= BB;

    setDealerSeat(newDealerSeat);
    setPlayers(newPlayers);
    setPhase('preflop');
    setPot(SB + BB);
    setCurrentBet(BB);
    setCommunityCards(generateCards(5));
    
    // First to act is after BB
    const firstToAct = (bbIdx + 1) % players.length;
    setCurrentPlayerSeat(newPlayers[firstToAct].seatNumber);

    if (soundEnabled) pokerSounds.playDeal();
  }, [players, dealerSeat, soundEnabled, pokerSounds]);

  // Generate random cards
  const generateCards = (count: number): string[] => {
    const suits = ['h', 'd', 'c', 's'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const cards: string[] = [];
    const used = new Set<string>();

    while (cards.length < count) {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const card = rank + suit;
      if (!used.has(card)) {
        used.add(card);
        cards.push(card);
      }
    }
    return cards;
  };

  // Handle player action
  const handleAction = useCallback((action: string, amount?: number) => {
    if (currentPlayerSeat !== mySeat) return;

    setPlayers(prev => {
      const idx = prev.findIndex(p => p.seatNumber === mySeat);
      if (idx === -1) return prev;

      const player = { ...prev[idx] };
      const newPlayers = [...prev];

      switch (action) {
        case 'fold':
          player.isFolded = true;
          player.lastAction = { type: 'fold' };
          if (soundEnabled) pokerSounds.playFold();
          break;
        case 'check':
          player.lastAction = { type: 'check' };
          if (soundEnabled) pokerSounds.playCheck();
          break;
        case 'call':
          const callAmt = currentBet - player.currentBet;
          player.stack -= callAmt;
          player.currentBet = currentBet;
          player.lastAction = { type: 'call', amount: callAmt };
          setPot(p => p + callAmt);
          if (soundEnabled) pokerSounds.playCall();
          break;
        case 'raise':
          const raiseAmt = (amount || currentBet * 2) - player.currentBet;
          player.stack -= raiseAmt;
          player.currentBet += raiseAmt;
          setCurrentBet(player.currentBet);
          player.lastAction = { type: 'raise', amount: player.currentBet };
          setPot(p => p + raiseAmt);
          if (soundEnabled) pokerSounds.playRaise();
          break;
        case 'allin':
          const allInAmt = player.stack;
          player.currentBet += allInAmt;
          player.stack = 0;
          player.isAllIn = true;
          player.lastAction = { type: 'allin', amount: player.currentBet };
          if (player.currentBet > currentBet) setCurrentBet(player.currentBet);
          setPot(p => p + allInAmt);
          if (soundEnabled) pokerSounds.playAllIn();
          break;
      }

      newPlayers[idx] = player;
      return newPlayers;
    });

    // Move to next player
    setTimeout(() => advanceToNextPlayer(), 500);
  }, [currentPlayerSeat, mySeat, currentBet, soundEnabled, pokerSounds]);

  // Advance to next player
  const advanceToNextPlayer = useCallback(() => {
    const activePlayers = players.filter(p => !p.isFolded && !p.isAllIn);
    
    if (activePlayers.length <= 1) {
      // Round or hand over
      advancePhase();
      return;
    }

    const currentIdx = activePlayers.findIndex(p => p.seatNumber === currentPlayerSeat);
    const nextIdx = (currentIdx + 1) % activePlayers.length;
    
    // Check if betting round complete
    const allActed = activePlayers.every(p => p.currentBet === currentBet || p.isAllIn);
    if (allActed && currentIdx === activePlayers.length - 1) {
      advancePhase();
      return;
    }

    setCurrentPlayerSeat(activePlayers[nextIdx].seatNumber);
  }, [players, currentPlayerSeat, currentBet]);

  // Advance game phase
  const advancePhase = useCallback(() => {
    // Reset bets
    setPlayers(prev => prev.map(p => ({ ...p, currentBet: 0, lastAction: undefined })));
    setCurrentBet(0);

    const phases: GamePhase[] = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIdx = phases.indexOf(phase);
    const nextPhase = phases[Math.min(currentIdx + 1, phases.length - 1)] as GamePhase;

    setPhase(nextPhase);

    if (nextPhase === 'showdown') {
      // Show winner
      setTimeout(() => {
        setPhase('waiting');
        if (soundEnabled) pokerSounds.playWin();
      }, 3000);
    } else {
      // Set first to act (after dealer for post-flop)
      const activePlayers = players.filter(p => !p.isFolded && !p.isAllIn);
      if (activePlayers.length > 0) {
        setCurrentPlayerSeat(activePlayers[0].seatNumber);
      }
    }
  }, [phase, players, soundEnabled, pokerSounds]);

  // Simulate bot action
  const simulateBotAction = useCallback(() => {
    const actions = ['check', 'call', 'raise', 'fold'];
    const weights = [30, 40, 20, 10];
    const random = Math.random() * 100;
    let sum = 0;
    let action = 'call';

    for (let i = 0; i < actions.length; i++) {
      sum += weights[i];
      if (random < sum) {
        action = actions[i];
        break;
      }
    }

    // Bot can't check if there's a bet
    if (action === 'check' && currentBet > 0) {
      action = 'call';
    }

    setPlayers(prev => {
      const idx = prev.findIndex(p => p.seatNumber === currentPlayerSeat);
      if (idx === -1) return prev;

      const player = { ...prev[idx] };
      const newPlayers = [...prev];

      switch (action) {
        case 'fold':
          player.isFolded = true;
          player.lastAction = { type: 'fold' };
          break;
        case 'check':
          player.lastAction = { type: 'check' };
          break;
        case 'call':
          const callAmt = Math.min(currentBet - player.currentBet, player.stack);
          player.stack -= callAmt;
          player.currentBet += callAmt;
          player.lastAction = { type: 'call', amount: callAmt };
          setPot(p => p + callAmt);
          break;
        case 'raise':
          const raiseAmt = Math.min(currentBet * 2, player.stack);
          player.stack -= raiseAmt;
          player.currentBet += raiseAmt;
          setCurrentBet(player.currentBet);
          player.lastAction = { type: 'raise', amount: player.currentBet };
          setPot(p => p + raiseAmt);
          break;
      }

      newPlayers[idx] = player;
      return newPlayers;
    });

    setTimeout(() => advanceToNextPlayer(), 800);
  }, [currentPlayerSeat, currentBet, advanceToNextPlayer]);

  // Auto bot turns
  useEffect(() => {
    if (phase === 'waiting' || phase === 'showdown') return;
    if (currentPlayerSeat === null || currentPlayerSeat === mySeat) return;

    const timeout = setTimeout(() => {
      simulateBotAction();
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timeout);
  }, [currentPlayerSeat, mySeat, phase, simulateBotAction]);

  // Calculated values
  const sbSeat = useMemo(() => (dealerSeat + 1) % Math.max(players.length, 1), [dealerSeat, players.length]);
  const bbSeat = useMemo(() => (dealerSeat + 2) % Math.max(players.length, 1), [dealerSeat, players.length]);
  const isMyTurn = currentPlayerSeat === mySeat && phase !== 'waiting' && phase !== 'showdown';
  const canCheck = currentBet === 0 || (players.find(p => p.seatNumber === mySeat)?.currentBet || 0) >= currentBet;
  const myPlayer = players.find(p => p.seatNumber === mySeat);
  const callAmount = currentBet - (myPlayer?.currentBet || 0);
  const minRaise = currentBet * 2;
  const maxBet = myPlayer?.stack || 0;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-900/90 z-30">
        <Button variant="ghost" size="sm" onClick={onLeave} className="text-white">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Выход
        </Button>
        
        <div className="flex items-center gap-2 text-white text-sm">
          <Users className="w-4 h-4" />
          <span>{players.length}/6</span>
          <span className="text-white/60">•</span>
          <span className="text-amber-400">{SB}/{BB}</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-white"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Table area */}
      <div className="flex-1 relative">
        <TableFelt />
        
        {/* Center - pot and community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-20">
          <PotDisplay pot={pot} />
          <CommunityCards cards={communityCards} phase={phase} />
          
          {phase === 'waiting' && (
            <Button
              onClick={startNewHand}
              className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-2 rounded-xl shadow-lg"
            >
              Начать раунд
            </Button>
          )}
        </div>

        {/* Player seats */}
        {SEAT_POSITIONS.map((pos, idx) => {
          const player = players.find(p => p.seatNumber === idx) || null;
          return (
            <PlayerSeat
              key={idx}
              player={player}
              position={pos}
              isHero={idx === mySeat}
              showCards={phase === 'showdown'}
              isCurrentTurn={currentPlayerSeat === idx}
              timerProgress={currentPlayerSeat === idx ? turnProgress : 1}
              dealerSeat={dealerSeat}
              sbSeat={sbSeat}
              bbSeat={bbSeat}
            />
          );
        })}
      </div>

      {/* Action panel */}
      <AnimatePresence>
        {isMyTurn && (
          <ActionPanel
            visible={isMyTurn}
            canCheck={canCheck}
            callAmount={callAmount}
            minRaise={minRaise}
            maxBet={maxBet}
            pot={pot}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default UltimatePPPokerTable;
