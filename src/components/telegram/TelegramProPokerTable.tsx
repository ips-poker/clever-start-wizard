import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, Volume2, VolumeX, Settings, MessageSquare,
  Timer, Users, Crown, Zap, X, RotateCcw,
  Eye, EyeOff, Maximize2, Gift, Smile, TrendingUp, Gem
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
import { PotDisplay } from '@/components/poker/AnimatedChips';
import { CommunityCards } from '@/components/poker/PokerCard';
import { ProFeaturesToolbar } from '@/components/poker/ProFeaturesToolbar';
import { usePokerProFeatures } from '@/hooks/usePokerProFeatures';

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
  const [allInPlayers, setAllInPlayers] = useState<{ playerId: string; name: string; cards: string[]; contribution: number }[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pro features hook
  const proFeatures = usePokerProFeatures({
    playerId: playerId || '',
    playerStack: myStack,
    communityCards: communityCards.map(c => `${RANK_NAMES[c.rank]}${c.suit.charAt(0)}`),
    holeCards: myCards.map(c => `${RANK_NAMES[c.rank]}${c.suit.charAt(0)}`),
    pot,
    phase: gamePhase === 'waiting' ? 'preflop' : gamePhase as any,
    allInPlayers,
    usedCards: [...communityCards, ...myCards].map(c => `${RANK_NAMES[c.rank]}${c.suit.charAt(0)}`),
    onChipsChange: (amount) => setMyStack(prev => prev + amount)
  });

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
          // Track all-in player for pro features
          if (myPlayer.cards) {
            setAllInPlayers(prev => [...prev, {
              playerId: myPlayer.id,
              name: myPlayer.name,
              cards: myPlayer.cards!.map(c => `${RANK_NAMES[c.rank]}${c.suit.charAt(0)}`),
              contribution: myStack
            }]);
          }
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
    setAllInPlayers([]);
    proFeatures.resetProFeatures();
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

  // Рендер игрока за столом - Syndikate Industrial Style
  const renderPlayerSeat = (seatNumber: number) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.id === playerId;
    const isWinner = player && winnerIds.includes(player.id);
    
    if (!player) {
      // Пустое место - Syndikate style
      return (
        <div
          key={seatNumber}
          className="absolute flex flex-col items-center"
          style={position}
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-syndikate-orange/30 bg-syndikate-metal/30 flex items-center justify-center backdrop-blur-sm">
            <Users className="w-5 h-5 text-syndikate-orange/40" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 font-medium">Сесть</span>
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
          scale: player.isTurn ? 1.08 : 1, 
          opacity: player.isFolded ? 0.4 : 1 
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Timer ring for active player - Syndikate orange glow */}
        {player.isTurn && isHero && (
          <svg className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsla(24, 100%, 50%, 0.2)"
              strokeWidth="4"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(24, 100%, 50%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={283}
              strokeDashoffset={283 - (283 * timeRemaining) / 30}
              transform="rotate(-90 50 50)"
              style={{ filter: 'drop-shadow(0 0 8px hsl(24, 100%, 50%))' }}
            />
          </svg>
        )}
        
        {/* Avatar - Syndikate circular design with glow effects */}
        <div className={cn(
          "relative w-14 h-14 rounded-full overflow-hidden transition-all duration-300",
          isWinner 
            ? "ring-[3px] ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]" 
            : player.isTurn 
              ? "ring-[3px] ring-syndikate-orange shadow-[0_0_20px_hsla(24,100%,50%,0.5)]" 
              : player.isFolded 
                ? "ring-2 ring-border/30 grayscale" 
                : isHero 
                  ? "ring-[3px] ring-syndikate-orange/70" 
                  : "ring-2 ring-border/50"
        )}>
          {/* Avatar Image - круглый, не квадратный */}
          <Avatar className="w-full h-full rounded-full">
            <AvatarImage 
              src={player.avatar} 
              className="object-cover w-full h-full rounded-full"
            />
            <AvatarFallback className="bg-gradient-to-br from-syndikate-metal to-syndikate-concrete text-foreground text-sm font-bold rounded-full w-full h-full flex items-center justify-center">
              {player.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Dealer button - Syndikate style */}
          {player.isDealer && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-syndikate-orange rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_hsla(24,100%,50%,0.7)]">
              D
            </div>
          )}
          
          {/* Winner crown - animated glow */}
          {isWinner && (
            <motion.div
              initial={{ scale: 0, y: -10, rotate: -15 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              className="absolute -top-4 left-1/2 -translate-x-1/2"
            >
              <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </motion.div>
          )}
          
          {/* All-in indicator */}
          {player.isAllIn && (
            <div className="absolute inset-0 bg-gradient-to-t from-purple-600/60 to-transparent flex items-end justify-center pb-1">
              <span className="text-[8px] font-black text-white uppercase tracking-wider">All-In</span>
            </div>
          )}
        </div>
        
        {/* Player info panel - Syndikate industrial style */}
        <div className={cn(
          "mt-1.5 px-3 py-1.5 rounded-lg min-w-[75px] text-center backdrop-blur-md transition-all duration-300",
          isWinner 
            ? "bg-gradient-to-r from-yellow-500/90 to-amber-500/90 shadow-[0_0_15px_rgba(250,204,21,0.4)]" 
            : player.isFolded 
              ? "bg-syndikate-metal/60" 
              : "bg-syndikate-metal/80 border border-border/30"
        )}>
          <p className={cn(
            "text-[10px] font-bold truncate max-w-[70px] uppercase tracking-wide",
            isWinner ? "text-background" : "text-foreground"
          )}>
            {isHero ? 'Вы' : player.name}
          </p>
          <div className={cn(
            "flex items-center justify-center gap-1 text-[11px] font-black",
            isWinner ? "text-background" : "text-syndikate-orange"
          )}>
            <Gem className="w-3 h-3" />
            <span>{player.stack.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Current bet indicator */}
        {player.currentBet && player.currentBet > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-syndikate-orange/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg"
          >
            {player.currentBet.toLocaleString()}
          </motion.div>
        )}
        
        {/* Last action badge - Syndikate style */}
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-lg",
              player.lastAction.includes('FOLD') 
                ? "bg-syndikate-red text-white" 
                : player.lastAction.includes('ALL-IN') 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                  : player.lastAction.includes('RAISE') 
                    ? "bg-green-600 text-white" 
                    : "bg-syndikate-metal-light text-foreground"
            )}
          >
            {player.lastAction}
          </motion.div>
        )}
        
        {/* Player cards - show for hero or at showdown */}
        {player.cards && player.cards.length > 0 && (isHero || gamePhase === 'showdown') && !player.isFolded && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.cards.map((card, idx) => (
              <motion.div 
                key={idx} 
                className="transform hover:scale-110 transition-transform"
                initial={{ rotateY: 180, y: 20 }}
                animate={{ rotateY: 0, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                {renderCard(card, !isHero && gamePhase !== 'showdown', 'sm')}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header - Syndikate Industrial Style */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-syndikate-metal/95 to-transparent backdrop-blur-sm z-20 border-b border-border/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeave}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-syndikate-metal"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">Texas Hold'em</h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <span className="text-syndikate-orange font-bold">10/20</span>
            <span className="w-1 h-1 rounded-full bg-syndikate-orange/60" />
            <span>{players.filter(p => !p.isFolded).length} игроков</span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-syndikate-metal"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-syndikate-metal"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 relative">
        {/* Poker Table - Syndikate Industrial Style */}
        <div className="absolute inset-4 md:inset-8">
          {/* Table shape - овальный стол Syndikate style */}
          <div 
            className="absolute inset-0 rounded-[50%] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, hsl(140, 50%, 18%) 0%, hsl(140, 60%, 12%) 50%, hsl(140, 50%, 18%) 100%)',
              boxShadow: `
                inset 0 0 80px rgba(0,0,0,0.6),
                0 0 0 6px hsl(var(--syndikate-rust)),
                0 0 0 10px hsl(var(--syndikate-concrete)),
                0 0 0 14px hsl(24, 100%, 50%, 0.3),
                0 10px 50px rgba(0,0,0,0.7)
              `,
              border: '3px solid hsl(var(--syndikate-metal-light))'
            }}
          >
            {/* Table felt pattern with industrial texture */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")
                `
              }}
            />
            
            {/* Syndikate orange accent glow on edge */}
            <div 
              className="absolute inset-0 rounded-[50%]"
              style={{
                boxShadow: 'inset 0 0 40px hsla(24, 100%, 50%, 0.1)'
              }}
            />
            
            {/* Table edge highlight */}
            <div 
              className="absolute inset-2 rounded-[50%]"
              style={{
                boxShadow: 'inset 0 2px 15px rgba(255,255,255,0.08)'
              }}
            />
          </div>

          {/* Pot display - using AnimatedChips PotDisplay */}
          <div className="absolute top-[32%] left-1/2 -translate-x-1/2 z-10">
            <PotDisplay mainPot={pot} sidePots={sidePots} />
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

          {/* Community Cards - using PokerCard CommunityCards */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 z-10">
            <CommunityCards 
              cards={communityCards.map(c => `${RANK_NAMES[c.rank]}${c.suit.charAt(0)}`)} 
              phase={gamePhase === 'waiting' ? 'preflop' : gamePhase}
            />
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
              <Badge className="bg-gradient-to-r from-syndikate-orange to-syndikate-red text-white px-4 py-1 font-bold uppercase tracking-wide shadow-[0_0_15px_hsla(24,100%,50%,0.5)]">
                {myHandEvaluation.name}
              </Badge>
            </motion.div>
          )}
        </div>
      )}

      {/* Action Panel - Syndikate Industrial Style */}
      <div className="bg-gradient-to-t from-syndikate-concrete via-syndikate-metal/95 to-syndikate-metal/80 backdrop-blur-lg border-t border-syndikate-orange/20 p-3 pb-safe z-20">
        {gamePhase === 'waiting' ? (
          <div className="flex gap-3">
            <Button
              onClick={startNewHand}
              className="flex-1 h-12 bg-gradient-to-r from-syndikate-orange to-syndikate-orange-glow hover:from-syndikate-orange-glow hover:to-syndikate-orange text-white font-black text-base rounded-lg shadow-[0_0_20px_hsla(24,100%,50%,0.4)] uppercase tracking-wide"
            >
              <Zap className="h-5 w-5 mr-2" />
              Начать игру
            </Button>
            <Button
              onClick={onLeave}
              variant="outline"
              className="h-12 px-6 border-border text-foreground hover:bg-syndikate-metal rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : showActions && isMyTurn ? (
          <div className="space-y-3">
            {/* Bet slider - Syndikate style */}
            <div className="flex items-center gap-3 bg-syndikate-concrete/50 rounded-lg p-3 border border-border/30">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBetAmount(minBet)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                Мин
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
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                Макс
              </Button>
              <div className="min-w-[70px] text-right flex items-center justify-end gap-1">
                <Gem className="w-4 h-4 text-syndikate-orange" />
                <span className="text-syndikate-orange font-black">{betAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons - Syndikate style */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => handleAction('fold')}
                className="h-12 bg-syndikate-red/90 hover:bg-syndikate-red text-white font-black rounded-lg uppercase text-sm"
              >
                Фолд
              </Button>
              <Button
                onClick={() => handleAction(currentBet === 0 ? 'check' : 'call')}
                className="h-12 bg-syndikate-metal-light hover:bg-syndikate-metal text-foreground font-black rounded-lg uppercase text-sm border border-border/30"
              >
                {currentBet === 0 ? 'Чек' : `Колл`}
              </Button>
              <Button
                onClick={() => handleAction('raise')}
                className="h-12 bg-green-700/90 hover:bg-green-600 text-white font-black rounded-lg uppercase text-sm"
              >
                Рейз
              </Button>
              <Button
                onClick={() => handleAction('all-in')}
                className="h-12 bg-gradient-to-r from-purple-600 to-syndikate-orange hover:from-purple-500 hover:to-syndikate-orange-glow text-white font-black rounded-lg uppercase text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                Ол-Ин
              </Button>
            </div>
          </div>
        ) : gamePhase === 'showdown' ? (
          <div className="flex gap-3">
            <Button
              onClick={resetGame}
              className="flex-1 h-12 bg-gradient-to-r from-syndikate-orange to-syndikate-orange-glow hover:from-syndikate-orange-glow hover:to-syndikate-orange text-white font-black text-base rounded-lg shadow-[0_0_20px_hsla(24,100%,50%,0.4)] uppercase tracking-wide"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Новая раздача
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3 text-muted-foreground">
            <Timer className="h-4 w-4 mr-2 animate-pulse text-syndikate-orange" />
            <span className="font-medium">Ожидание хода оппонентов...</span>
          </div>
        )}
      </div>
    </div>
  );
}
