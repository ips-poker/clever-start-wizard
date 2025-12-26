/**
 * Prize Payout System
 * Автоматическая выплата призов при завершении турнира
 */

import { supabase } from '../config';

interface PayoutPosition {
  position: number;
  percentage: number;
  amount: number;
  playerId?: string;
  ticketValue?: number;
}

interface TournamentPrizeInfo {
  tournamentId: string;
  prizePool: number;
  ticketValue: number | null;
  ticketsForTop: number | null;
  payouts: PayoutPosition[];
}

interface PayoutResult {
  playerId: string;
  position: number;
  diamondAmount: number;
  ticketAwarded: boolean;
  ticketValue: number;
  success: boolean;
  error?: string;
}

// Стандартные структуры выплат
const PAYOUT_STRUCTURES: Record<string, number[]> = {
  // 2-6 игроков: топ 2
  small: [65, 35],
  // 7-18 игроков: топ 3
  medium: [50, 30, 20],
  // 19-27 игроков: топ 4
  large: [40, 30, 20, 10],
  // 28-45 игроков: топ 5
  xlarge: [35, 25, 18, 12, 10],
  // 46-90 игроков: топ 8
  huge: [30, 20, 15, 12, 8, 6, 5, 4],
  // 91+ игроков: топ 12
  massive: [25, 17, 12, 9, 7, 6, 5, 4, 4, 4, 4, 3]
};

export function getPayoutStructure(playerCount: number): number[] {
  if (playerCount <= 6) return PAYOUT_STRUCTURES.small;
  if (playerCount <= 18) return PAYOUT_STRUCTURES.medium;
  if (playerCount <= 27) return PAYOUT_STRUCTURES.large;
  if (playerCount <= 45) return PAYOUT_STRUCTURES.xlarge;
  if (playerCount <= 90) return PAYOUT_STRUCTURES.huge;
  return PAYOUT_STRUCTURES.massive;
}

export function calculatePayouts(prizePool: number, playerCount: number): PayoutPosition[] {
  const structure = getPayoutStructure(playerCount);
  
  return structure.map((percentage, index) => ({
    position: index + 1,
    percentage,
    amount: Math.floor(prizePool * percentage / 100)
  }));
}

export async function getTournamentPrizeInfo(tournamentId: string): Promise<TournamentPrizeInfo | null> {
  try {
    const { data: tournament, error } = await supabase
      .from('online_poker_tournaments')
      .select('id, prize_pool, ticket_value, tickets_for_top')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      console.error('[PrizePayout] Failed to get tournament:', error);
      return null;
    }

    // Получаем количество участников для расчета структуры
    const { count } = await supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .neq('status', 'cancelled');

    const playerCount = count || 0;
    const payouts = calculatePayouts(tournament.prize_pool || 0, playerCount);

    return {
      tournamentId,
      prizePool: tournament.prize_pool || 0,
      ticketValue: tournament.ticket_value,
      ticketsForTop: tournament.tickets_for_top,
      payouts
    };
  } catch (error) {
    console.error('[PrizePayout] Error getting prize info:', error);
    return null;
  }
}

