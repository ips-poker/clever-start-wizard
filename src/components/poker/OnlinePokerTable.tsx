import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePokerTable, PokerPlayer } from '@/hooks/usePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerCard, CommunityCards, CardHand } from './PokerCard';
import { PokerChips, PotDisplay } from './PokerChips';
import { HandHistory } from './HandHistory';
import { WinnerDisplay } from './WinnerDisplay';
import { SpectatorBadge } from './SpectatorBadge';
import { MobilePokerControls } from './MobilePokerControls';
import { TournamentTimer } from './TournamentTimer';
import { TournamentTableHeader } from './TournamentTableHeader';
import { TournamentElimination } from './TournamentElimination';
import { TournamentLeaderboard } from './TournamentLeaderboard';
import { ProfessionalPokerTable } from './ProfessionalPokerTable';
import { EnhancedPokerControls } from './EnhancedPokerControls';
import { MobilePokerTable } from './MobilePokerTable';
import { HandHistoryExport } from './HandHistoryExport';
import { TableStatistics } from './TableStatistics';
import { TableChat } from './TableChat';
import { BombPotIndicator } from './BombPotIndicator';
// Pro features integration
import { SqueezeHand } from './SqueezeCard';
import { TableReactions, QuickReactionButton, useTableReactions, ReactionType } from './TableEmojis';
import { HandReplayer, HandReplay } from './HandReplayer';
import { AutoMuckButton, useAutoMuckSettings } from './AutoMuckSettings';
import { SmartHUD } from './SmartHUD';
import { EVCashoutPanel } from './EVCashoutPanel';
import { RabbitHuntPanel } from './RabbitHuntPanel';
import { JackpotWidget, JackpotWinOverlay, useJackpotSystem, JackpotInfo } from './JackpotSystem';
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
  Eye,
  Trophy,
  BarChart3,
  Bomb,
  Sparkles,
  Shield,
  Target,
  Rabbit,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isSpectator?: boolean;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
}

