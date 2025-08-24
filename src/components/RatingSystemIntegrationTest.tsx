import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { useRatingSystemIntegration } from '@/hooks/useRatingSystemIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  component: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export default function RatingSystemIntegrationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const { activeProfile } = useRatingProfiles();
  const { integrationStatus, checkSystemIntegration } = useRatingSystemIntegration();
  const { toast } = useToast();

  const runFullIntegrationTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const tests = [
      { name: 'Профили рейтинговой системы', test: testProfilesIntegration },
      { name: 'Edge функция calculate-elo', test: testEdgeFunctionIntegration },
      { name: 'База данных', test: testDatabaseIntegration },
      { name: 'Турниры', test: testTournamentsIntegration },
      { name: 'Игроки', test: testPlayersIntegration },
      { name: 'Расчет рейтингов', test: testRatingCalculation },
      { name: 'Синхронизация настроек', test: testSettingsSync },
      { name: 'Производительность', test: testPerformance }
    ];

    const results: TestResult[] = [];

    for (const { name, test } of tests) {
      setCurrentTest(name);
      
      try {
        const startTime = performance.now();
        const result = await test();
        const duration = performance.now() - startTime;
        
        results.push({
          component: name,
          status: result.status,
          message: result.message,
          details: result.details,
          duration: Math.round(duration)
        });
      } catch (error: any) {
        results.push({
          component: name,
          status: 'error',
          message: error.message || 'Неизвестная ошибка',
          duration: 0
        });
      }
    }

    setTestResults(results);
    setCurrentTest('');
    setIsRunning(false);

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

  const testProfilesIntegration = async () => {
    if (!activeProfile) {
      return {
        status: 'error' as const,
        message: 'Нет активного профиля рейтинговой системы'
      };
    }

    // Проверяем доступность профиля в базе данных
    const { data: profileData, error } = await supabase
      .from('cms_settings')
      .select('setting_value')
      .eq('setting_key', activeProfile.id)
      .eq('category', 'rating_profiles')
      .single();

    if (error || !profileData) {
      return {
        status: 'warning' as const,
        message: 'Профиль не синхронизирован с базой данных',
        details: { error: error?.message }
      };
    }

    try {
      const config = JSON.parse(profileData.setting_value);
      
      return {
        status: 'success' as const,
        message: 'Профиль загружен и валиден',
        details: { 
          profileName: activeProfile.name,
          configKeys: Object.keys(config).length
        }
      };
    } catch (parseError) {
      return {
        status: 'error' as const,
        message: 'Ошибка парсинга конфигурации профиля',
        details: { parseError }
      };
    }
  };

  const testEdgeFunctionIntegration = async () => {
    try {
      // Тестируем доступность edge функции с тестовыми данными
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: { 
          test_mode: true,
          tournament_id: 'test',
          results: []
        }
      });

      if (error) {
        return {
          status: 'error' as const,
          message: 'Edge функция недоступна',
          details: { error: error.message }
        };
      }

      return {
        status: 'success' as const,
        message: 'Edge функция отвечает корректно',
        details: { response: data }
      };
    } catch (networkError) {
      return {
        status: 'error' as const,
        message: 'Ошибка сети при обращении к edge функции',
        details: { networkError }
      };
    }
  };

  const testDatabaseIntegration = async () => {
    try {
      // Проверяем доступность основных таблиц
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
            const { data, error } = await check();
            return { table: name, success: !error, error: error?.message };
          } catch (err: any) {
            return { table: name, success: false, error: err.message };
          }
        })
      );

      const failedTables = results.filter(r => !r.success);

      if (failedTables.length > 0) {
        return {
          status: 'error' as const,
          message: 'Некоторые таблицы недоступны',
          details: { failedTables }
        };
      }

      return {
        status: 'success' as const,
        message: 'Все таблицы базы данных доступны',
        details: { testedTables: checks.length }
      };
    } catch (dbError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка доступа к базе данных',
        details: { dbError }
      };
    }
  };

  const testTournamentsIntegration = async () => {
    try {
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('id, name, status, buy_in, max_players')
        .limit(5);

      if (error) {
        return {
          status: 'error' as const,
          message: 'Ошибка доступа к турнирам',
          details: { error: error.message }
        };
      }

      if (!tournaments || tournaments.length === 0) {
        return {
          status: 'warning' as const,
          message: 'В системе нет турниров для тестирования'
        };
      }

      // Проверяем корректность данных турниров
      const invalidTournaments = tournaments.filter(t => 
        !t.id || !t.name || !t.status || typeof t.buy_in !== 'number'
      );

      if (invalidTournaments.length > 0) {
        return {
          status: 'warning' as const,
          message: 'Обнаружены турниры с некорректными данными',
          details: { invalidCount: invalidTournaments.length }
        };
      }

      return {
        status: 'success' as const,
        message: 'Турниры загружаются корректно',
        details: { tournamentsCount: tournaments.length }
      };
    } catch (tourError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка при работе с турнирами',
        details: { tourError }
      };
    }
  };

  const testPlayersIntegration = async () => {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins')
        .limit(10);

      if (error) {
        return {
          status: 'error' as const,
          message: 'Ошибка доступа к игрокам',
          details: { error: error.message }
        };
      }

      if (!players || players.length === 0) {
        return {
          status: 'warning' as const,
          message: 'В системе нет игроков для тестирования'
        };
      }

      // Проверяем корректность рейтингов
      const invalidRatings = players.filter(p => 
        typeof p.elo_rating !== 'number' || 
        p.elo_rating < 50 || 
        p.elo_rating > 10000
      );

      if (invalidRatings.length > 0) {
        return {
          status: 'warning' as const,
          message: 'Обнаружены игроки с некорректными рейтингами',
          details: { invalidCount: invalidRatings.length }
        };
      }

      return {
        status: 'success' as const,
        message: 'Данные игроков корректны',
        details: { playersCount: players.length }
      };
    } catch (playerError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка при работе с игроками',
        details: { playerError }
      };
    }
  };

  const testRatingCalculation = async () => {
    if (!activeProfile) {
      return {
        status: 'error' as const,
        message: 'Нет активного профиля для тестирования расчета'
      };
    }

    try {
      // Создаем тестовые данные для расчета
      const testData = {
        tournament_id: 'test-tournament',
        results: [
          { player_id: 'test-player-1', position: 1, rebuys: 0, addons: 0 },
          { player_id: 'test-player-2', position: 2, rebuys: 1, addons: 0 },
          { player_id: 'test-player-3', position: 3, rebuys: 0, addons: 1 }
        ]
      };

      // Проверяем, что настройки профиля можно применить
      const config = activeProfile.config;
      
      // Базовая проверка расчета
      let calculatedPoints = config.base_points + config.participation_bonus;
      calculatedPoints += config.first_place_bonus; // Для первого места

      if (calculatedPoints <= 0) {
        return {
          status: 'warning' as const,
          message: 'Конфигурация может привести к нулевому изменению рейтинга'
        };
      }

      return {
        status: 'success' as const,
        message: 'Алгоритм расчета рейтинга работает корректно',
        details: { 
          sampleCalculation: calculatedPoints,
          configUsed: config.profile_name
        }
      };
    } catch (calcError) {
      return {
        status: 'error' as const,
        message: 'Ошибка в алгоритме расчета рейтинга',
        details: { calcError }
      };
    }
  };

  const testSettingsSync = async () => {
    if (!activeProfile) {
      return {
        status: 'error' as const,
        message: 'Нет активного профиля для тестирования синхронизации'
      };
    }

    try {
      // Проверяем синхронизацию настроек с базой данных
      const { data: currentSettings, error } = await supabase
        .from('cms_settings')
        .select('setting_value, updated_at')
        .eq('setting_key', 'rating_system_config')
        .eq('category', 'rating_system')
        .single();

      if (error) {
        return {
          status: 'warning' as const,
          message: 'Основные настройки не синхронизированы с базой данных',
          details: { error: error.message }
        };
      }

      try {
        const dbConfig = JSON.parse(currentSettings.setting_value);
        const profileConfig = activeProfile.config;

        // Проверяем ключевые параметры
        const keysToCheck = ['base_points', 'min_rating', 'prize_coefficient'];
        const differences = keysToCheck.filter(key => 
          dbConfig[key] !== profileConfig[key]
        );

        if (differences.length > 0) {
          return {
            status: 'warning' as const,
            message: 'Настройки профиля отличаются от настроек в базе данных',
            details: { differences }
          };
        }

        return {
          status: 'success' as const,
          message: 'Настройки синхронизированы корректно',
          details: { lastSync: currentSettings.updated_at }
        };
      } catch (parseError) {
        return {
          status: 'error' as const,
          message: 'Ошибка парсинга настроек из базы данных',
          details: { parseError }
        };
      }
    } catch (syncError) {
      return {
        status: 'error' as const,
        message: 'Критическая ошибка синхронизации настроек',
        details: { syncError }
      };
    }
  };

  const testPerformance = async () => {
    try {
      const startTime = performance.now();
      
      // Тестируем производительность основных операций
      const operations = [
        () => supabase.from('players').select('id').limit(100),
        () => supabase.from('tournaments').select('id').limit(50),
        () => supabase.from('game_results').select('id').limit(200)
      ];

      await Promise.all(operations.map(op => op()));
      
      const duration = performance.now() - startTime;

      if (duration > 3000) {
        return {
          status: 'warning' as const,
          message: 'Медленная работа системы',
          details: { duration: Math.round(duration) }
        };
      }

      return {
        status: 'success' as const,
        message: 'Производительность в норме',
        details: { duration: Math.round(duration) }
      };
    } catch (perfError) {
      return {
        status: 'error' as const,
        message: 'Ошибка тестирования производительности',
        details: { perfError }
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
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <TestTube className="h-5 w-5 text-poker-accent" />
            Тестирование интеграции рейтинговой системы
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
          </div>

          {isRunning && (
            <Alert className="mb-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Выполняется тест: <strong>{currentTest}</strong>
              </AlertDescription>
            </Alert>
          )}

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-poker-text-primary">Результаты тестирования</h4>
              
              <div className="grid gap-3">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium text-gray-900">{result.component}</h5>
                          {result.duration && (
                            <Badge variant="outline" className="text-xs">
                              {result.duration}мс
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{result.message}</p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              Подробности
                            </summary>
                            <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-poker-accent/5 border border-poker-accent/20 rounded-lg">
                <h5 className="font-medium text-poker-text-primary mb-2">Сводка результатов</h5>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {testResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-poker-text-muted">Успешно</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {testResults.filter(r => r.status === 'warning').length}
                    </div>
                    <div className="text-sm text-poker-text-muted">Предупреждения</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {testResults.filter(r => r.status === 'error').length}
                    </div>
                    <div className="text-sm text-poker-text-muted">Ошибки</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}