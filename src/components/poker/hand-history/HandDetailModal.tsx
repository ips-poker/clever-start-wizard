import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, Coins, Users, Clock, Play, Download, Copy, 
  TrendingUp, TrendingDown, CircleDot, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniCardGroup, MiniPokerCard } from './MiniPokerCard';
import { HandHistoryRecord, HandActionRecord } from '@/hooks/useHandHistory';

interface HandDetailModalProps {
  hand: HandHistoryRecord | null;
  open: boolean;
  onClose: () => void;
  onReplay: () => void;
  playerId?: string;
}

const PHASE_LABELS: Record<string, string> = {
  preflop: 'Префлоп',
  flop: 'Флоп',
  turn: 'Тёрн',
  river: 'Ривер',
  showdown: 'Шоудаун'
};

const PHASE_ORDER = ['preflop', 'flop', 'turn', 'river', 'showdown'];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  fold: <Target className="w-3 h-3 text-slate-500" />,
  check: <CircleDot className="w-3 h-3 text-blue-500" />,
  call: <Coins className="w-3 h-3 text-amber-500" />,
  bet: <TrendingUp className="w-3 h-3 text-green-500" />,
  raise: <TrendingUp className="w-3 h-3 text-orange-500" />,
  'all-in': <Trophy className="w-3 h-3 text-red-500" />
};

const ACTION_LABELS: Record<string, string> = {
  fold: 'Фолд',
  check: 'Чек',
  call: 'Колл',
  bet: 'Ставка',
  raise: 'Рейз',
  'all-in': 'Олл-ин'
};

export function HandDetailModal({ hand, open, onClose, onReplay, playerId }: HandDetailModalProps) {
  if (!hand) return null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupActionsByPhase = (actions: HandActionRecord[]) => {
    const groups: Record<string, HandActionRecord[]> = {};
    actions.forEach(action => {
      if (!groups[action.phase]) groups[action.phase] = [];
      groups[action.phase].push(action);
    });
    return groups;
  };

  const getPhaseCards = (phase: string) => {
    switch (phase) {
      case 'flop': return hand.communityCards.slice(0, 3);
      case 'turn': return hand.communityCards.slice(0, 4);
      case 'river': return hand.communityCards;
      default: return [];
    }
  };

  const isWinner = hand.winners.some(w => w.playerId === playerId);
  const myPlayer = hand.players.find(p => p.playerId === playerId);
  const actionGroups = groupActionsByPhase(hand.actions);

  const handleCopyHand = () => {
    const text = `Hand #${hand.handNumber} - Pot: ${hand.pot} - ${hand.winners.map(w => `${w.playerName} wins ${w.amount}`).join(', ')}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="text-lg font-bold">Раздача #{hand.handNumber}</span>
              {isWinner && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  <Trophy className="w-3 h-3 mr-1" />
                  Победа
                </Badge>
              )}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {hand.actions.length > 0 && (
                <Button variant="default" size="sm" onClick={onReplay} className="gap-1">
                  <Play className="w-4 h-4" />
                  Воспроизвести
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleCopyHand}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(hand.completedAt || hand.startedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {hand.players.length} игроков
            </span>
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Coins className="w-3 h-3" />
              Банк: {hand.pot.toLocaleString()}
            </span>
          </div>
        </DialogHeader>

        <Separator className="my-3" />

        {/* Content */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mb-2">
            <TabsTrigger value="summary" className="flex-1">Итоги</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1">Действия</TabsTrigger>
            <TabsTrigger value="players" className="flex-1">Игроки</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 pb-4">
            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-0 space-y-4">
              {/* Board Section */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">БОРД</h4>
                <div className="flex justify-center">
                  {hand.communityCards.length > 0 ? (
                    <MiniCardGroup cards={hand.communityCards} size="md" overlap={false} />
                  ) : (
                    <span className="text-muted-foreground text-sm">Раздача закончилась до борда</span>
                  )}
                </div>
              </div>

              {/* My Cards (if available) */}
              {myPlayer && myPlayer.holeCards.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">МОИ КАРТЫ</h4>
                  <div className="flex justify-center">
                    <MiniCardGroup cards={myPlayer.holeCards} size="md" overlap={false} />
                  </div>
                </div>
              )}

              {/* Winners */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  ПОБЕДИТЕЛИ
                </h4>
                <div className="space-y-2">
                  {hand.winners.map((winner, i) => {
                    const winnerPlayer = hand.players.find(p => p.playerId === winner.playerId);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-amber-500" />
                          </div>
                          <div>
                            <span className="font-medium">{winner.playerName || 'Игрок'}</span>
                            {winner.handName && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {winner.handName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-green-500 font-bold text-lg">
                          +{winner.amount.toLocaleString()}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-0 space-y-4">
              {hand.actions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Нет записанных действий
                </div>
              ) : (
                PHASE_ORDER.filter(phase => actionGroups[phase]?.length > 0).map((phase) => {
                  const phaseCards = getPhaseCards(phase);
                  return (
                    <div key={phase} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase">
                          {PHASE_LABELS[phase] || phase}
                        </h4>
                        {phaseCards.length > 0 && (
                          <MiniCardGroup 
                            cards={phaseCards} 
                            size="xs" 
                            overlap={false}
                          />
                        )}
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-slate-700">
                        {actionGroups[phase].map((action, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30"
                          >
                            {ACTION_ICONS[action.actionType] || <CircleDot className="w-3 h-3" />}
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              S{action.seatNumber}
                            </Badge>
                            <span className="font-medium text-sm">
                              {action.playerName || 'Игрок'}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {ACTION_LABELS[action.actionType] || action.actionType}
                            </span>
                            {action.amount && action.amount > 0 && (
                              <span className="text-amber-500 font-mono font-medium">
                                {action.amount.toLocaleString()}
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players" className="mt-0">
              <div className="space-y-2">
                {hand.players
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map((player, i) => {
                    const isPlayerWinner = hand.winners.some(w => w.playerId === player.playerId);
                    const isDealer = player.seatNumber === hand.dealerSeat;
                    const isSB = player.seatNumber === hand.smallBlindSeat;
                    const isBB = player.seatNumber === hand.bigBlindSeat;
                    const stackChange = (player.stackEnd || player.stackStart) - player.stackStart;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between',
                          isPlayerWinner && 'bg-green-500/10 border-green-500/30',
                          player.playerId === playerId && !isPlayerWinner && 'bg-blue-500/10 border-blue-500/30'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                              isPlayerWinner ? 'bg-amber-500/20 text-amber-500' : 'bg-muted'
                            )}>
                              {(player.playerName || 'P')[0].toUpperCase()}
                            </div>
                            {(isDealer || isSB || isBB) && (
                              <div className={cn(
                                'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center',
                                isDealer ? 'bg-amber-500 text-black' :
                                isBB ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'
                              )}>
                                {isDealer ? 'D' : isBB ? 'B' : 'S'}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {player.playerName || `Seat ${player.seatNumber}`}
                              </span>
                              {player.playerId === playerId && (
                                <Badge variant="secondary" className="text-[10px]">Вы</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>Стек: {player.stackStart.toLocaleString()}</span>
                              {player.holeCards.length > 0 && (
                                <MiniCardGroup cards={player.holeCards} size="xs" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {stackChange !== 0 && (
                            <span className={cn(
                              'font-bold',
                              stackChange > 0 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {stackChange > 0 ? '+' : ''}{stackChange.toLocaleString()}
                            </span>
                          )}
                          {player.isFolded && (
                            <span className="text-muted-foreground text-xs block">Фолд</span>
                          )}
                          {player.handRank && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {player.handRank}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
