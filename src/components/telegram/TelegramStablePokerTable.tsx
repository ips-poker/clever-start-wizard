import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare,
  Users, RotateCcw, Zap, Loader2
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
  RANK_NAMES
} from '@/utils/pokerEngine';
import { cn } from '@/lib/utils';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { useReconnectManager } from '@/hooks/useReconnectManager';
import { getAvatarByNumber } from '@/utils/avatarResolver';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// Simple hand name for display
interface HandInfo {
  name: string;
}

// Import stable components
import { StablePokerCard, StableChipStack, StablePlayerSeat, StableActionPanel } from '@/components/poker/stable';
import { PhaseTransition, ActionBubble } from '@/components/poker/animations';

// Import error boundary and connection status
import { PokerErrorBoundary } from '@/components/poker/PokerErrorBoundary';
import { ConnectionStatusBanner } from '@/components/poker/ConnectionStatusBanner';

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

// Seat positions for 6-max table - PPPoker authentic layout
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88 },  // Seat 0 - Hero (bottom center)
  { x: 10, y: 60 },  // Seat 1 - Left middle
  { x: 10, y: 28 },  // Seat 2 - Left top
  { x: 50, y: 10 },  // Seat 3 - Top center
  { x: 90, y: 28 },  // Seat 4 - Right top
  { x: 90, y: 60 },  // Seat 5 - Right middle
];


// Syndikate Orange Industrial Table Felt
const TableFelt = memo(function TableFelt() {
  return (
    <div className="absolute inset-0">
      {/* Dark industrial background */}
      <div 
        className="absolute inset-0 rounded-[42%]"
        style={{
          background: 'linear-gradient(180deg, #1a1410 0%, #0d0a08 50%, #1a1410 100%)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.9)'
        }}
      />
      
      {/* Metallic rail - dark with orange tint */}
      <div 
        className="absolute inset-[2%] rounded-[44%]"
        style={{
          background: 'linear-gradient(180deg, #2d2520 0%, #1a1410 50%, #2d2520 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 10px 40px rgba(0,0,0,0.6), 0 0 40px rgba(249,115,22,0.08)'
        }}
      />
      
      {/* Table felt - Syndikate dark orange-brown industrial */}
      <div 
        className="absolute inset-[4%] rounded-[46%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #3d2a1a 0%, #2a1d12 30%, #1f150d 60%, #140d08 100%)',
          boxShadow: `
            inset 0 0 60px rgba(0,0,0,0.5),
            inset 0 -20px 60px rgba(0,0,0,0.4),
            0 15px 50px rgba(0,0,0,0.8),
            0 0 60px rgba(249,115,22,0.12)
          `
        }}
      >
        {/* Industrial texture overlay */}
        <div 
          className="absolute inset-0 rounded-[46%] opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Inner orange decorative line */}
        <div 
          className="absolute inset-[8%] rounded-[50%] border border-orange-500/10 pointer-events-none"
        />
        
        {/* Orange accent glow */}
        <div className="absolute inset-[8%] rounded-[50%] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 50%)'
          }}
        />
        
        {/* Center Syndikate Logo watermark */}
        <div className="absolute inset-[25%] rounded-[50%] flex items-center justify-center pointer-events-none opacity-15">
          <img 
            src={syndikateLogo} 
            alt="" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
});

