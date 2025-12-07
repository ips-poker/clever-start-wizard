import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Send,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw, Wifi, WifiOff,
  Shield, Rabbit, Clock, Bomb, Layers, Settings, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';

// Import pro features components
import { EquityDisplay } from '@/components/poker/EquityDisplay';
import { EVCashoutPanel } from '@/components/poker/EVCashoutPanel';
import { AllInInsurance } from '@/components/poker/AllInInsurance';
import { SqueezeHand } from '@/components/poker/SqueezeCard';
import { RabbitHuntPanel } from '@/components/poker/RabbitHuntPanel';
import { SidePotsDisplay } from '@/components/poker/SidePotsDisplay';

interface OnlinePokerTableProps {
  tableId: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  buyIn?: number;
  onLeave: () => void;
}

// Позиции для 6-max стола
const SEAT_POSITIONS_6MAX = [
  { top: '75%', left: '50%', transform: 'translate(-50%, -50%)' },
  { top: '55%', left: '8%', transform: 'translate(-50%, -50%)' },
  { top: '20%', left: '12%', transform: 'translate(-50%, -50%)' },
  { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' },
  { top: '20%', left: '88%', transform: 'translate(-50%, -50%)' },
  { top: '55%', left: '92%', transform: 'translate(-50%, -50%)' },
];

const SUIT_SYMBOLS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const QUICK_EMOJIS = ['👍', '👎', '😂', '😡', '🎉', '💰', '🔥', '💀'];

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  buyIn = 10000,
  onLeave
}: OnlinePokerTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [betAmount, setBetAmount] = useState(40);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pro features state
  const [showEVCashout, setShowEVCashout] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [showRabbitHunt, setShowRabbitHunt] = useState(false);
  const [useSqueeze, setUseSqueeze] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Use the main poker table hook
  const pokerTable = usePokerTable(playerId ? { tableId, playerId, buyIn } : null);
  
  const {
    isConnected,
    isConnecting,
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaiseAmount,
    error,
    chatMessages,
    showdownResult,
    lastAction,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    sendChat: sendTableChat,
    disconnect,
    postStraddle,
    useTimeBank,
    triggerBombPot,
    isBombPot,
    bombPotEnabled,
    timeBankRemaining,
    canPostStraddle,
    straddleAmount,
    hasPostedStraddle,
    configureTable
  } = pokerTable;

  const players = tableState?.players || [];
  const minRaise = tableState?.minRaise || minRaiseAmount || 40;

  // Update bet amount when minRaise changes
  useEffect(() => {
    setBetAmount(minRaise);
  }, [minRaise]);

  // Detect all-in situation for showing equity/insurance
  const isAllInSituation = useMemo(() => {
    if (!tableState || tableState.phase === 'waiting' || tableState.phase === 'preflop') return false;
    const activePlayers = players.filter(p => !p.isFolded);
    const allInPlayers = activePlayers.filter(p => p.isAllIn);
    return allInPlayers.length >= 1 && activePlayers.length >= 2;
  }, [tableState, players]);

  // Convert players for EquityDisplay
  const pokerPlayersForEquity = useMemo((): PokerPlayer[] => {
    return players
      .filter(p => !p.isFolded && p.holeCards && p.holeCards.length === 2 && p.holeCards[0] !== '??')
      .map(p => ({
        oderId: p.oderId,
        seatNumber: p.seatNumber,
        name: p.name,
        stack: p.stack,
        holeCards: p.holeCards || [],
        betAmount: p.betAmount || 0,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isActive: !p.isFolded && p.stack > 0,
      }));
  }, [players]);

  // My equity for insurance/cashout
  const myEquity = useMemo(() => {
    if (!isAllInSituation || !myPlayer || myPlayer.isFolded) return 0;
    const activePlayers = players.filter(p => !p.isFolded);
    return 100 / Math.max(1, activePlayers.length);
  }, [isAllInSituation, myPlayer, players]);

  // Turn timer
  useEffect(() => {
    if (isMyTurn) {
      setTimeRemaining(tableState?.actionTimer || 30);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-fold when time runs out
            fold();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, tableState?.actionTimer, fold]);

  // Show winner toast
  useEffect(() => {
    if (showdownResult?.winners && showdownResult.winners.length > 0) {
      const myWin = showdownResult.winners.find(w => w.oderId === playerId);
      if (myWin) {
        toast.success(`Вы выиграли ${myWin.amount}! ${myWin.handRank || ''}`);
      }
    }
  }, [showdownResult, playerId]);

  // Handle leave
  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Render card
  const renderCard = (cardStr: string, faceDown = false, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = { sm: 'w-8 h-11', md: 'w-11 h-15', lg: 'w-14 h-19' };
    
    if (faceDown || !cardStr || cardStr === '??') {
      return (
        <div className={cn(sizeClasses[size], "rounded-lg bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-600/50 shadow-lg flex items-center justify-center")}>
          <span className="text-blue-400/40 text-lg font-bold">♠</span>
        </div>
      );
    }

    const rank = cardStr[0];
    const suit = cardStr[1];
    const isRed = suit === 'h' || suit === 'd';
    
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(sizeClasses[size], "rounded-lg bg-white border border-gray-200 flex flex-col items-center justify-center shadow-lg relative overflow-hidden")}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
        <div className={cn("relative z-10 flex flex-col items-center", isRed ? 'text-red-600' : 'text-gray-900')}>
          <span className={cn("font-bold leading-none", size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>{rank}</span>
          <span className={cn(size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl')}>{SUIT_SYMBOLS[suit] || suit}</span>
        </div>
      </motion.div>
    );
  };

  // Render player seat
  const renderPlayerSeat = (seatNumber: number) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.seatNumber === mySeat;
    const isCurrentPlayer = tableState?.currentPlayerSeat === seatNumber;
    const isWinner = showdownResult?.winners?.some(w => w.seatNumber === seatNumber);
    const isDealer = tableState?.dealerSeat === seatNumber;
    const isSB = tableState?.smallBlindSeat === seatNumber;
    const isBB = tableState?.bigBlindSeat === seatNumber;
    
    if (!player) {
      return (
        <div key={seatNumber} className="absolute flex flex-col items-center" style={position}>
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
            <Users className="w-5 h-5 text-white/30" />
          </div>
          <span className="text-[10px] text-white/30 mt-1">Seat {seatNumber}</span>
        </div>
      );
    }

    return (
      <motion.div
        key={seatNumber}
        className="absolute flex flex-col items-center"
        style={position}
        animate={{ scale: isCurrentPlayer ? 1.05 : 1, opacity: player.isFolded ? 0.5 : 1 }}
      >
        {/* Timer ring */}
        {isCurrentPlayer && isHero && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,200,0,0.3)" strokeWidth="3" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="#ffc800" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={283}
              strokeDashoffset={283 - (283 * timeRemaining) / (tableState?.actionTimer || 30)}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
        
        {/* Disconnected indicator */}
        {player.isDisconnected && (
          <div className="absolute -top-2 -right-2 z-20">
            <WifiOff className="w-4 h-4 text-red-500" />
          </div>
        )}
        
        {/* Avatar */}
        <div className={cn(
          "relative w-14 h-14 rounded-full overflow-hidden border-2",
          isWinner ? "border-yellow-400 ring-2 ring-yellow-400/50" :
          isCurrentPlayer ? "border-yellow-500" :
          player.isFolded ? "border-gray-600" :
          isHero ? "border-blue-500" : "border-gray-500"
        )}>
          <Avatar className="w-full h-full">
            <AvatarImage src={player.avatarUrl || ''} />
            <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm">
              {(player.name || 'P').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Dealer button */}
          {isDealer && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-lg">D</div>
          )}
          
          {/* Small/Big blind indicator */}
          {isSB && !isDealer && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-lg">SB</div>
          )}
          {isBB && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-lg">BB</div>
          )}
          
          {isWinner && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Crown className="w-5 h-5 text-yellow-400" />
            </motion.div>
          )}
        </div>
        
        {/* Info */}
        <div className={cn("mt-1 px-2 py-1 rounded-lg min-w-[70px] text-center", isWinner ? "bg-yellow-500/90" : player.isFolded ? "bg-gray-800/80" : "bg-gray-900/90")}>
          <p className={cn("text-[10px] font-medium truncate max-w-[70px]", isWinner ? "text-gray-900" : "text-white")}>
            {isHero ? 'You' : player.name || `Player ${seatNumber}`}
          </p>
          <div className={cn("flex items-center justify-center gap-0.5 text-[11px] font-bold", isWinner ? "text-gray-900" : "text-yellow-400")}>
            <span>{player.stack.toLocaleString()}</span>
          </div>
          {/* Time bank indicator */}
          {isHero && timeBankRemaining > 0 && (
            <div className="flex items-center justify-center gap-1 text-[8px] text-blue-400">
              <Clock className="w-2 h-2" />
              <span>{timeBankRemaining}s</span>
            </div>
          )}
        </div>
        
        {/* Current bet */}
        {(player.betAmount || 0) > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1 px-2 py-0.5 bg-yellow-500/80 rounded text-[9px] font-bold text-black">
            {player.betAmount}
          </motion.div>
        )}
        
        {/* Status badges */}
        <div className="flex gap-1 mt-1">
          {player.isAllIn && <Badge className="bg-purple-600 text-white text-[8px] px-1 py-0">ALL-IN</Badge>}
          {player.isFolded && <Badge className="bg-red-600/50 text-white text-[8px] px-1 py-0">FOLD</Badge>}
        </div>

        {/* Cards */}
        {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.holeCards.map((card, idx) => (
              <div key={idx}>{renderCard(isHero ? card : (tableState?.phase === 'showdown' ? card : '??'), false, 'sm')}</div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // Send chat
  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendTableChat(chatInput.trim());
      setChatInput('');
    }
  };

  // Handle use time bank
  const handleUseTimeBank = () => {
    if (timeBankRemaining > 0) {
      useTimeBank(30);
      toast.info('Time bank activated: +30s');
    }
  };

  // Handle straddle
  const handlePostStraddle = () => {
    if (canPostStraddle && !hasPostedStraddle) {
      postStraddle(straddleAmount);
      toast.info(`Straddle posted: ${straddleAmount}`);
    }
  };

  // Handle bomb pot
  const handleTriggerBombPot = () => {
    if (bombPotEnabled) {
      triggerBombPot();
      toast.info('Bomb pot triggered for next hand!');
    }
  };

  if (!playerId) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p>Player ID required to join table</p>
          <Button onClick={onLeave} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  // Loading state while connecting
  if (!isConnected && isConnecting) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-syndikate-orange" />
          <p className="text-lg font-semibold">Подключение к столу...</p>
          <p className="text-sm text-white/60 mt-2">Пожалуйста, подождите</p>
          <Button onClick={onLeave} variant="ghost" className="mt-6 text-white/70">
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  // Connection error state
  if (!isConnected && !isConnecting && error) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold">Ошибка подключения</p>
          <p className="text-sm text-white/60 mt-2">{error}</p>
          <div className="flex gap-2 mt-6 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-syndikate-orange">
              Повторить
            </Button>
            <Button onClick={onLeave} variant="ghost" className="text-white/70">
              Назад
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/90 to-transparent z-20">
        <Button variant="ghost" size="icon" onClick={handleLeave} className="h-9 w-9 text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-sm font-semibold text-white">Texas Hold'em</h1>
            {isConnected ? <Wifi className="w-3 h-3 text-green-400" /> : 
             isConnecting ? <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" /> : 
             <WifiOff className="w-3 h-3 text-red-400" />}
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/60">
            <span>{tableState?.smallBlindAmount || 10}/{tableState?.bigBlindAmount || 20}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{players.length} players</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="capitalize">{tableState?.phase || 'connecting...'}</span>
            {isBombPot && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-orange-400 flex items-center gap-1">
                  <Bomb className="w-3 h-3" /> Bomb Pot
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-9 w-9 text-white/70">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} className="h-9 w-9 text-white/70 relative">
            <MessageSquare className="h-4 w-4" />
            {chatMessages.length > 0 && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="h-9 w-9 text-white/70">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-12 bottom-32 w-64 bg-gray-900/95 backdrop-blur-lg z-30 flex flex-col border-l border-white/10"
          >
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("text-xs", msg.playerId === playerId ? "text-right" : "")}>
                  <span className="text-blue-400 font-medium">{msg.playerName || 'Player'}: </span>
                  <span className="text-white/80">{msg.text || msg.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1 p-2 border-t border-white/10 flex-wrap">
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => sendTableChat(emoji)} className="text-lg hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2 p-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Message..."
                className="flex-1 h-8 text-xs bg-white/10 border-white/20 text-white"
              />
              <Button size="icon" onClick={handleSendChat} className="h-8 w-8 bg-blue-600">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-4">
          {/* Table */}
          <div 
            className="absolute inset-0 rounded-[50%] overflow-hidden"
            style={{
              background: isBombPot 
                ? 'linear-gradient(180deg, #5a3a1a 0%, #3d2810 50%, #5a3a1a 100%)' 
                : 'linear-gradient(180deg, #1a5a3a 0%, #0d3d28 50%, #1a5a3a 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 8px #2d1810, 0 0 0 12px #1a0f0a',
              border: isBombPot ? '4px solid #ff6b35' : '4px solid #3d2518'
            }}
          />

          {/* Pot & Side Pots */}
          {(tableState?.pot || 0) > 0 && (
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
              {/* Main Pot */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-4 py-1.5 bg-black/60 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-bold text-sm">{tableState?.pot.toLocaleString()}</span>
              </motion.div>
              
              {/* Side Pots with component */}
              {tableState?.sidePots && (
                <SidePotsDisplay sidePots={tableState.sidePots} className="mt-1" />
              )}
            </div>
          )}

          {/* Community Cards */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            <AnimatePresence mode="popLayout">
              {(tableState?.communityCards || []).map((card, i) => (
                <motion.div key={i} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}>
                  {renderCard(card, false, 'md')}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Player Seats */}
          {[1, 2, 3, 4, 5, 6].map(seat => renderPlayerSeat(seat))}
        </div>
      </div>

      {/* Hero Cards - with optional squeeze */}
      {myCards && myCards.length > 0 && myCards[0] !== '??' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          {useSqueeze && tableState?.phase === 'preflop' ? (
            <SqueezeHand 
              cards={myCards} 
              size="lg"
              onRevealComplete={() => setUseSqueeze(false)}
            />
          ) : (
            <div className="flex gap-2">
              {myCards.map((card, idx) => (
                <motion.div key={idx} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}>
                  {renderCard(card, false, 'lg')}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Equity Display - shows during all-in situations */}
      {isAllInSituation && pokerPlayersForEquity.length >= 2 && (
        <EquityDisplay
          players={pokerPlayersForEquity}
          communityCards={tableState?.communityCards || []}
          phase={tableState?.phase || 'waiting'}
          showAlways={true}
        />
      )}

      {/* EV Cashout Panel - shows when player is all-in */}
      {showEVCashout && myPlayer?.isAllIn && tableState && (
        <div className="absolute top-20 left-4 z-40">
          <EVCashoutPanel
            scenario={{
              pot: tableState.pot,
              phase: tableState.phase as 'flop' | 'turn' | 'river',
              communityCards: tableState.communityCards,
              players: players.filter(p => !p.isFolded).map(p => ({
                playerId: p.oderId,
                playerName: p.name || '',
                cards: p.holeCards || [],
                stack: p.stack,
                contribution: p.betAmount || 0,
              }))
            }}
            playerId={playerId}
            onAcceptCashout={(amount) => {
              toast.success(`Cashout accepted: ${amount}`);
              setShowEVCashout(false);
            }}
            onDeclineCashout={() => setShowEVCashout(false)}
          />
        </div>
      )}

      {/* All-In Insurance Modal */}
      <AllInInsurance
        isOpen={showInsurance}
        onClose={() => setShowInsurance(false)}
        onPurchase={(coverage) => {
          toast.success(`Insurance purchased: ${coverage}`);
          setShowInsurance(false);
        }}
        potAmount={tableState?.pot || 0}
        playerEquity={myEquity}
        maxInsurable={Math.floor((tableState?.pot || 0) * (myEquity / 100))}
        playerStack={myPlayer?.stack || 0}
        communityCards={tableState?.communityCards || []}
        holeCards={myCards || []}
      />

      {/* Pro Features Buttons */}
      {isAllInSituation && myPlayer && !myPlayer.isFolded && (
        <div className="absolute top-16 right-4 z-30 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEVCashout(!showEVCashout)}
            className="bg-amber-500/20 border-amber-500/50 text-amber-400 text-xs"
          >
            <Shield className="w-3 h-3 mr-1" />
            EV Cashout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInsurance(true)}
            className="bg-blue-500/20 border-blue-500/50 text-blue-400 text-xs"
          >
            <Shield className="w-3 h-3 mr-1" />
            Insurance
          </Button>
        </div>
      )}

      {/* Special Actions (Straddle, Bomb Pot, Time Bank) */}
      {tableState?.phase === 'waiting' && (
        <div className="absolute top-16 left-4 z-30 flex flex-col gap-2">
          {canPostStraddle && !hasPostedStraddle && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePostStraddle}
              className="bg-green-500/20 border-green-500/50 text-green-400 text-xs"
            >
              <Layers className="w-3 h-3 mr-1" />
              Straddle {straddleAmount}
            </Button>
          )}
          {bombPotEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTriggerBombPot}
              className="bg-orange-500/20 border-orange-500/50 text-orange-400 text-xs"
            >
              <Bomb className="w-3 h-3 mr-1" />
              Bomb Pot
            </Button>
          )}
        </div>
      )}

      {/* Time Bank Button (when it's my turn) */}
      {isMyTurn && timeBankRemaining > 0 && timeRemaining <= 10 && (
        <div className="absolute top-16 left-4 z-30">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUseTimeBank}
            className="bg-blue-500/20 border-blue-500/50 text-blue-400 text-xs animate-pulse"
          >
            <Clock className="w-3 h-3 mr-1" />
            Time Bank ({timeBankRemaining}s)
          </Button>
        </div>
      )}

      {/* Rabbit Hunt (after fold) */}
      {myPlayer?.isFolded && tableState?.phase !== 'showdown' && tableState?.phase !== 'waiting' && (
        <div className="absolute top-20 left-4 z-30">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRabbitHunt(!showRabbitHunt)}
            className="bg-purple-500/20 border-purple-500/50 text-purple-400 text-xs"
          >
            <Rabbit className="w-3 h-3 mr-1" />
            Rabbit Hunt
          </Button>
          {showRabbitHunt && (
            <RabbitHuntPanel
              foldedPlayerCards={myCards || []}
              communityCards={tableState?.communityCards || []}
              usedCards={players.flatMap(p => p.holeCards || [])}
              potSize={tableState?.pot || 0}
              onPurchase={(cost) => toast.info(`Rabbit hunt: -${cost} chips`)}
              className="mt-2"
            />
          )}
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 border-t border-white/10 p-3 pb-safe z-20">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        
        {!isConnected && !isConnecting ? (
          <div className="flex items-center justify-center py-3 text-red-400">
            <WifiOff className="h-4 w-4 mr-2" />
            Disconnected. Reconnecting...
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </div>
        ) : tableState?.phase === 'waiting' ? (
          <div className="flex gap-3">
            <Button
              onClick={startHand}
              disabled={players.length < 2}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl"
            >
              <Zap className="h-5 w-5 mr-2" />
              {players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
            </Button>
            <Button onClick={handleLeave} variant="outline" className="h-12 px-6 border-white/20 text-white rounded-xl">
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : isMyTurn ? (
          <div className="space-y-3">
            {/* Bet slider */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <Button size="sm" variant="ghost" onClick={() => setBetAmount(minRaise)} className="text-white/70 text-xs">Min</Button>
              <Slider
                value={[betAmount]}
                min={minRaise}
                max={myPlayer?.stack || 1000}
                step={10}
                onValueChange={([val]) => setBetAmount(val)}
                className="flex-1"
              />
              <Button size="sm" variant="ghost" onClick={() => setBetAmount(myPlayer?.stack || 1000)} className="text-white/70 text-xs">Max</Button>
              <div className="min-w-[60px] text-right">
                <span className="text-yellow-400 font-bold">{betAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-4 gap-2">
              <Button onClick={fold} className="h-12 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl">Fold</Button>
              <Button onClick={canCheck ? check : call} className="h-12 bg-blue-600/80 hover:bg-blue-600 text-white font-bold rounded-xl">
                {canCheck ? 'Check' : `Call ${callAmount}`}
              </Button>
              <Button onClick={() => raise(betAmount)} className="h-12 bg-green-600/80 hover:bg-green-600 text-white font-bold rounded-xl">Raise</Button>
              <Button onClick={allIn} className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl">All-In</Button>
            </div>
          </div>
        ) : tableState?.phase === 'showdown' ? (
          <Button onClick={startHand} className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl">
            <RotateCcw className="h-5 w-5 mr-2" />
            New Hand
          </Button>
        ) : (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-pulse" />
            Waiting for {players.find(p => p.seatNumber === tableState?.currentPlayerSeat)?.name || 'opponent'}...
          </div>
        )}
      </div>
    </div>
  );
}
