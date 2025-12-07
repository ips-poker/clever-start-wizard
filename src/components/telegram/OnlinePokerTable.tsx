import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerGameEngine, PlayerState } from '@/hooks/usePokerGameEngine';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  playerName?: string;
  playerAvatar?: string;
  onLeave: () => void;
}

// Позиции для 6-max стола
const SEAT_POSITIONS_6MAX = [
  { top: '75%', left: '50%', transform: 'translate(-50%, -50%)' }, // Seat 1 - Hero
  { top: '55%', left: '8%', transform: 'translate(-50%, -50%)' },  // Seat 2
  { top: '20%', left: '12%', transform: 'translate(-50%, -50%)' }, // Seat 3
  { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' },  // Seat 4
  { top: '20%', left: '88%', transform: 'translate(-50%, -50%)' }, // Seat 5
  { top: '55%', left: '92%', transform: 'translate(-50%, -50%)' }, // Seat 6
];

const SUIT_SYMBOLS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_COLORS: Record<string, string> = { h: 'text-red-500', d: 'text-red-500', c: 'text-gray-900', s: 'text-gray-900' };

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  onLeave
}: OnlinePokerTableProps) {
  const {
    gameState,
    myCards,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaise,
    isLoading,
    error,
    lastAction,
    join,
    leave,
    startHand,
    fold,
    check,
    call,
    raise,
    allIn,
    refresh
  } = usePokerGameEngine(tableId, playerId);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Автоматически присоединяемся к столу
  useEffect(() => {
    if (tableId && playerId && !myPlayer) {
      join();
    }
  }, [tableId, playerId, myPlayer, join]);

  // Обновляем bet amount при изменении minRaise
  useEffect(() => {
    setBetAmount(minRaise);
  }, [minRaise]);

  // Таймер хода
  useEffect(() => {
    if (isMyTurn) {
      setTimeRemaining(30);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            fold();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, fold]);

  // Показываем тосты для действий
  useEffect(() => {
    if (lastAction?.handComplete) {
      if (lastAction.winners) {
        const isWinner = lastAction.winners.some(w => w.playerId === playerId);
        if (isWinner) {
          toast.success(`Вы выиграли ${lastAction.winners.find(w => w.playerId === playerId)?.amount}!`);
        } else {
          toast.info('Раздача завершена');
        }
      } else if (lastAction.winner === playerId) {
        toast.success(`Вы выиграли ${lastAction.winAmount}!`);
      }
    }
  }, [lastAction, playerId]);

  // Рендер карты
  const renderCard = (cardStr: string, faceDown = false, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-11',
      md: 'w-11 h-15',
      lg: 'w-14 h-19'
    };
    
    if (faceDown || !cardStr) {
      return (
        <div
          className={cn(
            sizeClasses[size],
            "rounded-lg bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900",
            "border border-blue-600/50 shadow-lg flex items-center justify-center"
          )}
        >
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
        className={cn(
          sizeClasses[size],
          "rounded-lg bg-white border border-gray-200",
          "flex flex-col items-center justify-center shadow-lg relative overflow-hidden"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
        <div className={cn("relative z-10 flex flex-col items-center", isRed ? 'text-red-600' : 'text-gray-900')}>
          <span className={cn("font-bold leading-none", size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>
            {rank}
          </span>
          <span className={cn(size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl')}>
            {SUIT_SYMBOLS[suit] || suit}
          </span>
        </div>
      </motion.div>
    );
  };

  // Рендер игрока
  const renderPlayerSeat = (seatNumber: number) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = gameState?.players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.playerId === playerId;
    const isCurrentPlayer = gameState?.currentPlayerSeat === seatNumber;
    const isWinner = lastAction?.winners?.some(w => w.playerId === player?.playerId) || 
                     lastAction?.winner === player?.playerId;
    
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
        animate={{ 
          scale: isCurrentPlayer ? 1.05 : 1, 
          opacity: player.isFolded ? 0.5 : 1 
        }}
      >
        {/* Timer ring */}
        {isCurrentPlayer && isHero && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,200,0,0.3)" strokeWidth="3" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="#ffc800" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={283}
              strokeDashoffset={283 - (283 * timeRemaining) / 30}
              transform="rotate(-90 50 50)"
            />
          </svg>
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
              {player.playerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {player.isDealer && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-lg">
              D
            </div>
          )}
          
          {isWinner && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Crown className="w-5 h-5 text-yellow-400" />
            </motion.div>
          )}
        </div>
        
        {/* Info panel */}
        <div className={cn(
          "mt-1 px-2 py-1 rounded-lg min-w-[70px] text-center",
          isWinner ? "bg-yellow-500/90" : player.isFolded ? "bg-gray-800/80" : "bg-gray-900/90"
        )}>
          <p className={cn("text-[10px] font-medium truncate max-w-[70px]", isWinner ? "text-gray-900" : "text-white")}>
            {isHero ? 'You' : player.playerName}
          </p>
          <div className={cn("flex items-center justify-center gap-0.5 text-[11px] font-bold", isWinner ? "text-gray-900" : "text-yellow-400")}>
            <span>{player.stack.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Current bet */}
        {player.currentBet > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} 
            className="mt-1 px-2 py-0.5 bg-yellow-500/80 rounded text-[9px] font-bold text-black">
            {player.currentBet}
          </motion.div>
        )}
        
        {/* Status badges */}
        {player.isAllIn && (
          <Badge className="mt-1 bg-purple-600 text-white text-[9px]">ALL-IN</Badge>
        )}
        {player.isFolded && (
          <Badge className="mt-1 bg-red-600/50 text-white text-[9px]">FOLD</Badge>
        )}
      </motion.div>
    );
  };

  // Обработчики действий
  const handleFold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    fold();
    toast.info('Fold');
  };

  const handleCheck = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    check();
    toast.info('Check');
  };

  const handleCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    call();
    toast.info(`Call ${callAmount}`);
  };

  const handleRaise = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    raise(betAmount);
    toast.info(`Raise to ${betAmount}`);
  };

  const handleAllIn = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    allIn();
    toast.info('ALL-IN!');
  };

  const handleLeave = async () => {
    await leave();
    onLeave();
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/90 to-transparent z-20">
        <Button variant="ghost" size="icon" onClick={handleLeave} className="h-9 w-9 text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <h1 className="text-sm font-semibold text-white">Texas Hold'em</h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/60">
            <span>10/20</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{gameState?.players.length || 0} players</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="capitalize">{gameState?.phase || 'waiting'}</span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-9 w-9 text-white/70">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} className="h-9 w-9 text-white/70">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-4">
          {/* Table */}
          <div 
            className="absolute inset-0 rounded-[50%] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a5a3a 0%, #0d3d28 50%, #1a5a3a 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 8px #2d1810, 0 0 0 12px #1a0f0a',
              border: '4px solid #3d2518'
            }}
          />

          {/* Pot */}
          {(gameState?.pot || 0) > 0 && (
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 z-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} 
                className="flex items-center gap-1.5 px-4 py-1.5 bg-black/60 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-bold text-sm">{gameState?.pot.toLocaleString()}</span>
              </motion.div>
            </div>
          )}

          {/* Community Cards */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            <AnimatePresence mode="popLayout">
              {(gameState?.communityCards || []).map((card, i) => (
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

      {/* Hero Cards */}
      {myCards.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <div className="flex gap-2">
            {myCards.map((card, idx) => (
              <motion.div key={idx} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}>
                {renderCard(card, false, 'lg')}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90 border-t border-white/10 p-3 pb-safe z-20">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        
        {gameState?.phase === 'waiting' ? (
          <div className="flex gap-3">
            <Button
              onClick={() => startHand()}
              disabled={isLoading || (gameState?.players.length || 0) < 2}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl"
            >
              <Zap className="h-5 w-5 mr-2" />
              {(gameState?.players.length || 0) < 2 ? 'Need 2+ Players' : 'Start Game'}
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
              <Button onClick={handleFold} disabled={isLoading} className="h-12 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl">
                Fold
              </Button>
              <Button 
                onClick={canCheck ? handleCheck : handleCall} 
                disabled={isLoading}
                className="h-12 bg-blue-600/80 hover:bg-blue-600 text-white font-bold rounded-xl"
              >
                {canCheck ? 'Check' : `Call ${callAmount}`}
              </Button>
              <Button onClick={handleRaise} disabled={isLoading} className="h-12 bg-green-600/80 hover:bg-green-600 text-white font-bold rounded-xl">
                Raise
              </Button>
              <Button onClick={handleAllIn} disabled={isLoading} className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl">
                All-In
              </Button>
            </div>
          </div>
        ) : gameState?.phase === 'showdown' ? (
          <Button onClick={() => startHand()} disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl">
            <RotateCcw className="h-5 w-5 mr-2" />
            New Hand
          </Button>
        ) : (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-pulse" />
            Waiting for {gameState?.players.find(p => p.seatNumber === gameState?.currentPlayerSeat)?.playerName || 'opponent'}...
          </div>
        )}
      </div>
    </div>
  );
}
