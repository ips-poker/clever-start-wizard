import React, { useState } from 'react';
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
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useHandHistory, HandHistoryRecord, HandActionRecord } from '@/hooks/useHandHistory';

interface FullHandHistoryProps {
  tableId?: string;
  playerId?: string;
  className?: string;
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
  'all-in': 'Олл-ин'
};

export function FullHandHistory({ tableId, playerId, className }: FullHandHistoryProps) {
  const { hands, isLoading, error, selectedHand, setSelectedHand, fetchHistory, fetchHandDetails } = useHandHistory({
    tableId,
    playerId,
    limit: 50
  });

  const [detailsOpen, setDetailsOpen] = useState(false);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCard = (card: string) => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const isRed = suit === 'h' || suit === 'd';
    
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center px-1.5 py-0.5 rounded font-mono text-sm font-bold',
          'bg-card border shadow-sm',
          isRed ? 'text-red-500' : 'text-foreground'
        )}
      >
        {rank}{suitSymbols[suit] || suit}
      </span>
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

  if (isLoading && hands.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              История рук ({hands.length})
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchHistory}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {hands.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              История пуста
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="p-2 space-y-2">
                {hands.map((hand) => {
                  const isWinner = hand.winners.some(w => w.playerId === playerId);
                  const myPlayer = hand.players.find(p => p.playerId === playerId);
                  
                  return (
                    <motion.div
                      key={hand.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/50",
                        isWinner && "border-green-500/50 bg-green-500/5"
                      )}
                      onClick={() => handleViewDetails(hand)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">
                            #{hand.handNumber}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(hand.completedAt || hand.startedAt)}
                          </div>
                          {isWinner && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-500 text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Победа
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Coins className="h-3 w-3 mr-1" />
                            {hand.pot}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {hand.players.length}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Quick preview */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Борд:</span>
                        <div className="flex gap-1">
                          {hand.communityCards.length > 0 ? (
                            hand.communityCards.map((card, i) => (
                              <span key={i}>{renderCard(card)}</span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        {myPlayer && myPlayer.holeCards.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground ml-2">Мои:</span>
                            <div className="flex gap-1">
                              {myPlayer.holeCards.map((card, i) => (
                                <span key={i}>{renderCard(card)}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Hand Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Раздача #{selectedHand?.handNumber}
              {selectedHand?.completedAt && (
                <span className="text-sm font-normal text-muted-foreground">
                  {formatTime(selectedHand.completedAt)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedHand && (
            <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="summary">Итоги</TabsTrigger>
                <TabsTrigger value="actions">Действия</TabsTrigger>
                <TabsTrigger value="players">Игроки</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="summary" className="mt-0 space-y-4">
                  {/* Board */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Борд</h4>
                    <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                      {selectedHand.communityCards.length > 0 ? (
                        selectedHand.communityCards.map((card, i) => (
                          <span key={i}>{renderCard(card)}</span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Нет карт</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Pot */}
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">Банк</div>
                      <div className="text-xl font-bold flex items-center gap-1">
                        <Coins className="h-5 w-5 text-amber-500" />
                        {selectedHand.pot}
                      </div>
                    </div>
                    {selectedHand.rake && (
                      <div>
                        <div className="text-xs text-muted-foreground">Рейк</div>
                        <div className="text-lg font-medium text-muted-foreground">
                          {selectedHand.rake}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Winners */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Победители
                    </h4>
                    <div className="space-y-2">
                      {selectedHand.winners.map((winner, i) => (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {winner.playerName || 'Игрок'}
                            </span>
                            {winner.handName && (
                              <Badge variant="secondary">{winner.handName}</Badge>
                            )}
                          </div>
                          <span className="text-green-500 font-bold">+{winner.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-0 space-y-4">
                  {selectedHand.actions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Нет записанных действий
                    </div>
                  ) : (
                    Object.entries(groupActionsByPhase(selectedHand.actions))
                      .sort(([a], [b]) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b))
                      .map(([phase, actions]) => (
                        <div key={phase} className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground uppercase">
                            {PHASE_LABELS[phase] || phase}
                          </h4>
                          <div className="space-y-1 pl-2 border-l-2 border-muted">
                            {actions.map((action, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm py-1">
                                <Badge variant="outline" className="text-xs">
                                  Seat {action.seatNumber}
                                </Badge>
                                <span className="font-medium">
                                  {action.playerName || 'Игрок'}
                                </span>
                                <span className="text-muted-foreground">
                                  {ACTION_LABELS[action.actionType] || action.actionType}
                                </span>
                                {action.amount && action.amount > 0 && (
                                  <span className="text-amber-500 font-mono">
                                    {action.amount}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </TabsContent>
                
                <TabsContent value="players" className="mt-0">
                  <div className="space-y-2">
                    {selectedHand.players.map((player, i) => {
                      const isWinner = selectedHand.winners.some(w => w.playerId === player.playerId);
                      
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "p-3 border rounded-lg",
                            isWinner && "border-green-500/50 bg-green-500/5",
                            player.isFolded && "opacity-60"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Seat {player.seatNumber}</Badge>
                              <span className="font-medium">
                                {player.playerName || 'Игрок'}
                              </span>
                              {player.seatNumber === selectedHand.dealerSeat && (
                                <Badge className="bg-amber-500/20 text-amber-500 text-xs">D</Badge>
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
                                <Badge className="bg-red-500/20 text-red-500 text-xs">All-in</Badge>
                              )}
                              {isWinner && player.wonAmount && (
                                <span className="text-green-500 font-bold">+{player.wonAmount}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            {player.holeCards.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Карты:</span>
                                <div className="flex gap-1">
                                  {player.holeCards.map((card, ci) => (
                                    <span key={ci}>{renderCard(card)}</span>
                                  ))}
                                </div>
                                {player.handRank && (
                                  <Badge variant="secondary" className="ml-1 text-xs">
                                    {player.handRank}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>Ставка: {player.betAmount}</span>
                              {player.stackEnd !== undefined && (
                                <span>• Стек: {player.stackEnd}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