// Memoized community cards display - PPPoker style larger cards
const CommunityCards = memo(function CommunityCards({
  cards,
  phase
}: {
  cards: string[];
  phase: GamePhase;
}) {
  const visibleCount = useMemo(() => {
    switch (phase) {
      case 'preflop': return 0;
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  }, [phase]);

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2, 3, 4].map((idx) => {
        const card = cards[idx];
        const shouldShow = idx < visibleCount && card;
        
        return (
          <motion.div 
            key={idx} 
            className="relative"
            initial={shouldShow ? { scale: 0, rotateY: 180, y: -20 } : { scale: 1 }}
            animate={shouldShow ? { scale: 1, rotateY: 0, y: 0 } : { scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 350, 
              damping: 22,
              delay: (idx % 3) * 0.08
            }}
          >
            {shouldShow ? (
              <StablePokerCard
                card={card}
                size="lg"
                dealDelay={0}
              />
            ) : (
              <div 
                className="w-14 h-[80px] rounded-lg"
                style={{ 
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}, (prev, next) => 
  JSON.stringify(prev.cards) === JSON.stringify(next.cards) &&
  prev.phase === next.phase
);

// Header component
const TableHeader = memo(function TableHeader({
  onLeave,
  soundEnabled,
  onToggleSound,
  playerCount,
  blinds,
  onNewHand,
  showChat,
  onToggleChat
}: {
  onLeave: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playerCount: number;
  blinds: string;
  onNewHand: () => void;
  showChat: boolean;
  onToggleChat: () => void;
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
          onClick={onToggleChat}
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// Winner overlay - SYNDIKATE brutal celebration
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
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 30, rotateX: -20 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 0.8, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center p-10 relative"
        style={{ 
          background: 'linear-gradient(135deg, rgba(26,26,26,0.98) 0%, rgba(10,10,10,0.98) 100%)',
          border: '2px solid rgba(255, 122, 0, 0.5)',
          boxShadow: '0 0 60px rgba(255, 122, 0, 0.4), 0 0 100px rgba(255, 122, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          clipPath: 'polygon(0% 5%, 5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%)'
        }}
      >
        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-orange-500" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-orange-500" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-orange-500" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-orange-500" />
        
        {/* Trophy icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="text-5xl mb-3"
        >
          🏆
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-orange-400 text-2xl font-display uppercase tracking-wider mb-2"
          style={{ textShadow: '0 0 20px rgba(255, 122, 0, 0.5)' }}
        >
          {winner.name} Wins!
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white text-5xl font-black mb-3"
          style={{ textShadow: '0 0 30px rgba(255, 122, 0, 0.6)' }}
        >
          +{amount.toLocaleString()}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-orange-300/70 text-sm font-bold uppercase tracking-wider"
        >
          {handRank}
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

// Main component props
interface TelegramStablePokerTableProps {
  tableId?: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerStack?: number;
  onLeave: () => void;
}

function TelegramStablePokerTableInner({
  tableId,
  playerId = 'hero',
  playerName = 'You',
  playerAvatar,
  playerStack = 10000,
  onLeave
}: TelegramStablePokerTableProps) {
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
  const [showChat, setShowChat] = useState(false);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [actionBubbles, setActionBubbles] = useState<Array<{id: string; action: string; amount?: number; x: number; y: number}>>([]);
  const [myHandEvaluation, setMyHandEvaluation] = useState<HandInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Winner state
  const [winner, setWinner] = useState<{ name: string; id: string; amount: number; handRank: string } | null>(null);
  
  // Refs
  const deckRef = useRef<PokerEngineCard[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = useRef<GamePhase>('waiting');

  // Sounds
  const sounds = usePokerSounds();

  // Reconnection manager for real tables
  const reconnectManager = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    onReconnect: async () => {
      if (tableId) {
        setIsConnecting(true);
        // Reload table data
        try {
          const { data } = await supabase
            .from('poker_table_players')
            .select('*')
            .eq('table_id', tableId);
          if (data) {
            reconnectManager.markConnected();
          }
        } catch (err) {
          console.error('Reconnect failed:', err);
        } finally {
          setIsConnecting(false);
        }
      }
    },
    onMaxRetriesReached: () => {
      toast.error('Не удалось подключиться к столу');
    }
  });
  
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  // Hero player
  const heroPlayer = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);
  const heroStack = heroPlayer?.stack ?? playerStack;

  // Initialize players
  useEffect(() => {
    const loadTablePlayers = async () => {
      if (!tableId) {
        // Demo mode - with proper avatars
        const demoPlayers: Player[] = [
          { id: playerId, name: playerName, avatar: playerAvatar || getAvatarByNumber(1), stack: playerStack, seatNumber: 0, isDealer: true },
          { id: 'p2', name: 'Viktor_Pro', avatar: getAvatarByNumber(5), stack: 15420, seatNumber: 1 },
          { id: 'p3', name: 'PokerKing', avatar: getAvatarByNumber(12), stack: 8750, seatNumber: 3 },
          { id: 'p4', name: 'LuckyAce', avatar: getAvatarByNumber(18), stack: 12300, seatNumber: 4 },
        ];
        setPlayers(demoPlayers);
        return;
      }

      try {
        const { data: tablePlayers, error } = await supabase
          .from('poker_table_players')
          .select(`
            id,
            seat_number,
            stack,
            is_dealer,
            status,
            player_id,
            players!poker_table_players_player_id_fkey (
              id,
              name,
              avatar_url
            )
          `)
          .eq('table_id', tableId)
          .eq('status', 'active');

        if (error) {
          console.error('Error loading table players:', error);
          return;
        }

        if (tablePlayers && tablePlayers.length > 0) {
          const realPlayers: Player[] = tablePlayers.map((tp: any) => ({
            id: tp.player_id,
            name: tp.players?.name || 'Unknown',
            avatar: tp.players?.avatar_url || undefined,
            stack: tp.stack,
            seatNumber: tp.seat_number,
            isDealer: tp.is_dealer,
            isFolded: false,
            isAllIn: false,
            currentBet: 0,
          }));
          setPlayers(realPlayers);
        }
      } catch (err) {
        console.error('Error fetching table players:', err);
      }
    };

    loadTablePlayers();

    if (tableId) {
      const channel = supabase
        .channel(`table-players-${tableId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'poker_table_players',
          filter: `table_id=eq.${tableId}`
        }, loadTablePlayers)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tableId, playerId, playerName, playerAvatar, playerStack]);

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

  // Show phase transition effect
  const triggerPhaseTransition = useCallback((newPhase: GamePhase) => {
    if (newPhase !== 'waiting' && newPhase !== prevPhaseRef.current) {
      setShowPhaseTransition(true);
      
      if (newPhase === 'flop' || newPhase === 'turn' || newPhase === 'river') {
        sounds.playDeal();
      } else if (newPhase === 'showdown') {
        sounds.playWin();
      }
      
      setTimeout(() => setShowPhaseTransition(false), 1500);
    }
    prevPhaseRef.current = newPhase;
  }, [sounds]);

  // Show action bubble
  const showActionBubble = useCallback((targetPlayerId: string, action: string, amount?: number) => {
    const player = players.find(p => p.id === targetPlayerId);
    if (!player) return;
    
    const pos = SEAT_POSITIONS_6MAX[player.seatNumber];
    if (!pos) return;
    
    const id = `action-${Date.now()}`;
    
    setActionBubbles(prev => [...prev, { 
      id, 
      action, 
      amount, 
      x: pos.x, 
      y: pos.y - 10 
    }]);
    
    setTimeout(() => {
      setActionBubbles(prev => prev.filter(b => b.id !== id));
    }, 2500);
  }, [players]);

  // Start new hand
  const startNewHand = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const deck = shuffleDeckSecure(createDeck());
    deckRef.current = [...deck];
    
    const activePlayers = players.filter(p => p.stack > 0);
    if (activePlayers.length < 2) return;

    sounds.playDeal();
    
    const { playerHands, remainingDeck } = dealToPlayers(deck, activePlayers.length, 2);
    deckRef.current = remainingDeck;

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
    setPot(30);
    setCurrentBet(20);
    setMinRaise(40);
    setGamePhase('preflop');
    triggerPhaseTransition('preflop');
    setIsMyTurn(true);
    setWinner(null);
    setActionBubbles([]);
    setMyHandEvaluation(null);
  }, [players, playerId, sounds, triggerPhaseTransition]);

  // Auto-start game in demo mode when players are loaded
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!tableId && players.length >= 2 && gamePhase === 'waiting' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Small delay to let UI render first
      const timer = setTimeout(() => {
        startNewHand();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [players.length, gamePhase, tableId, startNewHand]);

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
        sounds.playFold();
        break;
      case 'check':
        sounds.playCheck();
        break;
      case 'call':
        sounds.playCall();
        betAmount = Math.min(currentBet - (myPlayer.currentBet || 0), myPlayer.stack);
        newStack = myPlayer.stack - betAmount;
        break;
      case 'raise':
        sounds.playRaise();
        betAmount = amount || minRaise;
        newStack = myPlayer.stack - betAmount;
        setCurrentBet(betAmount);
        setMinRaise(betAmount * 2);
        break;
      case 'allin':
        sounds.playAllIn();
        betAmount = myPlayer.stack;
        newStack = 0;
        break;
    }

    showActionBubble(playerId, action.toUpperCase(), betAmount > 0 ? betAmount : undefined);
    setPot(p => p + betAmount);

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
    setTimeout(() => simulateOpponents(), 600);
  }, [players, playerId, currentBet, minRaise, sounds, showActionBubble]);

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

    setTimeout(() => advancePhase(), 800);
  }, [playerId, currentBet]);

  // Advance game phase
  const advancePhase = useCallback(() => {
    const deck = deckRef.current.length > 5 ? deckRef.current : shuffleDeckSecure(createDeck());

    setPlayers(prev => prev.map(p => ({ ...p, lastAction: undefined, currentBet: 0 })));
    setCurrentBet(0);

    let newPhase: GamePhase = gamePhase;

    switch (gamePhase) {
      case 'preflop': {
        const flop = dealCards(deck.slice(1), 3);
        deckRef.current = flop.remainingDeck;
        setCommunityCards(flop.dealtCards.map(cardToString));
        newPhase = 'flop';
        break;
      }
      case 'flop': {
        const turn = dealCards(deckRef.current.slice(1), 1);
        deckRef.current = turn.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(turn.dealtCards[0])]);
        newPhase = 'turn';
        break;
      }
      case 'turn': {
        const river = dealCards(deckRef.current.slice(1), 1);
        deckRef.current = river.remainingDeck;
        setCommunityCards(prev => [...prev, cardToString(river.dealtCards[0])]);
        newPhase = 'river';
        break;
      }
      case 'river': {
        const activePlayers = players.filter(p => !p.isFolded);
        const hero = players.find(p => p.id === playerId);
        
        if (hero?.cards && communityCards.length >= 5) {
          // Simplified hand evaluation display
          setMyHandEvaluation({ name: 'Two Pair' });
        }
        
        if (activePlayers.length > 0) {
          const winnerPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
          
          sounds.playWin();
          
          setWinner({
            id: winnerPlayer.id,
            name: winnerPlayer.name,
            amount: pot,
            handRank: 'Two Pair, Aces and Kings'
          });

          if (winnerPlayer.id === playerId) {
            setPlayers(prev => prev.map(p => 
              p.id === playerId ? { ...p, stack: p.stack + pot } : p
            ));
          }
        }
        newPhase = 'showdown';
        setGamePhase(newPhase);
        triggerPhaseTransition(newPhase);
        return;
      }
    }

    setGamePhase(newPhase);
    triggerPhaseTransition(newPhase);
    setIsMyTurn(true);
  }, [gamePhase, players, playerId, pot, communityCards, sounds, triggerPhaseTransition]);

  // Close winner overlay
  const handleCloseWinner = useCallback(() => {
    setWinner(null);
    setTimeout(() => {
      setGamePhase('waiting');
      setCommunityCards([]);
      setPot(0);
      setMyHandEvaluation(null);
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

  // Loading state for real tables
  if (tableId && isConnecting) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-amber-400 animate-spin mx-auto" />
          <p className="text-white/60 mt-4">Подключение к столу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Connection status banner for real tables */}
      {tableId && (
        <ConnectionStatusBanner
          status={reconnectManager.status}
          retryCount={reconnectManager.retryCount}
          nextRetryIn={reconnectManager.nextRetryIn}
          onReconnectNow={reconnectManager.reconnectNow}
          onCancel={reconnectManager.cancelReconnect}
        />
      )}

      {/* Header */}
      <TableHeader
        onLeave={onLeave}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        playerCount={activePlayerCount}
        blinds="10/20"
        onNewHand={startNewHand}
        showChat={showChat}
        onToggleChat={() => setShowChat(!showChat)}
      />

      {/* Main Table Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-4 md:inset-8">
          {/* Table felt */}
          <TableFelt />

          {/* Pot display - SYNDIKATE brutal style with neon orange */}
          {pot > 0 && (
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-20">
              <motion.div 
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(26,26,26,0.95) 100%)',
                  boxShadow: '0 0 20px rgba(255, 122, 0, 0.3), 0 4px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 122, 0, 0.2)',
                  border: '1px solid rgba(255, 122, 0, 0.3)',
                  clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {/* Chip icon - Syndikate orange */}
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #ff7a00 0%, #cc5500 100%)',
                    boxShadow: '0 0 10px rgba(255, 122, 0, 0.5), 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 border-black/30" />
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-orange-400 font-black text-lg tracking-wide"
                    style={{ textShadow: '0 0 10px rgba(255, 122, 0, 0.4)' }}
                  >
                    {pot.toLocaleString()}
                  </span>
                </div>
              </motion.div>
              <div className="text-center mt-1">
                <span className="text-orange-500/50 text-[10px] font-bold uppercase tracking-wider">Pot</span>
              </div>
            </div>
          )}

          {/* Community cards */}
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 z-20">
            <CommunityCards cards={communityCards} phase={gamePhase} />
          </div>

          {/* Phase transition overlay */}
          <AnimatePresence>
            {showPhaseTransition && gamePhase !== 'waiting' && (
              <PhaseTransition phase={gamePhase} />
            )}
          </AnimatePresence>

          {/* Action bubbles */}
          {actionBubbles.map(bubble => (
            <ActionBubble
              key={bubble.id}
              action={bubble.action}
              amount={bubble.amount}
              x={bubble.x}
              y={bubble.y}
            />
          ))}

          {/* Player seats */}
          {SEAT_POSITIONS_6MAX.map((pos, idx) => {
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
              {/* Hand evaluation */}
              {myHandEvaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2"
                >
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold">
                    {myHandEvaluation.name}
                  </div>
                </motion.div>
              )}
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
                <Zap className="h-5 w-5 mr-2" />
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

      {/* Waiting/Showdown actions */}
      {gamePhase === 'showdown' && !winner && (
        <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 border-t border-white/10 p-3 pb-safe z-20">
          <Button
            onClick={handleCloseWinner}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-base rounded-xl"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            New Hand
          </Button>
        </div>
      )}
    </div>
  );
}

// Wrapper with Error Boundary and Connection Status
export function TelegramStablePokerTable(props: TelegramStablePokerTableProps) {
  return (
    <PokerErrorBoundary 
      onReset={() => window.location.reload()} 
      onGoHome={props.onLeave}
    >
      <TelegramStablePokerTableInner {...props} />
    </PokerErrorBoundary>
  );
}

export default TelegramStablePokerTable;
