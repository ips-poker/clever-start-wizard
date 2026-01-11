import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HandHistoryRecord {
  id: string;
  handNumber: number;
  tableId: string;
  tableName?: string;
  startedAt: string;
  completedAt?: string;
  phase: string;
  pot: number;
  communityCards: string[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  winners: Array<{
    playerId: string;
    playerName?: string;
    amount: number;
    handName?: string;
  }>;
  rake?: number;
  players: HandPlayerRecord[];
  actions: HandActionRecord[];
}

export interface HandPlayerRecord {
  id: string;
  playerId: string;
  playerName?: string;
  seatNumber: number;
  stackStart: number;
  stackEnd?: number;
  holeCards: string[];
  betAmount: number;
  isFolded: boolean;
  isAllIn: boolean;
  handRank?: string;
  wonAmount?: number;
}

export interface HandActionRecord {
  id: string;
  playerId: string;
  playerName?: string;
  seatNumber: number;
  actionType: string;
  amount?: number;
  phase: string;
  actionOrder: number;
  createdAt: string;
}

interface UseHandHistoryOptions {
  tableId?: string;
  playerId?: string;
  limit?: number;
}

export function useHandHistory(options: UseHandHistoryOptions = {}) {
  const { tableId, playerId, limit = 50 } = options;
  
  const [hands, setHands] = useState<HandHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<HandHistoryRecord | null>(null);

  // Fetch hand history from database
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query for hands
      let query = supabase
        .from('poker_hands')
        .select(`
          id,
          hand_number,
          table_id,
          phase,
          pot,
          community_cards,
          dealer_seat,
          small_blind_seat,
          big_blind_seat,
          winners,
          started_at,
          completed_at,
          side_pots
        `)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (tableId) {
        query = query.eq('table_id', tableId);
      }

      const { data: handsData, error: handsError } = await query;

      if (handsError) {
        throw handsError;
      }

      if (!handsData || handsData.length === 0) {
        setHands([]);
        return;
      }

      // Fetch players and actions for each hand
      const handIds = handsData.map(h => h.id);
      
      const [playersResult, actionsResult] = await Promise.all([
        supabase
          .from('poker_hand_players')
          .select(`
            id,
            hand_id,
            player_id,
            seat_number,
            stack_start,
            stack_end,
            hole_cards,
            bet_amount,
            is_folded,
            is_all_in,
            hand_rank,
            won_amount
          `)
          .in('hand_id', handIds),
        supabase
          .from('poker_actions')
          .select(`
            id,
            hand_id,
            player_id,
            seat_number,
            action_type,
            amount,
            phase,
            action_order,
            created_at
          `)
          .in('hand_id', handIds)
          .order('action_order', { ascending: true })
      ]);

      // Get player names
      const allPlayerIds = new Set<string>();
      playersResult.data?.forEach(p => allPlayerIds.add(p.player_id));
      actionsResult.data?.forEach(a => allPlayerIds.add(a.player_id));

      const { data: playerNames } = await supabase
        .from('players')
        .select('id, name')
        .in('id', Array.from(allPlayerIds));

      const nameMap = new Map(playerNames?.map(p => [p.id, p.name]) || []);

      // Build complete records
      const records: HandHistoryRecord[] = handsData.map(hand => {
        const handPlayers = (playersResult.data || [])
          .filter(p => p.hand_id === hand.id)
          .map(p => ({
            id: p.id,
            playerId: p.player_id,
            playerName: nameMap.get(p.player_id),
            seatNumber: p.seat_number,
            stackStart: p.stack_start,
            stackEnd: p.stack_end,
            holeCards: p.hole_cards || [],
            betAmount: p.bet_amount,
            isFolded: p.is_folded,
            isAllIn: p.is_all_in,
            handRank: p.hand_rank,
            wonAmount: p.won_amount
          }));

        const handActions = (actionsResult.data || [])
          .filter(a => a.hand_id === hand.id)
          .map(a => ({
            id: a.id,
            playerId: a.player_id,
            playerName: nameMap.get(a.player_id),
            seatNumber: a.seat_number,
            actionType: a.action_type,
            amount: a.amount,
            phase: a.phase,
            actionOrder: a.action_order,
            createdAt: a.created_at
          }));

        // Parse winners JSON
        let winners: HandHistoryRecord['winners'] = [];
        try {
          if (hand.winners) {
            const parsed = typeof hand.winners === 'string' 
              ? JSON.parse(hand.winners) 
              : hand.winners;
            winners = parsed.map((w: any) => ({
              playerId: w.playerId,
              playerName: nameMap.get(w.playerId),
              amount: w.amount,
              handName: w.handName
            }));
          }
        } catch (e) {
          console.error('Error parsing winners:', e);
        }

        return {
          id: hand.id,
          handNumber: hand.hand_number,
          tableId: hand.table_id,
          startedAt: hand.started_at,
          completedAt: hand.completed_at,
          phase: hand.phase,
          pot: hand.pot,
          communityCards: hand.community_cards || [],
          dealerSeat: hand.dealer_seat,
          smallBlindSeat: hand.small_blind_seat,
          bigBlindSeat: hand.big_blind_seat,
          winners,
          players: handPlayers,
          actions: handActions
        };
      });

      // Filter by playerId if specified
      if (playerId) {
        const filteredRecords = records.filter(hand => 
          hand.players.some(p => p.playerId === playerId) ||
          hand.actions.some(a => a.playerId === playerId)
        );
        setHands(filteredRecords);
      } else {
        setHands(records);
      }

    } catch (err: any) {
      console.error('Error fetching hand history:', err);
      setError(err.message || 'Failed to fetch hand history');
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId, limit]);

  // Fetch single hand details
  const fetchHandDetails = useCallback(async (handId: string) => {
    try {
      const hand = hands.find(h => h.id === handId);
      if (hand && hand.players.length > 0) {
        setSelectedHand(hand);
        return hand;
      }

      // Fetch from DB if not in cache
      const { data: handData, error: handError } = await supabase
        .from('poker_hands')
        .select('*')
        .eq('id', handId)
        .single();

      if (handError) throw handError;

      const [playersResult, actionsResult] = await Promise.all([
        supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', handId),
        supabase
          .from('poker_actions')
          .select('*')
          .eq('hand_id', handId)
          .order('action_order', { ascending: true })
      ]);

      const allPlayerIds = new Set<string>();
      playersResult.data?.forEach(p => allPlayerIds.add(p.player_id));
      actionsResult.data?.forEach(a => allPlayerIds.add(a.player_id));

      const { data: playerNames } = await supabase
        .from('players')
        .select('id, name')
        .in('id', Array.from(allPlayerIds));

      const nameMap = new Map(playerNames?.map(p => [p.id, p.name]) || []);

      let winners: HandHistoryRecord['winners'] = [];
      try {
        if (handData.winners) {
          const parsed = typeof handData.winners === 'string' 
            ? JSON.parse(handData.winners) 
            : handData.winners;
          winners = parsed.map((w: any) => ({
            playerId: w.playerId,
            playerName: nameMap.get(w.playerId),
            amount: w.amount,
            handName: w.handName
          }));
        }
      } catch (e) {}

      const record: HandHistoryRecord = {
        id: handData.id,
        handNumber: handData.hand_number,
        tableId: handData.table_id,
        startedAt: handData.started_at,
        completedAt: handData.completed_at,
        phase: handData.phase,
        pot: handData.pot,
        communityCards: handData.community_cards || [],
        dealerSeat: handData.dealer_seat,
        smallBlindSeat: handData.small_blind_seat,
        bigBlindSeat: handData.big_blind_seat,
        winners,
        players: (playersResult.data || []).map(p => ({
          id: p.id,
          playerId: p.player_id,
          playerName: nameMap.get(p.player_id),
          seatNumber: p.seat_number,
          stackStart: p.stack_start,
          stackEnd: p.stack_end,
          holeCards: p.hole_cards || [],
          betAmount: p.bet_amount,
          isFolded: p.is_folded,
          isAllIn: p.is_all_in,
          handRank: p.hand_rank,
          wonAmount: p.won_amount
        })),
        actions: (actionsResult.data || []).map(a => ({
          id: a.id,
          playerId: a.player_id,
          playerName: nameMap.get(a.player_id),
          seatNumber: a.seat_number,
          actionType: a.action_type,
          amount: a.amount,
          phase: a.phase,
          actionOrder: a.action_order,
          createdAt: a.created_at
        }))
      };

      setSelectedHand(record);
      return record;

    } catch (err: any) {
      console.error('Error fetching hand details:', err);
      return null;
    }
  }, [hands]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    hands,
    isLoading,
    error,
    selectedHand,
    setSelectedHand,
    fetchHistory,
    fetchHandDetails
  };
}
