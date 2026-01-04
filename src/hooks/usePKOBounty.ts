/**
 * usePKOBounty - Hook for PKO tournament bounty information
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BountyData {
  currentBounty: number;
  startingBounty: number;
  collectedBounties: number;
  knockouts: number;
  isLoading: boolean;
  error: string | null;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  knockouts: number;
  bountiesCollected: number;
  currentBounty: number;
}

export function usePKOBounty(tournamentId: string, playerId?: string) {
  const [isPKO, setIsPKO] = useState(false);
  const [bountyData, setBountyData] = useState<BountyData>({
    currentBounty: 0,
    startingBounty: 0,
    collectedBounties: 0,
    knockouts: 0,
    isLoading: true,
    error: null
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const fetchBountyData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      // Check tournament format
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('tournament_format, buy_in')
        .eq('id', tournamentId)
        .single();

      if (!tournament) {
        setBountyData(prev => ({ ...prev, isLoading: false, error: 'Tournament not found' }));
        return;
      }

      const isPKOFormat = ['pko', 'knockout', 'bounty'].includes(tournament.tournament_format || '');
      setIsPKO(isPKOFormat);

      if (!isPKOFormat) {
        setBountyData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const startingBounty = Math.floor((tournament.buy_in || 0) * 0.5);

      // Fetch leaderboard
      const { data: leaderboardData } = await supabase
        .rpc('get_pko_bounty_leaderboard', {
          p_tournament_id: tournamentId,
          p_limit: 10
        });

      if (leaderboardData) {
        setLeaderboard((leaderboardData as any[]).map(h => ({
          playerId: h.player_id,
          playerName: h.player_name || 'Unknown',
          avatarUrl: h.avatar_url,
          knockouts: h.knockouts || 0,
          bountiesCollected: h.bounty_collected || 0,
          currentBounty: h.current_bounty || startingBounty
        })));
      }

      // Fetch player-specific data if playerId provided
      if (playerId) {
        const { data: participant } = await supabase
          .from('online_poker_tournament_participants')
          .select('knockouts_count, bounty_collected, bounty_value')
          .eq('tournament_id', tournamentId)
          .eq('player_id', playerId)
          .single();

        if (participant) {
          setBountyData({
            currentBounty: participant.bounty_value || startingBounty,
            startingBounty,
            collectedBounties: participant.bounty_collected || 0,
            knockouts: participant.knockouts_count || 0,
            isLoading: false,
            error: null
          });
        } else {
          setBountyData({
            currentBounty: startingBounty,
            startingBounty,
            collectedBounties: 0,
            knockouts: 0,
            isLoading: false,
            error: null
          });
        }
      } else {
        setBountyData(prev => ({ ...prev, startingBounty, isLoading: false }));
      }
    } catch (err) {
      setBountyData(prev => ({ ...prev, isLoading: false, error: String(err) }));
    }
  }, [tournamentId, playerId]);

  useEffect(() => {
    fetchBountyData();

    // Subscribe to updates
    const channel = supabase
      .channel(`pko-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchBountyData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchBountyData]);

  return {
    isPKO,
    bountyData,
    leaderboard,
    refresh: fetchBountyData
  };
}

export default usePKOBounty;
