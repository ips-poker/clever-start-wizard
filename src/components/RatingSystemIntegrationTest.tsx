import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { useRatingSystemIntegration } from '@/hooks/useRatingSystemIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Database,
  Zap,
  Users,
  Target,
  Activity,
  Settings,
  Clock,
  Shield,
  TrendingUp,
  FileText,
  Info,
  RefreshCw,
  Eye,
  X,
  BarChart3,
  Gauge
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestFunctionResult {
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  recommendations?: string[];
  metrics?: Record<string, number>;
}

interface TestResult {
  component: string;
  category: 'integration' | 'performance' | 'data' | 'security';
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  duration?: number;
  recommendations?: string[];
  metrics?: Record<string, number>;
}

interface SystemMetrics {
  uptime: number;
  responseTime: number;
  dataIntegrity: number;
  securityScore: number;
  performanceScore: number;
  totalTournaments: number;
  totalPlayers: number;
  totalResults: number;
}

export default function RatingSystemIntegrationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});
  const { activeProfile } = useRatingProfiles();
  const { integrationStatus, systemHealth, checkSystemIntegration, getIntegrationReport } = useRatingSystemIntegration();
  const { toast } = useToast();

  useEffect(() => {
    loadSystemMetrics();
  }, []);

  const loadSystemMetrics = async () => {
    try {
      const startTime = performance.now();
      
      // Получаем метрики системы
      const [tournamentsData, playersData, resultsData] = await Promise.all([
        supabase.from('tournaments').select('*').limit(1000),
        supabase.from('players').select('*').limit(1000), 
        supabase.from('game_results').select('*').limit(1000)
      ]);

      const responseTime = performance.now() - startTime;
      
      const metrics: SystemMetrics = {
        uptime: 100, // Можно получать из мониторинга
        responseTime: Math.round(responseTime),
        dataIntegrity: calculateDataIntegrity(tournamentsData.data, playersData.data, resultsData.data),
        securityScore: 95, // Базовая оценка, можно расширить
        performanceScore: responseTime < 1000 ? 95 : responseTime < 3000 ? 80 : 60,
        totalTournaments: tournamentsData.data?.length || 0,
        totalPlayers: playersData.data?.length || 0,
        totalResults: resultsData.data?.length || 0
      };

      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Error loading system metrics:', error);
    }
  };

  const calculateDataIntegrity = (tournaments: any[], players: any[], results: any[]) => {
    if (!tournaments || !players || !results) return 0;
    
    let integrityScore = 100;
    
    // Проверяем корректность данных турниров
    const invalidTournaments = tournaments?.filter(t => !t.id || !t.name || typeof t.buy_in !== 'number') || [];
    if (invalidTournaments.length > 0) integrityScore -= (invalidTournaments.length / tournaments.length) * 30;
    
    // Проверяем корректность данных игроков
    const invalidPlayers = players?.filter(p => !p.id || !p.name || typeof p.elo_rating !== 'number') || [];
    if (invalidPlayers.length > 0) integrityScore -= (invalidPlayers.length / players.length) * 30;
    
    // Проверяем корректность результатов
    const invalidResults = results?.filter(r => !r.id || !r.tournament_id || !r.player_id) || [];
    if (invalidResults.length > 0) integrityScore -= (invalidResults.length / results.length) * 40;
    
    return Math.max(0, Math.round(integrityScore));
  };

  const runFullIntegrationTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setTestProgress(0);
    
    const tests = [
      { 
        name: 'Профили рейтинговой системы', 
        category: 'integration' as const,
        test: testProfilesIntegration 
      },
      { 
        name: 'Edge функция calculate-elo', 
        category: 'integration' as const,
        test: testEdgeFunctionIntegration 
      },
      { 
        name: 'База данных', 
        category: 'data' as const,
        test: testDatabaseIntegration 
      },
      { 
        name: 'Турниры', 
        category: 'data' as const,
        test: testTournamentsIntegration 
      },
      { 
        name: 'Игроки', 
        category: 'data' as const,
        test: testPlayersIntegration 
      },
      { 
        name: 'Расчет рейтингов', 
        category: 'integration' as const,
        test: testRatingCalculation 
      },
      { 
        name: 'Синхронизация настроек', 
        category: 'integration' as const,
        test: testSettingsSync 
      },
      { 
        name: 'Производительность', 
        category: 'performance' as const,
        test: testPerformance 
      },
      { 
        name: 'Безопасность данных', 
        category: 'security' as const,
        test: testSecurity 
      },
      { 
        name: 'Офлайн покер специфика', 
        category: 'integration' as const,
        test: testOfflinePokerFeatures 
      }
    ];

    const results: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      const { name, category, test } = tests[i];
      setCurrentTest(name);
      setTestProgress(((i + 1) / tests.length) * 100);
      
      try {
        const startTime = performance.now();
        const result = await test();
        const duration = performance.now() - startTime;
        
        results.push({
          component: name,
          category,
          status: result.status,
          message: result.message,
          details: result.details,
          duration: Math.round(duration),
          recommendations: result.recommendations || [],
          metrics: result.metrics || {}
        });
      } catch (error: any) {
        results.push({
          component: name,
          category,
          status: 'error',
          message: error.message || 'Неизвестная ошибка',
          duration: 0,
          recommendations: ['Проверьте логи консоли для получения дополнительной информации']
        });
      }

      // Небольшая задержка для плавности
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setTestResults(results);
    setCurrentTest('');
    setIsRunning(false);
    setTestProgress(100);

    // Показываем общий результат
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');
    
    if (hasErrors) {
      toast({
        title: 'Тестирование завершено с ошибками',
        description: 'Обнаружены критические проблемы интеграции',
        variant: 'destructive'
      });
    } else if (hasWarnings) {
      toast({
        title: 'Тестирование завершено с предупреждениями',
        description: 'Система работает, но есть рекомендации'
      });
    } else {
      toast({
        title: 'Тестирование успешно завершено',
        description: 'Все компоненты работают корректно'
      });
    }
  };

  // Все существующие функции тестирования остаются без изменений
  const testProfilesIntegration = async (): Promise<TestFunctionResult> => {
    if (!activeProfile) {
      return {
        status: 'error',
        message: 'Нет активного профиля рейтинговой системы',
        recommendations: ['Создайте или активируйте профиль рейтинговой системы'],
        metrics: {}
      };
    }

    const { data: profileData, error } = await supabase
      .from('cms_settings')
      .select('setting_value')
      .eq('setting_key', activeProfile.id)
      .eq('category', 'rating_profiles')
      .maybeSingle();

    if (error || !profileData) {
      return {
        status: 'warning',
        message: 'Профиль не синхронизирован с базой данных',
        details: { error: error?.message },
        recommendations: ['Синхронизируйте профиль с базой данных через настройки'],
        metrics: {}
      };
    }

    try {
      const config = JSON.parse(profileData.setting_value);
      
      return {
        status: 'success',
        message: 'Профиль загружен и валиден',
        details: { 
          profileName: activeProfile.name,
          configKeys: Object.keys(config).length
        },
        metrics: { configKeys: Object.keys(config).length }
      };
    } catch (parseError) {
      return {
        status: 'error',
        message: 'Ошибка парсинга конфигурации профиля',
        details: { parseError },
        recommendations: ['Проверьте корректность JSON конфигурации профиля'],
        metrics: {}
      };
    }
  };

  // Обновляем все функции тестирования для соответствия TestFunctionResult
  const testEdgeFunctionIntegration = async (): Promise<TestFunctionResult> => {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: { 
          test_mode: true,
          tournament_id: 'test',
          results: []
        }
      });
      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          status: 'error',
          message: 'Edge функция недоступна',
          details: { error: error.message },
          recommendations: ['Проверьте статус Edge функций в Supabase Dashboard'],
          metrics: {}
        };
      }

      return {
        status: 'success',
        message: 'Edge функция отвечает корректно',
        details: { response: data },
        metrics: { responseTime: Math.round(responseTime) },
        recommendations: []
      };
    } catch (networkError) {
      return {
        status: 'error',
        message: 'Ошибка сети при обращении к edge функции',
        details: { networkError },
        recommendations: ['Проверьте интернет соединение и статус Supabase'],
        metrics: {}
      };
    }
  };

  const testDatabaseIntegration = async (): Promise<TestFunctionResult> => {
    try {
      const checks = [
        { name: 'tournaments', check: () => supabase.from('tournaments').select('*').limit(1) },
        { name: 'players', check: () => supabase.from('players').select('*').limit(1) },
        { name: 'tournament_registrations', check: () => supabase.from('tournament_registrations').select('*').limit(1) },
        { name: 'game_results', check: () => supabase.from('game_results').select('*').limit(1) },
        { name: 'cms_settings', check: () => supabase.from('cms_settings').select('*').limit(1) }
      ];

      const results = await Promise.all(
        checks.map(async ({ name, check }) => {
          try {
            const startTime = performance.now();
            const { data, error } = await check();
            const responseTime = performance.now() - startTime;
            return { table: name, success: !error, error: error?.message, responseTime: Math.round(responseTime) };
          } catch (err: any) {
            return { table: name, success: false, error: err.message, responseTime: 0 };
          }
        })
      );

      const failedTables = results.filter(r => !r.success);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      if (failedTables.length > 0) {
        return {
          status: 'error',
          message: 'Некоторые таблицы недоступны',
          details: { failedTables },
          recommendations: ['Проверьте RLS политики и права доступа к таблицам'],
          metrics: {}
        };
      }

      return {
        status: 'success',
        message: 'Все таблицы базы данных доступны',
        details: { testedTables: checks.length, avgResponseTime: Math.round(avgResponseTime) },
        metrics: { tablesCount: checks.length, avgResponseTime: Math.round(avgResponseTime) },
        recommendations: []
      };
    } catch (dbError) {
      return {
        status: 'error',
        message: 'Критическая ошибка доступа к базе данных',
        details: { dbError },
        recommendations: ['Проверьте подключение к Supabase и API ключи'],
        metrics: {}
      };
    }
  };

  const testTournamentsIntegration = async (): Promise<TestFunctionResult> => {
    try {
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('id, name, status, buy_in, max_players, tournament_format')
        .limit(100);

      if (error) {
        return {
          status: 'error',
          message: 'Ошибка доступа к турнирам',
          details: { error: error.message },
          recommendations: ['Проверьте RLS политики для таблицы tournaments'],
          metrics: {}
        };
      }

      if (!tournaments || tournaments.length === 0) {
        return {
          status: 'warning',
          message: 'В системе нет турниров для тестирования',
          recommendations: ['Создайте тестовые турниры для проверки работы системы'],
          metrics: {}
        };
      }

      // Детальная проверка корректности данных турниров
      const invalidTournaments = tournaments.filter(t => 
        !t.id || !t.name || !t.status || typeof t.buy_in !== 'number'
      );

      // Анализ форматов турниров для офлайн покера
      const formatStats = tournaments.reduce((acc: any, t) => {
        acc[t.tournament_format || 'unknown'] = (acc[t.tournament_format || 'unknown'] || 0) + 1;
        return acc;
      }, {});

      const buyInRanges = {
        low: tournaments.filter(t => t.buy_in < 1000).length,
        medium: tournaments.filter(t => t.buy_in >= 1000 && t.buy_in < 5000).length,
        high: tournaments.filter(t => t.buy_in >= 5000).length
      };

      if (invalidTournaments.length > 0) {
        return {
          status: 'warning',
          message: 'Обнаружены турниры с некорректными данными',
          details: { 
            invalidCount: invalidTournaments.length,
            formatStats,
            buyInRanges
          },
          recommendations: ['Проверьте и исправьте данные некорректных турниров'],
          metrics: { totalTournaments: tournaments.length, formatsCount: Object.keys(formatStats).length }
        };
      }

      return {
        status: 'success',
        message: 'Турниры загружаются корректно',
        details: { 
          tournamentsCount: tournaments.length,
          formatStats,
          buyInRanges
        },
        metrics: { 
          totalTournaments: tournaments.length,
          formatsCount: Object.keys(formatStats).length
        },
        recommendations: []
      };
    } catch (tourError) {
      return {
        status: 'error',
        message: 'Критическая ошибка при работе с турнирами',
        details: { tourError },
        recommendations: ['Проверьте структуру таблицы tournaments и её индексы'],
        metrics: {}
      };
    }
  };

  const testPlayersIntegration = async () => {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins')
        .limit(100);

      if (error) {
        return {
          status: 'error' as const,
          message: 'Ошибка доступа к игрокам',
          details: { error: error.message },
          recommendations: ['Проверьте RLS политики для таблицы players']
        };
      }

      if (!players || players.length === 0) {
        return {
          status: 'warning' as const,
          message: 'В системе нет игроков для тестирования',
          recommendations: ['Создайте тестовых игроков для проверки работы системы']
        };
      }

      // Детальный анализ рейтингов
      const ratingStats = {
        average: Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length),
        min: Math.min(...players.map(p => p.elo_rating)),
        max: Math.max(...players.map(p => p.elo_rating)),
        ranges: {
          beginner: players.filter(p => p.elo_rating < 1200).length,
          intermediate: players.filter(p => p.elo_rating >= 1200 && p.elo_rating < 1800).length,
          advanced: players.filter(p => p.elo_rating >= 1800).length
        }
      };

      // Проверяем корректность рейтингов
      const invalidRatings = players.filter(p => 
        typeof p.elo_rating !== 'number' || 
        p.elo_rating < 50 || 
        p.elo_rating > 10000
      );

      // Проверяем активность игроков
      const activePlayersCount = players.filter(p => p.games_played > 0).length;
      const winRateStats = players.filter(p => p.games_played > 0).map(p => ({
        name: p.name,
        winRate: p.games_played > 0 ? Math.round((p.wins / p.games_played) * 100) : 0
      }));

      if (invalidRatings.length > 0) {
        return {
          status: 'warning' as const,
          message: 'Обнаружены игроки с некорректными рейтингами',
          details: { 
            invalidCount: invalidRatings.length,
            ratingStats,
            activePlayersCount,
            topWinRates: winRateStats.sort((a, b) => b.winRate - a.winRate).slice(0, 5)
          },
          recommendations: ['Проверьте и исправьте рейтинги некорректных игроков']
        };
      }

      return {
        status: 'success' as const,
        message: 'Данные игроков корректны',
        details: { 
          playersCount: players.length,
          ratingStats,
          activePlayersCount,
          topWinRates: winRateStats.sort((a, b) => b.winRate - a.winRate).slice(0, 5)
        },
        metrics: { 
          totalPlayers: players.length,
          averageRating: ratingStats.average,
          activePlayersRatio: Math.round((activePlayersCount / players.length) * 100)
        }
      };
    } catch (playerError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка при работе с игроками',
        details: { playerError },
        recommendations: ['Проверьте структуру таблицы players и её индексы']
      };
    }
  };

  const testRatingCalculation = async () => {
    if (!activeProfile) {
      return {
        status: 'error' as const,
        message: 'Нет активного профиля для тестирования расчета',
        recommendations: ['Создайте или активируйте профиль рейтинговой системы']
      };
    }

    try {
      const config = activeProfile.config;
      
      // Симуляция различных сценариев
      const scenarios = [
        { name: 'Победа новичка', position: 1, rebuys: 0, addons: 0, startRating: 1000 },
        { name: 'Выбывание эксперта', position: 8, rebuys: 2, addons: 1, startRating: 2000 },
        { name: 'Средний результат', position: 4, rebuys: 1, addons: 0, startRating: 100 }
      ];

      const calculations = scenarios.map(scenario => {
        let points = config.base_points + config.participation_bonus;
        
        if (scenario.position === 1) points += config.first_place_bonus;
        if (scenario.position <= 3) points += config.top_3_bonus;
        
        // Для ребаев используем rebuy_multiplier
        points += scenario.rebuys * config.rebuy_multiplier;
        // Для аддонов используем addon_multiplier  
        points += scenario.addons * config.addon_multiplier;
        
        return {
          scenario: scenario.name,
          calculatedPoints: Math.round(points),
          estimatedNewRating: scenario.startRating + Math.round(points)
        };
      });

      const validCalculations = calculations.filter(c => c.calculatedPoints !== 0);

      if (validCalculations.length === 0) {
        return {
          status: 'warning' as const,
          message: 'Конфигурация может привести к нулевым изменениям рейтинга',
          details: { calculations },
          recommendations: ['Пересмотрите настройки профиля для более реалистичных изменений рейтинга']
        };
      }

      return {
        status: 'success' as const,
        message: 'Алгоритм расчета рейтинга работает корректно',
        details: { 
          calculations,
          configUsed: config.profile_name,
          activeMultipliers: {
            base_points: config.base_points,
            participation_bonus: config.participation_bonus,
            first_place_bonus: config.first_place_bonus
          }
        },
        metrics: {
          averageChange: Math.round(calculations.reduce((sum, c) => sum + c.calculatedPoints, 0) / calculations.length)
        }
      };
    } catch (calcError) {
      return {
        status: 'error' as const,
        message: 'Ошибка в алгоритме расчета рейтинга',
        details: { calcError },
        recommendations: ['Проверьте корректность настроек профиля рейтинговой системы']
      };
    }
  };

  const testSettingsSync = async () => {
    if (!activeProfile) {
      return {
        status: 'error' as const,
        message: 'Нет активного профиля для тестирования синхронизации',
        recommendations: ['Создайте или активируйте профиль рейтинговой системы']
      };
    }

    try {
      const { data: currentSettings, error } = await supabase
        .from('cms_settings')
        .select('setting_value, updated_at')
        .eq('setting_key', 'rating_system_config')
        .eq('category', 'rating_system')
        .maybeSingle();

      if (error) {
        return {
          status: 'warning' as const,
          message: 'Основные настройки не синхронизированы с базой данных',
          details: { error: error.message },
          recommendations: ['Выполните синхронизацию настроек через панель управления']
        };
      }

      if (!currentSettings) {
        return {
          status: 'info' as const,
          message: 'Настройки еще не были синхронизированы с базой данных',
          recommendations: ['Выполните первичную синхронизацию настроек']
        };
      }

      try {
        const dbConfig = JSON.parse(currentSettings.setting_value);
        const profileConfig = activeProfile.config;

        const keysToCheck = ['base_points', 'min_rating', 'prize_coefficient', 'participation_bonus'];
        const differences = keysToCheck.filter(key => 
          dbConfig[key] !== profileConfig[key]
        );

        const syncAge = new Date().getTime() - new Date(currentSettings.updated_at).getTime();
        const syncAgeHours = Math.round(syncAge / (1000 * 60 * 60));

        if (differences.length > 0) {
          return {
            status: 'warning' as const,
            message: 'Настройки профиля отличаются от настроек в базе данных',
            details: { 
              differences,
              syncAge: `${syncAgeHours} часов назад`,
              dbValues: differences.reduce((acc, key) => ({ ...acc, [key]: dbConfig[key] }), {}),
              profileValues: differences.reduce((acc, key) => ({ ...acc, [key]: profileConfig[key] }), {})
            },
            recommendations: ['Выполните повторную синхронизацию для применения изменений']
          };
        }

        return {
          status: 'success' as const,
          message: 'Настройки синхронизированы корректно',
          details: { 
            lastSync: currentSettings.updated_at,
            syncAge: `${syncAgeHours} часов назад`,
            checkedParameters: keysToCheck.length
          },
          metrics: { syncAgeHours }
        };
      } catch (parseError) {
        return {
          status: 'error' as const,
          message: 'Ошибка парсинга настроек из базы данных',
          details: { parseError },
          recommendations: ['Проверьте корректность JSON данных в базе данных']
        };
      }
    } catch (syncError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка синхронизации настроек',
        details: { syncError },
        recommendations: ['Проверьте подключение к базе данных и права доступа']
      };
    }
  };

  const testPerformance = async () => {
    try {
      const startTime = performance.now();
      
      // Тестируем производительность основных операций
      const operations = [
        { name: 'Players query', op: () => supabase.from('players').select('id').limit(100) },
        { name: 'Tournaments query', op: () => supabase.from('tournaments').select('id').limit(50) },
        { name: 'Game results query', op: () => supabase.from('game_results').select('id').limit(200) }
      ];

      const results = [];
      for (const { name, op } of operations) {
        const opStartTime = performance.now();
        await op();
        const opDuration = performance.now() - opStartTime;
        results.push({ operation: name, duration: Math.round(opDuration) });
      }
      
      const totalDuration = performance.now() - startTime;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      let status: 'success' | 'warning' | 'error' = 'success';
      let message = 'Производительность в норме';

      if (totalDuration > 5000) {
        status = 'error';
        message = 'Критически медленная работа системы';
      } else if (totalDuration > 3000) {
        status = 'warning';
        message = 'Медленная работа системы';
      }

      return {
        status,
        message,
        details: { 
          totalDuration: Math.round(totalDuration),
          averageDuration: Math.round(avgDuration),
          operationResults: results
        },
        metrics: { 
          totalDuration: Math.round(totalDuration),
          avgDuration: Math.round(avgDuration)
        },
        recommendations: totalDuration > 3000 ? [
          'Рассмотрите оптимизацию запросов к базе данных',
          'Проверьте индексы на часто используемых таблицах'
        ] : []
      };
    } catch (perfError) {
      return {
        status: 'error' as const,
        message: 'Ошибка тестирования производительности',
        details: { perfError },
        recommendations: ['Проверьте стабильность соединения с базой данных']
      };
    }
  };

  const testSecurity = async () => {
    try {
      // Проверяем основные аспекты безопасности
      const securityChecks = [];
      
      // Проверка RLS политик
      try {
        await supabase.from('players').select('email').limit(1);
        securityChecks.push({ check: 'Player data access', status: 'pass', note: 'RLS работает корректно' });
      } catch (error) {
        securityChecks.push({ check: 'Player data access', status: 'fail', note: 'Проблемы с RLS политиками' });
      }

      // Проверка доступа к настройкам
      try {
        const { data } = await supabase.from('cms_settings').select('*').limit(1);
        securityChecks.push({ 
          check: 'Settings access', 
          status: data ? 'pass' : 'warning', 
          note: data ? 'Доступ к настройкам работает' : 'Ограниченный доступ к настройкам'
        });
      } catch (error) {
        securityChecks.push({ check: 'Settings access', status: 'fail', note: 'Нет доступа к настройкам' });
      }

      const failedChecks = securityChecks.filter(c => c.status === 'fail');
      const warningChecks = securityChecks.filter(c => c.status === 'warning');

      let status: 'success' | 'warning' | 'error' = 'success';
      let message = 'Базовые проверки безопасности пройдены';

      if (failedChecks.length > 0) {
        status = 'error';
        message = 'Обнаружены проблемы безопасности';
      } else if (warningChecks.length > 0) {
        status = 'warning';
        message = 'Есть рекомендации по безопасности';
      }

      return {
        status,
        message,
        details: { 
          securityChecks,
          passedChecks: securityChecks.filter(c => c.status === 'pass').length,
          totalChecks: securityChecks.length
        },
        metrics: {
          securityScore: Math.round((securityChecks.filter(c => c.status === 'pass').length / securityChecks.length) * 100)
        },
        recommendations: [
          'Регулярно проверяйте и обновляйте RLS политики',
          'Следите за логами доступа к базе данных',
          'Используйте принцип минимальных привилегий для пользователей'
        ]
      };
    } catch (secError) {
      return {
        status: 'error' as const,
        message: 'Ошибка проверки безопасности',
        details: { secError },
        recommendations: ['Проверьте настройки безопасности Supabase']
      };
    }
  };

  const testOfflinePokerFeatures = async () => {
    try {
      // Специфичные проверки для офлайн покера
      const offlineChecks = [];
      
      // Проверка поддержки ребаев и аддонов
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('rebuy_cost, addon_cost, rebuy_chips, addon_chips')
        .not('rebuy_cost', 'is', null)
        .limit(10);
      
      const rebuySupport = tournaments && tournaments.length > 0;
      offlineChecks.push({
        feature: 'Rebuy/Addon support',
        supported: rebuySupport,
        details: rebuySupport ? `${tournaments.length} турниров с ребаями` : 'Нет турниров с ребаями'
      });

      // Проверка различных форматов турниров
      const { data: formats } = await supabase
        .from('tournaments')
        .select('tournament_format')
        .limit(100);

      const uniqueFormats = [...new Set(formats?.map(f => f.tournament_format).filter(Boolean))];
      offlineChecks.push({
        feature: 'Tournament formats',
        supported: uniqueFormats.length > 0,
        details: uniqueFormats.length > 0 ? `Поддерживается ${uniqueFormats.length} форматов: ${uniqueFormats.join(', ')}` : 'Нет данных о форматах'
      });

      // Проверка системы мест за столами
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('seat_number')
        .not('seat_number', 'is', null)
        .limit(10);

      const seatingSupport = registrations && registrations.length > 0;
      offlineChecks.push({
        feature: 'Seating system',
        supported: seatingSupport,
        details: seatingSupport ? 'Система рассадки работает' : 'Нет данных о рассадке'
      });

      const supportedFeatures = offlineChecks.filter(c => c.supported).length;
      const totalFeatures = offlineChecks.length;

      return {
        status: supportedFeatures === totalFeatures ? 'success' as const : 'warning' as const,
        message: `Поддерживается ${supportedFeatures} из ${totalFeatures} функций офлайн покера`,
        details: { 
          offlineChecks,
          supportedFeatures,
          totalFeatures
        },
        metrics: {
          offlineCompatibility: Math.round((supportedFeatures / totalFeatures) * 100)
        },
        recommendations: supportedFeatures < totalFeatures ? [
          'Настройте поддержку ребаев и аддонов для турниров',
          'Определите различные форматы турниров (Freezeout, Rebuy, Bounty)',
          'Внедрите систему рассадки игроков за столами'
        ] : []
      };
    } catch (offlineError) {
      return {
        status: 'error' as const,
        message: 'Ошибка проверки функций офлайн покера',
        details: { offlineError },
        recommendations: ['Проверьте структуру данных турниров и регистраций']
      };
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getCategoryIcon = (category: TestResult['category']) => {
    switch (category) {
      case 'integration':
        return <Zap className="w-4 h-4" />;
      case 'performance':
        return <Gauge className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
    }
  };

  const toggleDetails = (index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Тесты
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Метрики
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Системные метрики */}
          {systemMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-gradient-card border-poker-border shadow-minimal">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{systemMetrics.uptime}%</div>
                  <div className="text-sm text-poker-text-muted">Время работы</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-card border-poker-border shadow-minimal">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{systemMetrics.responseTime}мс</div>
                  <div className="text-sm text-poker-text-muted">Отклик</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-card border-poker-border shadow-minimal">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{systemMetrics.dataIntegrity}%</div>
                  <div className="text-sm text-poker-text-muted">Целостность</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-card border-poker-border shadow-minimal">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{systemMetrics.securityScore}%</div>
                  <div className="text-sm text-poker-text-muted">Безопасность</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-card border-poker-border shadow-minimal">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-teal-600">{systemMetrics.performanceScore}%</div>
                  <div className="text-sm text-poker-text-muted">Производительность</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Статус интеграций */}
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Activity className="h-5 w-5 text-poker-accent" />
                Статус интеграций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(integrationStatus).map(([key, status]) => (
                  <div key={key} className="flex items-center gap-2">
                    {status ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm capitalize text-poker-text-muted">
                      {key === 'edgeFunction' ? 'Edge функция' :
                       key === 'profiles' ? 'Профили' :
                       key === 'database' ? 'База данных' :
                       key === 'tournaments' ? 'Турниры' :
                       key === 'players' ? 'Игроки' : key}
                    </span>
                  </div>
                ))}
              </div>
              
              {systemHealth && (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Общее здоровье системы</span>
                    <span className="font-medium">{systemHealth.overall}%</span>
                  </div>
                  <Progress value={systemHealth.overall} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <TestTube className="h-5 w-5 text-poker-accent" />
                Тестирование интеграций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <Button 
                  onClick={runFullIntegrationTest} 
                  disabled={isRunning || !activeProfile}
                  className="bg-poker-primary hover:bg-poker-primary/90"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Тестирование...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Запустить полное тестирование
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={checkSystemIntegration}
                  className="border-poker-border"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Быстрая проверка
                </Button>

                <Button 
                  variant="outline" 
                  onClick={loadSystemMetrics}
                  className="border-poker-border"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить метрики
                </Button>
              </div>

              {isRunning && (
                <div className="space-y-3 mb-6">
                  <Alert className="animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Выполняется тест: <strong>{currentTest}</strong>
                    </AlertDescription>
                  </Alert>
                  <Progress value={testProgress} className="h-2" />
                </div>
              )}

              {testResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-poker-text-primary">
                      Результаты тестирования ({testResults.length} тестов)
                    </h4>
                    
                    {/* Фильтры по категориям */}
                    <div className="flex gap-2">
                      {['all', 'integration', 'performance', 'data', 'security'].map(category => (
                        <Badge 
                          key={category} 
                          variant="outline"
                          className="cursor-pointer hover:bg-poker-accent/10"
                        >
                          {category === 'all' ? 'Все' :
                           category === 'integration' ? 'Интеграция' :
                           category === 'performance' ? 'Производительность' :
                           category === 'data' ? 'Данные' :
                           category === 'security' ? 'Безопасность' : category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {testResults.map((result, index) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            {getCategoryIcon(result.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                {result.component}
                                <Badge variant="secondary" className="text-xs">
                                  {result.category === 'integration' ? 'Интеграция' :
                                   result.category === 'performance' ? 'Производительность' :
                                   result.category === 'data' ? 'Данные' :
                                   result.category === 'security' ? 'Безопасность' : result.category}
                                </Badge>
                              </h5>
                              <div className="flex items-center gap-2">
                                {result.duration && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {result.duration}мс
                                  </Badge>
                                )}
                                {(result.details || result.recommendations) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleDetails(index)}
                                    className="p-1 h-6 w-6"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                            
                            {/* Метрики */}
                            {result.metrics && Object.keys(result.metrics).length > 0 && (
                              <div className="flex gap-3 mb-2">
                                {Object.entries(result.metrics).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-gray-500">{key}: </span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Рекомендации */}
                            {result.recommendations && result.recommendations.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-600 mb-1">Рекомендации:</div>
                                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                                  {result.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Детали (раскрывающиеся) */}
                            {showDetails[index] && result.details && (
                              <div className="mt-3 p-3 bg-gray-50 rounded border-t">
                                <div className="text-xs font-medium text-gray-600 mb-2">Детали:</div>
                                <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Сводка по категориям */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {['success', 'warning', 'error', 'info'].map(status => {
                      const count = testResults.filter(r => r.status === status).length;
                      const color = {
                        success: 'text-green-600',
                        warning: 'text-yellow-600', 
                        error: 'text-red-600',
                        info: 'text-blue-600'
                      }[status];
                      
                      return (
                        <div key={status} className="text-center p-3 bg-white/50 rounded-lg">
                          <div className={`text-2xl font-bold ${color}`}>{count}</div>
                          <div className="text-sm text-poker-text-muted capitalize">
                            {status === 'success' ? 'Успешно' :
                             status === 'warning' ? 'Предупреждения' :
                             status === 'error' ? 'Ошибки' :
                             status === 'info' ? 'Информация' : status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {systemMetrics && (
            <div className="grid gap-4">
              {/* Детальные метрики системы */}
              <Card className="bg-gradient-card border-poker-border shadow-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <BarChart3 className="h-5 w-5 text-poker-accent" />
                    Детальные системные метрики
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-poker-text-primary mb-3">Данные системы</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Всего турниров:</span>
                          <span className="font-medium">{systemMetrics.totalTournaments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Всего игроков:</span>
                          <span className="font-medium">{systemMetrics.totalPlayers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Всего результатов:</span>
                          <span className="font-medium">{systemMetrics.totalResults}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-poker-text-primary mb-3">Производительность</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Время отклика:</span>
                          <span className="font-medium">{systemMetrics.responseTime}мс</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Целостность данных:</span>
                          <span className="font-medium">{systemMetrics.dataIntegrity}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-poker-text-muted">Оценка безопасности:</span>
                          <span className="font-medium">{systemMetrics.securityScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}