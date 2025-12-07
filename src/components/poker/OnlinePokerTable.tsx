import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { usePokerTable, PokerPlayer } from '@/hooks/usePokerTable';
import { 
  Loader2, 
  LogOut, 
  Play, 
  X, 
  Check, 
  ArrowUp,
  Coins,
  MessageCircle,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  onLeave: () => void;
}

const SUIT_SYMBOLS: Record<string, string> = {
  'h': '♥', 'd': '♦', 'c': '♣', 's': '♠'
};

const RANK_DISPLAY: Record<string, string> = {
  'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
};

export function OnlinePokerTable({ tableId, playerId, buyIn, onLeave }: OnlinePokerTableProps) {
  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const {
    isConnected,
    isConnecting,
    error,
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    chatMessages,
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand
  } = pokerTable;

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Update raise amount when current bet changes
  useEffect(() => {
    if (tableState) {
      setRaiseAmount(tableState.currentBet * 2 || tableState.bigBlindSeat || 40);
    }
  }, [tableState?.currentBet]);

  const handleRaise = () => {
    raise(raiseAmount);
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      pokerTable.sendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Render card
  const renderCard = (cardStr: string, size: 'sm' | 'lg' = 'sm') => {
    if (!cardStr) return null;
    
    const rank = cardStr[0];
    const suit = cardStr[1];
    const suitSymbol = SUIT_SYMBOLS[suit] || suit;
    const rankDisplay = RANK_DISPLAY[rank] || rank;
    const isRed = suit === 'h' || suit === 'd';
    
    const sizeClasses = size === 'lg' 
      ? 'w-14 h-20 text-xl' 
      : 'w-10 h-14 text-sm';

    return (
      <div 
        className={cn(
          sizeClasses,
          "bg-white rounded-lg shadow-md flex flex-col items-center justify-center font-bold border border-border",
          isRed ? "text-red-500" : "text-foreground"
        )}
      >
        <span>{rankDisplay}</span>
        <span className="text-lg">{suitSymbol}</span>
      </div>
    );
  };

  // Render player seat
  const renderPlayerSeat = (player: PokerPlayer | undefined, seatNumber: number) => {
    const isDealer = tableState?.dealerSeat === seatNumber;
    const isSB = tableState?.smallBlindSeat === seatNumber;
    const isBB = tableState?.bigBlindSeat === seatNumber;
    const isCurrentPlayer = tableState?.currentPlayerSeat === seatNumber;
    const isMe = player?.oderId === playerId;

    if (!player) {
      return (
        <div className="w-24 h-24 rounded-full bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Место {seatNumber}</span>
        </div>
      );
    }

    return (
      <div className={cn(
        "relative p-3 rounded-xl transition-all",
        isCurrentPlayer && "ring-2 ring-primary animate-pulse",
        player.isFolded && "opacity-50",
        isMe && "bg-primary/10"
      )}>
        {/* Dealer/Blind badges */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {isDealer && (
            <Badge variant="default" className="text-[10px] h-5">D</Badge>
          )}
          {isSB && (
            <Badge variant="secondary" className="text-[10px] h-5">SB</Badge>
          )}
          {isBB && (
            <Badge variant="secondary" className="text-[10px] h-5">BB</Badge>
          )}
        </div>

        {/* Player avatar */}
        <div className={cn(
          "w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto",
          player.isAllIn && "ring-2 ring-yellow-500"
        )}>
          <span className="text-2xl">👤</span>
        </div>

        {/* Stack */}
        <div className="text-center mt-1">
          <p className="text-xs font-medium truncate max-w-20">
            {isMe ? 'Вы' : `Игрок ${seatNumber}`}
          </p>
          <p className="text-sm font-bold flex items-center justify-center gap-1">
            <Coins className="h-3 w-3" />
            {player.stack.toLocaleString()}
          </p>
        </div>

        {/* Current bet */}
        {player.betAmount > 0 && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <Badge variant="outline" className="bg-background">
              {player.betAmount}
            </Badge>
          </div>
        )}

        {/* Hole cards (only show for self or at showdown) */}
        {player.holeCards.length > 0 && (isMe || tableState?.phase === 'showdown') && (
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex gap-0.5">
            {player.holeCards.map((card, i) => (
              <div key={i} className="scale-75">
                {renderCard(card)}
              </div>
            ))}
          </div>
        )}

        {/* Status badges */}
        {player.isFolded && (
          <Badge variant="destructive" className="absolute top-0 right-0 text-[10px]">
            Fold
          </Badge>
        )}
        {player.isAllIn && (
          <Badge className="absolute top-0 right-0 text-[10px] bg-yellow-500">
            All-in
          </Badge>
        )}
      </div>
    );
  };

  // Loading state
  if (isConnecting) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Подключение к столу...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={connect}>Переподключиться</Button>
            <Button variant="outline" onClick={onLeave}>Выйти</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Подключено' : 'Отключено'}
          </Badge>
          {tableState && (
            <Badge variant="outline">{tableState.phase}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleLeave}>
          <LogOut className="h-4 w-4 mr-2" />
          Выйти
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-green-900/20 border-green-800/50 overflow-hidden">
        <CardContent className="p-6">
          {/* Community Cards & Pot */}
          <div className="flex flex-col items-center justify-center min-h-40 gap-4">
            {/* Pot */}
            {tableState && tableState.pot > 0 && (
              <div className="flex items-center gap-2 bg-background/80 rounded-full px-4 py-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="font-bold">{tableState.pot.toLocaleString()}</span>
              </div>
            )}

            {/* Community Cards */}
            <div className="flex gap-2">
              {tableState?.communityCards.length ? (
                tableState.communityCards.map((card, i) => (
                  <div key={i}>{renderCard(card, 'lg')}</div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">
                  {tableState?.phase === 'waiting' 
                    ? 'Ожидание начала раздачи' 
                    : 'Карты на столе появятся здесь'}
                </div>
              )}
            </div>

            {/* My Cards */}
            {myCards.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground text-center mb-2">Ваши карты:</p>
                <div className="flex gap-2">
                  {myCards.map((card, i) => (
                    <div key={i}>{renderCard(card, 'lg')}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Players around the table */}
          <div className="mt-6 grid grid-cols-3 gap-4 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((seat) => {
              const player = tableState?.players.find(p => p.seatNumber === seat);
              return (
                <div key={seat}>
                  {renderPlayerSeat(player, seat)}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          {tableState?.phase === 'waiting' ? (
            <div className="flex justify-center">
              <Button onClick={startHand} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Начать раздачу
              </Button>
            </div>
          ) : isMyTurn ? (
            <div className="space-y-4">
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="destructive" onClick={fold}>
                  <X className="h-4 w-4 mr-2" />
                  Fold
                </Button>
                
                {canCheck ? (
                  <Button variant="secondary" onClick={check}>
                    <Check className="h-4 w-4 mr-2" />
                    Check
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={call}>
                    <Check className="h-4 w-4 mr-2" />
                    Call {callAmount}
                  </Button>
                )}
                
                <Button onClick={handleRaise}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Raise {raiseAmount}
                </Button>
                
                <Button variant="outline" onClick={allIn}>
                  All-in
                </Button>
              </div>
              
              {/* Raise slider */}
              <div className="flex items-center gap-4 max-w-md mx-auto">
                <span className="text-sm">{tableState.currentBet * 2 || 40}</span>
                <Slider
                  value={[raiseAmount]}
                  onValueChange={([val]) => setRaiseAmount(val)}
                  min={tableState.currentBet * 2 || 40}
                  max={myPlayer?.stack || 10000}
                  step={tableState.currentBet || 20}
                  className="flex-1"
                />
                <span className="text-sm">{myPlayer?.stack}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {tableState?.phase === 'showdown' 
                  ? 'Вскрытие карт' 
                  : `Ход игрока на месте ${tableState?.currentPlayerSeat}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat toggle */}
      <Button 
        variant="outline" 
        size="sm"
        className="fixed bottom-4 right-4"
        onClick={() => setShowChat(!showChat)}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>

      {/* Chat panel */}
      {showChat && (
        <Card className="fixed bottom-16 right-4 w-80">
          <CardContent className="p-3">
            <div className="h-40 overflow-y-auto mb-2 space-y-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">
                    {msg.playerId === playerId ? 'Вы' : 'Игрок'}:
                  </span>{' '}
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Сообщение..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              />
              <Button size="icon" onClick={handleSendChat}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
