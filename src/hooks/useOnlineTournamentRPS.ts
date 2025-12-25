import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RPSResult {
  success: boolean;
  position?: number;
  rps_earned?: number;
  rps_pool?: number;
  elo_before?: number;
  elo_after?: number;
  elo_change?: number;
  prize_amount?: number;
  payout_percentage?: number;
  paid_places?: number;
  error?: string;
}

interface EliminationResult {
  success: boolean;
  finish_position?: number;
  remaining_players?: number;
  rps_result?: RPSResult;
  error?: string;
}

interface LevelAdvanceResult {
  success: boolean;
  new_level?: number;
  small_blind?: number;
  big_blind?: number;
  ante?: number;
  is_break?: boolean;
  duration?: number;
  error?: string;
}

interface RebuyResult {
  success: boolean;
  new_chips?: number;
  rebuy_cost?: number;
  new_balance?: number;
  error?: string;
}

interface AddonResult {
  success: boolean;
  new_chips?: number;
  addon_cost?: number;
  new_balance?: number;
  error?: string;
}

/**
 * Хук для интеграции онлайн турниров с RPS рейтинговой системой
 * RPS пул рассчитывается аналогично офлайн турнирам: 1000₽ = 100 RPS баллов
 */
export function useOnlineTournamentRPS() {
  /**
   * Записать результат игрока в общую систему RPS
   */
  const recordResult = useCallback(async (
    tournamentId: string,
    playerId: string,
    position: number
  ): Promise<RPSResult> => {
    try {
      const { data, error } = await supabase.rpc('record_online_tournament_result', {
        p_tournament_id: tournamentId,
        p_player_id: playerId,
        p_position: position
      });

      if (error) {
        console.error('Error recording tournament result:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as RPSResult;
      
      if (result.success && result.elo_change) {
        const changeText = result.elo_change > 0 ? `+${result.elo_change}` : result.elo_change;
        toast.success(`Позиция ${result.position}: RPS ${changeText} (из пула ${result.rps_pool} RPS)`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in recordResult:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Обработать выбывание игрока из турнира
   */
  const eliminatePlayer = useCallback(async (
    tournamentId: string,
    playerId: string,
    eliminatedBy?: string
  ): Promise<EliminationResult> => {
    try {
      const { data, error } = await supabase.rpc('eliminate_online_tournament_player', {
        p_tournament_id: tournamentId,
        p_player_id: playerId,
        p_eliminated_by: eliminatedBy || null
      });

      if (error) {
        console.error('Error eliminating player:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as EliminationResult;
      
      if (result.success) {
        console.log(`Player eliminated: position ${result.finish_position}, ${result.remaining_players} remaining`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in eliminatePlayer:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Повысить уровень блайндов в турнире
   */
  const advanceLevel = useCallback(async (
    tournamentId: string
  ): Promise<LevelAdvanceResult> => {
    try {
      const { data, error } = await supabase.rpc('advance_online_tournament_level', {
        p_tournament_id: tournamentId
      });

      if (error) {
        console.error('Error advancing level:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as LevelAdvanceResult;
      
      if (result.success) {
        if (result.is_break) {
          toast.info(`Перерыв (${result.duration} секунд)`);
        } else {
          toast.info(`Уровень ${result.new_level}: ${result.small_blind}/${result.big_blind}`);
        }
      }

      return result;
    } catch (err: any) {
      console.error('Error in advanceLevel:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Обработать ребай игрока
   */
  const processRebuy = useCallback(async (
    tournamentId: string,
    playerId: string
  ): Promise<RebuyResult> => {
    try {
      const { data, error } = await supabase.rpc('process_online_tournament_rebuy', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        console.error('Error processing rebuy:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as RebuyResult;
      
      if (result.success) {
        toast.success(`Ребай выполнен! +${result.new_chips} фишек`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in processRebuy:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Обработать аддон игрока
   */
  const processAddon = useCallback(async (
    tournamentId: string,
    playerId: string
  ): Promise<AddonResult> => {
    try {
      const { data, error } = await supabase.rpc('process_online_tournament_addon', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        console.error('Error processing addon:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as AddonResult;
      
      if (result.success) {
        toast.success(`Аддон выполнен! +${result.new_chips} фишек`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in processAddon:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Рассчитать RPS пул турнира на основе входов (аналогично офлайн)
   * 1000₽ = 100 RPS баллов
   */
  const calculateRPSPool = useCallback(async (tournamentId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_online_tournament_rps_pool', {
        tournament_id_param: tournamentId
      });

      if (error) {
        console.error('Error calculating RPS pool:', error);
        return 0;
      }

      return data as number;
    } catch (err) {
      console.error('Error in calculateRPSPool:', err);
      return 0;
    }
  }, []);

  /**
   * Рассчитать призовой пул турнира (включая ребаи и аддоны)
   */
  const calculatePrizePool = useCallback(async (tournamentId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_online_tournament_prize_pool', {
        tournament_id_param: tournamentId
      });

      if (error) {
        console.error('Error calculating prize pool:', error);
        return 0;
      }

      return data as number;
    } catch (err) {
      console.error('Error in calculatePrizePool:', err);
      return 0;
    }
  }, []);

  /**
   * Генерировать структуру призов автоматически на основе кол-ва участников
   */
  const generatePayoutStructure = useCallback(async (tournamentId: string): Promise<{
    success: boolean;
    participants_count?: number;
    prize_pool?: number;
    rps_pool?: number;
    payout_places?: number;
    entries_structure?: number[];
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase.rpc('generate_online_tournament_payout_structure', {
        p_tournament_id: tournamentId
      });

      if (error) {
        console.error('Error generating payout structure:', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (result?.success) {
        toast.success(`Сгенерирована структура призов для ${result.participants_count} участников`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in generatePayoutStructure:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Выдать билеты/входы победителям
   */
  const issueOfflineEntries = useCallback(async (
    tournamentId: string,
    topPositions: number = 3,
    entriesPerPosition: number[] = [3, 2, 1]
  ): Promise<{
    success: boolean;
    tickets_issued?: number;
    total_entries?: number;
    tournament_name?: string;
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase.rpc('issue_offline_tickets_for_winners', {
        p_tournament_id: tournamentId,
        p_top_positions: topPositions,
        p_entries_per_position: entriesPerPosition
      });

      if (error) {
        console.error('Error issuing tickets:', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (result?.success) {
        toast.success(`Выдано ${result.total_entries} входов для ${result.tickets_issued} победителей`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in issueOfflineEntries:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Получить количество доступных входов игрока
   */
  const getPlayerAvailableEntries = useCallback(async (playerId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_player_available_entries', {
        p_player_id: playerId
      });

      if (error) {
        console.error('Error getting player entries:', error);
        return 0;
      }

      return data as number;
    } catch (err) {
      console.error('Error in getPlayerAvailableEntries:', err);
      return 0;
    }
  }, []);

  /**
   * Использовать вход игрока для офлайн турнира
   */
  const useOfflineEntry = useCallback(async (
    playerId: string,
    offlineTournamentId: string
  ): Promise<{
    success: boolean;
    ticket_id?: string;
    remaining_entries?: number;
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase.rpc('use_offline_entry', {
        p_player_id: playerId,
        p_offline_tournament_id: offlineTournamentId
      });

      if (error) {
        console.error('Error using entry:', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (result?.success) {
        toast.success(`Вход использован! Осталось: ${result.remaining_entries}`);
      }

      return result;
    } catch (err: any) {
      console.error('Error in useOfflineEntry:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Получить структуру выплат RPS
   */
  const getRPSPayoutStructure = useCallback((participantCount: number, totalRPSPool: number) => {
    let structure: { position: number; percentage: number; rpsPoints: number }[] = [];

    if (participantCount < 10) {
      structure = [
        { position: 1, percentage: 100, rpsPoints: totalRPSPool }
      ];
    } else if (participantCount < 20) {
      structure = [
        { position: 1, percentage: 60, rpsPoints: Math.round(totalRPSPool * 0.60) },
        { position: 2, percentage: 40, rpsPoints: Math.round(totalRPSPool * 0.40) }
      ];
    } else if (participantCount < 30) {
      structure = [
        { position: 1, percentage: 50, rpsPoints: Math.round(totalRPSPool * 0.50) },
        { position: 2, percentage: 30, rpsPoints: Math.round(totalRPSPool * 0.30) },
        { position: 3, percentage: 20, rpsPoints: Math.round(totalRPSPool * 0.20) }
      ];
    } else if (participantCount < 50) {
      structure = [
        { position: 1, percentage: 40, rpsPoints: Math.round(totalRPSPool * 0.40) },
        { position: 2, percentage: 30, rpsPoints: Math.round(totalRPSPool * 0.30) },
        { position: 3, percentage: 20, rpsPoints: Math.round(totalRPSPool * 0.20) },
        { position: 4, percentage: 10, rpsPoints: Math.round(totalRPSPool * 0.10) }
      ];
    } else {
      structure = [
        { position: 1, percentage: 35, rpsPoints: Math.round(totalRPSPool * 0.35) },
        { position: 2, percentage: 25, rpsPoints: Math.round(totalRPSPool * 0.25) },
        { position: 3, percentage: 15, rpsPoints: Math.round(totalRPSPool * 0.15) },
        { position: 4, percentage: 10, rpsPoints: Math.round(totalRPSPool * 0.10) },
        { position: 5, percentage: 8, rpsPoints: Math.round(totalRPSPool * 0.08) },
        { position: 6, percentage: 7, rpsPoints: Math.round(totalRPSPool * 0.07) }
      ];
    }

    return structure;
  }, []);

  /**
   * Получить структуру входов для призовых мест
   */
  const getEntriesStructure = useCallback((topPositions: number): number[] => {
    const structures: { [key: number]: number[] } = {
      1: [1],
      2: [2, 1],
      3: [3, 2, 1],
      4: [4, 3, 2, 1],
      5: [5, 4, 3, 2, 1],
      6: [5, 4, 3, 2, 1, 1]
    };
    return structures[topPositions] || structures[3];
  }, []);

  return {
    recordResult,
    eliminatePlayer,
    advanceLevel,
    processRebuy,
    processAddon,
    calculateRPSPool,
    calculatePrizePool,
    generatePayoutStructure,
    issueOfflineEntries,
    getPlayerAvailableEntries,
    useOfflineEntry,
    getRPSPayoutStructure,
    getEntriesStructure
  };
}
