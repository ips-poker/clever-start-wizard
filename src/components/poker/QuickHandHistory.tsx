// ============================================
// QUICK HAND HISTORY - PokerStars-style instant replay panel
// ============================================
// Shows last N hands with one-click replay - accessible from table menu
// Primary source: Node WebSocket server (authoritative)
// Fallback: Supabase direct query (useful for admin/debug environments)

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  X,
  ChevronLeft,
  ChevronRight,
  Coins,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface QuickHandEntry {
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

  // Poker engine integration
  wsRef?: React.MutableRefObject<WebSocket | null>;
  sendMessage?: (message: object) => boolean;
}

type HandHistoryServerMessage =
  | { type: 'hand_history'; tableId: string; hands: QuickHandEntry[]; timestamp?: number }
  | { type: 'hand_completed'; tableId: string; handId?: string; handNumber?: number; timestamp?: number }
  | { type: 'error'; tableId?: string; error?: string; message?: string };

export function QuickHandHistory({
  tableId,
  playerId,
  isOpen,
  onClose,
  onOpenFullHistory,
  wsRef,
  sendMessage,
}: QuickHandHistoryProps) {
  const [hands, setHands] = useState<QuickHandEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHandIndex, setSelectedHandIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  const lastRequestIdRef = useRef(0);
  const refreshDebounceRef = useRef<number | null>(null);

  const selectedHand = useMemo(() => hands[selectedHandIndex], [hands, selectedHandIndex]);

  const applyHands = useCallback((incoming: QuickHandEntry[]) => {
    setHands(incoming);
    setSelectedHandIndex(0);
    setErrorText(null);
  }, []);

  const requestHandsFromServer = useCallback(
    (reason: 'open' | 'manual' | 'hand_completed' = 'manual') => {
      if (!sendMessage || !tableId) return false;

      const ws = wsRef?.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // If socket is still connecting, try a short retry window.
        if (reason === 'open') {
          const startId = ++lastRequestIdRef.current;
          setLoading(true);
          setErrorText(null);

          let attempts = 0;
          const tick = () => {
            if (!isOpen) return;
            if (startId !== lastRequestIdRef.current) return;

            const w = wsRef?.current;
            if (w?.readyState === WebSocket.OPEN) {
              sendMessage({ type: 'get_hand_history', tableId, playerId, limit: 10 });
              return;
            }

            attempts += 1;
            if (attempts >= 6) {
              setLoading(false);
              return;
            }
            window.setTimeout(tick, 250);
          };

          window.setTimeout(tick, 50);
          return true;
        }

        return false;
      }

      setLoading(true);
      setErrorText(null);
      return sendMessage({ type: 'get_hand_history', tableId, playerId, limit: 10 });
    },
    [sendMessage, tableId, playerId, wsRef, isOpen]
  );

  const fetchHandsFromSupabase = useCallback(async () => {
    if (!tableId) return;

    setLoading(true);
    setErrorText(null);

    try {
      const { data: handsData, error } = await supabase
        .from('poker_hands')
        .select(
          `
            id,
            hand_number,
            pot,
            community_cards,
            phase,
            completed_at,
            winners
          `
        )
        .eq('table_id', tableId)
        .not('completed_at', 'is', null)
        .order('hand_number', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!handsData || handsData.length === 0) {
        applyHands([]);
        return;
      }

      // Fetch hero cards for each hand
      const handIds = handsData.map((h) => h.id);
      const playerHandsMap = new Map<string, { hole_cards: string[] | null; won_amount: number | null; is_folded: boolean }>();

      const { data: playerHands } = await supabase
        .from('poker_hand_players')
        .select('hand_id, hole_cards, won_amount, is_folded')
        .eq('player_id', playerId)
        .in('hand_id', handIds);

      if (playerHands) {
        for (const ph of playerHands) {
          playerHandsMap.set(ph.hand_id, {
            hole_cards: (ph.hole_cards as any) || [],
            won_amount: ph.won_amount,
            is_folded: !!ph.is_folded,
          });
        }
      }

      const formatted: QuickHandEntry[] = handsData.map((hand) => {
        const winners = (hand.winners as any[]) || [];
        const playerHand = playerHandsMap.get(hand.id);

        let myCards: string[] = [];
        let myResult: 'win' | 'lose' | 'fold' | null = null;
        let winAmount: number | undefined;

        if (playerHand) {
          myCards = (playerHand.hole_cards as any) || [];
          if (playerHand.is_folded) myResult = 'fold';
          else if ((playerHand.won_amount ?? 0) > 0) {
            myResult = 'win';
            winAmount = playerHand.won_amount ?? undefined;
          } else myResult = 'lose';
        }

        return {
          id: hand.id,
          handNumber: hand.hand_number,
          pot: hand.pot || 0,
          communityCards: (hand.community_cards as string[]) || [],
          myCards,
          myResult,
          winAmount,
          timestamp: hand.completed_at || '',
          winnersCount: winners.length,
          phase: hand.phase,
        };
      });

      applyHands(formatted);
    } catch (e: any) {
      console.error('[QuickHandHistory] Supabase fetch failed:', e);
      setErrorText(e?.message || 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }, [applyHands, playerId, tableId]);

  // Attach WS listeners (non-invasive: does not override hook's onmessage)
  useEffect(() => {
    if (!isOpen) return;

    const ws = wsRef?.current;
    if (!ws) return;

    const onWsMessage = (event: MessageEvent) => {
      let parsed: HandHistoryServerMessage | null = null;
      try {
        parsed = JSON.parse(event.data) as HandHistoryServerMessage;
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== 'object') return;

      if (parsed.type === 'hand_history') {
        if (parsed.tableId !== tableId) return;
        applyHands(Array.isArray(parsed.hands) ? parsed.hands : []);
        setLoading(false);
        setErrorText(null);
        return;
      }

      // When a hand completes, refresh the list (debounced)
      if (parsed.type === 'hand_completed' && parsed.tableId === tableId) {
        if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = window.setTimeout(() => {
          requestHandsFromServer('hand_completed');
        }, 250);
        return;
      }

      if (parsed.type === 'error') {
        // Only show error if it is clearly about this table and panel is open
        if (parsed.tableId && parsed.tableId !== tableId) return;

        const msg = parsed.error || parsed.message || 'Ошибка сервера';
        console.warn('[QuickHandHistory] WS error:', msg);
        setLoading(false);

        // Older server builds may not support get_hand_history yet.
        if (msg.includes('Unknown message type') && msg.includes('get_hand_history')) {
          fetchHandsFromSupabase();
          return;
        }

        setErrorText(msg);
      }
    };

    ws.addEventListener('message', onWsMessage);
    return () => {
      if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
      ws.removeEventListener('message', onWsMessage);
    };
  }, [applyHands, fetchHandsFromSupabase, isOpen, loading, requestHandsFromServer, tableId, wsRef]);

  // Fetch when opened (prefer server)
  useEffect(() => {
    if (!isOpen) return;

    lastRequestIdRef.current += 1;

    const startedViaWs = requestHandsFromServer('open');

    // Fallback to Supabase if WS path isn't available / not connected
    if (!startedViaWs) {
      fetchHandsFromSupabase();
      return;
    }

    // If WS doesn't answer quickly, fallback to Supabase (best-effort)
    const timeoutId = window.setTimeout(() => {
      if (!hands.length) {
        fetchHandsFromSupabase();
      }
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHandsFromSupabase, hands.length, isOpen, requestHandsFromServer]);

  const renderCard = (card: string) => {
    if (!card) return null;
    const rank = card[0];
    const suit = card[1];
    const suitSymbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const suitColors: Record<string, string> = {
      h: 'text-red-500',
      d: 'text-blue-500',
      c: 'text-green-500',
      s: 'text-foreground',
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
            <ArrowUp className="h-3 w-3 mr-1" />+{amount?.toLocaleString() || 0}
          </Badge>
        );
      case 'lose':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <ArrowDown className="h-3 w-3 mr-1" />Проигрыш
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
                  onClick={() => {
                    const ok = requestHandsFromServer('manual');
                    if (!ok) fetchHandsFromSupabase();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
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
            ) : errorText ? (
              <div className="py-6 px-4 text-center">
                <div className="text-white/70 text-sm">{errorText}</div>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const ok = requestHandsFromServer('manual');
                      if (!ok) fetchHandsFromSupabase();
                    }}
                  >
                    Повторить
                  </Button>
                </div>
              </div>
            ) : hands.length === 0 ? (
              <div className="py-8 text-center text-white/50 text-sm">Нет завершённых раздач</div>
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
                      onClick={() => setSelectedHandIndex((i) => Math.min(i + 1, hands.length - 1))}
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
                      onClick={() => setSelectedHandIndex((i) => Math.max(i - 1, 0))}
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
                      <span className="text-white font-medium">{selectedHand.pot.toLocaleString()}</span>
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
