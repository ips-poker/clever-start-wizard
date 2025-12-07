import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Send,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerWebSocket, WsPlayerState } from '@/hooks/usePokerWebSocket';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  playerName?: string;
  playerAvatar?: string;
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

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface PlayerEmoji {
  playerId: string;
  emoji: string;
  id: number;
}

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  onLeave
}: OnlinePokerTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [betAmount, setBetAmount] = useState(40);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [playerEmojis, setPlayerEmojis] = useState<PlayerEmoji[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const emojiIdRef = useRef(0);

  const {
    isConnected,
    gameState,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaise,
    error,
    lastActionResult,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    sendChat,
    sendEmoji,
  } = usePokerWebSocket({
    tableId,
    playerId,
    onChat: (data) => {
      const player = gameState?.players.find(p => p.playerId === data.playerId);
      setChatMessages(prev => [...prev.slice(-50), {
        playerId: data.playerId,
        playerName: player?.playerName || 'Unknown',
        message: data.message,
        timestamp: Date.now()
      }]);
    },
    onEmoji: (data) => {
      const id = emojiIdRef.current++;
      setPlayerEmojis(prev => [...prev, { ...data, id }]);
      setTimeout(() => {
        setPlayerEmojis(prev => prev.filter(e => e.id !== id));
      }, 3000);
    },
    onPlayerConnected: (pid) => {
      if (pid !== playerId) {
        toast.info('Игрок присоединился');
      }
    },
    onPlayerDisconnected: (pid) => {
      if (pid !== playerId) {
        toast.info('Игрок отключился');
      }
    },
  });

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
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, fold]);

  // Обработка результатов
  useEffect(() => {
    if (lastActionResult?.handComplete) {
      if (lastActionResult.winners) {
        const isWinner = lastActionResult.winners.some(w => w.playerId === playerId);
        if (isWinner) {
          const myWin = lastActionResult.winners.find(w => w.playerId === playerId);
          toast.success(`Вы выиграли ${myWin?.amount}! ${myWin?.handName || ''}`);
        }
      } else if (lastActionResult.winner === playerId) {
        toast.success(`Вы выиграли!`);
      }
    }
  }, [lastActionResult, playerId]);

  // Рендер карты
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

  // Рендер игрока
  const renderPlayerSeat = (seatNumber: number) => {
    const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
    const player = gameState?.players.find(p => p.seatNumber === seatNumber);
    const isHero = player?.playerId === playerId;
    const isCurrentPlayer = gameState?.currentPlayerSeat === seatNumber;
    const isWinner = lastActionResult?.winners?.some(w => w.playerId === player?.playerId) || lastActionResult?.winner === player?.playerId;
    const playerEmojiData = playerEmojis.find(e => e.playerId === player?.playerId);
    
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
        {/* Emoji */}
        <AnimatePresence>
          {playerEmojiData && (
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1.5, y: -30 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-8 text-3xl z-50"
            >
              {playerEmojiData.emoji}
            </motion.div>
          )}
        </AnimatePresence>

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
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-lg">D</div>
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
            {isHero ? 'You' : player.playerName}
          </p>
          <div className={cn("flex items-center justify-center gap-0.5 text-[11px] font-bold", isWinner ? "text-gray-900" : "text-yellow-400")}>
            <span>{player.stack.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Current bet */}
        {player.currentBet > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1 px-2 py-0.5 bg-yellow-500/80 rounded text-[9px] font-bold text-black">
            {player.currentBet}
          </motion.div>
        )}
        
        {/* Status */}
        {player.isAllIn && <Badge className="mt-1 bg-purple-600 text-white text-[9px]">ALL-IN</Badge>}
        {player.isFolded && <Badge className="mt-1 bg-red-600/50 text-white text-[9px]">FOLD</Badge>}

        {/* Cards */}
        {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.holeCards.map((card, idx) => (
              <div key={idx}>{renderCard(card, card === '??', 'sm')}</div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // Отправка чата
  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendChat(chatInput.trim());
      setChatInput('');
    }
  };

  // Быстрые эмодзи
  const quickEmojis = ['👍', '👎', '😂', '😡', '🎉', '💰'];

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/90 to-transparent z-20">
        <Button variant="ghost" size="icon" onClick={onLeave} className="h-9 w-9 text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-sm font-semibold text-white">Texas Hold'em</h1>
            {isConnected ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/60">
            <span>{gameState?.smallBlind || 10}/{gameState?.bigBlind || 20}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{gameState?.players.length || 0} players</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="capitalize">{gameState?.phase || 'connecting...'}</span>
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
                  <span className="text-blue-400 font-medium">{msg.playerName}: </span>
                  <span className="text-white/80">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1 p-2 border-t border-white/10">
              {quickEmojis.map(emoji => (
                <button key={emoji} onClick={() => sendEmoji(emoji)} className="text-lg hover:scale-125 transition-transform">
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
              background: 'linear-gradient(180deg, #1a5a3a 0%, #0d3d28 50%, #1a5a3a 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 8px #2d1810, 0 0 0 12px #1a0f0a',
              border: '4px solid #3d2518'
            }}
          />

          {/* Pot & Side Pots */}
          {(gameState?.pot || 0) > 0 && (
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
              {/* Main Pot */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-4 py-1.5 bg-black/60 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-bold text-sm">{gameState?.pot.toLocaleString()}</span>
              </motion.div>
              
              {/* Side Pots */}
              {gameState?.sidePots && gameState.sidePots.length > 0 && (
                <div className="flex gap-1.5 flex-wrap justify-center">
                  {gameState.sidePots.map((sidePot, i) => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/70 rounded-full"
                    >
                      <span className="text-[10px] text-white/70">Side {i + 1}:</span>
                      <span className="text-white font-bold text-xs">{sidePot.amount.toLocaleString()}</span>
                    </motion.div>
                  ))}
                </div>
              )}
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
      {myPlayer?.holeCards && myPlayer.holeCards.length > 0 && myPlayer.holeCards[0] !== '??' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <div className="flex gap-2">
            {myPlayer.holeCards.map((card, idx) => (
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
        
        {!isConnected ? (
          <div className="flex items-center justify-center py-3 text-white/50">
            <Timer className="h-4 w-4 mr-2 animate-spin" />
            Подключение...
          </div>
        ) : gameState?.phase === 'waiting' ? (
          <div className="flex gap-3">
            <Button
              onClick={startHand}
              disabled={(gameState?.players.length || 0) < 2}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl"
            >
              <Zap className="h-5 w-5 mr-2" />
              {(gameState?.players.length || 0) < 2 ? 'Need 2+ Players' : 'Start Game'}
            </Button>
            <Button onClick={onLeave} variant="outline" className="h-12 px-6 border-white/20 text-white rounded-xl">
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
        ) : gameState?.phase === 'showdown' ? (
          <Button onClick={startHand} className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl">
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
