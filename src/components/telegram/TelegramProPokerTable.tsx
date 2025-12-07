import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, Volume2, VolumeX, Settings, MessageSquare,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw,
  Eye, EyeOff, Maximize2, Gift, Smile, TrendingUp
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
  determineWinners,
  Card as PokerCard,
  HandEvaluation,
  SUIT_NAMES,
  RANK_NAMES,
  getSuitColor
} from '@/utils/pokerEngine';
import { cn } from '@/lib/utils';

interface TelegramProPokerTableProps {
  tableId?: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerStack?: number;
  onLeave: () => void;
}

interface TablePlayer {
  id: string;
  name: string;
  avatar?: string;
  stack: number;
  seatNumber: number;
  cards?: PokerCard[];
  isFolded?: boolean;
  isAllIn?: boolean;
  isTurn?: boolean;
  isDealer?: boolean;
  currentBet?: number;
  lastAction?: string;
  isWinner?: boolean;
}

// Seat positions for 6-max table (PPPoker style - овальный стол)
const SEAT_POSITIONS_6MAX = [
  { top: '75%', left: '50%', transform: 'translate(-50%, -50%)' }, // Seat 1 - Bottom center (Hero)
  { top: '55%', left: '8%', transform: 'translate(-50%, -50%)' },  // Seat 2 - Left bottom
  { top: '20%', left: '12%', transform: 'translate(-50%, -50%)' }, // Seat 3 - Left top
  { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' },  // Seat 4 - Top center
  { top: '20%', left: '88%', transform: 'translate(-50%, -50%)' }, // Seat 5 - Right top
  { top: '55%', left: '92%', transform: 'translate(-50%, -50%)' }, // Seat 6 - Right bottom
];

export function TelegramProPokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  playerStack = 10000,
  onLeave
}: TelegramProPokerTableProps) {
  const [players, setPlayers] = useState<TablePlayer[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [pot, setPot] = useState(0);
  const [sidePots, setSidePots] = useState<number[]>([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [myStack, setMyStack] = useState(playerStack);
  const [myCards, setMyCards] = useState<PokerCard[]>([]);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [minBet, setMinBet] = useState(20);
  const [maxBet, setMaxBet] = useState(playerStack);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [myHandEvaluation, setMyHandEvaluation] = useState<HandEvaluation | null>(null);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showCardPeek, setShowCardPeek] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка реальных игроков со стола
  useEffect(() => {
    const loadTablePlayers = async () => {
      if (!tableId) {
        // Демо режим - используем демо-игроков
        const demoPlayers: TablePlayer[] = [
          { id: playerId || '1', name: playerName, avatar: playerAvatar, stack: myStack, seatNumber: 1, isDealer: false },
          { id: '2', name: 'Viktor_Pro', avatar: '', stack: 15420, seatNumber: 2 },
          { id: '3', name: 'PokerKing', avatar: '', stack: 8750, seatNumber: 4 },
          { id: '4', name: 'LuckyAce', avatar: '', stack: 12300, seatNumber: 5 },
        ];
        setPlayers(demoPlayers);
        return;
      }

      try {
        // Загружаем реальных игроков со стола
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
          const realPlayers: TablePlayer[] = tablePlayers.map((tp: any) => {
            const isHero = tp.player_id === playerId;
            return {
              id: tp.player_id,
              name: tp.players?.name || 'Unknown',
              avatar: tp.players?.avatar_url || undefined,
              stack: tp.stack,
              seatNumber: tp.seat_number,
              isDealer: tp.is_dealer,
              isFolded: false,
              isAllIn: false,
              currentBet: 0,
            };
          });
          
          // Если текущий игрок есть за столом, обновляем его стек
          const heroPlayer = realPlayers.find(p => p.id === playerId);
          if (heroPlayer) {
            setMyStack(heroPlayer.stack);
          }
          
          setPlayers(realPlayers);
          console.log('Loaded real players:', realPlayers);
        }
      } catch (err) {
        console.error('Error fetching table players:', err);
      }
    };

    loadTablePlayers();

    // Realtime подписка на изменения игроков за столом
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
  }, [tableId, playerId, playerName, playerAvatar, myStack]);

  // Таймер хода
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

  const startNewHand = () => {
    const deck = shuffleDeckSecure(createDeck());
    const numPlayers = players.length;
    const { playerHands, remainingDeck } = dealToPlayers(deck, numPlayers, 2);
    
    // Находим индекс hero игрока
    const heroIndex = players.findIndex(p => p.id === playerId);
    
    // Раздаём карты игрокам
    const updatedPlayers = players.map((p, idx) => ({
      ...p,
      cards: playerHands[idx] || [],
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      lastAction: undefined,
      isWinner: false,
      isTurn: p.id === playerId
    }));
    
    setPlayers(updatedPlayers);
    // Устанавливаем карты hero
    setMyCards(heroIndex >= 0 ? playerHands[heroIndex] || [] : []);
    setCommunityCards([]);
    setPot(30); // SB + BB
    setCurrentBet(20);
    setMinBet(20);
    setBetAmount(40);
    setGamePhase('preflop');
    setShowActions(true);
    setIsMyTurn(true);
    setWinnerIds([]);
    setMyHandEvaluation(null);
  };

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in') => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const updatedPlayers = [...players];
    const myPlayer = updatedPlayers.find(p => p.id === playerId);
    
    switch (action) {
      case 'fold':
        if (myPlayer) {
          myPlayer.isFolded = true;
          myPlayer.lastAction = 'FOLD';
        }
        toast.info('Fold');
        setShowActions(false);
        setIsMyTurn(false);
        // Автоматически переходим к showdown
        setTimeout(() => simulateOpponentsAndAdvance(), 500);
        break;
        
      case 'check':
        if (myPlayer) myPlayer.lastAction = 'CHECK';
        toast.info('Check');
        setShowActions(false);
        setIsMyTurn(false);
        setTimeout(() => simulateOpponentsAndAdvance(), 500);
        break;
        
      case 'call':
        if (myPlayer) {
          myPlayer.currentBet = currentBet;
          myPlayer.lastAction = 'CALL';
          setMyStack(prev => prev - currentBet);
        }
        setPot(p => p + currentBet);
        toast.info(`Call ${currentBet}`);
        setShowActions(false);
        setIsMyTurn(false);
        setTimeout(() => simulateOpponentsAndAdvance(), 500);
        break;
        
      case 'raise':
        if (myPlayer) {
          myPlayer.currentBet = betAmount;
          myPlayer.lastAction = `RAISE ${betAmount}`;
          setMyStack(prev => prev - betAmount);
        }
        setPot(p => p + betAmount);
        setCurrentBet(betAmount);
        toast.info(`Raise to ${betAmount}`);
        setShowActions(false);
        setIsMyTurn(false);
        setTimeout(() => simulateOpponentsAndAdvance(), 500);
        break;
        
      case 'all-in':
        if (myPlayer) {
          myPlayer.isAllIn = true;
          myPlayer.currentBet = myStack;
          myPlayer.lastAction = 'ALL-IN';
          setPot(p => p + myStack);
          setMyStack(0);
        }
        toast.info('ALL-IN!');
        setShowActions(false);
        setIsMyTurn(false);
        setTimeout(() => simulateOpponentsAndAdvance(), 500);
        break;
    }
    
    setPlayers(updatedPlayers);
  };

  const simulateOpponentsAndAdvance = () => {
    // Симуляция действий оппонентов
    const updatedPlayers = players.map(p => {
      if (p.id !== playerId && !p.isFolded) {
        const actions = ['CALL', 'CHECK', 'FOLD'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        return { ...p, lastAction: randomAction, isFolded: randomAction === 'FOLD' };
      }
      return p;
    });
    setPlayers(updatedPlayers);
    
    // Переход к следующей фазе
    setTimeout(() => advancePhase(), 800);
  };

  const advancePhase = () => {
    const deck = shuffleDeckSecure(createDeck());
    
    if (gamePhase === 'preflop') {
      const { dealtCards } = dealCards(deck, 3);
      setCommunityCards(dealtCards);
      setGamePhase('flop');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'flop') {
      const newCard = dealCards(deck, 1).dealtCards[0];
      setCommunityCards(prev => [...prev, newCard]);
      setGamePhase('turn');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'turn') {
      const newCard = dealCards(deck, 1).dealtCards[0];
      setCommunityCards(prev => [...prev, newCard]);
      setGamePhase('river');
      setShowActions(true);
      setIsMyTurn(true);
    } else if (gamePhase === 'river') {
      // Showdown
      if (myCards.length > 0 && communityCards.length >= 5) {
        const evaluation = evaluateHand([...myCards, ...communityCards]);
        setMyHandEvaluation(evaluation);
      }
      
      // Определяем победителя (упрощенно)
      const activePlayers = players.filter(p => !p.isFolded);
      if (activePlayers.length > 0) {
        const winnerId = activePlayers[Math.floor(Math.random() * activePlayers.length)].id;
        setWinnerIds([winnerId]);
        
        if (winnerId === playerId) {
          toast.success(`Вы выиграли ${pot}!`);
          setMyStack(prev => prev + pot);
        } else {
          toast.info('Вы проиграли');
        }
      }
      
      setGamePhase('showdown');
      setShowActions(false);
      setIsMyTurn(false);
    }
  };

  const resetGame = () => {
    setGamePhase('waiting');
    setMyCards([]);
    setCommunityCards([]);
    setPot(0);
    setCurrentBet(0);
    setWinnerIds([]);
    setMyHandEvaluation(null);
    setShowActions(false);
    setIsMyTurn(false);
    setPlayers(prev => prev.map(p => ({
      ...p,
      cards: [],
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      lastAction: undefined,
      isWinner: false
    })));
  };

  // Рендер карты в стиле PPPoker
  const renderCard = (card: PokerCard, faceDown = false, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-11',
      md: 'w-11 h-15',
      lg: 'w-14 h-19'
    };
    
    if (faceDown) {
      return (
        <motion.div
          initial={{ rotateY: 0 }}
          className={cn(
            sizeClasses[size],
            "rounded-lg bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900",
            "border border-blue-600/50 shadow-lg",
            "flex items-center justify-center"
          )}
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 50%, #1e3a5f 100%)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <div className="text-blue-400/40 text-lg font-bold">♠</div>
        </motion.div>
      );
    }

    const color = getSuitColor(card.suit);
    const isRed = color === 'red';
    
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          sizeClasses[size],
          "rounded-lg bg-white border border-gray-200",
          "flex flex-col items-center justify-center shadow-lg relative overflow-hidden"
        )}
        style={{
          boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Фон карты */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
        
        {/* Контент */}
        <div className={cn(
          "relative z-10 flex flex-col items-center",
          isRed ? 'text-red-600' : 'text-gray-900'
        )}>
          <span className={cn(
            "font-bold leading-none",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            {RANK_NAMES[card.rank]}
          </span>
          <span className={cn(
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
          )}>
            {SUIT_NAMES[card.suit]}
          </span>
        </div>
      </motion.div>
    );
  };

  // Рендер игрока за столом
  const renderPlayerSeat = (seatNumber: number) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.id === playerId;
    const isWinner = player && winnerIds.includes(player.id);
    
    if (!player) {
      // Пустое место
      return (
        <div
          key={seatNumber}
          className="absolute flex flex-col items-center"
          style={position}
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
            <Users className="w-5 h-5 text-white/30" />
          </div>
          <span className="text-[10px] text-white/30 mt-1">Sit</span>
        </div>
      );
    }

    return (
      <motion.div
        key={seatNumber}
        className="absolute flex flex-col items-center"
        style={position}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: player.isTurn ? 1.05 : 1, 
          opacity: player.isFolded ? 0.5 : 1 
        }}
      >
        {/* Timer ring for active player */}
        {player.isTurn && isHero && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,200,0,0.3)"
              strokeWidth="3"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#ffc800"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={283}
              strokeDashoffset={283 - (283 * timeRemaining) / 30}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
        
        {/* Avatar */}
        <div className={cn(
          "relative w-14 h-14 rounded-full overflow-hidden border-2",
          isWinner ? "border-yellow-400 ring-2 ring-yellow-400/50" :
          player.isTurn ? "border-yellow-500" :
          player.isFolded ? "border-gray-600" :
          isHero ? "border-blue-500" : "border-gray-500"
        )}>
          <Avatar className="w-full h-full">
            <AvatarImage src={player.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm">
              {player.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Dealer button */}
          {player.isDealer && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-lg">
              D
            </div>
          )}
          
          {/* Winner crown */}
          {isWinner && (
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              className="absolute -top-3 left-1/2 -translate-x-1/2"
            >
              <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
            </motion.div>
          )}
        </div>
        
        {/* Player info panel */}
        <div className={cn(
          "mt-1 px-2 py-1 rounded-lg min-w-[70px] text-center",
          isWinner ? "bg-yellow-500/90" :
          player.isFolded ? "bg-gray-800/80" :
          "bg-gray-900/90"
        )}>
          <p className={cn(
            "text-[10px] font-medium truncate max-w-[70px]",
            isWinner ? "text-gray-900" : "text-white"
          )}>
            {isHero ? 'You' : player.name}
          </p>
          <div className={cn(
            "flex items-center justify-center gap-0.5 text-[11px] font-bold",
            isWinner ? "text-gray-900" : "text-yellow-400"
          )}>
            <span>{player.stack.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Last action */}
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase",
              player.lastAction.includes('FOLD') ? "bg-red-600 text-white" :
              player.lastAction.includes('ALL-IN') ? "bg-purple-600 text-white" :
              player.lastAction.includes('RAISE') ? "bg-green-600 text-white" :
              "bg-blue-600 text-white"
            )}
          >
            {player.lastAction}
          </motion.div>
        )}
        
        {/* Player cards (only show for hero or at showdown) */}
        {player.cards && player.cards.length > 0 && (isHero || gamePhase === 'showdown') && !player.isFolded && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.cards.map((card, idx) => (
              <div key={idx} className="transform hover:scale-110 transition-transform">
                {renderCard(card, !isHero && gamePhase !== 'showdown', 'sm')}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
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
            <span>10/20</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{players.filter(p => !p.isFolded).length} players</span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 relative">
        {/* Poker Table */}
        <div className="absolute inset-4 md:inset-8">
          {/* Table shape - овальный стол PPPoker style */}
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
            {/* Table felt pattern */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%)`
              }}
            />
            
            {/* Table edge highlight */}
            <div 
              className="absolute inset-2 rounded-[50%]"
              style={{
                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1)'
              }}
            />
          </div>

          {/* Pot display */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 z-10">
            {pot > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-black/60 rounded-full backdrop-blur-sm border border-white/10">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-white font-bold text-sm">{pot.toLocaleString()}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Community Cards */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            <AnimatePresence mode="popLayout">
              {communityCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ y: -30, opacity: 0, rotateY: 180 }}
                  animate={{ y: 0, opacity: 1, rotateY: 0 }}
                  transition={{ delay: i * 0.15, type: 'spring', stiffness: 300 }}
                >
                  {renderCard(card, false, 'md')}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Player Seats */}
          {[1, 2, 3, 4, 5, 6].map(seat => renderPlayerSeat(seat))}
        </div>
      </div>

      {/* Hero Cards - Peek View */}
      {myCards.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <div className="flex gap-2">
            {myCards.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="cursor-pointer"
              >
                {renderCard(card, !showCardPeek, 'lg')}
              </motion.div>
            ))}
          </div>
          
          {/* Hand strength indicator */}
          {myHandEvaluation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center"
            >
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3">
                {myHandEvaluation.name}
              </Badge>
            </motion.div>
          )}
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 backdrop-blur-lg border-t border-white/10 p-3 pb-safe z-20">
        {gamePhase === 'waiting' ? (
          <div className="flex gap-3">
            <Button
              onClick={startNewHand}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold text-base rounded-xl shadow-lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              Start Game
            </Button>
            <Button
              onClick={onLeave}
              variant="outline"
              className="h-12 px-6 border-white/20 text-white hover:bg-white/10 rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : showActions && isMyTurn ? (
          <div className="space-y-3">
            {/* Bet slider */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBetAmount(minBet)}
                className="text-white/70 hover:text-white text-xs"
              >
                Min
              </Button>
              <Slider
                value={[betAmount]}
                min={minBet}
                max={myStack}
                step={10}
                onValueChange={([val]) => setBetAmount(val)}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBetAmount(myStack)}
                className="text-white/70 hover:text-white text-xs"
              >
                Max
              </Button>
              <div className="min-w-[60px] text-right">
                <span className="text-yellow-400 font-bold">{betAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => handleAction('fold')}
                className="h-12 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl"
              >
                Fold
              </Button>
              <Button
                onClick={() => handleAction(currentBet === 0 ? 'check' : 'call')}
                className="h-12 bg-blue-600/80 hover:bg-blue-600 text-white font-bold rounded-xl"
              >
                {currentBet === 0 ? 'Check' : `Call ${currentBet}`}
              </Button>
              <Button
                onClick={() => handleAction('raise')}
                className="h-12 bg-green-600/80 hover:bg-green-600 text-white font-bold rounded-xl"
              >
                Raise
              </Button>
              <Button
                onClick={() => handleAction('all-in')}
                className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl"
              >
                All-In
              </Button>
            </div>
          </div>
        ) : gamePhase === 'showdown' ? (
          <div className="flex gap-3">
            <Button
              onClick={resetGame}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-base rounded-xl"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              New Hand
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-pulse" />
            Waiting for opponents...
          </div>
        )}
      </div>
    </div>
  );
}
