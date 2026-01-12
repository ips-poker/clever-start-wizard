/**
 * PKO Bounty Service
 * Professional Progressive Knockout tournament management:
 * - Bounty calculation and distribution
 * - Knockout tracking
 * - Real-time bounty updates
 * - RPS points integration (not diamonds)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// RPS conversion: 1000₽ (1000 diamonds) = 100 RPS
const RPS_CONVERSION_RATE = 10;

export interface BountyInfo {
  playerId: string;
  playerName: string;
  currentBounty: number; // In RPS points
  startingBounty: number; // In RPS points
  collectedBounties: number; // In RPS points
  knockouts: number;
  isEliminated: boolean;
}

export interface KnockoutEvent {
  tournamentId: string;
  eliminatedPlayerId: string;
  eliminatedByPlayerId: string;
  bountyAmount: number; // In RPS points
  collectedRPS: number; // 50% of bounty awarded immediately
  addedToBountyRPS: number; // 50% added to winner's bounty
  timestamp: Date;
}

interface PKOTournament {
  id: string;
  name: string;
  buy_in: number;
  tournament_format: string;
  status: string;
}

class PKOBountyService {
  private supabase: SupabaseClient | null = null;

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[PKOBountyService] Supabase client configured');
  }

  /**
   * Check if tournament is PKO format
   */
  async isPKOTournament(tournamentId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data } = await this.supabase
      .from('online_poker_tournaments')
      .select('tournament_format')
      .eq('id', tournamentId)
      .single();

    return data?.tournament_format === 'pko' || data?.tournament_format === 'knockout' || data?.tournament_format === 'bounty';
  }

  /**
   * Calculate starting bounty for a tournament (in RPS points)
   * Standard PKO: 50% of buy-in goes to bounty, converted to RPS
   */
  calculateStartingBountyRPS(buyIn: number, bountyPercentage: number = 50): number {
    const bountyDiamonds = Math.floor(buyIn * (bountyPercentage / 100));
    return Math.floor(bountyDiamonds / RPS_CONVERSION_RATE);
  }

  /**
   * Legacy method for diamond bounty (deprecated, use RPS)
   */
  calculateStartingBounty(buyIn: number, bountyPercentage: number = 50): number {
    return Math.floor(buyIn * (bountyPercentage / 100));
  }

  /**
   * Get all bounty information for tournament
   */
  async getTournamentBounties(tournamentId: string): Promise<BountyInfo[]> {
    if (!this.supabase) return [];

    // Get tournament info
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in, tournament_format')
      .eq('id', tournamentId)
      .single();

    if (!tournament || (tournament.tournament_format !== 'pko' && tournament.tournament_format !== 'knockout' && tournament.tournament_format !== 'bounty')) {
      return [];
    }

    const startingBounty = this.calculateStartingBounty(tournament.buy_in);

    // Get all participants with player info
    const { data: participants } = await this.supabase
      .from('online_poker_tournament_participants')
      .select(`
        player_id,
        status,
        eliminated_by,
        players!inner(name)
      `)
      .eq('tournament_id', tournamentId);

    if (!participants) return [];

    // Calculate bounties for each player
    const bounties: BountyInfo[] = [];

    for (const p of participants) {
      // Count knockouts by this player
      const { count: knockouts } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('eliminated_by', p.player_id);

      const knockoutCount = knockouts || 0;
      const collectedBounties = knockoutCount * startingBounty * 0.5;
      const currentBounty = startingBounty + collectedBounties;

      bounties.push({
        playerId: p.player_id,
        playerName: (p.players as any)?.name || 'Unknown',
        currentBounty,
        startingBounty,
        collectedBounties,
        knockouts: knockoutCount,
        isEliminated: p.status === 'eliminated'
      });
    }

    // Sort by knockouts descending
    return bounties.sort((a, b) => b.knockouts - a.knockouts);
  }

  /**
   * Process knockout event - awards RPS points
   * Called when a player is eliminated
   */
  async processKnockout(
    tournamentId: string,
    eliminatedPlayerId: string,
    eliminatorPlayerId: string
  ): Promise<KnockoutEvent | null> {
    if (!this.supabase) return null;

    // Check if PKO tournament
    const isPKO = await this.isPKOTournament(tournamentId);
    if (!isPKO) {
      logger.info(`[PKOBountyService] Tournament ${tournamentId} is not PKO, skipping bounty`);
      return null;
    }

    // Get tournament buy-in
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in, name')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      logger.error(`[PKOBountyService] Tournament not found: ${tournamentId}`);
      return null;
    }

    // Calculate bounty in RPS
    const startingBountyRPS = this.calculateStartingBountyRPS(tournament.buy_in);

    // Get eliminated player's knockouts to calculate accumulated bounty
    const { count: eliminatedKnockouts } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('eliminated_by', eliminatedPlayerId);

    const accumulatedBountyRPS = (eliminatedKnockouts || 0) * Math.floor(startingBountyRPS * 0.5);
    const totalBountyRPS = startingBountyRPS + accumulatedBountyRPS;

    // Split: 50% to eliminator immediately as RPS, 50% added to eliminator's bounty value
    const collectedRPS = Math.floor(totalBountyRPS * 0.5);
    const addedToBountyRPS = Math.floor(totalBountyRPS * 0.5);

    const knockoutEvent: KnockoutEvent = {
      tournamentId,
      eliminatedPlayerId,
      eliminatedByPlayerId: eliminatorPlayerId,
      bountyAmount: totalBountyRPS,
      collectedRPS,
      addedToBountyRPS,
      timestamp: new Date()
    };

    // Award RPS to eliminator immediately
    await this.awardBountyRPS(eliminatorPlayerId, collectedRPS, tournamentId);

    // Update participant stats
    await this.updateParticipantBountyStats(tournamentId, eliminatorPlayerId, collectedRPS);

    logger.info(`[PKOBountyService] Knockout processed in ${tournament.name}`, {
      eliminator: eliminatorPlayerId,
      eliminated: eliminatedPlayerId,
      bountyRPS: totalBountyRPS,
      collectedRPS
    });

    return knockoutEvent;
  }

  /**
   * Award bounty RPS to player's elo_rating
   */
  private async awardBountyRPS(
    playerId: string,
    rpsPoints: number,
    tournamentId: string
  ): Promise<void> {
    if (!this.supabase || rpsPoints <= 0) return;

    try {
      // Get player's current rating
      const { data: player } = await this.supabase
        .from('players')
        .select('id, elo_rating, name')
        .eq('id', playerId)
        .single();

      if (!player) {
        logger.error(`[PKOBountyService] Player not found: ${playerId}`);
        return;
      }

      // Add RPS to elo_rating
      const newRating = (player.elo_rating || 1000) + rpsPoints;

      await this.supabase
        .from('players')
        .update({ 
          elo_rating: newRating,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      logger.info(`[PKOBountyService] Awarded ${rpsPoints} RPS bounty to ${player.name}`, {
        playerId,
        oldRating: player.elo_rating,
        newRating,
        tournamentId
      });

    } catch (err) {
      logger.error(`[PKOBountyService] Error awarding bounty RPS`, { error: String(err), playerId });
    }
  }

  /**
   * Update participant bounty stats in DB
   */
  private async updateParticipantBountyStats(
    tournamentId: string,
    eliminatorId: string,
    collectedRPS: number
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: participant } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('knockouts_count, bounty_collected, bounty_value')
        .eq('tournament_id', tournamentId)
        .eq('player_id', eliminatorId)
        .single();

      if (participant) {
        await this.supabase
          .from('online_poker_tournament_participants')
          .update({
            knockouts_count: (participant.knockouts_count || 0) + 1,
            bounty_collected: (participant.bounty_collected || 0) + collectedRPS,
            bounty_value: (participant.bounty_value || 0) + Math.floor(collectedRPS) // 50% added to own bounty
          })
          .eq('tournament_id', tournamentId)
          .eq('player_id', eliminatorId);
      }
    } catch (err) {
      logger.error(`[PKOBountyService] Error updating participant stats`, { error: String(err) });
    }
  }

  /**
   * @deprecated Use awardBountyRPS instead - diamonds are no longer used for bounties
   * Credit bounty diamonds to player (legacy, not called)
   */
  private async creditBountyToPlayer(
    playerId: string,
    amount: number,
    tournamentId: string
  ): Promise<void> {
    // Deprecated - bounties now paid in RPS points to elo_rating
    // This method exists only for backwards compatibility
    logger.warn(`[PKOBountyService] creditBountyToPlayer is deprecated, use RPS system`);
  }

  /**
   * Get player's bounty value
   */
  async getPlayerBounty(tournamentId: string, playerId: string): Promise<BountyInfo | null> {
    const bounties = await this.getTournamentBounties(tournamentId);
    return bounties.find(b => b.playerId === playerId) || null;
  }

  /**
   * Get bounty leaderboard (top knockouts)
   */
  async getBountyLeaderboard(tournamentId: string, limit: number = 10): Promise<BountyInfo[]> {
    const bounties = await this.getTournamentBounties(tournamentId);
    return bounties.filter(b => b.knockouts > 0).slice(0, limit);
  }

  /**
   * Calculate total bounty pool for tournament (in RPS)
   */
  async getTotalBountyPoolRPS(tournamentId: string): Promise<{
    totalPoolRPS: number;
    collectedBountiesRPS: number;
    remainingBountiesRPS: number;
  }> {
    if (!this.supabase) {
      return { totalPoolRPS: 0, collectedBountiesRPS: 0, remainingBountiesRPS: 0 };
    }

    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { totalPoolRPS: 0, collectedBountiesRPS: 0, remainingBountiesRPS: 0 };
    }

    // Count participants
    const { count: totalPlayers } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    const { count: eliminatedPlayers } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'eliminated');

    const startingBountyRPS = this.calculateStartingBountyRPS(tournament.buy_in);
    const totalPoolRPS = (totalPlayers || 0) * startingBountyRPS;
    const collectedBountiesRPS = (eliminatedPlayers || 0) * Math.floor(startingBountyRPS * 0.5);
    const remainingBountiesRPS = totalPoolRPS - collectedBountiesRPS;

    return {
      totalPoolRPS,
      collectedBountiesRPS,
      remainingBountiesRPS
    };
  }

  /**
   * Legacy method for diamond pool (deprecated)
   */
  async getTotalBountyPool(tournamentId: string): Promise<{
    totalPool: number;
    collectedBounties: number;
    remainingBounties: number;
  }> {
    const rpsPool = await this.getTotalBountyPoolRPS(tournamentId);
    return {
      totalPool: rpsPool.totalPoolRPS,
      collectedBounties: rpsPool.collectedBountiesRPS,
      remainingBounties: rpsPool.remainingBountiesRPS
    };
  }

  /**
   * Finalize PKO tournament - distribute winner's remaining bounty as RPS
   */
  async finalizeTournament(tournamentId: string): Promise<void> {
    if (!this.supabase) return;

    const isPKO = await this.isPKOTournament(tournamentId);
    if (!isPKO) return;

    // Get winner (finish_position = 1)
    const { data: winner } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id, bounty_value')
      .eq('tournament_id', tournamentId)
      .eq('finish_position', 1)
      .single();

    if (winner) {
      // Winner gets their own remaining bounty as RPS
      const { data: tournament } = await this.supabase
        .from('online_poker_tournaments')
        .select('buy_in')
        .eq('id', tournamentId)
        .single();

      if (tournament) {
        const startingBountyRPS = this.calculateStartingBountyRPS(tournament.buy_in);
        const accumulatedBountyRPS = winner.bounty_value || 0;
        const totalRemainingBounty = startingBountyRPS + accumulatedBountyRPS;

        if (totalRemainingBounty > 0) {
          await this.awardBountyRPS(winner.player_id, totalRemainingBounty, tournamentId);
          logger.info(`[PKOBountyService] Winner ${winner.player_id} received remaining bounty: ${totalRemainingBounty} RPS`);
        }
      }
    }
  }
}

export const pkoBountyService = new PKOBountyService();
