import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, Settings, Users, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  createDeck, 
  shuffleDeckSecure, 
  dealToPlayers, 
  dealCards,
  Card as PokerEngineCard,
  RANK_NAMES
} from '@/utils/pokerEngine';
import { cn } from '@/lib/utils';

// Import stable components
import { StablePokerCard, StableChipStack, StablePlayerSeat, StableActionPanel } from './stable';

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
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

// Helper function
function cardToString(card: PokerEngineCard): string {
  const suitChar = card.suit.charAt(0).toLowerCase();
  return `${RANK_NAMES[card.rank]}${suitChar}`;
}

// Seat positions for 9-max table
const SEAT_POSITIONS = [
  { x: 50, y: 88 },  // Seat 0 - Hero (bottom center)
  { x: 18, y: 75 },  // Seat 1
  { x: 8, y: 48 },   // Seat 2
  { x: 18, y: 22 },  // Seat 3
  { x: 38, y: 10 },  // Seat 4
  { x: 62, y: 10 },  // Seat 5
  { x: 82, y: 22 },  // Seat 6
  { x: 92, y: 48 },  // Seat 7
  { x: 82, y: 75 },  // Seat 8
];

// Memoized table felt component
const TableFelt = memo(function TableFelt() {
  return (
    <div className="absolute inset-0">
      {/* Outer wood frame */}
      <div 
        className="absolute inset-0 rounded-[45%]"
        style={{
          background: 'linear-gradient(180deg, #3d2817 0%, #2a1a0f 50%, #3d2817 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.5)'
        }}
      />
      {/* Inner felt */}
      <div 
        className="absolute inset-[2.5%] rounded-[45%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, #2d8a52 0%, #1e6b3d 45%, #145530 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4), inset 0 4px 20px rgba(255,255,255,0.03)'
        }}
      >
        {/* Felt texture overlay */}
        <div 
          className="absolute inset-0 rounded-[45%] opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />
        {/* Decorative rings */}
        <div className="absolute inset-[12%] rounded-[50%] border border-white/5" />
        <div className="absolute inset-[22%] rounded-[50%] border border-white/3" />
      </div>
    </div>
  );
});

