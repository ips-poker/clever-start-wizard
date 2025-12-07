import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Eye, EyeOff
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

// Optimized components
import { OptimizedPlayerSeat, PlayerData } from '@/components/poker/OptimizedPlayerSeat';
import { OptimizedCommunityCards, HeroCards } from '@/components/poker/OptimizedCommunityCards';
import { OptimizedPotDisplay } from '@/components/poker/OptimizedPotDisplay';
import { OptimizedActionPanel } from '@/components/poker/OptimizedActionPanel';
import { ProFeaturesToolbar } from '@/components/poker/ProFeaturesToolbar';
import { usePokerProFeatures } from '@/hooks/usePokerProFeatures';
import { useStableState } from '@/hooks/useStableState';

interface OptimizedPokerTableProps {
  tableId?: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerStack?: number;
  onLeave: () => void;
}

type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

// Convert engine card to string format
function cardToString(card: PokerEngineCard): string {
  return `${RANK_NAMES[card.rank]}${card.suit.charAt(0)}`;
}

// Table background component - memoized
const TableBackground = memo(function TableBackground() {
  return (
    <div 
      className="absolute inset-0 rounded-[50%] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a5a3a 0%, #0d3d28 50%, #1a5a3a 100%)',
        boxShadow: `
          inset 0 0 60px rgba(0,0,0,0.5),
          0 0 0 8px #2d1810,
          0 0 0 12px #1a0f0a,
          0 10px 40px rgba(0,0,0,0.6)
        `,
        border: '4px solid #3d2518'
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%)`
      }} />
      <div className="absolute inset-2 rounded-[50%]" style={{
        boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1)'
      }} />
    </div>
  );
});

// Header component
const TableHeader = memo(function TableHeader({
  onLeave,
  soundEnabled,
  onToggleSound,
  showChat,
  onToggleChat,
  playerCount,
  blinds
}: {
  onLeave: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  playerCount: number;
  blinds: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/90 to-transparent z-20">
      <Button
        variant="ghost"
        size="icon"
        onClick={onLeave}
        className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="text-center flex-1">
        <h1 className="text-sm font-semibold text-white">Texas Hold'em</h1>
        <div className="flex items-center justify-center gap-2 text-[10px] text-white/60">
          <span>{blinds}</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>{playerCount} players</span>
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
          onClick={onToggleChat}
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export function OptimizedPokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  playerStack = 10000,
  onLeave
}: OptimizedPokerTableProps) {
  // Use stable state for frequently updated values
  const [pot, setPot, setPotImmediate] = useStableState(0, 50);
  const [myStack, setMyStack] = useState(playerStack);
  
  // Regular state
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [sidePots, setSidePots] = useState<number[]>([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [minBet, setMinBet] = useState(20);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [myHandEvaluation, setMyHandEvaluation] = useState<HandEvaluation | null>(null);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showCardPeek, setShowCardPeek] = useState(true);
  const [allInPlayers, setAllInPlayers] = useState<{ playerId: string; name: string; cards: string[]; contribution: number }[]>([]);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const deckRef = useRef<PokerEngineCard[]>([]);

  // Pro features hook
  const proFeatures = usePokerProFeatures({
    playerId: playerId || '',
    playerStack: myStack,
    communityCards,
    holeCards: myCards,
    pot,
    phase: gamePhase === 'waiting' ? 'preflop' : gamePhase as any,
    allInPlayers,
    usedCards: [...communityCards, ...myCards],
    onChipsChange: (amount) => setMyStack(prev => prev + amount)
  });

  // Computed values
  const activePlayers = useMemo(() => 
    players.filter(p => !p.isFolded), 
    [players]
  );

  // Load table players
  useEffect(() => {
    const loadTablePlayers = async () => {
      if (!tableId) {
        // Demo mode
        const demoPlayers: PlayerData[] = [
          { id: playerId || '1', name: playerName, avatar: playerAvatar, stack: myStack, seatNumber: 1, isDealer: false },
          { id: '2', name: 'Viktor_Pro', avatar: '', stack: 15420, seatNumber: 2 },
          { id: '3', name: 'PokerKing', avatar: '', stack: 8750, seatNumber: 4 },
          { id: '4', name: 'LuckyAce', avatar: '', stack: 12300, seatNumber: 5 },
        ];
        setPlayers(demoPlayers);
        return;
      }

      try {
        const { data: tablePlayers, error } = await supabase
          .from('poker_table_players')
          .select(`
            id, seat_number, stack, is_dealer, status, player_id,
            players!poker_table_players_player_id_fkey (id, name, avatar_url)
          `)
          .eq('table_id', tableId)
          .eq('status', 'active');

        if (error) {
          console.error('Error loading table players:', error);
          return;
        }

        if (tablePlayers && tablePlayers.length > 0) {
          const realPlayers: PlayerData[] = tablePlayers.map((tp: any) => ({
            id: tp.player_id,
            name: tp.players?.name || 'Unknown',
            avatar: tp.players?.avatar_url || undefined,
            stack: tp.stack,
            seatNumber: tp.seat_number,
            isDealer: tp.is_dealer,
          }));
          
          const heroPlayer = realPlayers.find(p => p.id === playerId);
          if (heroPlayer) {
            setMyStack(heroPlayer.stack);
          }
          
          setPlayers(realPlayers);
        }
      } catch (err) {
        console.error('Error fetching table players:', err);
      }
    };

    loadTablePlayers();

    // Realtime subscription
    if (tableId) {
      const channel = supabase
        .channel(`table-players-${tableId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'poker_table_players',
          filter: `table_id=eq.${tableId}`
        }, () => {
          loadTablePlayers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tableId, playerId, playerName, playerAvatar]);

  // Turn timer
  useEffect(() => {
    if (isMyTurn && showActions) {
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
  }, [isMyTurn, showActions]);

  const startNewHand = useCallback(() => {
    const deck = shuffleDeckSecure(createDeck());
    deckRef.current = deck;
    const numPlayers = players.length;
    const { playerHands, remainingDeck } = dealToPlayers(deck, numPlayers, 2);
    deckRef.current = remainingDeck;
    
    const heroIndex = players.findIndex(p => p.id === playerId);
    
    const updatedPlayers = players.map((p, idx) => ({
      ...p,
      cards: playerHands[idx]?.map(cardToString) || [],
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      lastAction: undefined,
      isWinner: false,
      isTurn: p.id === playerId
    }));
    
    setPlayers(updatedPlayers);
    setMyCards(heroIndex >= 0 ? playerHands[heroIndex]?.map(cardToString) || [] : []);
    setCommunityCards([]);
    setPotImmediate(30);
    setCurrentBet(20);
    setMinBet(20);
    setGamePhase('preflop');
    setShowActions(true);
    setIsMyTurn(true);
    setWinnerIds([]);
    setMyHandEvaluation(null);
  }, [players, playerId, setPotImmediate]);

  const handleAction = useCallback((action: ActionType, amount?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setPlayers(prev => {
      const updated = [...prev];
      const myPlayer = updated.find(p => p.id === playerId);
      if (!myPlayer) return prev;

      switch (action) {
        case 'fold':
          myPlayer.isFolded = true;
          myPlayer.lastAction = 'FOLD';
          break;
        case 'check':
          myPlayer.lastAction = 'CHECK';
          break;
        case 'call':
          myPlayer.currentBet = currentBet;
          myPlayer.lastAction = 'CALL';
          setPot(p => p + currentBet);
          setMyStack(s => s - currentBet);
          break;
        case 'raise':
          const raiseAmount = amount || minBet * 2;
          myPlayer.currentBet = raiseAmount;
          myPlayer.lastAction = `RAISE ${raiseAmount}`;
          setPot(p => p + raiseAmount);
          setCurrentBet(raiseAmount);
          setMyStack(s => s - raiseAmount);
          break;
        case 'all-in':
          myPlayer.isAllIn = true;
          myPlayer.currentBet = myStack;
          myPlayer.lastAction = 'ALL-IN';
          setPot(p => p + myStack);
          if (myPlayer.cards) {
            setAllInPlayers(prev => [...prev, {
              playerId: myPlayer.id,
              name: myPlayer.name,
              cards: myPlayer.cards!,
              contribution: myStack
            }]);
          }
          setMyStack(0);
          break;
      }
      
      myPlayer.isTurn = false;
      return updated;
    });

    toast.info(action.charAt(0).toUpperCase() + action.slice(1));
    setShowActions(false);
    setIsMyTurn(false);
    setTimeout(simulateOpponentsAndAdvance, 500);
  }, [playerId, currentBet, minBet, myStack, setPot]);

  const simulateOpponentsAndAdvance = useCallback(() => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId && !p.isFolded) {
        const actions = ['CALL', 'CHECK', 'FOLD'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        return { ...p, lastAction: randomAction, isFolded: randomAction === 'FOLD' };
      }
      return p;
    }));
    
    setTimeout(advancePhase, 800);
  }, [playerId]);

  const advancePhase = useCallback(() => {
    const deck = deckRef.current.length > 0 ? deckRef.current : shuffleDeckSecure(createDeck());
    
    if (gamePhase === 'preflop') {
      const { dealtCards, remainingDeck } = dealCards(deck, 3);
      deckRef.current = remainingDeck;
      setCommunityCards(dealtCards.map(cardToString));
      setGamePhase('flop');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'flop') {
      const { dealtCards, remainingDeck } = dealCards(deck, 1);
      deckRef.current = remainingDeck;
      setCommunityCards(prev => [...prev, cardToString(dealtCards[0])]);
      setGamePhase('turn');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'turn') {
      const { dealtCards, remainingDeck } = dealCards(deck, 1);
      deckRef.current = remainingDeck;
      setCommunityCards(prev => [...prev, cardToString(dealtCards[0])]);
      setGamePhase('river');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'river') {
      // Showdown logic would go here
      const active = players.filter(p => !p.isFolded);
      if (active.length > 0) {
        const winnerId = active[Math.floor(Math.random() * active.length)].id;
        setWinnerIds([winnerId]);
        
        if (winnerId === playerId) {
          toast.success(`You won ${pot}!`);
          setMyStack(prev => prev + pot);
        } else {
          toast.info('You lost');
        }
      }
      
      setGamePhase('showdown');
      setShowActions(false);
      setIsMyTurn(false);
    }
  }, [gamePhase, players, playerId, pot]);

  const resetGame = useCallback(() => {
    setGamePhase('waiting');
    setMyCards([]);
    setCommunityCards([]);
    setPotImmediate(0);
    setCurrentBet(0);
    setWinnerIds([]);
    setMyHandEvaluation(null);
    setShowActions(false);
    setIsMyTurn(false);
    setAllInPlayers([]);
    proFeatures.resetProFeatures();
    deckRef.current = [];
    setPlayers(prev => prev.map(p => ({
      ...p,
      cards: [],
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      lastAction: undefined,
      isWinner: false
    })));
  }, [setPotImmediate, proFeatures]);

  const toggleSound = useCallback(() => setSoundEnabled(s => !s), []);
  const toggleChat = useCallback(() => setShowChat(c => !c), []);
  const toggleCardPeek = useCallback(() => setShowCardPeek(p => !p), []);

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <TableHeader
        onLeave={onLeave}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        showChat={showChat}
        onToggleChat={toggleChat}
        playerCount={activePlayers.length}
        blinds="10/20"
      />

      {/* Main Table Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-4 md:inset-8">
          {/* Table background */}
          <TableBackground />

          {/* Pot display */}
          <div className="absolute top-[32%] left-1/2 -translate-x-1/2 z-10">
            <OptimizedPotDisplay mainPot={pot} sidePots={sidePots} />
          </div>

          {/* Pro Features Toolbar */}
          <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-20">
            <ProFeaturesToolbar
              canRabbitHunt={proFeatures.canRabbitHunt && gamePhase !== 'waiting'}
              rabbitHuntCost={proFeatures.rabbitHuntCost}
              onRabbitHunt={proFeatures.purchaseRabbitHunt}
              rabbitHuntActive={proFeatures.rabbitHuntActive}
              canRunItTwice={proFeatures.canUseRunItTwice}
              onRunItTwice={proFeatures.requestRunItTwice}
              runItTwiceActive={proFeatures.runItTwiceActive}
              hasInsuranceOptions={proFeatures.insuranceOptions.length > 0}
              onOpenInsurance={proFeatures.openInsuranceModal}
              hasCashoutOffer={!!proFeatures.myCashoutOffer}
              cashoutAmount={proFeatures.myCashoutOffer?.cashoutAmount}
              onOpenCashout={proFeatures.openCashoutModal}
              playerStack={myStack}
              compact
            />
          </div>

          {/* Community Cards */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 z-10">
            <OptimizedCommunityCards
              cards={communityCards}
              phase={gamePhase}
              size="md"
            />
          </div>

          {/* Player Seats */}
          {[1, 2, 3, 4, 5, 6].map(seat => {
            const player = players.find(p => p.seatNumber === seat);
            const isHero = player?.id === playerId;
            const isWinner = player ? winnerIds.includes(player.id) : false;
            
            return (
              <OptimizedPlayerSeat
                key={seat}
                seatNumber={seat}
                player={player}
                isHero={isHero}
                isWinner={isWinner}
                showCards={isHero || gamePhase === 'showdown'}
                timeRemaining={isHero && isMyTurn ? timeRemaining : 0}
                maxTime={30}
              />
            );
          })}
        </div>
      </div>

      {/* Hero Cards - Peek View */}
      {myCards.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <HeroCards
            cards={myCards}
            showPeek={showCardPeek}
            handName={myHandEvaluation?.name}
          />
          
          {/* Peek toggle */}
          <button
            onClick={toggleCardPeek}
            className="absolute -right-8 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white/80"
          >
            {showCardPeek ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 backdrop-blur-lg border-t border-white/10 p-3 pb-safe z-20">
        <OptimizedActionPanel
          gamePhase={gamePhase}
          isMyTurn={isMyTurn}
          showActions={showActions}
          currentBet={currentBet}
          minBet={minBet}
          myStack={myStack}
          onAction={handleAction}
          onStartGame={startNewHand}
          onNewHand={resetGame}
          onLeave={onLeave}
        />
      </div>
    </div>
  );
}
