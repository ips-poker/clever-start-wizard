/**
 * Hook for fetching live tournament data for TV Mode
 * Provides real-time pot, blinds, community cards, payouts
 */
import { useState, useEffect, useMemo } from 'react';
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
    tables: []
  });
  const [participants, setParticipants] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tournament data including blinds and level
  const fetchTournamentData = async () => {
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

      // Get tables with their current hands
      const { data: tables } = await supabase
        .from('poker_tables')
        .select(`
          *,
          poker_hands(id, pot, community_cards, phase)
        `)
        .eq('tournament_id', tournamentId)
        .in('status', ['active', 'playing', 'waiting']);

      // Calculate total pot from all active hands
      let totalPot = 0;
      let communityCards: string[] = [];
      let isHandInProgress = false;
      const tableInfos: TableInfo[] = [];

      for (const table of tables || []) {
        const activeHand = (table.poker_hands as any[])?.find((h: any) => !h.completed_at);
        if (activeHand) {
          totalPot += activeHand.pot || 0;
          if (activeHand.community_cards?.length > 0) {
            communityCards = activeHand.community_cards;
          }
          if (activeHand.phase !== 'showdown' && activeHand.phase !== 'complete') {
            isHandInProgress = true;
          }
        }

        // Get players at this table
        const { count } = await supabase
          .from('poker_table_players')
          .select('*', { count: 'exact', head: true })
          .eq('table_id', table.id)
          .eq('status', 'active');

        tableInfos.push({
          tableId: table.id,
          tableName: table.name,
          isWaiting: table.status === 'waiting',
          currentHand: activeHand?.id ? 1 : 0,
          playersRemaining: count || 0
        });
      }

      // Calculate time remaining in current level
      let timeRemaining = 0;
      if (tournament.level_end_at) {
        const endTime = new Date(tournament.level_end_at).getTime();
        timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
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
        spectatorCount: 0, // TODO: Implement spectator tracking
        handForHandActive: tournament.status === 'hand_for_hand',
        tables: tableInfos
      });
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  };

  // Fetch participants
  const fetchParticipants = async () => {
    if (!tournamentId) return;

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

      const participantsData = data?.map(p => ({
        id: p.id,
        player_id: p.player_id,
        player_name: (p.players as any)?.name || 'Unknown',
        chips: p.chips || 0,
        status: p.status,
        table_id: p.table_id
      })) || [];

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
    fetchParticipants();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`tv-mode-${tournamentId}`)
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
        fetchParticipants();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_hands'
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

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [tournamentId]);

  return {
    liveData,
    participants,
    loading,
    refetch: () => {
      fetchTournamentData();
      fetchParticipants();
    }
  };
}
