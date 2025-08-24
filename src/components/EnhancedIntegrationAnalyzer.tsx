import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingSystemIntegration } from '@/hooks/useRatingSystemIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  Zap,
  Users,
  Trophy,
  Settings,
  TrendingUp,
  RefreshCw,
  Info,
  Eye,
  Clock,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  details?: any;
  lastChecked: Date;
  responseTime?: number;
}

export default function EnhancedIntegrationAnalyzer() {
  const { integrationStatus, systemHealth, checkSystemIntegration, getIntegrationReport } = useRatingSystemIntegration();
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    runFullAnalysis();
  }, []);

  const runFullAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const analyses = [
        analyzeRatingProfiles(),
        analyzeEdgeFunctions(),
        analyzeDatabaseHealth(),
        analyzeTournamentIntegration(),
        analyzePlayerData(),
        analyzeSecurityStatus()
      ];

      const results = await Promise.all(analyses);
      setSystemStatuses(results);
      setLastUpdate(new Date());
      
      await checkSystemIntegration();
      
      toast({
        title: 'Анализ завершён',
        description: 'Проверка интеграций успешно выполнена'
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось выполнить полный анализ системы',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeRatingProfiles = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const { data: profiles, error } = await supabase
        .from('cms_settings')
        .select('*')
        .eq('category', 'rating_profiles');

      const responseTime = performance.now() - startTime;
      
      if (error) {
        return {
          component: 'Профили рейтинговой системы',
          status: 'error',
          message: 'Ошибка доступа к профилям',
          details: { error: error.message },
          lastChecked: new Date(),
          responseTime: Math.round(responseTime)
        };
      }

      const profileCount = profiles?.length || 0;
      
      return {
        component: 'Профили рейтинговой системы',
        status: profileCount > 0 ? 'healthy' : 'warning',
        message: profileCount > 0 
          ? `Найдено ${profileCount} профилей рейтинговой системы`
          : 'Профили рейтинговой системы не настроены',
        details: { profileCount, profiles },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'Профили рейтинговой системы',
        status: 'error',
        message: 'Критическая ошибка при проверке профилей',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const analyzeEdgeFunctions = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: { test_mode: true }
      });
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: 'Edge функции',
        status: error ? 'error' : 'healthy',
        message: error 
          ? 'Edge функция недоступна'
          : 'Edge функция calculate-elo работает корректно',
        details: { response: data, error: error?.message },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'Edge функции',
        status: 'error',
        message: 'Ошибка сети или недоступность функций',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const analyzeDatabaseHealth = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const tables = ['tournaments', 'players', 'tournament_registrations', 'game_results', 'cms_settings'] as const;
      const checks = await Promise.all(
        tables.map(async (table) => {
          const tableStart = performance.now();
          const { data, error } = await supabase.from(table).select('id').limit(1);
          const tableTime = performance.now() - tableStart;
          
          return {
            table,
            accessible: !error,
            error: error?.message,
            responseTime: Math.round(tableTime),
            recordCount: data?.length || 0
          };
        })
      );

      const responseTime = performance.now() - startTime;
      const failedTables = checks.filter(c => !c.accessible);
      const avgResponseTime = checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length;

      return {
        component: 'База данных',
        status: failedTables.length === 0 ? 'healthy' : 'error',
        message: failedTables.length === 0 
          ? `Все ${tables.length} таблиц доступны` 
          : `${failedTables.length} таблиц недоступны`,
        details: { 
          checks, 
          failedTables: failedTables.map(t => t.table),
          avgResponseTime: Math.round(avgResponseTime)
        },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'База данных',
        status: 'error',
        message: 'Критическая ошибка подключения к БД',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const analyzeTournamentIntegration = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('id, name, status, buy_in, tournament_format')
        .limit(50);

      const responseTime = performance.now() - startTime;
      
      if (error) {
        return {
          component: 'Интеграция турниров',
          status: 'error',
          message: 'Ошибка доступа к турнирам',
          details: { error: error.message },
          lastChecked: new Date(),
          responseTime: Math.round(responseTime)
        };
      }

      const tournamentCount = tournaments?.length || 0;
      const activeCount = tournaments?.filter(t => t.status === 'running').length || 0;
      const formats = [...new Set(tournaments?.map(t => t.tournament_format).filter(Boolean))];
      
      // Проверяем связанные данные
      const { data: payouts } = await supabase
        .from('tournament_payouts')
        .select('tournament_id')
        .limit(10);

      const payoutIntegration = (payouts?.length || 0) > 0;

      return {
        component: 'Интеграция турниров',
        status: tournamentCount > 0 ? 'healthy' : 'warning',
        message: `${tournamentCount} турниров, ${activeCount} активных`,
        details: { 
          tournamentCount, 
          activeCount, 
          formats,
          payoutIntegration,
          payoutCount: payouts?.length || 0
        },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'Интеграция турниров',
        status: 'error',
        message: 'Критическая ошибка анализа турниров',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const analyzePlayerData = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins')
        .limit(100);

      const responseTime = performance.now() - startTime;
      
      if (error) {
        return {
          component: 'Данные игроков',
          status: 'error',
          message: 'Ошибка доступа к игрокам',
          details: { error: error.message },
          lastChecked: new Date(),
          responseTime: Math.round(responseTime)
        };
      }

      const playerCount = players?.length || 0;
      const activePlayerCount = players?.filter(p => p.games_played > 0).length || 0;
      
      // Анализ рейтингов
      const ratings = players?.map(p => p.elo_rating) || [];
      const ratingStats = ratings.length > 0 ? {
        average: Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length),
        min: Math.min(...ratings),
        max: Math.max(...ratings),
        range: Math.max(...ratings) - Math.min(...ratings)
      } : null;

      return {
        component: 'Данные игроков',
        status: playerCount > 0 ? 'healthy' : 'warning',
        message: `${playerCount} игроков, ${activePlayerCount} активных`,
        details: { 
          playerCount, 
          activePlayerCount,
          activityRate: playerCount > 0 ? Math.round((activePlayerCount / playerCount) * 100) : 0,
          ratingStats
        },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'Данные игроков',
        status: 'error',
        message: 'Критическая ошибка анализа игроков',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const analyzeSecurityStatus = async (): Promise<SystemStatus> => {
    const startTime = performance.now();
    
    try {
      const securityChecks = [];
      
      // Проверка RLS
      try {
        await supabase.from('players').select('email').limit(1);
        securityChecks.push({ check: 'RLS Players', status: 'pass' });
      } catch {
        securityChecks.push({ check: 'RLS Players', status: 'fail' });
      }

      // Проверка доступа к настройкам
      try {
        const { data } = await supabase.from('cms_settings').select('id').limit(1);
        securityChecks.push({ 
          check: 'Settings Access', 
          status: data ? 'pass' : 'warning'
        });
      } catch {
        securityChecks.push({ check: 'Settings Access', status: 'fail' });
      }

      const responseTime = performance.now() - startTime;
      const passedChecks = securityChecks.filter(c => c.status === 'pass').length;
      const failedChecks = securityChecks.filter(c => c.status === 'fail').length;
      const securityScore = Math.round((passedChecks / securityChecks.length) * 100);

      return {
        component: 'Безопасность',
        status: failedChecks === 0 ? 'healthy' : failedChecks > 1 ? 'error' : 'warning',
        message: `Безопасность: ${securityScore}% (${passedChecks}/${securityChecks.length})`,
        details: { 
          securityChecks, 
          securityScore,
          passedChecks,
          failedChecks
        },
        lastChecked: new Date(),
        responseTime: Math.round(responseTime)
      };
    } catch (error: any) {
      return {
        component: 'Безопасность',
        status: 'error',
        message: 'Ошибка проверки безопасности',
        details: { error: error.message },
        lastChecked: new Date()
      };
    }
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getComponentIcon = (component: string) => {
    if (component.includes('профил')) return <Settings className="w-4 h-4" />;
    if (component.includes('Edge')) return <Zap className="w-4 h-4" />;
    if (component.includes('База')) return <Database className="w-4 h-4" />;
    if (component.includes('турнир')) return <Trophy className="w-4 h-4" />;
    if (component.includes('игрок')) return <Users className="w-4 h-4" />;
    if (component.includes('Безопасность')) return <Shield className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const toggleDetails = (component: string) => {
    setShowDetails(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  const overallHealth = systemStatuses.length > 0 
    ? Math.round((systemStatuses.filter(s => s.status === 'healthy').length / systemStatuses.length) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Обзор системы
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Компоненты
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Здоровье системы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Общий статус */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-poker-border shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/10 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-poker-text-primary">
                      Общий статус интеграций
                    </CardTitle>
                    <p className="text-poker-text-muted mt-1">
                      {lastUpdate ? `Последнее обновление: ${lastUpdate.toLocaleTimeString()}` : 'Анализ не проводился'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{overallHealth}%</div>
                  <div className="text-sm text-blue-600/80">Здоровье системы</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Общее здоровье системы</span>
                  <span className="font-medium">{overallHealth}%</span>
                </div>
                <Progress value={overallHealth} className="h-2" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {['healthy', 'warning', 'error', 'unknown'].map(status => {
                    const count = systemStatuses.filter(s => s.status === status).length;
                    const color = {
                      healthy: 'text-green-600',
                      warning: 'text-yellow-600',
                      error: 'text-red-600',
                      unknown: 'text-gray-600'
                    }[status];
                    
                    return (
                      <div key={status} className="text-center p-3 bg-white/50 rounded-lg">
                        <div className={`text-2xl font-bold ${color}`}>{count}</div>
                        <div className="text-sm text-poker-text-muted capitalize">
                          {status === 'healthy' ? 'Здоровые' :
                           status === 'warning' ? 'Предупреждения' :
                           status === 'error' ? 'Ошибки' :
                           'Неизвестно'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Быстрые действия */}
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-poker-accent" />
                Действия
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={runFullAnalysis}
                  disabled={isAnalyzing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Анализ...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Полный анализ
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          {systemStatuses.length > 0 ? (
            <div className="grid gap-4">
              {systemStatuses.map((status, index) => (
                <Card 
                  key={status.component} 
                  className={`transition-all duration-200 hover:shadow-md ${getStatusColor(status.status)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.status)}
                        {getComponentIcon(status.component)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{status.component}</h4>
                          <div className="flex items-center gap-2">
                            {status.responseTime && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {status.responseTime}мс
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDetails(status.component)}
                              className="p-1 h-6 w-6"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">{status.message}</p>
                        
                        <div className="text-xs text-gray-500">
                          Проверено: {status.lastChecked.toLocaleTimeString()}
                        </div>

                        {/* Детали */}
                        {showDetails[status.component] && status.details && (
                          <div className="mt-3 p-3 bg-gray-100 rounded border">
                            <div className="text-xs font-medium text-gray-600 mb-2">Детали:</div>
                            <pre className="text-xs text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                              {JSON.stringify(status.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardContent className="text-center py-16">
                <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Анализ не проводился</h3>
                <p className="text-gray-500 mb-6">Запустите анализ для проверки состояния системы</p>
                <Button
                  onClick={runFullAnalysis}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Запустить анализ
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-poker-accent" />
                Метрики здоровья системы
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-poker-text-primary">Общие метрики</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-poker-text-muted">Общее здоровье</span>
                          <span className="text-sm font-medium">{systemHealth.overall}%</span>
                        </div>
                        <Progress value={systemHealth.overall} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-poker-text-muted">Конфигурация</span>
                          <span className="text-sm font-medium">{systemHealth.config}%</span>
                        </div>
                        <Progress value={systemHealth.config} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-poker-text-muted">Интеграции</span>
                          <span className="text-sm font-medium">{systemHealth.integration}%</span>
                        </div>
                        <Progress value={systemHealth.integration} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-poker-text-muted">Производительность</span>
                          <span className="text-sm font-medium">{systemHealth.performance}%</span>
                        </div>
                        <Progress value={systemHealth.performance} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-poker-text-primary">Статус интеграций</h4>
                    
                    <div className="space-y-2">
                      {Object.entries(integrationStatus).map(([key, status]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm capitalize">
                            {key === 'edgeFunction' ? 'Edge функции' :
                             key === 'profiles' ? 'Профили' :
                             key === 'database' ? 'База данных' :
                             key === 'tournaments' ? 'Турниры' :
                             key === 'players' ? 'Игроки' : key}
                          </span>
                          {status ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Нет данных о здоровье системы</h3>
                  <p className="text-gray-500">Запустите анализ для получения метрик</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}