export async function processTournamentPayouts(tournamentId: string): Promise<PayoutResult[]> {
  const results: PayoutResult[] = [];
  
  try {
    console.log(`[PrizePayout] Processing payouts for tournament ${tournamentId}`);

    const prizeInfo = await getTournamentPrizeInfo(tournamentId);
    if (!prizeInfo) {
      console.error('[PrizePayout] Could not get prize info');
      return results;
    }

    // Получаем финальные позиции игроков
    const { data: participants, error } = await supabase
      .from('online_poker_tournament_participants')
      .select('player_id, finish_position')
      .eq('tournament_id', tournamentId)
      .not('finish_position', 'is', null)
      .order('finish_position', { ascending: true });

    if (error || !participants) {
      console.error('[PrizePayout] Failed to get participants:', error);
      return results;
    }

    // Обрабатываем каждую призовую позицию
    for (const payout of prizeInfo.payouts) {
      const participant = participants.find(p => p.finish_position === payout.position);
      
      if (!participant) {
        console.warn(`[PrizePayout] No player found for position ${payout.position}`);
        continue;
      }

      const result = await processPlayerPayout(
        participant.player_id,
        tournamentId,
        payout.position,
        payout.amount,
        prizeInfo.ticketValue,
        prizeInfo.ticketsForTop,
        payout.position
      );

      results.push(result);

      // Обновляем приз в таблице участников
      await supabase
        .from('online_poker_tournament_participants')
        .update({ prize_amount: payout.amount })
        .eq('tournament_id', tournamentId)
        .eq('player_id', participant.player_id);

      // Обновляем таблицу выплат
      await supabase
        .from('online_poker_tournament_payouts')
        .update({ 
          player_id: participant.player_id,
          amount: payout.amount,
          paid_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('position', payout.position);
    }

    console.log(`[PrizePayout] Processed ${results.length} payouts for tournament ${tournamentId}`);
    return results;

  } catch (error) {
    console.error('[PrizePayout] Error processing payouts:', error);
    return results;
  }
}

async function processPlayerPayout(
  playerId: string,
  tournamentId: string,
  position: number,
  diamondAmount: number,
  ticketValue: number | null,
  ticketsForTop: number | null,
  finishPosition: number
): Promise<PayoutResult> {
  const result: PayoutResult = {
    playerId,
    position,
    diamondAmount,
    ticketAwarded: false,
    ticketValue: 0,
    success: false
  };

  try {
    // Выплачиваем алмазы
    if (diamondAmount > 0) {
      const { data: wallet, error: walletError } = await supabase
        .from('diamond_wallets')
        .select('id, balance')
        .eq('player_id', playerId)
        .single();

      if (walletError || !wallet) {
        // Создаем кошелек если нет
        const { error: createError } = await supabase
          .from('diamond_wallets')
          .insert({
            player_id: playerId,
            balance: diamondAmount,
            total_won: diamondAmount
          });

        if (createError) {
          result.error = 'Failed to create wallet';
          return result;
        }
      } else {
        // Обновляем баланс
        const { error: updateError } = await supabase
          .from('diamond_wallets')
          .update({
            balance: wallet.balance + diamondAmount,
            total_won: supabase.rpc ? diamondAmount : diamondAmount, // Increment
            updated_at: new Date().toISOString()
          })
          .eq('player_id', playerId);

        if (updateError) {
          result.error = 'Failed to update wallet';
          return result;
        }
      }

      // Записываем транзакцию
      const { data: walletData } = await supabase
        .from('diamond_wallets')
        .select('id, balance')
        .eq('player_id', playerId)
        .single();

      if (walletData) {
        await supabase.from('diamond_transactions').insert({
          player_id: playerId,
          wallet_id: walletData.id,
          transaction_type: 'tournament_prize',
          amount: diamondAmount,
          balance_before: walletData.balance - diamondAmount,
          balance_after: walletData.balance,
          description: `Приз за ${position} место в турнире`,
          reference_id: tournamentId
        });
      }
    }

    // Выдаем билет на оффлайн турнир если нужно
    if (ticketValue && ticketsForTop && finishPosition <= ticketsForTop) {
      const { error: ticketError } = await supabase
        .from('tournament_tickets')
        .insert({
          player_id: playerId,
          won_from_tournament_id: tournamentId,
          ticket_value: ticketValue,
          finish_position: finishPosition,
          status: 'active',
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 дней
        });

      if (!ticketError) {
        result.ticketAwarded = true;
        result.ticketValue = ticketValue;
      }
    }

    result.success = true;
    console.log(`[PrizePayout] Paid ${diamondAmount} diamonds to player ${playerId} (position ${position})`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PrizePayout] Error paying player ${playerId}:`, error);
  }

  return result;
}

// Экспорт для использования в TournamentManager
export const prizePayoutSystem = {
  getPayoutStructure,
  calculatePayouts,
  getTournamentPrizeInfo,
  processTournamentPayouts
};
