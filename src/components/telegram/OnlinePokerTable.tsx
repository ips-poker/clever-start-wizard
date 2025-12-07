import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Send,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw, Wifi, WifiOff,
  Shield, Rabbit, Clock, Bomb, Layers, Settings, AlertTriangle, Loader2,
  Plus, ChevronUp, ChevronDown
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

// Позиции для 6-max стола в стиле PPPoker (процентные)
const SEAT_POSITIONS_6MAX = [
  { top: '85%', left: '50%' },   // 1 - Hero (внизу по центру)
  { top: '65%', left: '5%' },    // 2 - Слева внизу
  { top: '25%', left: '5%' },    // 3 - Слева вверху
  { top: '8%', left: '50%' },    // 4 - Сверху по центру
  { top: '25%', left: '95%' },   // 5 - Справа вверху
  { top: '65%', left: '95%' },   // 6 - Справа внизу
];

const SUIT_SYMBOLS: Record<string, { symbol: string; color: string }> = { 
  h: { symbol: '♥', color: '#ef4444' }, 
  d: { symbol: '♦', color: '#3b82f6' }, 
  c: { symbol: '♣', color: '#22c55e' }, 
  s: { symbol: '♠', color: '#1f2937' } 
};

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

  // Professional Card Component
  const PokerCard = ({ card, faceDown = false, size = 'md' }: { card: string; faceDown?: boolean; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeStyles = {
      sm: { width: 32, height: 44, fontSize: 12, suitSize: 14 },
      md: { width: 44, height: 62, fontSize: 16, suitSize: 20 },
      lg: { width: 56, height: 78, fontSize: 20, suitSize: 26 },
    };
    const s = sizeStyles[size];

    if (faceDown || !card || card === '??') {
      return (
        <div 
          className="rounded-md shadow-lg flex items-center justify-center"
          style={{
            width: s.width,
            height: s.height,
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1e40af 100%)',
            border: '2px solid #3b82f6',
          }}
        >
          <div className="w-full h-full rounded-md bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />
        </div>
      );
    }

    const rank = card[0] === 'T' ? '10' : card[0];
    const suit = card[1]?.toLowerCase() as keyof typeof SUIT_SYMBOLS;
    const suitInfo = SUIT_SYMBOLS[suit] || { symbol: '?', color: '#000' };

    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="rounded-md shadow-xl relative overflow-hidden"
        style={{
          width: s.width,
          height: s.height,
          background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            style={{ 
              fontSize: s.fontSize, 
              fontWeight: 700, 
              color: suitInfo.color,
              lineHeight: 1 
            }}
          >
            {rank}
          </span>
          <span style={{ fontSize: s.suitSize, color: suitInfo.color }}>
            {suitInfo.symbol}
          </span>
        </div>
        {/* Corner pip */}
        <div className="absolute top-0.5 left-0.5 flex flex-col items-center leading-none" style={{ color: suitInfo.color }}>
          <span style={{ fontSize: s.fontSize * 0.6, fontWeight: 600 }}>{rank}</span>
          <span style={{ fontSize: s.suitSize * 0.5 }}>{suitInfo.symbol}</span>
        </div>
      </motion.div>
    );
  };

  // Player Seat Component - PPPoker style
  const PlayerSeat = ({ seatNumber }: { seatNumber: number }) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.seatNumber === mySeat;
    const isCurrentPlayer = tableState?.currentPlayerSeat === seatNumber;
    const isWinner = showdownResult?.winners?.some(w => w.seatNumber === seatNumber);
    const isDealer = tableState?.dealerSeat === seatNumber;
    const isSB = tableState?.smallBlindSeat === seatNumber;
    const isBB = tableState?.bigBlindSeat === seatNumber;

    // Вычисляем позицию для карт и ставки
    const isLeft = seatNumber === 2 || seatNumber === 3;
    const isRight = seatNumber === 5 || seatNumber === 6;
    const isTop = seatNumber === 3 || seatNumber === 4 || seatNumber === 5;
    
    if (!player) {
      // Empty seat
      return (
        <div 
          className="absolute flex flex-col items-center"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/30 bg-black/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white/30" />
          </div>
          <span className="text-[9px] text-white/40 mt-1">Seat {seatNumber}</span>
        </div>
      );
    }

    return (
      <div
        className="absolute flex flex-col items-center"
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, -50%)',
          zIndex: isCurrentPlayer ? 20 : 10,
        }}
      >
        {/* Timer ring for current player */}
        {isCurrentPlayer && (
          <svg 
            className="absolute w-16 h-16"
            style={{ top: -4, left: '50%', transform: 'translateX(-50%)' }}
            viewBox="0 0 64 64"
          >
            <circle 
              cx="32" cy="32" r="28" 
              fill="none" 
              stroke="rgba(251, 191, 36, 0.3)" 
              strokeWidth="3" 
            />
            <motion.circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={176}
              strokeDashoffset={176 - (176 * timeRemaining) / (tableState?.actionTimer || 30)}
              transform="rotate(-90 32 32)"
            />
          </svg>
        )}

        {/* Avatar with status */}
        <div className="relative">
          {/* Avatar container */}
          <div 
            className={cn(
              "w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg",
              isWinner ? "border-yellow-400 ring-2 ring-yellow-400/50" :
              isCurrentPlayer ? "border-yellow-400" :
              player.isFolded ? "border-gray-600 opacity-50" :
              isHero ? "border-green-500" : "border-slate-500"
            )}
          >
            <Avatar className="w-full h-full">
              <AvatarImage src={player.avatarUrl || ''} />
              <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-sm font-bold">
                {(player.name || 'P').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Position badge (D, SB, BB) */}
          {(isDealer || isSB || isBB) && (
            <div 
              className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg",
                isDealer ? "bg-white text-gray-900" :
                isSB ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
              )}
            >
              {isDealer ? 'D' : isSB ? 'SB' : 'BB'}
            </div>
          )}

          {/* Disconnected indicator */}
          {player.isDisconnected && (
            <div className="absolute -top-1 -right-1">
              <WifiOff className="w-3 h-3 text-red-500" />
            </div>
          )}

          {/* Winner crown */}
          {isWinner && (
            <motion.div 
              initial={{ scale: 0, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              className="absolute -top-3 left-1/2 -translate-x-1/2"
            >
              <Crown className="w-5 h-5 text-yellow-400 drop-shadow-glow" />
            </motion.div>
          )}

          {/* Action label (Fold/All-In) */}
          {(player.isFolded || player.isAllIn) && (
            <div 
              className={cn(
                "absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] font-bold shadow",
                player.isAllIn ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"
              )}
            >
              {player.isAllIn ? 'ALL-IN' : 'FOLD'}
            </div>
          )}
        </div>

        {/* Name plate with stack */}
        <div 
          className={cn(
            "mt-1 px-2.5 py-0.5 rounded-md min-w-[68px] text-center shadow-lg",
            isWinner ? "bg-yellow-500" :
            isHero ? "bg-green-700" : 
            player.isFolded ? "bg-gray-800/80" : "bg-slate-800"
          )}
        >
          <p className={cn(
            "text-[10px] font-medium truncate max-w-[68px]",
            isWinner ? "text-gray-900" : "text-white"
          )}>
            {isHero ? 'Вы' : player.name || `Player ${seatNumber}`}
          </p>
          <p className={cn(
            "text-[11px] font-bold",
            isWinner ? "text-gray-900" : "text-green-400"
          )}>
            {player.stack.toLocaleString()}
          </p>
        </div>

        {/* Current bet chip */}
        {(player.betAmount || 0) > 0 && !player.isFolded && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-lg",
              "bg-gradient-to-r from-amber-600 to-amber-500"
            )}
            style={{
              top: isTop ? '100%' : isHero ? '-35%' : '50%',
              left: isLeft ? '110%' : isRight ? '-10%' : '50%',
              transform: isLeft || isRight ? 'translateY(-50%)' : 'translateX(-50%)',
            }}
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white/30" />
            <span className="text-[10px] font-bold text-white">{player.betAmount}</span>
          </motion.div>
        )}

        {/* Hole cards - show for hero or during showdown */}
        {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
          <div 
            className={cn(
              "absolute flex gap-0.5",
              isTop ? "-bottom-10" : "-top-10",
              isLeft ? "left-full ml-2" : isRight ? "right-full mr-2" : "left-1/2 -translate-x-1/2"
            )}
            style={{
              transform: (isLeft || isRight) ? 'translateY(-50%)' : isTop ? undefined : 'translateX(-50%)',
              top: isLeft || isRight ? '50%' : isTop ? '100%' : undefined,
              bottom: !isTop && !isLeft && !isRight ? '100%' : undefined,
            }}
          >
            {player.holeCards.map((card, idx) => (
              <PokerCard 
                key={idx} 
                card={isHero || tableState?.phase === 'showdown' ? card : '??'} 
                faceDown={!isHero && tableState?.phase !== 'showdown'} 
                size="sm" 
              />
            ))}
          </div>
        )}
      </div>
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

  // Render states
  if (!playerId) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p>Player ID required to join table</p>
          <Button onClick={onLeave} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  if (!isConnected && isConnecting) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-green-500" />
          <p className="text-lg font-semibold">Подключение к столу...</p>
          <p className="text-sm text-white/60 mt-2">Пожалуйста, подождите</p>
          <Button onClick={onLeave} variant="ghost" className="mt-6 text-white/70">
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  if (!isConnected && !isConnecting && error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold">Ошибка подключения</p>
          <p className="text-sm text-white/60 mt-2">{error}</p>
          <div className="flex gap-2 mt-6 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-green-600">
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
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 z-20 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={handleLeave} className="h-9 w-9 text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-sm font-bold text-white">No Limit Hold'em</h1>
            {isConnected ? <Wifi className="w-3 h-3 text-green-400" /> : 
             isConnecting ? <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" /> : 
             <WifiOff className="w-3 h-3 text-red-400" />}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/60">
            <span className="px-1.5 py-0.5 bg-white/10 rounded">
              {tableState?.smallBlindAmount || 10}/{tableState?.bigBlindAmount || 20}
            </span>
            <span className="text-white/40">•</span>
            <span>{players.length}/6</span>
            {tableState?.phase && tableState.phase !== 'waiting' && (
              <>
                <span className="text-white/40">•</span>
                <span className="capitalize text-amber-400">{tableState.phase}</span>
              </>
            )}
            {isBombPot && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-orange-400 flex items-center gap-0.5">
                  <Bomb className="w-2.5 h-2.5" /> Bomb
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-8 w-8 text-white/70">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} className="h-8 w-8 text-white/70 relative">
            <MessageSquare className="h-4 w-4" />
            {chatMessages.length > 0 && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
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
            className="absolute right-0 top-12 bottom-32 w-64 bg-slate-900/95 backdrop-blur-lg z-30 flex flex-col border-l border-white/10"
          >
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-center text-white/30 text-xs py-4">Нет сообщений</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("text-xs", msg.playerId === playerId ? "text-right" : "")}>
                  <span className="text-green-400 font-medium">{msg.playerName || 'Player'}: </span>
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
                placeholder="Сообщение..."
                className="flex-1 h-8 text-xs bg-white/10 border-white/20 text-white"
              />
              <Button size="icon" onClick={handleSendChat} className="h-8 w-8 bg-green-600">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poker Table Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Felt Table - PPPoker style */}
        <div 
          className="absolute inset-4 rounded-[100px] overflow-hidden"
          style={{
            background: isBombPot 
              ? 'radial-gradient(ellipse at center, #4a3728 0%, #2d1f14 70%, #1a1209 100%)' 
              : 'radial-gradient(ellipse at center, #1a7f4d 0%, #0d5c33 50%, #083d22 100%)',
            boxShadow: isBombPot
              ? 'inset 0 0 80px rgba(0,0,0,0.5), 0 0 0 6px #4a3728, 0 0 0 10px #2d1f14, 0 8px 32px rgba(0,0,0,0.5)'
              : 'inset 0 0 80px rgba(0,0,0,0.4), 0 0 0 6px #0d5c33, 0 0 0 10px #083d22, 0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Table border decoration */}
          <div 
            className="absolute inset-2 rounded-[92px] pointer-events-none"
            style={{
              border: isBombPot ? '2px solid rgba(255, 165, 0, 0.3)' : '2px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>

        {/* Pot Display */}
        {(tableState?.pot || 0) > 0 && (
          <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-10">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10"
            >
              {/* Chip stack visual */}
              <div className="relative w-5 h-5">
                <div className="absolute bottom-0 w-5 h-2 rounded-full bg-gradient-to-b from-red-400 to-red-600 border border-red-800" />
                <div className="absolute bottom-1 w-5 h-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-800" />
                <div className="absolute bottom-2 w-5 h-2 rounded-full bg-gradient-to-b from-green-400 to-green-600 border border-green-800" />
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/60 uppercase tracking-wide">Pot</p>
                <p className="text-white font-bold text-sm">{tableState?.pot.toLocaleString()}</p>
              </div>
            </motion.div>
            
            {/* Side Pots */}
            {tableState?.sidePots && (
              <SidePotsDisplay sidePots={tableState.sidePots} className="mt-1" />
            )}
          </div>
        )}

        {/* Community Cards */}
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          <AnimatePresence mode="popLayout">
            {(tableState?.communityCards || []).map((card, i) => (
              <motion.div 
                key={`${card}-${i}`} 
                initial={{ y: -30, opacity: 0, rotateY: 180 }} 
                animate={{ y: 0, opacity: 1, rotateY: 0 }} 
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 300 }}
              >
                <PokerCard card={card} size="md" />
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Placeholder cards when waiting */}
          {(!tableState?.communityCards || tableState.communityCards.length === 0) && tableState?.phase === 'waiting' && (
            <div className="flex gap-1.5 opacity-20">
              {[1, 2, 3, 4, 5].map(i => (
                <PokerCard key={i} card="??" faceDown size="md" />
              ))}
            </div>
          )}
        </div>

        {/* Blinds info */}
        <div className="absolute top-[56%] left-1/2 -translate-x-1/2 z-10">
          <div className="text-[10px] text-white/50 text-center">
            Blinds: {tableState?.smallBlindAmount || 10}/{tableState?.bigBlindAmount || 20}
            {tableState?.anteAmount ? ` • Ante: ${tableState.anteAmount}` : ''}
          </div>
        </div>

        {/* Player Seats */}
        {[1, 2, 3, 4, 5, 6].map(seat => (
          <PlayerSeat key={seat} seatNumber={seat} />
        ))}

        {/* Hero Cards - Large display at bottom */}
        {myCards && myCards.length > 0 && myCards[0] !== '??' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            {useSqueeze && tableState?.phase === 'preflop' ? (
              <SqueezeHand 
                cards={myCards} 
                size="lg"
                onRevealComplete={() => setUseSqueeze(false)}
              />
            ) : (
              <motion.div 
                className="flex gap-2"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {myCards.map((card, idx) => (
                  <PokerCard key={idx} card={card} size="lg" />
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Equity Display */}
        {isAllInSituation && pokerPlayersForEquity.length >= 2 && (
          <EquityDisplay
            players={pokerPlayersForEquity}
            communityCards={tableState?.communityCards || []}
            phase={tableState?.phase || 'waiting'}
            showAlways={true}
          />
        )}

        {/* EV Cashout Panel */}
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
                toast.success(`Cashout: ${amount}`);
                setShowEVCashout(false);
              }}
              onDeclineCashout={() => setShowEVCashout(false)}
            />
          </div>
        )}

        {/* All-In Insurance */}
        <AllInInsurance
          isOpen={showInsurance}
          onClose={() => setShowInsurance(false)}
          onPurchase={(coverage) => {
            toast.success(`Страховка: ${coverage}`);
            setShowInsurance(false);
          }}
          potAmount={tableState?.pot || 0}
          playerEquity={myEquity}
          maxInsurable={Math.floor((tableState?.pot || 0) * (myEquity / 100))}
          playerStack={myPlayer?.stack || 0}
          communityCards={tableState?.communityCards || []}
          holeCards={myCards || []}
        />

        {/* Pro Features Panel - right side */}
        {isAllInSituation && myPlayer && !myPlayer.isFolded && (
          <div className="absolute top-16 right-2 z-30 flex flex-col gap-1.5">
            <Button
              size="sm"
              onClick={() => setShowEVCashout(!showEVCashout)}
              className="h-7 px-2 bg-amber-600/80 hover:bg-amber-600 text-white text-[10px]"
            >
              <Shield className="w-3 h-3 mr-1" />
              Cashout
            </Button>
            <Button
              size="sm"
              onClick={() => setShowInsurance(true)}
              className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px]"
            >
              <Shield className="w-3 h-3 mr-1" />
              Insurance
            </Button>
          </div>
        )}

        {/* Special Actions - left side */}
        {tableState?.phase === 'waiting' && (
          <div className="absolute top-16 left-2 z-30 flex flex-col gap-1.5">
            {canPostStraddle && !hasPostedStraddle && (
              <Button
                size="sm"
                onClick={() => postStraddle(straddleAmount)}
                className="h-7 px-2 bg-green-600/80 hover:bg-green-600 text-white text-[10px]"
              >
                <Layers className="w-3 h-3 mr-1" />
                Straddle
              </Button>
            )}
            {bombPotEnabled && (
              <Button
                size="sm"
                onClick={triggerBombPot}
                className="h-7 px-2 bg-orange-600/80 hover:bg-orange-600 text-white text-[10px]"
              >
                <Bomb className="w-3 h-3 mr-1" />
                Bomb Pot
              </Button>
            )}
          </div>
        )}

        {/* Time Bank Button */}
        {isMyTurn && timeBankRemaining > 0 && timeRemaining <= 10 && (
          <div className="absolute top-16 left-2 z-30">
            <Button
              size="sm"
              onClick={handleUseTimeBank}
              className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] animate-pulse"
            >
              <Clock className="w-3 h-3 mr-1" />
              +30s ({timeBankRemaining}s)
            </Button>
          </div>
        )}

        {/* Rabbit Hunt */}
        {myPlayer?.isFolded && tableState?.phase !== 'showdown' && tableState?.phase !== 'waiting' && (
          <div className="absolute top-16 left-2 z-30">
            <Button
              size="sm"
              onClick={() => setShowRabbitHunt(!showRabbitHunt)}
              className="h-7 px-2 bg-purple-600/80 hover:bg-purple-600 text-white text-[10px]"
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
                onPurchase={(cost) => toast.info(`Rabbit: -${cost}`)}
                className="mt-2"
              />
            )}
          </div>
        )}
      </div>

      {/* Action Panel */}
      <div className="bg-slate-900/95 border-t border-white/10 p-3 pb-safe z-20">
        {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
        
        {!isConnected && !isConnecting ? (
          <div className="flex items-center justify-center py-3 text-red-400">
            <WifiOff className="h-4 w-4 mr-2" />
            Reconnecting...
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </div>
        ) : tableState?.phase === 'waiting' ? (
          <div className="flex gap-2">
            <Button
              onClick={startHand}
              disabled={players.length < 2}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-xl shadow-lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              {players.length < 2 ? `Нужно 2+ игрока (${players.length}/2)` : 'Начать игру'}
            </Button>
            <Button onClick={handleLeave} variant="outline" className="h-12 px-4 border-white/20 text-white rounded-xl">
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : isMyTurn ? (
          <div className="space-y-2.5">
            {/* Bet Slider */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setBetAmount(minRaise)} 
                className="text-white/70 text-[10px] h-7 px-2"
              >
                Min
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setBetAmount(Math.floor((tableState?.pot || 0) / 2))} 
                className="text-white/70 text-[10px] h-7 px-2"
              >
                ½ Pot
              </Button>
              <Slider
                value={[betAmount]}
                min={minRaise}
                max={myPlayer?.stack || 1000}
                step={Math.max(1, Math.floor(minRaise / 10))}
                onValueChange={([val]) => setBetAmount(val)}
                className="flex-1"
              />
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setBetAmount(tableState?.pot || minRaise)} 
                className="text-white/70 text-[10px] h-7 px-2"
              >
                Pot
              </Button>
              <div className="min-w-[55px] text-right">
                <span className="text-amber-400 font-bold text-sm">{betAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button 
                onClick={fold} 
                className="h-11 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
              >
                Fold
              </Button>
              <Button 
                onClick={canCheck ? check : call} 
                className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              >
                {canCheck ? 'Check' : `Call ${callAmount}`}
              </Button>
              <Button 
                onClick={() => raise(betAmount)} 
                className="h-11 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Raise
              </Button>
              <Button 
                onClick={allIn} 
                className="h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl"
              >
                All-In
              </Button>
            </div>
          </div>
        ) : tableState?.phase === 'showdown' ? (
          <Button 
            onClick={startHand} 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Новая раздача
          </Button>
        ) : (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-pulse" />
            Ожидание хода: {players.find(p => p.seatNumber === tableState?.currentPlayerSeat)?.name || 'оппонент'}...
          </div>
        )}
      </div>
    </div>
  );
}
