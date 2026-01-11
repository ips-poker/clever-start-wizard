// ============================================
// QUICK HAND HISTORY - PokerStars-style instant replay panel
// ============================================
// Shows last N hands with one-click replay - accessible from table menu
// Uses WebSocket for real-time updates when new hands complete

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Coins,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface QuickHandEntry {
  id: string;
  handNumber: number;
  pot: number;
  communityCards: string[];
  myCards: string[];
  myResult: 'win' | 'lose' | 'fold' | null;
  winAmount?: number;
  timestamp: string;
  winnersCount: number;
  phase: string;
}

interface QuickHandHistoryProps {
  tableId: string;
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullHistory?: () => void;
}

export function QuickHandHistory({ 
  tableId, 
  playerId, 
  isOpen, 
  onClose,
  onOpenFullHistory
}: QuickHandHistoryProps) {
  const [hands, setHands] = useState<QuickHandEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHandIndex, setSelectedHandIndex] = useState(0);
  
  // Fetch hands from Supabase
  const fetchHands = useCallback(async () => {
    if (!tableId || !playerId) return;
    
    setLoading(true);
    try {
      // Fetch last 10 completed hands for this table
      const { data: handsData, error } = await supabase
        .from('poker_hands')
        .select(`
          id,
          hand_number,
          pot,
          community_cards,
          phase,
          completed_at,
          winners
        `)
        .eq('table_id', tableId)
        .not('completed_at', 'is', null)
        .order('hand_number', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (!handsData || handsData.length === 0) {
        setHands([]);
        return;
      }
      
      // Fetch player's cards for each hand
      const handIds = handsData.map(h => h.id);
      const { data: playerHands } = await supabase
        .from('poker_hand_players')
        .select('hand_id, hole_cards, won_amount, is_folded')
        .eq('player_id', playerId)
        .in('hand_id', handIds);
      
      const playerHandsMap = new Map(
        playerHands?.map(ph => [ph.hand_id, ph]) || []
      );
      
      const formattedHands: QuickHandEntry[] = handsData.map(hand => {
        const playerHand = playerHandsMap.get(hand.id);
        const winners = (hand.winners as any[]) || [];
        const isWinner = winners.some((w: any) => w.playerId === playerId);
        const myWin = winners.find((w: any) => w.playerId === playerId);
        
        let myResult: 'win' | 'lose' | 'fold' | null = null;
        if (playerHand) {
          if (playerHand.is_folded) {
            myResult = 'fold';
          } else if (isWinner) {
            myResult = 'win';
          } else {
            myResult = 'lose';
          }
        }
        
        return {
          id: hand.id,
          handNumber: hand.hand_number,
          pot: hand.pot || 0,
          communityCards: (hand.community_cards as string[]) || [],
          myCards: (playerHand?.hole_cards as string[]) || [],
          myResult,
          winAmount: myWin?.amount,
          timestamp: hand.completed_at || '',
          winnersCount: winners.length,
          phase: hand.phase
        };
      });
      
      setHands(formattedHands);
      setSelectedHandIndex(0);
    } catch (err) {
      console.error('[QuickHandHistory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [tableId, playerId]);
  
  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchHands();
    }
  }, [isOpen, fetchHands]);
  
  // Subscribe to real-time hand completions
  useEffect(() => {
    if (!isOpen || !tableId) return;
    
    const channel = supabase
      .channel(`quick-history-${tableId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'poker_hands',
        filter: `table_id=eq.${tableId}`
      }, (payload) => {
        // Refresh when a hand is completed
        if (payload.new && (payload.new as any).completed_at) {
          fetchHands();
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, tableId, fetchHands]);
  
  const selectedHand = useMemo(() => hands[selectedHandIndex], [hands, selectedHandIndex]);
  
  const renderCard = (card: string) => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const suitColors: Record<string, string> = { 
      h: 'text-red-500', 
      d: 'text-blue-500', 
      c: 'text-green-500', 
      s: 'text-foreground' 
    };
    
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center w-8 h-11 rounded bg-white shadow-md font-bold text-sm',
          suitColors[suit] || 'text-foreground'
        )}
      >
        <span className="flex flex-col items-center leading-none">
          <span>{rank}</span>
          <span className="text-xs">{suitSymbols[suit] || suit}</span>
        </span>
      </span>
    );
  };
  
  const getResultBadge = (result: 'win' | 'lose' | 'fold' | null, amount?: number) => {
    if (!result) return null;
    
    switch (result) {
      case 'win':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <ArrowUp className="h-3 w-3 mr-1" />
            +{amount?.toLocaleString() || 0}
          </Badge>
        );
      case 'lose':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <ArrowDown className="h-3 w-3 mr-1" />
            Проигрыш
          </Badge>
        );
      case 'fold':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Фолд
          </Badge>
        );
    }
  };
  
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute left-2 top-20 z-50 w-80"
        >
          <div className="bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <History className="h-4 w-4" />
                <span className="font-medium text-sm">Последняя раздача</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white"
                  onClick={fetchHands}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                {onOpenFullHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                    onClick={onOpenFullHistory}
                  >
                    Вся история
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hands.length === 0 ? (
              <div className="py-8 text-center text-white/50 text-sm">
                Нет завершённых раздач
              </div>
            ) : (
              <>
                {/* Hand Navigation */}
                {hands.length > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={selectedHandIndex >= hands.length - 1}
                      onClick={() => setSelectedHandIndex(i => Math.min(i + 1, hands.length - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-white/60">
                      #{selectedHand?.handNumber} • {selectedHandIndex + 1}/{hands.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={selectedHandIndex <= 0}
                      onClick={() => setSelectedHandIndex(i => Math.max(i - 1, 0))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Selected Hand Details */}
                {selectedHand && (
                  <div className="p-4 space-y-4">
                    {/* Header with result */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs">#{selectedHand.handNumber}</span>
                        <span className="text-white/30 text-xs">{formatTime(selectedHand.timestamp)}</span>
                      </div>
                      {getResultBadge(selectedHand.myResult, selectedHand.winAmount)}
                    </div>
                    
                    {/* My Cards */}
                    {selectedHand.myCards.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-white/50 uppercase tracking-wide">Ваши карты</div>
                        <div className="flex gap-2">
                          {selectedHand.myCards.map((card, i) => (
                            <motion.div
                              key={i}
                              initial={{ rotateY: 180, opacity: 0 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              {renderCard(card)}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Community Cards */}
                    <div className="space-y-2">
                      <div className="text-xs text-white/50 uppercase tracking-wide">Борд</div>
                      <div className="flex gap-1.5">
                        {selectedHand.communityCards.length > 0 ? (
                          selectedHand.communityCards.map((card, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              {renderCard(card)}
                            </motion.div>
                          ))
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Pot */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span className="text-white font-medium">
                        {selectedHand.pot.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QuickHandHistory;
