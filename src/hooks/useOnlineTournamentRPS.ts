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
   * Получить структуру выплат RPS
   */
  const getRPSPayoutStructure = useCallback((participantCount: number, totalRPSPool: number) => {
    let structure: { position: number; percentage: number; rpsPoints: number }[] = [];

    if (participantCount <= 6) {
      structure = [
        { position: 1, percentage: 65, rpsPoints: Math.round(totalRPSPool * 0.65) },
        { position: 2, percentage: 35, rpsPoints: Math.round(totalRPSPool * 0.35) }
      ];
    } else if (participantCount <= 18) {
      structure = [
        { position: 1, percentage: 50, rpsPoints: Math.round(totalRPSPool * 0.50) },
        { position: 2, percentage: 30, rpsPoints: Math.round(totalRPSPool * 0.30) },
        { position: 3, percentage: 20, rpsPoints: Math.round(totalRPSPool * 0.20) }
      ];
    } else if (participantCount <= 30) {
      structure = [
        { position: 1, percentage: 40, rpsPoints: Math.round(totalRPSPool * 0.40) },
        { position: 2, percentage: 25, rpsPoints: Math.round(totalRPSPool * 0.25) },
        { position: 3, percentage: 15, rpsPoints: Math.round(totalRPSPool * 0.15) },
        { position: 4, percentage: 12, rpsPoints: Math.round(totalRPSPool * 0.12) },
        { position: 5, percentage: 8, rpsPoints: Math.round(totalRPSPool * 0.08) }
      ];
    } else if (participantCount <= 50) {
      structure = [
        { position: 1, percentage: 34, rpsPoints: Math.round(totalRPSPool * 0.34) },
        { position: 2, percentage: 23, rpsPoints: Math.round(totalRPSPool * 0.23) },
        { position: 3, percentage: 16.5, rpsPoints: Math.round(totalRPSPool * 0.165) },
        { position: 4, percentage: 11.9, rpsPoints: Math.round(totalRPSPool * 0.119) },
        { position: 5, percentage: 8, rpsPoints: Math.round(totalRPSPool * 0.08) },
        { position: 6, percentage: 6.6, rpsPoints: Math.round(totalRPSPool * 0.066) }
      ];
    } else {
      structure = [
        { position: 1, percentage: 31.7, rpsPoints: Math.round(totalRPSPool * 0.317) },
        { position: 2, percentage: 20.7, rpsPoints: Math.round(totalRPSPool * 0.207) },
        { position: 3, percentage: 15.3, rpsPoints: Math.round(totalRPSPool * 0.153) },
        { position: 4, percentage: 10.8, rpsPoints: Math.round(totalRPSPool * 0.108) },
        { position: 5, percentage: 7.2, rpsPoints: Math.round(totalRPSPool * 0.072) },
        { position: 6, percentage: 5.8, rpsPoints: Math.round(totalRPSPool * 0.058) },
        { position: 7, percentage: 4.6, rpsPoints: Math.round(totalRPSPool * 0.046) },
        { position: 8, percentage: 3.9, rpsPoints: Math.round(totalRPSPool * 0.039) }
      ];
    }

    return structure;
  }, []);

  return {
    recordResult,
    eliminatePlayer,
    advanceLevel,
    processRebuy,
    processAddon,
    calculateRPSPool,
    calculatePrizePool,
    getRPSPayoutStructure
  };
}
