import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingSystemConfig } from './useRatingSystemConfig';
import { 
  AdvancedPokerRatingSystem, 
  AdaptiveRatingSystem, 
  RatingStatistics,
  AdvancedRatingParams,
  AdvancedRatingResult
} from '@/utils/advancedRatingAlgorithms';

interface PlayerHistory {
  playerId: string;
  recentResults: number[];
  varianceHistory: number[];
  opponentRatings: number[];
  gamesPlayed: number;
  winRate: number;
  roi: number;
  avgFieldSize: number;
  avgBuyIn: number;
}

interface RatingPrediction {
  predictedRating: number;
  confidence: number;
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface SystemMetrics {
  totalCalculations: number;
  avgCalculationTime: number;
  accuracyRate: number;
  systemLoad: number;
  cacheHitRate: number;
}

export function useAdvancedRatingSystem() {
  const { config } = useRatingSystemConfig();
  const [ratingSystem, setRatingSystem] = useState<AdvancedPokerRatingSystem | null>(null);
  const [adaptiveSystem] = useState(new AdaptiveRatingSystem());
  const [statistics] = useState(new RatingStatistics());
  
  const [playerHistories, setPlayerHistories] = useState<Map<string, PlayerHistory>>(new Map());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalCalculations: 0,
    avgCalculationTime: 0,
    accuracyRate: 0,
    systemLoad: 0,
    cacheHitRate: 0
  });
  
  const [ratingCache, setRatingCache] = useState<Map<string, AdvancedRatingResult>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (config) {
      setRatingSystem(new AdvancedPokerRatingSystem(config));
    }
  }, [config]);

  // Загрузка истории игрока
  const loadPlayerHistory = useCallback(async (playerId: string): Promise<PlayerHistory | null> => {
    try {
      // Получаем последние результаты игрока
      const { data: gameResults } = await supabase
        .from('game_results')
        .select(`
          position,
          elo_change,
          tournament_id,
          tournaments (
            name,
            buy_in,
            max_players,
            tournament_registrations (
              player_id,
              players (
                elo_rating
              )
            )
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!gameResults || gameResults.length === 0) return null;

      // Анализ результатов
      const recentResults = gameResults.slice(0, 20).map(r => r.position);
      const varianceHistory = gameResults.map(r => r.elo_change);
      
      // Средние рейтинги оппонентов
      const opponentRatings: number[] = [];
      gameResults.forEach(result => {
        if (result.tournaments?.tournament_registrations) {
          const opponents = result.tournaments.tournament_registrations
            .filter(reg => reg.player_id !== playerId)
            .map(reg => reg.players?.elo_rating || 100);
          
          if (opponents.length > 0) {
            const avgOpponentRating = opponents.reduce((sum, rating) => sum + rating, 0) / opponents.length;
            opponentRatings.push(avgOpponentRating);
          }
        }
      });

      const wins = gameResults.filter(r => r.position === 1).length;
      const totalBuyIns = gameResults.reduce((sum, r) => sum + (r.tournaments?.buy_in || 0), 0);
      const totalPrizes = gameResults.reduce((sum, r) => {
        // Примерный расчет призовых на основе позиции
        const maxPlayers = r.tournaments?.max_players || 100;
        const buyIn = r.tournaments?.buy_in || 0;
        if (r.position <= Math.ceil(maxPlayers * 0.15)) { // ITM
          return sum + buyIn * 2; // Упрощенный расчет
        }
        return sum;
      }, 0);

      const history: PlayerHistory = {
        playerId,
        recentResults,
        varianceHistory,
        opponentRatings,
        gamesPlayed: gameResults.length,
        winRate: wins / gameResults.length,
        roi: totalBuyIns > 0 ? (totalPrizes - totalBuyIns) / totalBuyIns : 0,
        avgFieldSize: gameResults.reduce((sum, r) => sum + (r.tournaments?.max_players || 0), 0) / gameResults.length,
        avgBuyIn: totalBuyIns / gameResults.length
      };

      setPlayerHistories(prev => new Map(prev).set(playerId, history));
      return history;
    } catch (error) {
      console.error('Error loading player history:', error);
      return null;
    }
  }, []);

  // Расширенный расчет рейтинга с кешированием
  const calculateAdvancedRating = useCallback(async (
    params: AdvancedRatingParams & { playerId: string }
  ): Promise<AdvancedRatingResult> => {
    const startTime = Date.now();
    setIsCalculating(true);

    try {
      // Проверяем кеш
      const cacheKey = `${params.playerId}_${params.position}_${params.totalPlayers}_${params.buyIn}`;
      const cached = ratingCache.get(cacheKey);
      
      if (cached) {
        setSystemMetrics(prev => ({
          ...prev,
          cacheHitRate: prev.cacheHitRate + 0.1
        }));
        return cached;
      }

      if (!ratingSystem) {
        throw new Error('Rating system not initialized');
      }

      // Загружаем историю игрока
      const history = await loadPlayerHistory(params.playerId);
      
      // Дополняем параметры данными из истории
      const enhancedParams: AdvancedRatingParams = {
        ...params,
        varianceHistory: history?.varianceHistory || [],
        averageOpponentRating: history?.opponentRatings.length 
          ? history.opponentRatings.reduce((sum, r) => sum + r, 0) / history.opponentRatings.length
          : undefined,
        fieldStrength: history ? history.avgFieldSize / 100 : undefined,
        confidenceFactor: history ? Math.min(1, history.gamesPlayed / 20) : 0.5
      };

      // Основной расчет
      let result = ratingSystem.calculateAdvancedRating(enhancedParams);

      // Адаптивные корректировки
      if (history && history.recentResults.length >= 5) {
        const adaptedRating = adaptiveSystem.adaptRatingBasedOnHistory(
          result.newRating,
          history.recentResults,
          history.opponentRatings
        );
        
        result = {
          ...result,
          newRating: adaptedRating,
          ratingChange: adaptedRating - params.currentRating
        };
      }

      // Проверяем статистическую значимость
      if (history) {
        const significance = statistics.calculateSignificance(
          params.currentRating,
          result.newRating,
          history.varianceHistory.length > 0 
            ? history.varianceHistory.reduce((sum, v) => sum + Math.pow(v, 2), 0) / history.varianceHistory.length
            : 100,
          history.gamesPlayed
        );

        result.confidenceLevel = significance.confidenceLevel;
      }

      // Кешируем результат
      setRatingCache(prev => new Map(prev).set(cacheKey, result));

      // Обновляем метрики
      const calculationTime = Date.now() - startTime;
      setSystemMetrics(prev => ({
        ...prev,
        totalCalculations: prev.totalCalculations + 1,
        avgCalculationTime: (prev.avgCalculationTime + calculationTime) / 2,
        systemLoad: Math.min(100, prev.systemLoad + 1)
      }));

      return result;

    } finally {
      setIsCalculating(false);
    }
  }, [ratingSystem, adaptiveSystem, statistics, ratingCache, loadPlayerHistory]);

  // Предсказание рейтинга для будущих турниров
  const predictRating = useCallback(async (
    playerId: string,
    tournamentParams: {
      expectedPosition: number;
      totalPlayers: number;
      buyIn: number;
      fieldStrength?: number;
    }
  ): Promise<RatingPrediction> => {
    const history = await loadPlayerHistory(playerId);
    
    if (!history || !ratingSystem) {
      return {
        predictedRating: 100,
        confidence: 0.3,
        factors: ['Недостаточно данных для прогноза'],
        riskLevel: 'high'
      };
    }

    // Получаем текущий рейтинг игрока
    const { data: player } = await supabase
      .from('players')
      .select('elo_rating')
      .eq('id', playerId)
      .single();

    const currentRating = player?.elo_rating || 100;

    // Симулируем результат
    const simulatedParams: AdvancedRatingParams = {
      position: tournamentParams.expectedPosition,
      totalPlayers: tournamentParams.totalPlayers,
      currentRating,
      rebuys: Math.round(history.avgBuyIn / 1000), // Примерная оценка
      addons: 1,
      prizeAmount: tournamentParams.expectedPosition <= Math.ceil(tournamentParams.totalPlayers * 0.15) 
        ? tournamentParams.buyIn * 2 : 0,
      totalPrizePool: tournamentParams.buyIn * tournamentParams.totalPlayers,
      buyIn: tournamentParams.buyIn,
      payoutStructure: Array.from({ length: Math.ceil(tournamentParams.totalPlayers * 0.15) }, (_, i) => i + 1),
      tournamentDuration: 4 * 3600, // 4 часа
      varianceHistory: history.varianceHistory,
      averageOpponentRating: history.opponentRatings.length > 0
        ? history.opponentRatings.reduce((sum, r) => sum + r, 0) / history.opponentRatings.length
        : currentRating,
      fieldStrength: tournamentParams.fieldStrength || history.avgFieldSize / 100,
      confidenceFactor: Math.min(1, history.gamesPlayed / 20)
    };

    const result = ratingSystem.calculateAdvancedRating(simulatedParams);

    // Анализ факторов
    const factors: string[] = [];
    if (history.winRate > 0.15) factors.push('Высокий винрейт');
    if (history.roi > 0.2) factors.push('Положительный ROI');
    if (history.gamesPlayed < 10) factors.push('Мало игр в истории');
    if (tournamentParams.buyIn > history.avgBuyIn * 2) factors.push('Высокий бай-ин для игрока');
    if (tournamentParams.totalPlayers > history.avgFieldSize * 1.5) factors.push('Большое поле');

    // Оценка риска
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    const variance = history.varianceHistory.length > 0 
      ? Math.sqrt(history.varianceHistory.reduce((sum, v) => sum + Math.pow(v, 2), 0) / history.varianceHistory.length)
      : 50;

    if (variance < 30 && history.gamesPlayed > 20) riskLevel = 'low';
    if (variance > 100 || history.gamesPlayed < 5) riskLevel = 'high';

    return {
      predictedRating: result.newRating,
      confidence: result.confidenceLevel,
      factors,
      riskLevel
    };
  }, [ratingSystem, loadPlayerHistory]);

  // Массовый пересчет рейтингов с оптимизацией
  const recalculateAllRatings = useCallback(async (tournamentId: string) => {
    setIsCalculating(true);
    
    try {
      // Получаем всех участников турнира
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          position,
          final_position,
          rebuys,
          addons,
          tournaments (
            buy_in,
            max_players,
            tournament_payouts (
              place,
              amount
            )
          ),
          players (
            elo_rating
          )
        `)
        .eq('tournament_id', tournamentId)
        .not('final_position', 'is', null);

      if (!registrations || registrations.length === 0) {
        throw new Error('No tournament results found');
      }

      const tournament = registrations[0].tournaments;
      const payouts = tournament?.tournament_payouts || [];
      
      // Пакетный расчет рейтингов
      const ratingUpdates = await Promise.all(
        registrations.map(async (reg) => {
          const prizeAmount = payouts.find(p => p.place === reg.final_position)?.amount || 0;
          
          const result = await calculateAdvancedRating({
            playerId: reg.player_id,
            position: reg.final_position || reg.position || registrations.length,
            totalPlayers: tournament?.max_players || registrations.length,
            currentRating: reg.players?.elo_rating || 100,
            rebuys: reg.rebuys || 0,
            addons: reg.addons || 0,
            prizeAmount,
            totalPrizePool: (tournament?.buy_in || 0) * registrations.length,
            buyIn: tournament?.buy_in || 0,
            payoutStructure: payouts.map(p => p.place),
            tournamentDuration: 4 * 3600
          });

          return {
            player_id: reg.player_id,
            old_rating: reg.players?.elo_rating || 100,
            new_rating: result.newRating,
            rating_change: result.ratingChange,
            confidence: result.confidenceLevel
          };
        })
      );

      // Обновляем рейтинги в базе данных
      for (const update of ratingUpdates) {
        await supabase
          .from('players')
          .update({ elo_rating: update.new_rating })
          .eq('id', update.player_id);
      }

      return {
        success: true,
        updatedPlayers: ratingUpdates.length,
        updates: ratingUpdates
      };

    } catch (error: any) {
      console.error('Error recalculating ratings:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsCalculating(false);
    }
  }, [calculateAdvancedRating]);

  // Анализ аномалий в рейтингах
  const detectRatingAnomalies = useCallback(async () => {
    try {
      const { data: players } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played')
        .gte('games_played', 5);

      if (!players) return [];

      const ratings = players.map(p => p.elo_rating);
      const anomalies = statistics.detectAnomalies(ratings);

      return players
        .filter(p => anomalies.includes(p.elo_rating))
        .map(p => ({
          ...p,
          anomalyType: p.elo_rating > 2500 ? 'high' : 'low'
        }));

    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }, [statistics]);

  // Очистка кеша
  const clearCache = useCallback(() => {
    setRatingCache(new Map());
    setPlayerHistories(new Map());
    setSystemMetrics(prev => ({
      ...prev,
      cacheHitRate: 0
    }));
  }, []);

  return {
    calculateAdvancedRating,
    predictRating,
    recalculateAllRatings,
    detectRatingAnomalies,
    loadPlayerHistory,
    clearCache,
    isCalculating,
    systemMetrics,
    playerHistories: Array.from(playerHistories.values()),
    cacheSize: ratingCache.size
  };
}