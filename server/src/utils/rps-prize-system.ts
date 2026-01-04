/**
 * RPS Prize System for Online Tournaments
 * 
 * Система призов на базе RPS (Rating Points System):
 * - Валюта входа: Алмазы (1000₽ = 1000💎)
 * - Призы: RPS очки (1000₽ = 100 RPS)
 * - Топ-3: Входы на офлайн турниры
 * 
 * Автоматический расчёт структуры выплат по количеству участников:
 * • 2-9 игроков: 1 место (100%)
 * • 10-19 игроков: 2 места (60% / 40%)
 * • 20-29 игроков: 3 места (50% / 30% / 20%)
 * • 30-49 игроков: 4 места (40% / 30% / 20% / 10%)
 * • 50+ игроков: 6 мест (35% / 25% / 15% / 10% / 8% / 7%)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// Константа конвертации: 1000₽ = 100 RPS
const RPS_CONVERSION_RATE = 10; // делим на 10 для получения RPS

// Структуры выплат по количеству игроков
const RPS_PAYOUT_STRUCTURES: Record<string, { places: number; percentages: number[] }> = {
  tiny: { places: 1, percentages: [100] }, // 2-9 игроков
  small: { places: 2, percentages: [60, 40] }, // 10-19 игроков
  medium: { places: 3, percentages: [50, 30, 20] }, // 20-29 игроков
  large: { places: 4, percentages: [40, 30, 20, 10] }, // 30-49 игроков
  xlarge: { places: 6, percentages: [35, 25, 15, 10, 8, 7] } // 50+ игроков
};

export interface RPSPayoutPosition {
  position: number;
  percentage: number;
  rpsPoints: number;
  playerId?: string;
  playerName?: string;
  offlineEntry: boolean; // Топ-3 получают входы на офлайн
}

export interface RPSTournamentPrizeInfo {
  tournamentId: string;
  tournamentName: string;
  totalBuyIn: number; // В алмазах
  participantCount: number;
  totalRebuys: number;
  totalAddons: number;
  totalRPSPool: number; // Общий фонд RPS
  payoutStructure: RPSPayoutPosition[];
  isPKO: boolean;
  bountyPoolRPS?: number; // PKO bounty в RPS
}

export interface RPSPayoutResult {
  playerId: string;
  position: number;
  rpsAwarded: number;
  offlineEntryAwarded: boolean;
  bountyRPS?: number; // Для PKO
  success: boolean;
  error?: string;
}

class RPSPrizeSystem {
  private supabase: SupabaseClient | null = null;

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[RPSPrizeSystem] Supabase client configured');
  }

  /**
   * Конвертация алмазов в RPS
   * 1000 алмазов = 100 RPS (конверсия 1:10)
   */
  convertDiamondsToRPS(diamonds: number): number {
    return Math.floor(diamonds / RPS_CONVERSION_RATE);
  }

  /**
   * Получить структуру выплат по количеству игроков
   */
  getPayoutStructure(playerCount: number): { places: number; percentages: number[] } {
    if (playerCount <= 9) return RPS_PAYOUT_STRUCTURES.tiny;
    if (playerCount <= 19) return RPS_PAYOUT_STRUCTURES.small;
    if (playerCount <= 29) return RPS_PAYOUT_STRUCTURES.medium;
    if (playerCount <= 49) return RPS_PAYOUT_STRUCTURES.large;
    return RPS_PAYOUT_STRUCTURES.xlarge;
  }

  /**
   * Рассчитать общий RPS пул турнира
   */
  async calculateTournamentRPSPool(tournamentId: string): Promise<{
    totalDiamonds: number;
    totalRPS: number;
    breakdown: {
      buyIns: number;
      rebuys: number;
      addons: number;
    };
  }> {
    if (!this.supabase) {
      return { totalDiamonds: 0, totalRPS: 0, breakdown: { buyIns: 0, rebuys: 0, addons: 0 } };
    }

    // Получаем данные турнира
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in, rebuy_cost, addon_cost')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { totalDiamonds: 0, totalRPS: 0, breakdown: { buyIns: 0, rebuys: 0, addons: 0 } };
    }

    // Получаем статистику участников
    const { data: participants } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('rebuys_count, addons_count')
      .eq('tournament_id', tournamentId)
      .neq('status', 'cancelled');

    if (!participants) {
      return { totalDiamonds: 0, totalRPS: 0, breakdown: { buyIns: 0, rebuys: 0, addons: 0 } };
    }

    const participantCount = participants.length;
    const totalRebuys = participants.reduce((sum, p) => sum + (p.rebuys_count || 0), 0);
    const totalAddons = participants.reduce((sum, p) => sum + (p.addons_count || 0), 0);

    const buyInDiamonds = participantCount * (tournament.buy_in || 0);
    const rebuyDiamonds = totalRebuys * (tournament.rebuy_cost || 0);
    const addonDiamonds = totalAddons * (tournament.addon_cost || 0);
    const totalDiamonds = buyInDiamonds + rebuyDiamonds + addonDiamonds;

    return {
      totalDiamonds,
      totalRPS: this.convertDiamondsToRPS(totalDiamonds),
      breakdown: {
        buyIns: this.convertDiamondsToRPS(buyInDiamonds),
        rebuys: this.convertDiamondsToRPS(rebuyDiamonds),
        addons: this.convertDiamondsToRPS(addonDiamonds)
      }
    };
  }

  /**
   * Получить полную информацию о призах турнира
   */
  async getTournamentPrizeInfo(tournamentId: string): Promise<RPSTournamentPrizeInfo | null> {
    if (!this.supabase) return null;

    // Получаем данные турнира
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('id, name, buy_in, tournament_format, rebuy_cost, addon_cost')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      logger.error(`[RPSPrizeSystem] Tournament not found: ${tournamentId}`);
      return null;
    }

    // Получаем статистику участников
    const { data: participants } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id, rebuys_count, addons_count, status')
      .eq('tournament_id', tournamentId)
      .neq('status', 'cancelled');

    if (!participants || participants.length === 0) {
      logger.error(`[RPSPrizeSystem] No participants for tournament: ${tournamentId}`);
      return null;
    }

    const participantCount = participants.length;
    const totalRebuys = participants.reduce((sum, p) => sum + (p.rebuys_count || 0), 0);
    const totalAddons = participants.reduce((sum, p) => sum + (p.addons_count || 0), 0);

    // Рассчитываем общий pool
    const rpsPoolData = await this.calculateTournamentRPSPool(tournamentId);
    const totalRPSPool = rpsPoolData.totalRPS;

    // Получаем структуру выплат
    const structure = this.getPayoutStructure(participantCount);
    
    // Формируем позиции выплат
    const payoutStructure: RPSPayoutPosition[] = structure.percentages.map((percentage, index) => ({
      position: index + 1,
      percentage,
      rpsPoints: Math.floor(totalRPSPool * (percentage / 100)),
      offlineEntry: index < 3 // Топ-3 получают входы на офлайн
    }));

    // Для PKO: 50% идёт в bounty pool
    const isPKO = tournament.tournament_format === 'pko' || 
                  tournament.tournament_format === 'knockout' || 
                  tournament.tournament_format === 'bounty';

    let bountyPoolRPS: number | undefined;
    if (isPKO) {
      bountyPoolRPS = Math.floor(totalRPSPool * 0.5);
      // Уменьшаем обычный призовой пул на 50% для PKO
      payoutStructure.forEach(p => {
        p.rpsPoints = Math.floor(p.rpsPoints * 0.5);
      });
    }

    return {
      tournamentId,
      tournamentName: tournament.name,
      totalBuyIn: rpsPoolData.totalDiamonds,
      participantCount,
      totalRebuys,
      totalAddons,
      totalRPSPool,
      payoutStructure,
      isPKO,
      bountyPoolRPS
    };
  }

  /**
   * Начислить RPS игроку
   */
  async awardRPS(
    playerId: string,
    rpsPoints: number,
    tournamentId: string,
    reason: 'position_prize' | 'bounty' | 'bonus'
  ): Promise<boolean> {
    if (!this.supabase || rpsPoints <= 0) return false;

    try {
      // Получаем текущий рейтинг игрока
      const { data: player, error: playerError } = await this.supabase
        .from('players')
        .select('id, elo_rating, name')
        .eq('id', playerId)
        .single();

      if (playerError || !player) {
        logger.error(`[RPSPrizeSystem] Player not found: ${playerId}`);
        return false;
      }

      // Начисляем RPS к elo_rating
      const newRating = (player.elo_rating || 1000) + rpsPoints;

      const { error: updateError } = await this.supabase
        .from('players')
        .update({ 
          elo_rating: newRating,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (updateError) {
        logger.error(`[RPSPrizeSystem] Failed to update rating`, { error: updateError, playerId });
        return false;
      }

      logger.info(`[RPSPrizeSystem] Awarded ${rpsPoints} RPS to ${player.name}`, {
        playerId,
        oldRating: player.elo_rating,
        newRating,
        reason,
        tournamentId
      });

      return true;
    } catch (error) {
      logger.error(`[RPSPrizeSystem] Error awarding RPS`, { error: String(error), playerId });
      return false;
    }
  }

  /**
   * Выдать вход на офлайн турнир
   */
  async awardOfflineEntry(
    playerId: string,
    tournamentId: string,
    finishPosition: number,
    entryValue: number = 1000 // Значение входа
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      // Создаём билет на офлайн турнир
      const { error } = await this.supabase
        .from('tournament_tickets')
        .insert({
          player_id: playerId,
          won_from_tournament_id: tournamentId,
          ticket_value: entryValue,
          finish_position: finishPosition,
          entry_type: 'rps_prize',
          entry_count: 1,
          status: 'active',
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 дней
        });

      if (error) {
        logger.error(`[RPSPrizeSystem] Failed to create offline entry`, { error, playerId });
        return false;
      }

      logger.info(`[RPSPrizeSystem] Awarded offline entry to player ${playerId} (position ${finishPosition})`);
      return true;
    } catch (error) {
      logger.error(`[RPSPrizeSystem] Error awarding offline entry`, { error: String(error), playerId });
      return false;
    }
  }

  /**
   * Обработать knockout в PKO турнире (начислить RPS за bounty)
   */
  async processKnockoutRPS(
    tournamentId: string,
    eliminatorPlayerId: string,
    eliminatedPlayerId: string
  ): Promise<{ rpsAwarded: number; success: boolean }> {
    if (!this.supabase) {
      return { rpsAwarded: 0, success: false };
    }

    // Получаем данные турнира
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select('buy_in, tournament_format')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { rpsAwarded: 0, success: false };
    }

    // Проверяем что это PKO турнир
    const isPKO = tournament.tournament_format === 'pko' || 
                  tournament.tournament_format === 'knockout' || 
                  tournament.tournament_format === 'bounty';

    if (!isPKO) {
      return { rpsAwarded: 0, success: false };
    }

    // Bounty = 50% от buy-in, конвертируем в RPS
    const bountyDiamonds = Math.floor(tournament.buy_in * 0.5);
    const bountyRPS = this.convertDiamondsToRPS(bountyDiamonds);

    // 50% bounty сразу начисляем победителю
    const collectedRPS = Math.floor(bountyRPS * 0.5);

    if (collectedRPS > 0) {
      const success = await this.awardRPS(eliminatorPlayerId, collectedRPS, tournamentId, 'bounty');
      
      if (success) {
        // Обновляем bounty_collected в участниках
        await this.supabase
          .from('online_poker_tournament_participants')
          .update({
            bounty_collected: this.supabase.rpc ? undefined : collectedRPS, // Используем raw update
            knockouts_count: this.supabase.rpc ? undefined : 1
          })
          .eq('tournament_id', tournamentId)
          .eq('player_id', eliminatorPlayerId);

        // Инкрементируем knockouts_count
        const { data: eliminator } = await this.supabase
          .from('online_poker_tournament_participants')
          .select('knockouts_count, bounty_collected')
          .eq('tournament_id', tournamentId)
          .eq('player_id', eliminatorPlayerId)
          .single();

        if (eliminator) {
          await this.supabase
            .from('online_poker_tournament_participants')
            .update({
              knockouts_count: (eliminator.knockouts_count || 0) + 1,
              bounty_collected: (eliminator.bounty_collected || 0) + collectedRPS
            })
            .eq('tournament_id', tournamentId)
            .eq('player_id', eliminatorPlayerId);
        }
      }

      return { rpsAwarded: collectedRPS, success };
    }

    return { rpsAwarded: 0, success: false };
  }

  /**
   * Обработать все выплаты при завершении турнира
   */
  async processTournamentPayouts(tournamentId: string): Promise<RPSPayoutResult[]> {
    const results: RPSPayoutResult[] = [];

    if (!this.supabase) {
      logger.error('[RPSPrizeSystem] Supabase not configured');
      return results;
    }

    logger.info(`[RPSPrizeSystem] Processing RPS payouts for tournament ${tournamentId}`);

    // Получаем информацию о призах
    const prizeInfo = await this.getTournamentPrizeInfo(tournamentId);
    if (!prizeInfo) {
      logger.error(`[RPSPrizeSystem] Could not get prize info for ${tournamentId}`);
      return results;
    }

    logger.info(`[RPSPrizeSystem] Prize info:`, {
      totalRPS: prizeInfo.totalRPSPool,
      participants: prizeInfo.participantCount,
      isPKO: prizeInfo.isPKO,
      payoutPlaces: prizeInfo.payoutStructure.length
    });

    // Получаем финальные позиции
    const { data: finishers } = await this.supabase
      .from('online_poker_tournament_participants')
      .select(`
        player_id,
        finish_position,
        bounty_collected,
        knockouts_count,
        players!inner(name)
      `)
      .eq('tournament_id', tournamentId)
      .not('finish_position', 'is', null)
      .order('finish_position', { ascending: true });

    if (!finishers || finishers.length === 0) {
      logger.warn(`[RPSPrizeSystem] No finishers found for tournament ${tournamentId}`);
      return results;
    }

    // Обрабатываем каждую призовую позицию
    for (const payout of prizeInfo.payoutStructure) {
      const finisher = finishers.find(f => f.finish_position === payout.position);
      
      if (!finisher) {
        logger.warn(`[RPSPrizeSystem] No player for position ${payout.position}`);
        continue;
      }

      const result: RPSPayoutResult = {
        playerId: finisher.player_id,
        position: payout.position,
        rpsAwarded: 0,
        offlineEntryAwarded: false,
        success: false
      };

      // Начисляем RPS за место
      if (payout.rpsPoints > 0) {
        const rpsSuccess = await this.awardRPS(
          finisher.player_id,
          payout.rpsPoints,
          tournamentId,
          'position_prize'
        );

        if (rpsSuccess) {
          result.rpsAwarded = payout.rpsPoints;
          result.success = true;
        }
      }

      // Выдаём вход на офлайн для топ-3
      if (payout.offlineEntry) {
        const entrySuccess = await this.awardOfflineEntry(
          finisher.player_id,
          tournamentId,
          payout.position
        );
        result.offlineEntryAwarded = entrySuccess;
      }

      // Добавляем bounty RPS для PKO (уже начислены при knockout, но записываем для отчёта)
      if (prizeInfo.isPKO && finisher.bounty_collected) {
        result.bountyRPS = finisher.bounty_collected;
      }

      // Обновляем prize_amount в участниках (храним RPS)
      await this.supabase
        .from('online_poker_tournament_participants')
        .update({ prize_amount: payout.rpsPoints })
        .eq('tournament_id', tournamentId)
        .eq('player_id', finisher.player_id);

      // Обновляем таблицу выплат
      await this.supabase
        .from('online_poker_tournament_payouts')
        .upsert({
          tournament_id: tournamentId,
          position: payout.position,
          percentage: payout.percentage,
          amount: payout.rpsPoints,
          player_id: finisher.player_id,
          paid_at: new Date().toISOString()
        }, {
          onConflict: 'tournament_id,position'
        });

      results.push(result);

      logger.info(`[RPSPrizeSystem] Paid position ${payout.position}:`, {
        player: (finisher.players as any)?.name,
        rps: payout.rpsPoints,
        offlineEntry: payout.offlineEntry,
        bountyRPS: result.bountyRPS
      });
    }

    // Для PKO: победитель получает свой оставшийся bounty
    if (prizeInfo.isPKO) {
      const winner = finishers.find(f => f.finish_position === 1);
      if (winner) {
        // Оставшийся bounty = стартовый bounty + накопленные 50%
        const startingBountyRPS = this.convertDiamondsToRPS(
          Math.floor((prizeInfo.totalBuyIn / prizeInfo.participantCount) * 0.25)
        );
        
        if (startingBountyRPS > 0) {
          await this.awardRPS(winner.player_id, startingBountyRPS, tournamentId, 'bounty');
          logger.info(`[RPSPrizeSystem] Winner received remaining bounty: ${startingBountyRPS} RPS`);
        }
      }
    }

    logger.info(`[RPSPrizeSystem] Completed payouts: ${results.length} players paid`);
    return results;
  }

  /**
   * Генерировать структуру выплат для турнира (до старта)
   */
  async generatePayoutStructure(tournamentId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const prizeInfo = await this.getTournamentPrizeInfo(tournamentId);
    if (!prizeInfo) return false;

    // Удаляем старую структуру
    await this.supabase
      .from('online_poker_tournament_payouts')
      .delete()
      .eq('tournament_id', tournamentId);

    // Создаём новую структуру
    const payouts = prizeInfo.payoutStructure.map(p => ({
      tournament_id: tournamentId,
      position: p.position,
      percentage: p.percentage,
      amount: p.rpsPoints
    }));

    const { error } = await this.supabase
      .from('online_poker_tournament_payouts')
      .insert(payouts);

    if (error) {
      logger.error(`[RPSPrizeSystem] Failed to generate payout structure`, { error });
      return false;
    }

    logger.info(`[RPSPrizeSystem] Generated payout structure for ${tournamentId}:`, {
      places: payouts.length,
      totalRPS: prizeInfo.totalRPSPool
    });

    return true;
  }
}

export const rpsPrizeSystem = new RPSPrizeSystem();
