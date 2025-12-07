import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ChevronDown, ChevronUp, Trophy, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface HandHistoryEntry {
  handNumber: number;
  timestamp: number;
  pot: number;
  winners: Array<{
    playerId: string;
    playerName?: string;
    amount: number;
    handRank?: string;
  }>;
  communityCards: string[];
  myCards?: string[];
  myResult?: 'win' | 'lose' | 'fold';
  actions: Array<{
    playerId: string;
    action: string;
    amount?: number;
    phase: string;
  }>;
}

interface HandHistoryProps {
  history: HandHistoryEntry[];
  playerId: string;
  className?: string;
}

export function HandHistory({ history, playerId, className }: HandHistoryProps) {
  const [expandedHand, setExpandedHand] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            История раздач
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            История пуста
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'lose': return 'text-red-500';
      case 'fold': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const renderCard = (card: string) => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const isRed = suit === 'h' || suit === 'd';
    
    return (
      <span className={cn('font-mono text-xs', isRed ? 'text-red-500' : 'text-foreground')}>
        {rank}{suitSymbols[suit] || suit}
      </span>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          История раздач ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-2 space-y-2">
            {history.slice().reverse().map((hand) => {
              const isExpanded = expandedHand === hand.handNumber;
              const isWinner = hand.winners.some(w => w.playerId === playerId);
              
              return (
                <div
                  key={hand.handNumber}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedHand(isExpanded ? null : hand.handNumber)}
                    className={cn(
                      "w-full p-2 flex items-center justify-between text-left",
                      "hover:bg-muted/50 transition-colors",
                      isWinner && "bg-green-500/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{hand.handNumber}</span>
                      <span className="text-xs">{formatTime(hand.timestamp)}</span>
                      {isWinner && <Trophy className="h-3 w-3 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Coins className="h-3 w-3 mr-1" />
                        {hand.pot}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t bg-muted/30"
                      >
                        <div className="p-2 space-y-2 text-xs">
                          {/* Community cards */}
                          {hand.communityCards.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Борд:</span>
                              <div className="flex gap-1">
                                {hand.communityCards.map((card, i) => (
                                  <span key={i} className="px-1 py-0.5 bg-background rounded">
                                    {renderCard(card)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* My cards */}
                          {hand.myCards && hand.myCards.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Мои карты:</span>
                              <div className="flex gap-1">
                                {hand.myCards.map((card, i) => (
                                  <span key={i} className="px-1 py-0.5 bg-primary/10 rounded">
                                    {renderCard(card)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Winners */}
                          {hand.winners.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-muted-foreground">Победители:</span>
                              {hand.winners.map((winner, i) => (
                                <Badge 
                                  key={i} 
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    winner.playerId === playerId && "bg-green-500/20 text-green-500"
                                  )}
                                >
                                  {winner.playerId === playerId ? 'Вы' : winner.playerName || 'Игрок'}
                                  {' +'}
                                  {winner.amount}
                                  {winner.handRank && ` (${winner.handRank})`}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Actions summary */}
                          {hand.actions.length > 0 && (
                            <details className="text-muted-foreground">
                              <summary className="cursor-pointer hover:text-foreground">
                                Действия ({hand.actions.length})
                              </summary>
                              <div className="mt-1 space-y-0.5 pl-2">
                                {hand.actions.map((action, i) => (
                                  <div key={i} className="flex gap-1">
                                    <span className="capitalize">{action.phase}:</span>
                                    <span>
                                      {action.playerId === playerId ? 'Вы' : 'Игрок'} {action.action}
                                      {action.amount ? ` ${action.amount}` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
