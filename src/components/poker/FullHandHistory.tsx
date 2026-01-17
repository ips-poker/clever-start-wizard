import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  Trophy, 
  Coins, 
  Users, 
  PlayCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Play,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Spade
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useHandHistory, HandHistoryRecord, HandActionRecord } from '@/hooks/useHandHistory';
import { HandReplayer, HandReplay, ReplayAction, ReplayPlayer } from './HandReplayer';

interface FullHandHistoryProps {
  tableId?: string;
  playerId?: string;
  className?: string;
  onReplayHand?: (hand: HandReplay) => void;
}

const PHASE_ORDER = ['preflop', 'flop', 'turn', 'river', 'showdown'];
const PHASE_LABELS: Record<string, string> = {
  preflop: 'Префлоп',
  flop: 'Флоп',
  turn: 'Тёрн',
  river: 'Ривер',
  showdown: 'Шоудаун'
};

const ACTION_LABELS: Record<string, string> = {
  fold: 'Фолд',
  check: 'Чек',
  call: 'Колл',
  raise: 'Рейз',
  bet: 'Ставка',
  'all-in': 'Олл-ин',
  allin: 'Олл-ин',
  post_sb: 'SB',
  post_bb: 'BB',
  post_ante: 'Анте'
};

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-muted-foreground',
  check: 'text-blue-400',
  call: 'text-green-400',
  raise: 'text-amber-400',
  bet: 'text-amber-400',
  'all-in': 'text-red-400',
  allin: 'text-red-400',
  post_sb: 'text-muted-foreground',
  post_bb: 'text-muted-foreground',
  post_ante: 'text-muted-foreground'
};

