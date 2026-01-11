/**
 * Tournament Elimination Hook
 * Handles elimination state, rebuy/reentry, and animations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TournamentEliminationState {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  position?: number;
  prizeAmount?: number;
  isInTheMoney: boolean;
  eliminatorName?: string;
  graceDeadline?: number;
  rebuyAvailable: boolean;
  reentryAvailable: boolean;
  rebuyCost?: number;
  reentryCost?: number;
  rebuyChips?: number;
  reentryChips?: number;
  state: 'busted' | 'rebuy_pending' | 'reentry_pending' | 'eliminated';
  tournamentName?: string;
  totalPlayers?: number;
}

export function useTournamentElimination(
  playerId: string | null,
  tournamentId: string | null,
  tableId: string | null
) {
  const [eliminationData, setEliminationData] = useState<TournamentEliminationState | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen for elimination events via realtime
  useEffect(() => {
    if (!playerId || !tournamentId) return;

    const channel = supabase
      .channel(`tournament-elimination-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `player_id=eq.${playerId}`
        },
        async (payload) => {
          const participant = payload.new as any;
          
          // Check if player was just eliminated (chips = 0 or status = 'eliminated')
          if (participant.chips === 0 || participant.status === 'eliminated') {
            await fetchEliminationDetails(participant);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, tournamentId]);

  // Fetch full elimination details
  const fetchEliminationDetails = useCallback(async (participant: any) => {
    if (!tournamentId || !playerId) return;

    try {
      // Get tournament details
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('name, current_level, rebuy_enabled, rebuy_end_level, rebuy_cost, rebuy_chips, prize_pool')
        .eq('id', tournamentId)
        .single();

      // Get player details
      const { data: player } = await supabase
        .from('players')
        .select('name, avatar_url')
        .eq('id', playerId)
        .single();

      // Get total players and position
      const { count: totalPlayers } = await supabase
        .from('online_poker_tournament_participants')
        .select('id', { count: 'exact' })
        .eq('tournament_id', tournamentId);

      const { count: playingPlayers } = await supabase
        .from('online_poker_tournament_participants')
        .select('id', { count: 'exact' })
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing');

      // Get payout structure
      const { data: payouts } = await supabase
        .from('online_poker_tournament_payouts')
        .select('position, percentage')
        .eq('tournament_id', tournamentId)
        .order('position');

      // Calculate position and prize
      const position = (playingPlayers || 0) + 1;
      const payout = payouts?.find(p => p.position === position);
      const prizeAmount = payout 
        ? Math.round((tournament?.prize_pool || 0) * payout.percentage / 100)
        : undefined;

      // Check rebuy/reentry availability
      const currentLevel = tournament?.current_level || 999;
      const rebuyAvailable = tournament?.rebuy_enabled && currentLevel <= (tournament?.rebuy_end_level || 0);

      // Grace period (60 seconds for rebuy)
      const graceDeadline = rebuyAvailable ? Date.now() + 60000 : undefined;

      const eliminationState: TournamentEliminationState = {
        playerId,
        playerName: player?.name || 'Player',
        avatarUrl: player?.avatar_url,
        position,
        prizeAmount,
        isInTheMoney: !!payout,
        eliminatorName: participant.eliminated_by ? undefined : undefined, // TODO: Fetch eliminator name
        graceDeadline,
        rebuyAvailable: !!rebuyAvailable,
        reentryAvailable: false, // TODO: Implement reentry check
        rebuyCost: tournament?.rebuy_cost,
        rebuyChips: tournament?.rebuy_chips,
        state: rebuyAvailable ? 'rebuy_pending' : 'eliminated',
        tournamentName: tournament?.name,
        totalPlayers: totalPlayers || undefined
      };

      setEliminationData(eliminationState);
      setIsDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch elimination details:', err);
    }
  }, [tournamentId, playerId]);

  // Process rebuy
  const processRebuy = useCallback(async () => {
    if (!tournamentId || !playerId || !eliminationData?.rebuyAvailable) return;

    setIsProcessing(true);
    try {
      // Use existing RPC or direct update
      const { error } = await supabase
        .from('online_poker_tournament_participants')
        .update({ 
          chips: eliminationData.rebuyChips || 3000,
          status: 'playing'
        })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

      if (error) throw error;

      toast.success('Rebuy successful!', {
        description: `You now have ${eliminationData.rebuyChips?.toLocaleString()} chips`
      });

      setIsDialogOpen(false);
      setEliminationData(null);
    } catch (err) {
      console.error('Rebuy failed:', err);
      toast.error('Rebuy failed', {
        description: 'Please try again or contact support'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [tournamentId, playerId, eliminationData]);

  // Process reentry
  const processReentry = useCallback(async () => {
    if (!tournamentId || !playerId || !eliminationData?.reentryAvailable) return;

    setIsProcessing(true);
    try {
      // Reentry creates new participation
      const { error } = await supabase
        .from('online_poker_tournament_participants')
        .update({ 
          chips: eliminationData.reentryChips || 3000,
          status: 'playing',
          rebuys_count: (eliminationData as any).rebuysCount || 0
        })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

      if (error) throw error;

      toast.success('Re-entry successful!', {
        description: `You have been seated at a new table`
      });

      setIsDialogOpen(false);
      setEliminationData(null);
    } catch (err) {
      console.error('Reentry failed:', err);
      toast.error('Re-entry failed', {
        description: 'Please try again or contact support'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [tournamentId, playerId, eliminationData]);

  // Decline and finalize elimination
  const declineAndExit = useCallback(async () => {
    setIsDialogOpen(false);
    setEliminationData(null);
    toast.info('Tournament ended', {
      description: eliminationData?.prizeAmount 
        ? `You won ${eliminationData.prizeAmount.toLocaleString()} 💎`
        : 'Better luck next time!'
    });
  }, [eliminationData]);

  // Manually trigger elimination (for testing or direct calls)
  const triggerElimination = useCallback((data: TournamentEliminationState) => {
    setEliminationData(data);
    setIsDialogOpen(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    eliminationData,
    isDialogOpen,
    isProcessing,
    processRebuy,
    processReentry,
    declineAndExit,
    closeDialog,
    triggerElimination
  };
}

export default useTournamentElimination;