export function OnlinePokerTable({ 
  tableId, 
  playerId, 
  buyIn, 
  isSpectator = false, 
  isTournament = false,
  tournamentId,
  onLeave 
}: OnlinePokerTableProps) {
  const isMobile = useIsMobile();
  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  const sounds = usePokerSounds();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const prevPhaseRef = useRef<string | null>(null);
  
  // Pro features state
  const [showSqueezeCards, setShowSqueezeCards] = useState(false);
  const [showEVCashout, setShowEVCashout] = useState(false);
  const [showRabbitHunt, setShowRabbitHunt] = useState(false);
  const [showHandReplayer, setShowHandReplayer] = useState(false);
  const [selectedReplayHand, setSelectedReplayHand] = useState<HandReplay | null>(null);
  const [showHUD, setShowHUD] = useState(true);
  
  // Pro hooks
  const { reactions, addReaction, removeReaction } = useTableReactions();
  const { settings: autoMuckSettings, updateSettings: updateAutoMuckSettings } = useAutoMuckSettings();
  const { jackpots, currentEvent: jackpotEvent, dismissEvent: dismissJackpotEvent } = useJackpotSystem(tableId);
  
  // Demo jackpots for display
  const demoJackpots: JackpotInfo[] = [
    { id: '1', type: 'bad-beat', name: 'Bad Beat Jackpot', description: 'Проиграйте с квадами или выше', amount: 125000, currency: 'chips', contributionPerHand: 1, qualifyingCondition: 'Квады JJ+' },
    { id: '2', type: 'high-hand', name: 'High Hand', description: 'Лучшая рука часа', amount: 5000, currency: 'chips', contributionPerHand: 0, qualifyingCondition: 'Фулл-хаус+' }
  ];

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
    clearShowdown,
    // Bomb Pot & Chat
    isBombPot,
    bombPotEnabled,
    bombPotMultiplier,
    triggerBombPot,
    mutePlayer,
    chatEnabled,
    chatSlowMode,
    chatSlowModeInterval
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

  const handleSendChat = (text?: string) => {
    const message = text || chatInput.trim();
    if (message) {
      pokerTable.sendChat(message);
      setChatInput('');
      sounds.playChat();
    }
  };

  const handleMutePlayer = (targetPlayerId: string, mute: boolean) => {
    if (mute) {
      setMutedPlayers(prev => new Set([...prev, targetPlayerId]));
    } else {
      setMutedPlayers(prev => {
        const next = new Set(prev);
        next.delete(targetPlayerId);
        return next;
      });
    }
    mutePlayer?.(targetPlayerId, mute);
  };

  const handleTriggerBombPot = () => {
    triggerBombPot?.();
  };

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Handle emoji reaction
  const handleReaction = useCallback((type: ReactionType) => {
    if (mySeat && myPlayer) {
      addReaction(playerId, myPlayer.name, mySeat, type);
    }
  }, [mySeat, myPlayer, playerId, addReaction]);

  // Seat positions for reactions overlay
  const seatPositions = [
    { x: 400, y: 450 }, { x: 120, y: 380 }, { x: 40, y: 220 },
    { x: 120, y: 80 }, { x: 280, y: 30 }, { x: 520, y: 30 },
    { x: 680, y: 80 }, { x: 760, y: 220 }, { x: 680, y: 380 }
  ];

  // Check if all-in situation for EV Cashout
  const isAllInSituation = tableState?.players.some(p => p.isAllIn && !p.isFolded);
  const activePlayers = tableState?.players.filter(p => !p.isFolded) || [];
  const canShowEVCashout = isAllInSituation && activePlayers.length >= 2 && tableState?.phase !== 'waiting';

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
            "w-14 h-14 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center mx-auto shadow-lg overflow-hidden",
            player.isAllIn && "ring-2 ring-yellow-500 ring-offset-1",
            isCurrentPlayer && "animate-pulse"
          )}
          whileHover={{ scale: 1.05 }}
        >
          {player.avatarUrl ? (
            <Avatar className="w-full h-full">
              <AvatarImage src={player.avatarUrl} className="object-cover" />
              <AvatarFallback className="text-xl">{isMe ? '😎' : '👤'}</AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-xl">{isMe ? '😎' : '👤'}</span>
          )}
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
    <div className="space-y-4 relative">
      {/* Tournament Elimination Tracker */}
      {isTournament && tournamentId && (
        <TournamentElimination
          tournamentId={tournamentId}
          playerId={playerId}
          playerStack={myPlayer?.stack || 0}
          onEliminated={(position, prize) => {
            console.log(`Eliminated at position ${position} with prize ${prize}`);
          }}
        />
      )}

      {/* Tournament Header */}
      {isTournament && tournamentId && (
        <TournamentTableHeader tournamentId={tournamentId} />
      )}

      {/* Header with Pro Features */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
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
          
          {/* Jackpot Widget */}
          <JackpotWidget jackpots={demoJackpots} />
        </div>
        
        <div className="flex items-center gap-1 flex-wrap">
          {/* Pro Feature Toggles */}
          <Button 
            variant={showHUD ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowHUD(!showHUD)}
            title="Smart HUD"
            className="gap-1 text-xs"
          >
            <TrendingUp className="h-3 w-3" />
            HUD
          </Button>
          
          {canShowEVCashout && (
            <Button 
              variant={showEVCashout ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowEVCashout(!showEVCashout)}
              title="EV Cashout & Insurance"
              className="gap-1 text-xs bg-gradient-to-r from-amber-500/20 to-green-500/20"
            >
              <Shield className="h-3 w-3" />
              Insurance
            </Button>
          )}
          
          {tableState?.phase !== 'waiting' && tableState?.phase !== 'showdown' && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowRabbitHunt(!showRabbitHunt)}
              title="Rabbit Hunt"
              className="gap-1 text-xs"
            >
              <Rabbit className="h-3 w-3" />
            </Button>
          )}
          
          {/* Auto Muck Settings */}
          <AutoMuckButton 
            settings={autoMuckSettings} 
            onSettingsChange={updateAutoMuckSettings} 
          />
          
          {/* Emoji Reactions */}
          <QuickReactionButton onReact={handleReaction} />
          
          {/* Hand History Export */}
          <HandHistoryExport handHistory={handHistory} />
          
          {/* Statistics Toggle */}
          <Button 
            variant={showStats ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowStats(!showStats)}
            title="Аналитика"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          
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

      {/* Tournament Timer & Leaderboard */}
      {isTournament && tournamentId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <TournamentTimer 
              tournamentId={tournamentId}
              isAdmin={false}
            />
          </div>
          <div className="lg:col-span-3">
            {/* Table will be rendered below */}
          </div>
        </div>
      )}

      {/* Tournament Leaderboard - Side panel */}
      {isTournament && tournamentId && (
        <div className="fixed right-4 top-24 z-40 w-72 hidden xl:block">
          <TournamentLeaderboard 
            tournamentId={tournamentId}
            currentPlayerId={playerId}
          />
        </div>
      )}

      {/* Spectator notice */}
      {isSpectator && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="py-3 flex items-center justify-center gap-2">
            <Eye className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400">Вы наблюдаете за игрой. Карты игроков скрыты.</span>
          </CardContent>
        </Card>
      )}

      {/* Professional Poker Table with Pro Features */}
      <div className="relative">
        {/* Bomb Pot Indicator */}
        <BombPotIndicator
          isActive={isBombPot || false}
          multiplier={bombPotMultiplier || 2}
          isDoubleBoard={tableState?.bombPotDoubleBoard}
        />

        {/* Table Reactions Overlay */}
        <TableReactions 
          reactions={reactions}
          seatPositions={seatPositions}
          onReactionComplete={removeReaction}
        />

        {/* Smart HUD overlay - show for first opponent */}
        {showHUD && tableState && tableState.players.length > 1 && (
          <div className="absolute top-2 left-2 z-30 space-y-1">
            {tableState.players
              .filter(p => p.oderId !== playerId && !p.isFolded)
              .slice(0, 2)
              .map(player => (
                <SmartHUD 
                  key={player.oderId}
                  playerId={player.oderId}
                  playerName={player.name || `Player ${player.seatNumber}`}
                  stats={null} // Would come from real stats tracking
                  isActive={tableState.currentPlayerSeat === player.seatNumber}
                  compact
                />
              ))}
          </div>
        )}

        <ProfessionalPokerTable
          tableState={tableState}
          myCards={isSpectator ? [] : myCards}
          playerId={playerId}
        />

        {/* EV Cashout Panel - Right side when all-in */}
        <AnimatePresence>
          {showEVCashout && canShowEVCashout && tableState && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-0 right-0 z-40 w-80"
            >
              <EVCashoutPanel
                scenario={{
                  players: activePlayers.map(p => ({
                    playerId: p.oderId,
                    playerName: p.name || `Player ${p.seatNumber}`,
                    cards: p.holeCards || [],
                    stack: p.stack,
                    contribution: p.betAmount
                  })),
                  communityCards: tableState.communityCards,
                  pot: tableState.pot,
                  phase: tableState.phase as 'preflop' | 'flop' | 'turn' | 'river'
                }}
                playerId={playerId}
                onAcceptCashout={(amount) => {
                  console.log(`Accepted cashout: ${amount}`);
                  setShowEVCashout(false);
                }}
                onDeclineCashout={() => setShowEVCashout(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rabbit Hunt Panel */}
        <AnimatePresence>
          {showRabbitHunt && tableState && myCards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 z-40"
            >
              <RabbitHuntPanel
                foldedPlayerCards={myCards}
                communityCards={tableState.communityCards}
                usedCards={tableState.players.flatMap(p => p.holeCards || [])}
                potSize={tableState.pot}
                onPurchase={(cost) => {
                  console.log(`Purchased rabbit hunt for ${cost}`);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Table Chat */}
        <TableChat
          messages={chatMessages.map(m => ({
            id: m.id || String(m.timestamp),
            playerId: m.playerId,
            playerName: m.playerName || 'Player',
            message: m.message || m.text || '',
            timestamp: m.timestamp,
            type: m.type || 'chat',
            isModerated: m.isModerated
          }))}
          onSendMessage={handleSendChat}
          onMutePlayer={handleMutePlayer}
          onTriggerBombPot={bombPotEnabled ? handleTriggerBombPot : undefined}
          mutedPlayers={mutedPlayers}
          isChatEnabled={chatEnabled}
          isSlowMode={chatSlowMode}
          slowModeInterval={chatSlowModeInterval}
          currentPlayerId={playerId}
          bombPotEnabled={bombPotEnabled}
        />
      </div>

      {/* Squeeze Cards Modal for new hand */}
      <AnimatePresence>
        {showSqueezeCards && myCards.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            onClick={() => setShowSqueezeCards(false)}
          >
            <div onClick={e => e.stopPropagation()}>
              <SqueezeHand 
                cards={myCards} 
                size="xl"
                onRevealComplete={() => {
                  setTimeout(() => setShowSqueezeCards(false), 500);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jackpot Win Overlay */}
      <AnimatePresence>
        {jackpotEvent && (
          <JackpotWinOverlay
            event={jackpotEvent}
            currentPlayerId={playerId}
            onClose={dismissJackpotEvent}
          />
        )}
      </AnimatePresence>

      {/* Action Buttons (only for players, not spectators) */}
      {!isSpectator && (
        <div className="mt-20">
          {tableState?.phase === 'waiting' ? (
            <div className="flex justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={startHand} size="lg" className="gap-2 h-14 px-8 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600">
                  <Play className="h-6 w-6" />
                  Начать раздачу
                </Button>
              </motion.div>
            </div>
          ) : (
            <EnhancedPokerControls
              isMyTurn={isMyTurn}
              canCheck={canCheck}
              callAmount={callAmount}
              currentBet={tableState?.currentBet || 0}
              myStack={myPlayer?.stack || 0}
              minRaise={(tableState?.currentBet || 20) * 2}
              onFold={handleFold}
              onCheck={handleCheck}
              onCall={handleCall}
              onRaise={handleRaise}
              onAllIn={handleAllIn}
            />
          )}
        </div>
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
                  <Button size="icon" onClick={() => handleSendChat()}>
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

      {/* Statistics panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed top-24 left-4 w-72 z-40"
          >
            <TableStatistics 
              handHistory={handHistory}
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
