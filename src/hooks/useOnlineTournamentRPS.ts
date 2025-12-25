import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RPSResult {
  success: boolean;
  position?: number;
  rps_earned?: number;
  elo_before?: number;
  elo_after?: number;
  elo_change?: number;
  prize_amount?: number;
  payout_percentage?: number;
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

/**
 * Хук для интеграции онлайн турниров с RPS рейтинговой системой
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

      const result = data as RPSResult;
      
      if (result.success && result.elo_change) {
        const changeText = result.elo_change > 0 ? `+${result.elo_change}` : result.elo_change;
        toast.success(`Позиция ${result.position}: RPS ${changeText}`);
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

      const result = data as EliminationResult;
      
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

      const result = data as LevelAdvanceResult;
      
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
   * Получить RPS пул турнира
   */
  const calculateRPSPool = useCallback((prizePool: number): number => {
    // 1000₽ = 100 RPS баллов (делим на 10)
    return Math.round(prizePool / 10);
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
    } else {
      structure = [
        { position: 1, percentage: 40, rpsPoints: Math.round(totalRPSPool * 0.40) },
        { position: 2, percentage: 25, rpsPoints: Math.round(totalRPSPool * 0.25) },
        { position: 3, percentage: 15, rpsPoints: Math.round(totalRPSPool * 0.15) },
        { position: 4, percentage: 12, rpsPoints: Math.round(totalRPSPool * 0.12) },
        { position: 5, percentage: 8, rpsPoints: Math.round(totalRPSPool * 0.08) }
      ];
    }

    return structure;
  }, []);

  return {
    recordResult,
    eliminatePlayer,
    advanceLevel,
    calculateRPSPool,
    getRPSPayoutStructure
  };
}