export function FullHandHistory({ tableId, playerId, className, onReplayHand }: FullHandHistoryProps) {
  const { hands, isLoading, error, selectedHand, setSelectedHand, fetchHistory, fetchHandDetails } = useHandHistory({
    tableId,
    playerId,
    limit: 50
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  // Convert HandHistoryRecord to HandReplay format
  const convertToReplayFormat = useCallback((hand: HandHistoryRecord): HandReplay => {
    const players: ReplayPlayer[] = hand.players.map(p => ({
      id: p.playerId,
      name: p.playerName || `Seat ${p.seatNumber}`,
      seatNumber: p.seatNumber,
      stackStart: p.stackStart,
      stackEnd: p.stackEnd || p.stackStart,
      holeCards: p.holeCards,
      isWinner: hand.winners.some(w => w.playerId === p.playerId),
      amountWon: p.wonAmount,
      handRank: p.handRank
    }));

    let runningPot = 0;
    const sbPlayer = hand.players.find(p => p.seatNumber === hand.smallBlindSeat);
    const bbPlayer = hand.players.find(p => p.seatNumber === hand.bigBlindSeat);
    const smallBlind = sbPlayer ? Math.min(sbPlayer.betAmount, 10) : 10;
    const bigBlind = bbPlayer ? Math.min(bbPlayer.betAmount, 20) : 20;
    runningPot = smallBlind + bigBlind;

    const actions: ReplayAction[] = hand.actions.map(a => {
      if (a.amount) runningPot += a.amount;
      return {
        phase: a.phase as ReplayAction['phase'],
        playerId: a.playerId,
        playerName: a.playerName,
        seatNumber: a.seatNumber,
        action: a.actionType as ReplayAction['action'],
        amount: a.amount,
        potAfter: runningPot,
        timestamp: new Date(a.createdAt).getTime()
      };
    });

    return {
      handId: hand.id,
      handNumber: hand.handNumber,
      timestamp: new Date(hand.startedAt).getTime(),
      players,
      communityCards: hand.communityCards,
      actions,
      dealerSeat: hand.dealerSeat,
      smallBlindSeat: hand.smallBlindSeat,
      bigBlindSeat: hand.bigBlindSeat,
      smallBlindAmount: smallBlind,
      bigBlindAmount: bigBlind,
      potTotal: hand.pot,
      winners: hand.winners.map(w => ({
        playerId: w.playerId,
        amount: w.amount,
        handRank: w.handName
      }))
    };
  }, []);

  const handleReplayHand = useCallback(() => {
    if (!selectedHand) return;
    const replayData = convertToReplayFormat(selectedHand);
    if (onReplayHand) {
      onReplayHand(replayData);
      setDetailsOpen(false);
    } else {
      setShowReplay(true);
    }
  }, [selectedHand, convertToReplayFormat, onReplayHand]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeShort = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Professional card rendering like PokerStars
  const renderCard = (card: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const isRed = suit === 'h' || suit === 'd';
    
    const sizeClasses = {
      sm: 'w-6 h-8 text-xs',
      md: 'w-8 h-11 text-sm',
      lg: 'w-10 h-14 text-base'
    };
    
    return (
      <div 
        className={cn(
          sizeClasses[size],
          'relative inline-flex flex-col items-center justify-center rounded-sm font-bold',
          'bg-gradient-to-b from-white to-gray-100 border border-gray-300',
          'shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]',
          isRed ? 'text-red-600' : 'text-gray-900'
        )}
      >
        <span className="leading-none">{rank}</span>
        <span className="leading-none text-[0.7em]">{suitSymbols[suit] || suit}</span>
      </div>
    );
  };

  // Render 5-card board with gaps for flop/turn/river
  const renderBoard = (cards: string[]) => {
    if (cards.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
    
    return (
      <div className="flex items-center gap-1">
        {/* Flop */}
        {cards.slice(0, 3).map((card, i) => (
          <span key={i}>{renderCard(card, 'md')}</span>
        ))}
        {/* Turn */}
        {cards[3] && (
          <>
            <div className="w-1" />
            {renderCard(cards[3], 'md')}
          </>
        )}
        {/* River */}
        {cards[4] && (
          <>
            <div className="w-1" />
            {renderCard(cards[4], 'md')}
          </>
        )}
      </div>
    );
  };

  const handleViewDetails = async (hand: HandHistoryRecord) => {
    await fetchHandDetails(hand.id);
    setDetailsOpen(true);
  };

  // Group actions by phase
  const groupActionsByPhase = (actions: HandActionRecord[]) => {
    const groups: Record<string, HandActionRecord[]> = {};
    actions.forEach(action => {
      if (!groups[action.phase]) {
        groups[action.phase] = [];
      }
      groups[action.phase].push(action);
    });
    return groups;
  };

  // Calculate profit/loss for player
  const getPlayerResult = (hand: HandHistoryRecord) => {
    const myPlayer = hand.players.find(p => p.playerId === playerId);
    if (!myPlayer) return { profit: 0, isWinner: false };
    
    const winAmount = myPlayer.wonAmount || 0;
    const betAmount = myPlayer.betAmount || 0;
    const profit = winAmount - betAmount;
    const isWinner = hand.winners.some(w => w.playerId === playerId);
    
    return { profit, isWinner, wonAmount: winAmount, betAmount };
  };

  if (isLoading && hands.length === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950", className)}>
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Загрузка истории...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">История рук</h2>
              <p className="text-xs text-muted-foreground">
                {hands.length} раздач
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchHistory}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Обновить
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {hands.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="p-6 rounded-full bg-muted/10">
              <Spade className="h-12 w-12 opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white/70">История пуста</p>
              <p className="text-sm">Сыгранные раздачи появятся здесь</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {hands.map((hand, index) => {
                const { profit, isWinner, wonAmount, betAmount } = getPlayerResult(hand);
                const myPlayer = hand.players.find(p => p.playerId === playerId);
                
                return (
                  <motion.div
                    key={hand.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                      "bg-gradient-to-r from-slate-800/80 to-slate-800/40 hover:from-slate-700/80 hover:to-slate-700/40",
                      "border border-white/5 hover:border-white/10",
                      isWinner && "border-l-2 border-l-green-500"
                    )}
                    onClick={() => handleViewDetails(hand)}
                  >
                    {/* Main row */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        {/* Left: Hand info */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-0.5 rounded">
                              #{hand.handNumber}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeShort(hand.completedAt || hand.startedAt)}
                            </span>
                          </div>
                          
                          {isWinner && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
                              <Trophy className="h-3 w-3" />
                              WIN
                            </Badge>
                          )}
                        </div>
                        
                        {/* Right: Pot & result */}
                        <div className="flex items-center gap-3">
                          {/* Profit/Loss indicator */}
                          {myPlayer && (
                            <div className={cn(
                              "flex items-center gap-1 text-sm font-mono font-bold",
                              profit > 0 && "text-green-400",
                              profit < 0 && "text-red-400",
                              profit === 0 && "text-muted-foreground"
                            )}>
                              {profit > 0 && <TrendingUp className="h-4 w-4" />}
                              {profit < 0 && <TrendingDown className="h-4 w-4" />}
                              {profit === 0 && <Minus className="h-4 w-4" />}
                              {profit > 0 ? '+' : ''}{profit}
                            </div>
                          )}
                          
                          {/* Pot */}
                          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded text-sm font-mono">
                            <Coins className="h-3.5 w-3.5" />
                            {hand.pot}
                          </div>
                          
                          {/* Players */}
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Users className="h-3.5 w-3.5" />
                            {hand.players.length}
                          </div>
                          
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                        </div>
                      </div>
                      
                      {/* Cards row */}
                      <div className="flex items-center gap-4 mt-2">
                        {/* My cards */}
                        {myPlayer && myPlayer.holeCards.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Мои</span>
                            <div className="flex gap-0.5">
                              {myPlayer.holeCards.map((card, i) => (
                                <span key={i}>{renderCard(card, 'sm')}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Board */}
                        {hand.communityCards.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Борд</span>
                            <div className="flex gap-0.5">
                              {hand.communityCards.map((card, i) => (
                                <span key={i}>{renderCard(card, 'sm')}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Winner hand rank */}
                        {isWinner && hand.winners[0]?.handName && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                            {hand.winners[0].handName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Hand Details Dialog - PokerStars Style */}
      <Dialog open={detailsOpen && !showReplay} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-gradient-to-b from-slate-900 to-slate-950 border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <PlayCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Раздача #{selectedHand?.handNumber}
                </h2>
                {selectedHand?.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatTime(selectedHand.completedAt)}
                  </p>
                )}
              </div>
            </div>
            
            {selectedHand && selectedHand.actions.length > 0 && (
              <Button 
                onClick={handleReplayHand}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Play className="h-4 w-4" />
                Воспроизвести
              </Button>
            )}
          </div>
          
          {selectedHand && (
            <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-3 mx-6 mt-4 bg-slate-800/50">
                <TabsTrigger value="summary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Итоги
                </TabsTrigger>
                <TabsTrigger value="actions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Действия
                </TabsTrigger>
                <TabsTrigger value="players" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Игроки
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 mt-4 px-6 pb-6">
                <TabsContent value="summary" className="mt-0 space-y-6">
                  {/* Board Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Борд</h4>
                    <div className="p-4 rounded-xl bg-gradient-to-b from-green-900/30 to-green-950/30 border border-green-500/20">
                      {renderBoard(selectedHand.communityCards)}
                    </div>
                  </div>
                  
                  {/* Pot & Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                      <div className="text-xs text-muted-foreground mb-1">Банк</div>
                      <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                        <Coins className="h-6 w-6" />
                        {selectedHand.pot}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                      <div className="text-xs text-muted-foreground mb-1">Игроков</div>
                      <div className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        {selectedHand.players.length}
                      </div>
                    </div>
                    {selectedHand.rake && selectedHand.rake > 0 && (
                      <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1">Рейк</div>
                        <div className="text-2xl font-bold text-muted-foreground">
                          {selectedHand.rake}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Winners Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      Победители
                    </h4>
                    <div className="space-y-2">
                      {selectedHand.winners.length > 0 ? (
                        selectedHand.winners.map((winner, i) => {
                          const winnerPlayer = selectedHand.players.find(p => p.playerId === winner.playerId);
                          return (
                            <div 
                              key={i}
                              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-green-500/20">
                                  <Trophy className="h-4 w-4 text-green-400" />
                                </div>
                                <div>
                                  <span className="font-bold text-white">
                                    {winner.playerName || 'Игрок'}
                                  </span>
                                  {winner.handName && (
                                    <Badge variant="secondary" className="ml-2 text-xs bg-green-500/20 text-green-400">
                                      {winner.handName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Winner cards */}
                                {winnerPlayer && winnerPlayer.holeCards.length > 0 && (
                                  <div className="flex gap-0.5">
                                    {winnerPlayer.holeCards.map((card, ci) => (
                                      <span key={ci}>{renderCard(card, 'sm')}</span>
                                    ))}
                                  </div>
                                )}
                                <span className="text-xl font-bold text-green-400">
                                  +{winner.amount}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-muted-foreground text-center py-4">
                          Нет данных о победителях
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-0 space-y-4">
                  {selectedHand.actions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Нет записанных действий</p>
                    </div>
                  ) : (
                    Object.entries(groupActionsByPhase(selectedHand.actions))
                      .sort(([a], [b]) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b))
                      .map(([phase, actions]) => (
                        <div key={phase} className="space-y-2">
                          {/* Phase header with cards */}
                          <div className="flex items-center gap-3 py-2">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              {PHASE_LABELS[phase] || phase}
                            </h4>
                            {phase === 'flop' && selectedHand.communityCards.length >= 3 && (
                              <div className="flex gap-0.5">
                                {selectedHand.communityCards.slice(0, 3).map((card, i) => (
                                  <span key={i}>{renderCard(card, 'sm')}</span>
                                ))}
                              </div>
                            )}
                            {phase === 'turn' && selectedHand.communityCards[3] && (
                              renderCard(selectedHand.communityCards[3], 'sm')
                            )}
                            {phase === 'river' && selectedHand.communityCards[4] && (
                              renderCard(selectedHand.communityCards[4], 'sm')
                            )}
                          </div>
                          
                          {/* Actions list */}
                          <div className="space-y-1 pl-4 border-l-2 border-slate-700">
                            {actions.map((action, i) => (
                              <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                              >
                                <Badge variant="outline" className="text-xs font-mono w-12 justify-center">
                                  S{action.seatNumber}
                                </Badge>
                                <span className="font-medium text-white min-w-[100px]">
                                  {action.playerName || 'Игрок'}
                                </span>
                                <span className={cn(
                                  "font-bold uppercase text-sm",
                                  ACTION_COLORS[action.actionType] || 'text-foreground'
                                )}>
                                  {ACTION_LABELS[action.actionType] || action.actionType}
                                </span>
                                {action.amount && action.amount > 0 && (
                                  <span className="text-amber-400 font-mono font-bold">
                                    {action.amount}
                                  </span>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </TabsContent>
                
                <TabsContent value="players" className="mt-0">
                  <div className="space-y-2">
                    {selectedHand.players
                      .sort((a, b) => a.seatNumber - b.seatNumber)
                      .map((player, i) => {
                        const isWinner = selectedHand.winners.some(w => w.playerId === player.playerId);
                        const isMe = player.playerId === playerId;
                        
                        return (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "p-4 rounded-xl border transition-all",
                              isWinner && "bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30",
                              isMe && !isWinner && "bg-gradient-to-r from-primary/10 to-transparent border-primary/30",
                              !isWinner && !isMe && "bg-slate-800/30 border-white/5",
                              player.isFolded && "opacity-50"
                            )}
                          >
                            {/* Player header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  S{player.seatNumber}
                                </Badge>
                                <span className="font-bold text-white">
                                  {player.playerName || 'Игрок'}
                                </span>
                                {isMe && (
                                  <Badge className="bg-primary/20 text-primary text-xs">
                                    ВЫ
                                  </Badge>
                                )}
                                {player.seatNumber === selectedHand.dealerSeat && (
                                  <Badge className="bg-amber-500/20 text-amber-400 text-xs font-bold">D</Badge>
                                )}
                                {player.seatNumber === selectedHand.smallBlindSeat && (
                                  <Badge variant="secondary" className="text-xs">SB</Badge>
                                )}
                                {player.seatNumber === selectedHand.bigBlindSeat && (
                                  <Badge variant="secondary" className="text-xs">BB</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {player.isFolded && (
                                  <Badge variant="secondary" className="text-xs">Фолд</Badge>
                                )}
                                {player.isAllIn && (
                                  <Badge className="bg-red-500/20 text-red-400 text-xs">All-in</Badge>
                                )}
                                {isWinner && player.wonAmount && (
                                  <span className="text-green-400 font-bold text-lg">
                                    +{player.wonAmount}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Player details */}
                            <div className="flex items-center gap-6 text-sm">
                              {/* Hole cards */}
                              {player.holeCards.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground uppercase">Карты</span>
                                  <div className="flex gap-0.5">
                                    {player.holeCards.map((card, ci) => (
                                      <span key={ci}>{renderCard(card, 'sm')}</span>
                                    ))}
                                  </div>
                                  {player.handRank && (
                                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                                      {player.handRank}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* Stack info */}
                              <div className="flex items-center gap-4 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="text-xs uppercase">Ставка:</span>
                                  <span className="text-white font-mono">{player.betAmount}</span>
                                </span>
                                {player.stackEnd !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-xs uppercase">Стек:</span>
                                    <span className="text-white font-mono">{player.stackEnd}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline Hand Replayer Dialog */}
      <Dialog open={showReplay} onOpenChange={setShowReplay}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-slate-900 border-white/10">
          {selectedHand && (
            <HandReplayer
              hand={convertToReplayFormat(selectedHand)}
              onClose={() => setShowReplay(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
