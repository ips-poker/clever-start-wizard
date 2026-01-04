/**
 * PKO Bounty Service
 * Professional Progressive Knockout tournament management:
 * - Bounty calculation and distribution
 * - Knockout tracking
 * - Real-time bounty updates
 * - Diamond wallet integration
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

export interface BountyInfo {
  playerId: string;
  playerName: string;
  currentBounty: number;
  startingBounty: number;
  collectedBounties: number;
  knockouts: number;
  isEliminated: boolean;
}

export interface KnockoutEvent {
  tournamentId: string;
  eliminatedPlayerId: string;
  eliminatedByPlayerId: string;
  bountyAmount: number;
  collectedAmount: number; // 50% of bounty
  addedToBounty: number; // 50% of bounty added to winner's bounty
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
   * Calculate starting bounty for a tournament
   * Standard PKO: 50% of buy-in goes to bounty
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
   * Process knockout event
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

    const startingBounty = this.calculateStartingBounty(tournament.buy_in);

    // Get eliminated player's current bounty (starting + accumulated)
    const { data: eliminatedPlayer } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournamentId)
      .eq('player_id', eliminatedPlayerId)
      .single();

    if (!eliminatedPlayer) {
      logger.error(`[PKOBountyService] Eliminated player not found: ${eliminatedPlayerId}`);
      return null;
    }

    // Count how many players the eliminated player has knocked out
    const { count: eliminatedKnockouts } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('eliminated_by', eliminatedPlayerId);

    const accumulatedBounty = (eliminatedKnockouts || 0) * startingBounty * 0.5;
    const totalBounty = startingBounty + accumulatedBounty;

    // Split: 50% to eliminator, 50% added to eliminator's bounty
    const collectedAmount = Math.floor(totalBounty * 0.5);
    const addedToBounty = Math.floor(totalBounty * 0.5);

    const knockoutEvent: KnockoutEvent = {
      tournamentId,
      eliminatedPlayerId,
      eliminatedByPlayerId: eliminatorPlayerId,
      bountyAmount: totalBounty,
      collectedAmount,
      addedToBounty,
      timestamp: new Date()
    };

    logger.info(`[PKOBountyService] Knockout processed in ${tournament.name}`, {
      eliminator: eliminatorPlayerId,
      eliminated: eliminatedPlayerId,
      bounty: totalBounty,
      collected: collectedAmount
    });

    // Credit diamonds to eliminator (if using diamond economy)
    await this.creditBountyToPlayer(eliminatorPlayerId, collectedAmount, tournamentId);

    return knockoutEvent;
  }

  /**
   * Credit bounty diamonds to player
   */
  private async creditBountyToPlayer(
    playerId: string,
    amount: number,
    tournamentId: string
  ): Promise<void> {
    if (!this.supabase || amount <= 0) return;

    try {
      // Check if player has a diamond wallet
      const { data: wallet } = await this.supabase
        .from('diamond_wallets')
        .select('id, balance')
        .eq('player_id', playerId)
        .single();

      if (wallet) {
        // Update wallet balance
        const newBalance = wallet.balance + amount;

        await this.supabase
          .from('diamond_wallets')
          .update({
            balance: newBalance,
            total_won: wallet.balance + amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);

        // Create transaction record
        await this.supabase
          .from('diamond_transactions')
          .insert({
            wallet_id: wallet.id,
            player_id: playerId,
            amount,
            balance_before: wallet.balance,
            balance_after: newBalance,
            transaction_type: 'bounty_win',
            description: `PKO Bounty - Tournament knockout`,
            reference_id: tournamentId
          });

        logger.info(`[PKOBountyService] Credited ${amount} diamonds to player ${playerId}`);
      }
    } catch (err) {
      logger.error(`[PKOBountyService] Error crediting bounty`, { error: String(err), playerId, amount });
    }
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
   * Calculate total bounty pool for tournament
   */
  async getTotalBountyPool(tournamentId: string): Promise<{
    totalPool: number;
    collectedBounties: number;
    remainingBounties: number;
  }> {
    if (!this.supabase) {
      return { totalPool: 0, collectedBounties: 0, remainingBounties: 0 };
    }

    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { totalPool: 0, collectedBounties: 0, remainingBounties: 0 };
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

    const startingBounty = this.calculateStartingBounty(tournament.buy_in);
    const totalPool = (totalPlayers || 0) * startingBounty;
    const collectedBounties = (eliminatedPlayers || 0) * startingBounty * 0.5;
    const remainingBounties = totalPool - collectedBounties;

    return {
      totalPool,
      collectedBounties,
      remainingBounties
    };
  }

  /**
   * Finalize PKO tournament - distribute remaining bounties
   */
  async finalizeTournament(tournamentId: string): Promise<void> {
    if (!this.supabase) return;

    const isPKO = await this.isPKOTournament(tournamentId);
    if (!isPKO) return;

    // Get winner (last remaining player or finish_position = 1)
    const { data: winner } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournamentId)
      .eq('finish_position', 1)
      .single();

    if (winner) {
      // Winner gets their own remaining bounty
      const bounty = await this.getPlayerBounty(tournamentId, winner.player_id);
      if (bounty) {
        await this.creditBountyToPlayer(winner.player_id, bounty.currentBounty, tournamentId);
        logger.info(`[PKOBountyService] Winner ${winner.player_id} received own bounty: ${bounty.currentBounty}`);
      }
    }
  }
}

export const pkoBountyService = new PKOBountyService();