// Memoized community cards display
const CommunityCards = memo(function CommunityCards({
  cards,
  winningCards = []
}: {
  cards: string[];
  winningCards?: string[];
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const card = cards[idx];
        const isWinning = card && winningCards.includes(card);
        
        return (
          <div key={idx} className="relative">
            {card ? (
              <StablePokerCard
                card={card}
                size="md"
                dealDelay={idx}
                isWinning={isWinning}
                isHighlighted={isWinning}
              />
            ) : (
              <div 
                className="w-12 h-[68px] rounded-lg border border-white/10 bg-black/20"
                style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}, (prev, next) => 
  JSON.stringify(prev.cards) === JSON.stringify(next.cards) &&
  JSON.stringify(prev.winningCards) === JSON.stringify(next.winningCards)
);

// Header component
const TableHeader = memo(function TableHeader({
  onLeave,
  soundEnabled,
  onToggleSound,
  playerCount,
  blinds,
  onNewHand
}: {
  onLeave: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playerCount: number;
  blinds: string;
  onNewHand: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/98 to-gray-900/90 z-20">
      <Button
        variant="ghost"
        size="icon"
        onClick={onLeave}
        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="text-center flex-1">
        <h1 className="text-sm font-semibold text-white">Texas Hold'em</h1>
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
          onClick={onNewHand}
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
          title="New Hand"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSound}
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// Winner overlay
const WinnerOverlay = memo(function WinnerOverlay({
  winner,
  amount,
  handRank,
  onClose
}: {
  winner: { name: string; id: string };
  amount: number;
  handRank: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="text-center p-8 rounded-2xl bg-gradient-to-b from-amber-900/90 to-gray-900/90 border border-amber-500/50"
        style={{ boxShadow: '0 0 60px rgba(251, 191, 36, 0.3)' }}
      >
        <div className="text-amber-400 text-xl font-bold mb-2">
          🏆 {winner.name} Wins!
        </div>
        <div className="text-white text-3xl font-black mb-2">
          +{amount.toLocaleString()}
        </div>
        <div className="text-amber-300/80 text-sm">
          {handRank}
        </div>
      </motion.div>
    </motion.div>
  );
});

// Main stable table component
interface StablePokerTableProps {
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerStack?: number;
  onLeave: () => void;
}

export function StablePokerTable({
  playerId = 'hero',
  playerName = 'You',
  playerAvatar,
  playerStack = 10000,
  onLeave
}: StablePokerTableProps) {
  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentBet, setCurrentBet] = useState(0);
  const [minRaise, setMinRaise] = useState(40);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Winner state
  const [winner, setWinner] = useState<{ name: string; id: string; amount: number; handRank: string } | null>(null);
  
  // Refs
  const deckRef = useRef<PokerEngineCard[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hero player
  const heroPlayer = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);
  const heroStack = heroPlayer?.stack ?? playerStack;

  // Initialize demo players
  useEffect(() => {
    const demoPlayers: Player[] = [
      { id: playerId, name: playerName, avatar: playerAvatar, stack: playerStack, seatNumber: 0, isDealer: true },
      { id: 'p2', name: 'Viktor_Pro', stack: 15420, seatNumber: 1 },
      { id: 'p3', name: 'PokerKing', stack: 8750, seatNumber: 3 },
      { id: 'p4', name: 'LuckyAce', stack: 12300, seatNumber: 5 },
      { id: 'p5', name: 'CardShark', stack: 9800, seatNumber: 7 },
    ];
    setPlayers(demoPlayers);
  }, [playerId, playerName, playerAvatar, playerStack]);

  // Turn timer
  useEffect(() => {
    if (isMyTurn && gamePhase !== 'waiting' && gamePhase !== 'showdown') {
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMyTurn, gamePhase]);

  // Start new hand
  const startNewHand = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Create and shuffle deck
    const deck = shuffleDeckSecure(createDeck());
    deckRef.current = [...deck];
    
    const activePlayers = players.filter(p => p.stack > 0);
    if (activePlayers.length < 2) return;

    // Deal cards
    const { playerHands, remainingDeck } = dealToPlayers(deck, activePlayers.length, 2);
    deckRef.current = remainingDeck;

    // Update players with cards
    setPlayers(prev => prev.map((p, idx) => {
      const activeIdx = activePlayers.findIndex(ap => ap.id === p.id);
      if (activeIdx === -1) return { ...p, cards: undefined, isFolded: true };
      
      return {
        ...p,
        cards: playerHands[activeIdx]?.map(cardToString),
        isFolded: false,
        isAllIn: false,
        currentBet: 0,
        lastAction: undefined,
        isTurn: p.id === playerId
      };
    }));

    setCommunityCards([]);
    setPot(30); // SB + BB
    setCurrentBet(20);
    setMinRaise(40);
    setGamePhase('preflop');
    setIsMyTurn(true);
    setWinner(null);
  }, [players, playerId]);

  // Handle player action
  const handleAction = useCallback((action: ActionType, amount?: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const myPlayer = players.find(p => p.id === playerId);
    if (!myPlayer) return;

    let betAmount = 0;
    let newStack = myPlayer.stack;

    switch (action) {
      case 'fold':
        break;
      case 'check':
        break;
      case 'call':
        betAmount = Math.min(currentBet - (myPlayer.currentBet || 0), myPlayer.stack);
        newStack = myPlayer.stack - betAmount;
        break;
      case 'raise':
        betAmount = amount || minRaise;
        newStack = myPlayer.stack - betAmount;
        setCurrentBet(betAmount);
        setMinRaise(betAmount * 2);
        break;
      case 'allin':
        betAmount = myPlayer.stack;
        newStack = 0;
        break;
    }

    // Update pot
    setPot(p => p + betAmount);

    // Update player
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          stack: newStack,
          currentBet: (p.currentBet || 0) + betAmount,
          isFolded: action === 'fold',
          isAllIn: action === 'allin' || newStack === 0,
          lastAction: action.toUpperCase() + (betAmount > 0 ? ` ${betAmount}` : ''),
          isTurn: false
        };
      }
      return { ...p, isTurn: false };
    }));

    setIsMyTurn(false);

    // Simulate opponents after delay
    setTimeout(() => simulateOpponents(), 600);
  }, [players, playerId, currentBet, minRaise]);

  // Simulate opponent actions
  const simulateOpponents = useCallback(() => {
    setPlayers(prev => {
      const updated = prev.map(p => {
        if (p.id !== playerId && !p.isFolded && !p.isAllIn) {
          const rand = Math.random();
          let action = 'CHECK';
          let newBet = p.currentBet || 0;
          let folded = false;

          if (currentBet > 0 && (p.currentBet || 0) < currentBet) {
            if (rand < 0.2) {
              action = 'FOLD';
              folded = true;
            } else if (rand < 0.7) {
              action = 'CALL';
              newBet = currentBet;
            } else {
              action = 'RAISE 60';
              newBet = 60;
            }
          } else {
            if (rand < 0.6) {
              action = 'CHECK';
            } else {
              action = 'BET 40';
              newBet = 40;
            }
          }

          return {
            ...p,
            lastAction: action,
            currentBet: newBet,
            isFolded: folded
          };
        }
        return p;
      });
      return updated;
    });

    // Advance phase after opponent actions
    setTimeout(() => advancePhase(), 800);
  }, [playerId, currentBet]);

  // Advance game phase
  const advancePhase = useCallback(() => {
    const deck = deckRef.current.length > 5 ? deckRef.current : shuffleDeckSecure(createDeck());

    // Clear last actions
    setPlayers(prev => prev.map(p => ({ ...p, lastAction: undefined, currentBet: 0 })));
    setCurrentBet(0);

    switch (gamePhase) {
      case 'preflop': {
        // Burn and deal flop
        const flop = dealCards(deck.slice(1), 3);
        deckRef.current = flop.remainingDeck;
        setCommunityCards(flop.dealtCards.map(cardToString));
        setGamePhase('flop');
        break;
      }
      case 'flop': {
        const turn = dealCards(deckRef.current.slice(1), 1);
        deckRef.current = turn.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(turn.dealtCards[0])]);
        setGamePhase('turn');
        break;
      }
      case 'turn': {
        const river = dealCards(deckRef.current.slice(1), 1);
        deckRef.current = river.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(river.dealtCards[0])]);
        setGamePhase('river');
        break;
      }
      case 'river': {
        // Showdown - determine winner
        const activePlayers = players.filter(p => !p.isFolded);
        if (activePlayers.length > 0) {
          const winnerPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
          
          setWinner({
            id: winnerPlayer.id,
            name: winnerPlayer.name,
            amount: pot,
            handRank: 'Two Pair, Aces and Kings'
          });

          // Award pot to winner
          if (winnerPlayer.id === playerId) {
            setPlayers(prev => prev.map(p => 
              p.id === playerId ? { ...p, stack: p.stack + pot } : p
            ));
          }
        }
        setGamePhase('showdown');
        return;
      }
    }

    setIsMyTurn(true);
  }, [gamePhase, players, playerId, pot]);

  // Close winner overlay
  const handleCloseWinner = useCallback(() => {
    setWinner(null);
    // Reset for new hand
    setTimeout(() => {
      setGamePhase('waiting');
      setCommunityCards([]);
      setPot(0);
      setPlayers(prev => prev.map(p => ({
        ...p,
        cards: undefined,
        isFolded: false,
        isAllIn: false,
        currentBet: 0,
        lastAction: undefined,
        isTurn: false
      })));
    }, 300);
  }, []);

  const canCheck = currentBet === 0 || (heroPlayer?.currentBet || 0) >= currentBet;
  const activePlayerCount = players.filter(p => !p.isFolded).length;

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <TableHeader
        onLeave={onLeave}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        playerCount={activePlayerCount}
        blinds="10/20"
        onNewHand={startNewHand}
      />

      {/* Main Table Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-4 md:inset-8 lg:inset-12">
          {/* Table felt */}
          <TableFelt />

          {/* Pot display */}
          {pot > 0 && (
            <div className="absolute top-[26%] left-1/2 -translate-x-1/2 z-20">
              <div className="flex flex-col items-center gap-2">
                <StableChipStack amount={pot} size="md" />
                <div className="px-3 py-1 rounded-full bg-black/70 text-amber-400 font-bold text-sm">
                  Pot: {pot.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Community cards */}
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 z-20">
            <CommunityCards cards={communityCards} />
          </div>

          {/* Player seats */}
          {SEAT_POSITIONS.map((pos, idx) => {
            const player = players.find(p => p.seatNumber === idx);
            const isHero = player?.id === playerId;

            return (
              <StablePlayerSeat
                key={idx}
                player={player || null}
                position={pos}
                isHero={isHero}
                showCards={gamePhase === 'showdown'}
                timeRemaining={isHero && isMyTurn ? timeRemaining : undefined}
                seatIndex={idx}
              />
            );
          })}

          {/* Hero cards display (larger at bottom) */}
          {heroPlayer?.cards && heroPlayer.cards.length > 0 && (
            <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {heroPlayer.cards.map((card, idx) => (
                <StablePokerCard
                  key={`hero-${idx}-${card}`}
                  card={card}
                  size="lg"
                  dealDelay={idx}
                />
              ))}
            </div>
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
                size="lg"
                className="px-10 py-5 text-lg font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl shadow-2xl"
              >
                Start Game
              </Button>
            </motion.div>
          )}

          {/* Winner overlay */}
          <AnimatePresence>
            {winner && (
              <WinnerOverlay
                winner={{ name: winner.name, id: winner.id }}
                amount={winner.amount}
                handRank={winner.handRank}
                onClose={handleCloseWinner}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action panel */}
      <StableActionPanel
        isVisible={isMyTurn && gamePhase !== 'waiting' && gamePhase !== 'showdown'}
        canCheck={canCheck}
        callAmount={currentBet}
        minRaise={minRaise}
        maxBet={heroStack}
        currentPot={pot}
        onAction={handleAction}
      />
    </div>
  );
}

export default StablePokerTable;
