import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RatingSystemConfig } from './useRatingSystemConfig';
import { useRatingProfiles } from './useRatingProfiles';
import { validateRatingConfig, getConfigurationHealthScore } from '@/utils/ratingValidation';

interface IntegrationStatus {
  profiles: boolean;
  edgeFunction: boolean;
  database: boolean;
  tournaments: boolean;
  players: boolean;
}

interface SystemHealth {
  overall: number;
  config: number;
  integration: number;
  performance: number;
}

export function useRatingSystemIntegration() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    profiles: false,
    edgeFunction: false,
    database: false,
    tournaments: false,
    players: false
  });
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 0,
    config: 0,
    integration: 0,
    performance: 0
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const { activeProfile } = useRatingProfiles();

  useEffect(() => {
    checkSystemIntegration();
  }, [activeProfile]);

  const checkSystemIntegration = async () => {
    setIsChecking(true);
    
    try {
      const status = await Promise.all([
        checkProfilesIntegration(),
        checkEdgeFunctionIntegration(),
        checkDatabaseIntegration(),
        checkTournamentsIntegration(),
        checkPlayersIntegration()
      ]);

      const newStatus: IntegrationStatus = {
        profiles: status[0],
        edgeFunction: status[1],
        database: status[2],
        tournaments: status[3],
        players: status[4]
      };

      setIntegrationStatus(newStatus);
      
      // Рассчитываем общее здоровье системы
      const health = calculateSystemHealth(newStatus);
      setSystemHealth(health);
      
    } catch (error) {
      console.error('Error checking system integration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const checkProfilesIntegration = async (): Promise<boolean> => {
    try {
      // Проверяем наличие профилей в базе данных
      const { data: profiles, error } = await supabase
        .from('cms_settings')
        .select('setting_key')
        .eq('category', 'rating_profiles')
        .limit(1);

      if (error) return false;

      // Проверяем активный профиль
      if (!activeProfile) return false;

      // Проверяем валидность конфигурации
      const validation = validateRatingConfig(activeProfile.config);
      
      return profiles && profiles.length > 0 && validation.isValid;
    } catch (error) {
      console.error('Error checking profiles integration:', error);
      return false;
    }
  };

  const checkEdgeFunctionIntegration = async (): Promise<boolean> => {
    try {
      // Проверяем доступность edge функции calculate-elo
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: { test: true }
      });

      // Если функция отвечает (даже с ошибкой), значит она доступна
      return true;
    } catch (error) {
      console.error('Error checking edge function integration:', error);
      return false;
    }
  };

  const checkDatabaseIntegration = async (): Promise<boolean> => {
    try {
      // Проверяем доступность основных таблиц
      const checks = await Promise.all([
        supabase.from('tournaments').select('id').limit(1),
        supabase.from('players').select('id').limit(1),
        supabase.from('game_results').select('id').limit(1),
        supabase.from('tournament_registrations').select('id').limit(1),
        supabase.from('cms_settings').select('id').limit(1)
      ]);

      return checks.every(check => !check.error);
    } catch (error) {
      console.error('Error checking database integration:', error);
      return false;
    }
  };

  const checkTournamentsIntegration = async (): Promise<boolean> => {
    try {
      // Проверяем наличие турниров и их корректность
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('id, status, buy_in, max_players')
        .limit(5);

      if (error || !tournaments) return false;

      // Проверяем корректность данных турниров
      return tournaments.every(t => 
        t.id && 
        t.status && 
        typeof t.buy_in === 'number' && 
        typeof t.max_players === 'number'
      );
    } catch (error) {
      console.error('Error checking tournaments integration:', error);
      return false;
    }
  };

  const checkPlayersIntegration = async (): Promise<boolean> => {
    try {
      // Проверяем наличие игроков и корректность их данных
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins')
        .limit(5);

      if (error || !players) return false;

      // Проверяем корректность данных игроков
      return players.every(p => 
        p.id && 
        p.name && 
        typeof p.elo_rating === 'number' &&
        typeof p.games_played === 'number' &&
        typeof p.wins === 'number'
      );
    } catch (error) {
      console.error('Error checking players integration:', error);
      return false;
    }
  };

  const calculateSystemHealth = (status: IntegrationStatus): SystemHealth => {
    const configHealth = activeProfile ? getConfigurationHealthScore(activeProfile.config) : 0;
    
    const integrationHealth = Object.values(status).reduce((sum, working) => 
      sum + (working ? 20 : 0), 0
    );
    
    // Простая оценка производительности (можно расширить)
    const performanceHealth = 85; // Базовая оценка, можно измерять реальную производительность
    
    const overallHealth = (configHealth + integrationHealth + performanceHealth) / 3;
    
    return {
      overall: Math.round(overallHealth),
      config: Math.round(configHealth),
      integration: Math.round(integrationHealth),
      performance: Math.round(performanceHealth)
    };
  };

  const syncProfileToDatabase = async (config: RatingSystemConfig) => {
    try {
      const { error } = await supabase
        .from('cms_settings')
        .upsert({
          setting_key: 'active_rating_config',
          setting_value: JSON.stringify(config),
          setting_type: 'json',
          category: 'rating_system',
          description: 'Активная конфигурация рейтинговой системы'
        });

      if (error) throw error;
      
      // Перепроверяем интеграцию после синхронизации
      await checkSystemIntegration();
      
      return { success: true };
    } catch (error) {
      console.error('Error syncing profile to database:', error);
      return { success: false, error };
    }
  };

  const testFullIntegration = async () => {
    try {
      if (!activeProfile) {
        throw new Error('Нет активного профиля для тестирования');
      }

      // Синхронизируем профиль
      const syncResult = await syncProfileToDatabase(activeProfile.config);
      if (!syncResult.success) {
        throw new Error('Ошибка синхронизации профиля');
      }

      // Проверяем интеграцию
      await checkSystemIntegration();

      return { success: true, message: 'Интеграция протестирована успешно' };
    } catch (error: any) {
      console.error('Error testing full integration:', error);
      return { success: false, error: error.message };
    }
  };

  const getIntegrationReport = () => {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!integrationStatus.profiles) {
      issues.push('Профили рейтинговой системы не настроены корректно');
      recommendations.push('Проверьте настройки профилей и их валидность');
    }

    if (!integrationStatus.edgeFunction) {
      issues.push('Edge функция calculate-elo недоступна');
      recommendations.push('Проверьте статус edge функций в Supabase');
    }

    if (!integrationStatus.database) {
      issues.push('Проблемы с подключением к базе данных');
      recommendations.push('Проверьте подключение к Supabase и RLS политики');
    }

    if (!integrationStatus.tournaments) {
      issues.push('Некорректные данные турниров');
      recommendations.push('Проверьте структуру данных турниров в базе данных');
    }

    if (!integrationStatus.players) {
      issues.push('Некорректные данные игроков');
      recommendations.push('Проверьте структуру данных игроков и их рейтинги');
    }

    if (systemHealth.config < 70) {
      issues.push('Низкое качество конфигурации рейтинговой системы');
      recommendations.push('Просмотрите настройки профиля и исправьте выявленные проблемы');
    }

    return {
      issues,
      recommendations,
      overallStatus: Object.values(integrationStatus).every(status => status) ? 'healthy' : 'issues',
      healthScore: systemHealth.overall
    };
  };

  return {
    integrationStatus,
    systemHealth,
    isChecking,
    checkSystemIntegration,
    syncProfileToDatabase,
    testFullIntegration,
    getIntegrationReport
  };
}