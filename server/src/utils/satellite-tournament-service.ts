/**
 * Satellite Tournament Service
 * Professional satellite tournament management:
 * - Awards tournament tickets instead of cash prizes
 * - Supports multiple ticket tiers
 * - Integrates with offline tournament registration
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

export interface TicketAward {
  playerId: string;
  playerName: string;
  finishPosition: number;
  ticketValue: number;
  targetTournamentId: string | null;
  entryType: 'offline_entry' | 'online_entry';
}

interface SatelliteTournament {
  id: string;
  name: string;
  tournament_format: string;
  tickets_for_top: number;
  ticket_value: number;
  status: string;
}

class SatelliteTournamentService {
  private supabase: SupabaseClient | null = null;

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[SatelliteService] Supabase client configured');
  }

  /**
   * Check if tournament is a satellite
   */
  async isSatelliteTournament(tournamentId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data } = await this.supabase
      .from('online_poker_tournaments')
      .select('tournament_format, tickets_for_top')
      .eq('id', tournamentId)
      .single();

    // Tournament is satellite if it awards tickets
    return (data?.tickets_for_top || 0) > 0;
  }

  /**
   * Get satellite tournament info
   */
  async getSatelliteInfo(tournamentId: string): Promise<{
    ticketsAwarded: number;
    ticketValue: number;
    isActive: boolean;
  } | null> {
    if (!this.supabase) return null;

    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('tickets_for_top, ticket_value, status')
      .eq('id', tournamentId)
      .single();

    if (!tournament || !tournament.tickets_for_top) return null;

    return {
      ticketsAwarded: tournament.tickets_for_top,
      ticketValue: tournament.ticket_value || 1000,
      isActive: tournament.status === 'running'
    };
  }

  /**
   * Award tickets to top finishers
   * Called when satellite tournament completes
   */
  async awardTickets(
    tournamentId: string,
    targetOfflineTournamentId?: string
  ): Promise<TicketAward[]> {
    if (!this.supabase) return [];

    // Get satellite info
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('id, name, tickets_for_top, ticket_value')
      .eq('id', tournamentId)
      .single();

    if (!tournament || !tournament.tickets_for_top) {
      logger.info(`[SatelliteService] Tournament ${tournamentId} is not a satellite`);
      return [];
    }

    const ticketsToAward = tournament.tickets_for_top;
    const ticketValue = tournament.ticket_value || 1000;

    // Get top finishers
    const { data: topFinishers } = await this.supabase
      .from('online_poker_tournament_participants')
      .select(`
        player_id,
        finish_position,
        players!inner(name)
      `)
      .eq('tournament_id', tournamentId)
      .not('finish_position', 'is', null)
      .lte('finish_position', ticketsToAward)
      .order('finish_position', { ascending: true });

    if (!topFinishers || topFinishers.length === 0) {
      logger.warn(`[SatelliteService] No top finishers found for ${tournamentId}`);
      return [];
    }

    const awards: TicketAward[] = [];

    for (const finisher of topFinishers) {
      if (finisher.finish_position <= ticketsToAward) {
        // Create ticket
        const ticketId = await this.createTicket({
          playerId: finisher.player_id,
          ticketValue,
          wonFromTournamentId: tournamentId,
          finishPosition: finisher.finish_position,
          offlineTournamentId: targetOfflineTournamentId || null
        });

        if (ticketId) {
          awards.push({
            playerId: finisher.player_id,
            playerName: (finisher.players as any)?.name || 'Unknown',
            finishPosition: finisher.finish_position,
            ticketValue,
            targetTournamentId: targetOfflineTournamentId || null,
            entryType: targetOfflineTournamentId ? 'offline_entry' : 'online_entry'
          });

          logger.info(`[SatelliteService] Ticket awarded to player ${finisher.player_id}`, {
            position: finisher.finish_position,
            value: ticketValue,
            tournament: tournament.name
          });
        }
      }
    }

    logger.info(`[SatelliteService] Awarded ${awards.length} tickets for ${tournament.name}`);
    return awards;
  }

  /**
   * Create a tournament ticket
   */
  private async createTicket(params: {
    playerId: string;
    ticketValue: number;
    wonFromTournamentId: string;
    finishPosition: number;
    offlineTournamentId: string | null;
  }): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      // Set expiry to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: ticket, error } = await this.supabase
        .from('tournament_tickets')
        .insert({
          player_id: params.playerId,
          ticket_value: params.ticketValue,
          won_from_tournament_id: params.wonFromTournamentId,
          finish_position: params.finishPosition,
          offline_tournament_id: params.offlineTournamentId,
          entry_type: params.offlineTournamentId ? 'offline_entry' : 'online_entry',
          status: 'active',
          expires_at: expiresAt.toISOString()
        })
        .select('id')
        .single();

      if (error) {
        logger.error(`[SatelliteService] Failed to create ticket`, { error: error.message });
        return null;
      }

      return ticket?.id || null;
    } catch (err) {
      logger.error(`[SatelliteService] Error creating ticket`, { error: String(err) });
      return null;
    }
  }

  /**
   * Get player's available tickets
   */
  async getPlayerTickets(playerId: string): Promise<{
    ticketId: string;
    value: number;
    status: string;
    expiresAt: string | null;
    offlineTournamentId: string | null;
    offlineTournamentName: string | null;
  }[]> {
    if (!this.supabase) return [];

    const { data: tickets } = await this.supabase
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

    if (!tickets) return [];

    return tickets.map(t => ({
      ticketId: t.id,
      value: t.ticket_value,
      status: t.status,
      expiresAt: t.expires_at,
      offlineTournamentId: t.offline_tournament_id,
      offlineTournamentName: (t.tournaments as any)?.name || null
    }));
  }

  /**
   * Use ticket for tournament registration
   */
  async useTicket(
    ticketId: string,
    playerId: string,
    tournamentId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Service not configured' };
    }

    // Verify ticket ownership and status
    const { data: ticket, error: ticketError } = await this.supabase
      .from('tournament_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .single();

    if (ticketError || !ticket) {
      return { success: false, error: 'Ticket not found or not available' };
    }

    // Check expiry
    if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
      await this.supabase
        .from('tournament_tickets')
        .update({ status: 'expired' })
        .eq('id', ticketId);
      return { success: false, error: 'Ticket has expired' };
    }

    // Check if ticket is for specific tournament
    if (ticket.offline_tournament_id && ticket.offline_tournament_id !== tournamentId) {
      return { success: false, error: 'Ticket is for a different tournament' };
    }

    // Mark ticket as used
    const { error: updateError } = await this.supabase
      .from('tournament_tickets')
      .update({
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (updateError) {
      return { success: false, error: 'Failed to use ticket' };
    }

    logger.info(`[SatelliteService] Ticket ${ticketId} used by player ${playerId} for tournament ${tournamentId}`);
    return { success: true };
  }

  /**
   * Get satellite leaderboard (players closest to winning tickets)
   */
  async getSatelliteLeaderboard(tournamentId: string): Promise<{
    playerId: string;
    playerName: string;
    chips: number;
    position: number;
    inTicketZone: boolean;
  }[]> {
    if (!this.supabase) return [];

    const info = await this.getSatelliteInfo(tournamentId);
    if (!info) return [];

    // Get active participants sorted by chips
    const { data: participants } = await this.supabase
      .from('online_poker_tournament_participants')
      .select(`
        player_id,
        chips,
        status,
        players!inner(name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'playing')
      .order('chips', { ascending: false });

    if (!participants) return [];

    return participants.map((p, index) => ({
      playerId: p.player_id,
      playerName: (p.players as any)?.name || 'Unknown',
      chips: p.chips || 0,
      position: index + 1,
      inTicketZone: index < info.ticketsAwarded
    }));
  }

  /**
   * Expire old tickets (cron job)
   */
  async expireOldTickets(): Promise<number> {
    if (!this.supabase) return 0;

    const { data, error } = await this.supabase
      .from('tournament_tickets')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      logger.error(`[SatelliteService] Error expiring tickets`, { error: error.message });
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      logger.info(`[SatelliteService] Expired ${count} tickets`);
    }

    return count;
  }
}

export const satelliteTournamentService = new SatelliteTournamentService();
