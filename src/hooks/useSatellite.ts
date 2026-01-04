/**
 * useSatellite - Hook for satellite tournament information
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SatelliteInfo {
  isSatellite: boolean;
  ticketsAwarded: number;
  ticketValue: number;
  totalPlayers: number;
  playersRemaining: number;
  isLoading: boolean;
  error: string | null;
}

interface TicketCandidate {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  chips: number;
  position: number;
  inTicketZone: boolean;
}

interface PlayerTicket {
  ticketId: string;
  value: number;
  status: string;
  expiresAt: string | null;
  offlineTournamentId: string | null;
  offlineTournamentName: string | null;
}

export function useSatellite(tournamentId: string, playerId?: string) {
  const [satelliteInfo, setSatelliteInfo] = useState<SatelliteInfo>({
    isSatellite: false,
    ticketsAwarded: 0,
    ticketValue: 0,
    totalPlayers: 0,
    playersRemaining: 0,
    isLoading: true,
    error: null
  });
  const [candidates, setCandidates] = useState<TicketCandidate[]>([]);
  const [playerPosition, setPlayerPosition] = useState<number | null>(null);
  const [playerTickets, setPlayerTickets] = useState<PlayerTicket[]>([]);

  const fetchSatelliteData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      // Get tournament info
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('tickets_for_top, ticket_value')
        .eq('id', tournamentId)
        .single();

      if (!tournament || !tournament.tickets_for_top) {
        setSatelliteInfo(prev => ({ ...prev, isSatellite: false, isLoading: false }));
        return;
      }

      // Count players
      const { count: totalCount } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const { count: activeCount } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing');

      setSatelliteInfo({
        isSatellite: true,
        ticketsAwarded: tournament.tickets_for_top,
        ticketValue: tournament.ticket_value || 1000,
        totalPlayers: totalCount || 0,
        playersRemaining: activeCount || 0,
        isLoading: false,
        error: null
      });

      // Get top players
      const { data: topPlayers } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          player_id,
          chips,
          players:player_id (name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing')
        .order('chips', { ascending: false })
        .limit(Math.min(tournament.tickets_for_top + 5, 15));

      if (topPlayers) {
        const candidatesList = topPlayers.map((p, index) => ({
          playerId: p.player_id,
          playerName: (p.players as any)?.name || 'Unknown',
          avatarUrl: (p.players as any)?.avatar_url || null,
          chips: p.chips || 0,
          position: index + 1,
          inTicketZone: index < tournament.tickets_for_top
        }));
        
        setCandidates(candidatesList);

        // Find player position
        if (playerId) {
          const playerCandidate = candidatesList.find(c => c.playerId === playerId);
          setPlayerPosition(playerCandidate?.position || null);
        }
      }
    } catch (err) {
      setSatelliteInfo(prev => ({ ...prev, isLoading: false, error: String(err) }));
    }
  }, [tournamentId, playerId]);

  const fetchPlayerTickets = useCallback(async () => {
    if (!playerId) return;

    try {
      const { data: tickets } = await supabase
        .from('tournament_tickets')
        .select(`
          id,
          ticket_value,
          status,
          expires_at,
          offline_tournament_id,
          tournaments:offline_tournament_id(name)
        `)
        .eq('player_id', playerId)
        .eq('status', 'active')
        .order('expires_at', { ascending: true });

      if (tickets) {
        setPlayerTickets(tickets.map(t => ({
          ticketId: t.id,
          value: t.ticket_value,
          status: t.status,
          expiresAt: t.expires_at,
          offlineTournamentId: t.offline_tournament_id,
          offlineTournamentName: (t.tournaments as any)?.name || null
        })));
      }
    } catch (err) {
      console.error('Error fetching player tickets:', err);
    }
  }, [playerId]);

  useEffect(() => {
    fetchSatelliteData();
    fetchPlayerTickets();

    // Subscribe to updates
    const channel = supabase
      .channel(`satellite-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchSatelliteData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchSatelliteData, fetchPlayerTickets]);

  return {
    satelliteInfo,
    candidates,
    playerPosition,
    playerTickets,
    isInTicketZone: playerPosition !== null && playerPosition <= satelliteInfo.ticketsAwarded,
    refresh: fetchSatelliteData
  };
}

export default useSatellite;
