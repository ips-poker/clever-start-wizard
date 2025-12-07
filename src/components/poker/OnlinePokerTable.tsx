import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { usePokerTable, PokerPlayer } from '@/hooks/usePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerCard, CommunityCards, CardHand } from './PokerCard';
import { PokerChips, PotDisplay } from './PokerChips';
import { HandHistory } from './HandHistory';
import { WinnerDisplay } from './WinnerDisplay';
import { SpectatorBadge } from './SpectatorBadge';
import { MobilePokerControls } from './MobilePokerControls';
import { MobilePokerTable } from './MobilePokerTable';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Loader2, 
  LogOut, 
  Play, 
  X, 
  Check, 
  ArrowUp,
  Coins,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  History,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isSpectator?: boolean;
  onLeave: () => void;
}

export function OnlinePokerTable({ tableId, playerId, buyIn, isSpectator = false, onLeave }: OnlinePokerTableProps) {
  const isMobile = useIsMobile();
  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  const sounds = usePokerSounds();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const prevPhaseRef = useRef<string | null>(null);

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
    lastAction,
    showdownResult,
    handHistory,
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    clearShowdown
  } = pokerTable;

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Update raise amount when current bet changes
  useEffect(() => {
    if (tableState) {
      const minRaise = tableState.currentBet * 2 || 40;
      setRaiseAmount(minRaise);
    }
  }, [tableState?.currentBet]);

  // Play sound on phase change
  useEffect(() => {
    if (tableState?.phase && tableState.phase !== prevPhaseRef.current) {
      if (prevPhaseRef.current !== null) {
        sounds.playDeal();
      }
      prevPhaseRef.current = tableState.phase;
    }
  }, [tableState?.phase, sounds]);

  // Play sound on my turn
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
    }
  }, [isMyTurn, sounds]);

  // Play sound on actions
  useEffect(() => {
    if (lastAction) {
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise': sounds.playRaise(); break;
        case 'all-in': sounds.playAllIn(); break;
      }
    }
  }, [lastAction, sounds]);

  // Play win sound on showdown
  useEffect(() => {
    if (showdownResult && showdownResult.winners.some(w => w.oderId === playerId)) {
      sounds.playWin();
    }
  }, [showdownResult, playerId, sounds]);

  // Toggle sound
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  const handleFold = () => {
    fold();
  };

  const handleCheck = () => {
    check();
  };

  const handleCall = () => {
    call();
  };

  const handleRaise = (amount?: number) => {
    raise(amount || raiseAmount);
  };

  const handleAllIn = () => {
    allIn();
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      pokerTable.sendChat(chatInput.trim());
      setChatInput('');
      sounds.playChat();
    }
  };

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Seat positions for oval layout
  const getSeatPosition = (seat: number, total: number = 9) => {
    const positions: Record<number, string> = {
      1: 'bottom-0 left-1/2 -translate-x-1/2',
      2: 'bottom-12 left-8',
      3: 'top-1/2 left-0 -translate-y-1/2',
      4: 'top-12 left-8',
      5: 'top-0 left-1/2 -translate-x-1/2',
      6: 'top-12 right-8',
      7: 'top-1/2 right-0 -translate-y-1/2',
      8: 'bottom-12 right-8',
      9: 'bottom-0 right-1/4',
    };
    return positions[seat] || '';
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-20 h-20 rounded-full bg-muted/20 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center"
        >
          <span className="text-xs text-muted-foreground">{seatNumber}</span>
        </motion.div>
      );
    }

    return (
      <motion.div 
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          isCurrentPlayer && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          player.isFolded && "opacity-40 grayscale",
          isMe && "bg-primary/10 border border-primary/30"
        )}
      >
        {/* Dealer/Blind badges */}
        <AnimatePresence>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
            {isDealer && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge className="text-[10px] h-5 bg-amber-500 hover:bg-amber-600">D</Badge>
              </motion.div>
            )}
            {isSB && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge variant="secondary" className="text-[10px] h-5">SB</Badge>
              </motion.div>
            )}
            {isBB && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge variant="secondary" className="text-[10px] h-5">BB</Badge>
              </motion.div>
            )}
          </div>
        </AnimatePresence>

        {/* Player avatar */}
        <motion.div 
          className={cn(
            "w-14 h-14 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center mx-auto shadow-lg",
            player.isAllIn && "ring-2 ring-yellow-500 ring-offset-1",
            isCurrentPlayer && "animate-pulse"
          )}
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-xl">{isMe ? '😎' : '👤'}</span>
        </motion.div>

        {/* Stack */}
        <div className="text-center mt-1">
          <p className="text-xs font-medium truncate max-w-16">
            {isMe ? 'Вы' : player.name || `#${seatNumber}`}
          </p>
          <div className="flex items-center justify-center gap-1">
            <Coins className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-bold">{player.stack.toLocaleString()}</span>
          </div>
        </div>

        {/* Current bet */}
        <AnimatePresence>
          {player.betAmount > 0 && (
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 10 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2"
            >
              <PokerChips amount={player.betAmount} size="sm" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status badges */}
        <AnimatePresence>
          {player.isFolded && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Badge variant="destructive" className="text-[9px] px-1">FOLD</Badge>
            </motion.div>
          )}
          {player.isAllIn && !player.isFolded && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Badge className="text-[9px] px-1 bg-gradient-to-r from-amber-500 to-yellow-500">ALL-IN</Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Loading state
  if (isConnecting) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Подключение к столу...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <Card className="border-destructive/50">
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

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-3 pb-32">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1 text-xs">
              <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-green-400" : "bg-red-400")} />
              {isConnected ? 'Онлайн' : 'Офлайн'}
            </Badge>
            {isSpectator && <SpectatorBadge count={0} isSpectator />}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLeave} className="h-8 text-xs">
              <LogOut className="h-3 w-3 mr-1" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Mobile Table */}
        <MobilePokerTable 
          tableState={tableState}
          myCards={myCards}
          playerId={playerId}
        />

        {/* Start Hand Button (waiting phase) */}
        {tableState?.phase === 'waiting' && !isSpectator && (
          <div className="flex justify-center px-4">
            <Button onClick={startHand} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Начать раздачу
            </Button>
          </div>
        )}

        {/* Spectator notice */}
        {isSpectator && (
          <div className="text-center p-3 bg-muted/30 rounded-lg mx-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Режим наблюдения</span>
            </div>
          </div>
        )}

        {/* Mobile Controls */}
        {!isSpectator && (
          <MobilePokerControls
            isMyTurn={isMyTurn}
            canCheck={canCheck}
            callAmount={callAmount}
            currentBet={tableState?.currentBet || 0}
            myStack={myPlayer?.stack || 0}
            onFold={handleFold}
            onCheck={handleCheck}
            onCall={handleCall}
            onRaise={handleRaise}
            onAllIn={handleAllIn}
          />
        )}

        {/* Winner display overlay */}
        <AnimatePresence>
          {showdownResult && showdownResult.winners.length > 0 && (
            <WinnerDisplay
              winners={showdownResult.winners.map(w => ({
                playerId: w.oderId,
                playerName: w.name,
                seatNumber: w.seatNumber,
                amount: w.amount,
                handRank: w.handRank,
                cards: w.cards
              }))}
              playerId={playerId}
              onClose={clearShowdown}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-400" : "bg-red-400")} />
            {isConnected ? 'Онлайн' : 'Офлайн'}
          </Badge>
          {tableState && (
            <Badge variant="outline" className="capitalize">
              {tableState.phase === 'waiting' ? 'Ожидание' : tableState.phase}
            </Badge>
          )}
          {isSpectator && <SpectatorBadge count={spectatorCount} isSpectator />}
          {!isSpectator && spectatorCount > 0 && <SpectatorBadge count={spectatorCount} />}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            title="История раздач"
            className="relative"
          >
            <History className="h-4 w-4" />
            {handHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                {handHistory.length}
              </span>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleLeave}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Spectator notice */}
      {isSpectator && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="py-3 flex items-center justify-center gap-2">
            <Eye className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400">Вы наблюдаете за игрой. Карты игроков скрыты.</span>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-900/40 border-green-700/50">
        {/* Felt texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiPjwvcmVjdD4KPC9zdmc+')] pointer-events-none" />
        
        <CardContent className="p-6 relative">
          {/* Center area - Pot & Community Cards */}
          <div className="flex flex-col items-center justify-center min-h-48 gap-4">
            {/* Pot */}
            <AnimatePresence>
              {tableState && tableState.pot > 0 && (
                <PotDisplay pot={tableState.pot} />
              )}
            </AnimatePresence>

            {/* Community Cards */}
            {tableState?.communityCards && tableState.communityCards.length > 0 ? (
              <CommunityCards cards={tableState.communityCards} />
            ) : (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i}
                    className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/30 bg-green-800/20"
                  />
                ))}
              </div>
            )}

            {/* My Cards (only for players, not spectators) */}
            <AnimatePresence>
              {myCards.length > 0 && !isSpectator && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="mt-4 p-3 rounded-xl bg-background/80 backdrop-blur border border-primary/30 shadow-lg"
                >
                  <p className="text-xs text-muted-foreground text-center mb-2">Ваши карты</p>
                  <CardHand cards={myCards} size="lg" overlap={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Players Grid */}
          <div className="mt-8 grid grid-cols-5 gap-4 justify-items-center">
            {[5, 4, 6, 3, 7, 2, 8, 1, 9].map((seat, idx) => {
              const player = tableState?.players.find(p => p.seatNumber === seat);
              return (
                <div key={seat} className={idx === 4 ? 'col-start-3' : ''}>
                  {renderPlayerSeat(player, seat)}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons (only for players, not spectators) */}
      {!isSpectator && (
        <Card>
          <CardContent className="p-4">
            {tableState?.phase === 'waiting' ? (
              <div className="flex justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={startHand} size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    Начать раздачу
                  </Button>
                </motion.div>
              </div>
            ) : isMyTurn ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button variant="destructive" onClick={handleFold} className="gap-1">
                    <X className="h-4 w-4" />
                    Fold
                  </Button>
                  
                  {canCheck ? (
                    <Button variant="secondary" onClick={handleCheck} className="gap-1">
                      <Check className="h-4 w-4" />
                      Check
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={handleCall} className="gap-1">
                      <Check className="h-4 w-4" />
                      Call {callAmount}
                    </Button>
                  )}
                  
                  <Button onClick={() => handleRaise(raiseAmount)} className="gap-1">
                    <ArrowUp className="h-4 w-4" />
                    Raise {raiseAmount}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleAllIn}
                    className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30"
                  >
                    All-in
                  </Button>
                </div>
                
                {/* Raise slider */}
                <div className="flex items-center gap-4 max-w-md mx-auto">
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {(tableState.currentBet * 2 || 40).toLocaleString()}
                  </span>
                  <Slider
                    value={[raiseAmount]}
                    onValueChange={([val]) => setRaiseAmount(val)}
                    min={tableState.currentBet * 2 || 40}
                    max={myPlayer?.stack || 10000}
                    step={tableState.currentBet || 20}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-20">
                    {myPlayer?.stack.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {tableState?.phase === 'showdown' 
                    ? '🎉 Вскрытие карт' 
                    : tableState?.currentPlayerSeat
                      ? `Ходит игрок на месте ${tableState.currentPlayerSeat}...`
                      : 'Ожидание хода...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat toggle */}
      <Button 
        variant="outline" 
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setShowChat(!showChat)}
      >
        <MessageCircle className="h-5 w-5" />
        {chatMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {chatMessages.length}
          </span>
        )}
      </Button>

      {/* Chat panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 w-80"
          >
            <Card className="shadow-xl">
              <CardContent className="p-3">
                <div className="h-40 overflow-y-auto mb-2 space-y-1 scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Нет сообщений
                    </p>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="text-sm p-1 rounded hover:bg-muted/50">
                        <span className="font-medium text-primary">
                          {msg.playerId === playerId ? 'Вы' : 'Игрок'}:
                        </span>{' '}
                        <span>{msg.text}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Сообщение..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    className="text-sm"
                  />
                  <Button size="icon" onClick={handleSendChat}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-24 right-4 w-80 z-40"
          >
            <HandHistory 
              history={handHistory.map(h => ({
                ...h,
                winners: h.winners.map(w => ({
                  ...w,
                  playerId: w.playerId
                }))
              }))}
              playerId={playerId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner display overlay */}
      <AnimatePresence>
        {showdownResult && showdownResult.winners.length > 0 && (
          <WinnerDisplay
            winners={showdownResult.winners.map(w => ({
              playerId: w.oderId,
              playerName: w.name,
              seatNumber: w.seatNumber,
              amount: w.amount,
              handRank: w.handRank,
              cards: w.cards
            }))}
            playerId={playerId}
            onClose={clearShowdown}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
