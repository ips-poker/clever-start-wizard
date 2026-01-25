/**
 * Hook for fetching live tournament data for TV Mode
 * Provides real-time pot, blinds, community cards, payouts, actions, hole cards
 * PokerStars-style professional broadcast data
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveTournamentData {
  pot: number;
  communityCards: string[];
  blinds: { small: number; big: number; ante?: number };
  currentLevel: number;
  timeRemaining: number;
  payoutPositions: { position: number; amount: number; percentage: number }[];
  isHandInProgress: boolean;
  spectatorCount: number;
  handForHandActive: boolean;
  tables: TableInfo[];
  currentPhase: string;
  currentHandId: string | null;
  actingPlayerId: string | null;
  actingPlayerSeat: number | null;
}

interface TableInfo {
  tableId: string;
  tableName: string;
  isWaiting: boolean;
  currentHand: number;
  playersRemaining: number;
}

interface PlayerData {
  id: string;
  player_id: string;
  player_name: string;
  chips: number;
  status: string;
  table_id: string | null;
  seatNumber?: number;
  holeCards?: string[];
  currentBet?: number;
  isFolded?: boolean;
  isAllIn?: boolean;
  isActing?: boolean;
  lastAction?: string;
  lastActionAmount?: number;
}

interface RecentAction {
  id: string;
  playerId: string;
  playerName: string;
  actionType: string;
  amount: number | null;
  phase: string;
  timestamp: number;
}

export function useTournamentLiveData(tournamentId: string | null) {
  const [liveData, setLiveData] = useState<LiveTournamentData>({
    pot: 0,
    communityCards: [],
    blinds: { small: 100, big: 200, ante: 0 },
    currentLevel: 1,
    timeRemaining: 0,
    payoutPositions: [],
    isHandInProgress: false,
    spectatorCount: 0,
    handForHandActive: false,
    tables: [],
    currentPhase: 'waiting',
    currentHandId: null,
    actingPlayerId: null,
    actingPlayerSeat: null
  });
  const [participants, setParticipants] = useState<PlayerData[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live hand data including hole cards and actions
  const fetchLiveHandData = useCallback(async (tableIds: string[]) => {
    if (tableIds.length === 0) return { hands: [], actions: [], handPlayers: [] };

    try {
      // Get current active hands
      const { data: hands } = await supabase
        .from('poker_hands')
        .select('*')
        .in('table_id', tableIds)
        .is('completed_at', null)
        .order('created_at', { ascending: false });

      if (!hands || hands.length === 0) {
        return { hands: [], actions: [], handPlayers: [] };
      }

      const handIds = hands.map(h => h.id);

      // Get hole cards for all players in active hands
      const { data: handPlayers } = await supabase
        .from('poker_hand_players')
        .select(`
          *,
          players:players!poker_hand_players_player_id_fkey(name)
        `)
        .in('hand_id', handIds);

      // Get recent actions (last 10)
      const { data: actions } = await supabase
        .from('poker_actions')
        .select(`
          *,
          players:players!poker_actions_player_id_fkey(name)
        `)
        .in('hand_id', handIds)
        .order('action_order', { ascending: false })
        .limit(10);

      return { hands, actions: actions || [], handPlayers: handPlayers || [] };
    } catch (error) {
      console.error('Error fetching live hand data:', error);
      return { hands: [], actions: [], handPlayers: [] };
    }
  }, []);

  // Fetch tournament data including blinds and level
  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      // Get tournament details
      const { data: tournament, error: tournamentError } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Get blind levels
      const { data: levels } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level', { ascending: true });

      const currentLevelData = levels?.find(l => l.level === tournament.current_level) || levels?.[0];

      // Get payouts from database
      const { data: payouts } = await supabase
        .from('online_poker_tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position', { ascending: true });

      const payoutPositions = payouts?.map(p => ({
        position: p.position,
        amount: p.amount || (tournament.prize_pool || 0) * (p.percentage / 100),
        percentage: p.percentage
      })) || [];

      // Get tables
      const { data: tables } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('status', ['active', 'playing', 'waiting']);

      const tableIds = tables?.map(t => t.id) || [];
      const tableInfos: TableInfo[] = [];

      // Get live hand data
      const { hands, actions, handPlayers } = await fetchLiveHandData(tableIds);

      // Find the primary active hand (usually from main/final table)
      const activeHand = hands?.[0];
      
      let totalPot = 0;
      let communityCards: string[] = [];
      let isHandInProgress = false;
      let currentPhase = 'waiting';
      let currentHandId: string | null = null;
      let actingPlayerSeat: number | null = null;

      if (activeHand) {
        totalPot = activeHand.pot || 0;
        communityCards = activeHand.community_cards || [];
        currentPhase = activeHand.phase || 'preflop';
        currentHandId = activeHand.id;
        actingPlayerSeat = activeHand.current_player_seat;
        isHandInProgress = activeHand.phase !== 'showdown' && activeHand.phase !== 'complete';
      }

      // Build table info
      for (const table of tables || []) {
        const tableHand = hands?.find(h => h.table_id === table.id);
        
        const { count } = await supabase
          .from('poker_table_players')
          .select('*', { count: 'exact', head: true })
          .eq('table_id', table.id)
          .eq('status', 'active');

        tableInfos.push({
          tableId: table.id,
          tableName: table.name,
          isWaiting: table.status === 'waiting',
          currentHand: tableHand ? 1 : 0,
          playersRemaining: count || 0
        });
      }

      // Process recent actions
      const processedActions: RecentAction[] = (actions || []).map(a => ({
        id: a.id,
        playerId: a.player_id,
        playerName: (a.players as any)?.name || 'Unknown',
        actionType: a.action_type,
        amount: a.amount,
        phase: a.phase,
        timestamp: Date.now()
      }));

      setRecentActions(processedActions);

      // Calculate time remaining in current level
      let timeRemaining = 0;
      if (tournament.level_end_at) {
        const endTime = new Date(tournament.level_end_at).getTime();
        timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      }

      // Find acting player
      let actingPlayerId: string | null = null;
      if (actingPlayerSeat !== null && handPlayers) {
        const actingPlayer = handPlayers.find(hp => 
          hp.hand_id === currentHandId && hp.seat_number === actingPlayerSeat
        );
        actingPlayerId = actingPlayer?.player_id || null;
      }

      setLiveData({
        pot: totalPot,
        communityCards,
        blinds: {
          small: currentLevelData?.small_blind || tournament.small_blind || 100,
          big: currentLevelData?.big_blind || tournament.big_blind || 200,
          ante: currentLevelData?.ante || tournament.ante || 0
        },
        currentLevel: tournament.current_level || 1,
        timeRemaining,
        payoutPositions,
        isHandInProgress,
        spectatorCount: 0,
        handForHandActive: tournament.status === 'hand_for_hand',
        tables: tableInfos,
        currentPhase,
        currentHandId,
        actingPlayerId,
        actingPlayerSeat
      });

      // Update participants with hole cards and actions
      await fetchParticipantsWithCards(tournamentId, handPlayers, actingPlayerId, actions);
      
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  }, [tournamentId, fetchLiveHandData]);

  // Fetch participants with hole cards
  const fetchParticipantsWithCards = async (
    tournamentId: string,
    handPlayers: any[],
    actingPlayerId: string | null,
    actions: any[]
  ) => {
    try {
      const { data, error } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          *,
          players:players!online_poker_tournament_participants_player_id_fkey(name)
        `)
        .eq('tournament_id', tournamentId)
        .neq('status', 'eliminated')
        .order('chips', { ascending: false });

      if (error) throw error;

      const participantsData: PlayerData[] = (data || []).map(p => {
        // Find hole cards for this player
        const playerHand = handPlayers?.find(hp => hp.player_id === p.player_id);
        
        // Find last action for this player
        const lastAction = actions?.find(a => a.player_id === p.player_id);

        return {
          id: p.id,
          player_id: p.player_id,
          player_name: (p.players as any)?.name || 'Unknown',
          chips: p.chips || 0,
          status: p.status,
          table_id: p.table_id,
          seatNumber: playerHand?.seat_number,
          holeCards: playerHand?.hole_cards || undefined,
          currentBet: playerHand?.bet_amount || 0,
          isFolded: playerHand?.is_folded || false,
          isAllIn: playerHand?.is_all_in || false,
          isActing: p.player_id === actingPlayerId,
          lastAction: lastAction?.action_type,
          lastActionAmount: lastAction?.amount
        };
      });

      setParticipants(participantsData);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    fetchTournamentData();

    // Subscribe to realtime updates - more granular
    const channel = supabase
      .channel(`tv-mode-live-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournaments',
        filter: `id=eq.${tournamentId}`
      }, () => {
        fetchTournamentData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchTournamentData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_hands'
      }, () => {
        // Immediate refetch on hand changes
        fetchTournamentData();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poker_actions'
      }, () => {
        // Immediate refetch on new actions
        fetchTournamentData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_hand_players'
      }, () => {
        fetchTournamentData();
      })
      .subscribe();

    // Timer for level countdown
    const timer = setInterval(() => {
      setLiveData(prev => ({
        ...prev,
        timeRemaining: Math.max(0, prev.timeRemaining - 1)
      }));
    }, 1000);

    // Periodic refresh for pot updates (every 2 seconds)
    const refreshInterval = setInterval(() => {
      fetchTournamentData();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, [tournamentId, fetchTournamentData]);

  return {
    liveData,
    participants,
    recentActions,
    loading,
    refetch: fetchTournamentData
  };
}
