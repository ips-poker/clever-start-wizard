import React, { useState, useEffect } from 'react';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
  Trophy,
  DollarSign,
  Clock,
  Layers,
  Brain,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TournamentAnalysis {
  totalTournaments: number;
  formats: {
    freezeout: number;
    rebuy: number;
    bounty_knockout: number;
    turbo: number;
    deepstack: number;
    satellite: number;
  };
  avgBuyIn: number;
  avgFieldSize: number;
  avgRebuyRate: number;
  avgAddonRate: number;
  prizeDistribution: number[];
}

interface RatingSystemHealth {
  stability: number;
  fairness: number;
  volatility: number;
  coverage: number;
  issues: string[];
  recommendations: string[];
}

interface OfflineSpecificSettings {
  liveDelayCompensation: number;
  manualEntryErrors: number;
  seatChangeBonus: number;
  dealerTipAdjustment: number;
  physicalChipHandling: boolean;
  realTimeRatingUpdates: boolean;
}

export default function OfflinePokerRatingAnalyzer() {
  const { config, saveConfig } = useRatingSystemConfig();
  const [analysis, setAnalysis] = useState<TournamentAnalysis | null>(null);
  const [health, setHealth] = useState<RatingSystemHealth | null>(null);
  const [offlineSettings, setOfflineSettings] = useState<OfflineSpecificSettings>({
    liveDelayCompensation: 5,
    manualEntryErrors: 2,
    seatChangeBonus: 0,
    dealerTipAdjustment: 1,
    physicalChipHandling: true,
    realTimeRatingUpdates: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    analyzeTournamentData();
    analyzeRatingSystemHealth();
  }, []);

  const analyzeTournamentData = async () => {
    setIsAnalyzing(true);
    try {
      // Получаем данные о турнирах
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select(`
          id,
          tournament_format,
          buy_in,
          max_players,
          rebuy_cost,
          addon_cost,
          tournament_registrations (
            rebuys,
            addons,
            player_id
          )
        `)
        .eq('status', 'completed');

      if (tournamentsError) throw tournamentsError;

      if (!tournaments) {
        setAnalysis({
          totalTournaments: 0,
          formats: {
            freezeout: 0,
            rebuy: 0,
            bounty_knockout: 0,
            turbo: 0,
            deepstack: 0,
            satellite: 0
          },
          avgBuyIn: 0,
          avgFieldSize: 0,
          avgRebuyRate: 0,
          avgAddonRate: 0,
          prizeDistribution: []
        });
        return;
      }

      // Анализируем форматы турниров
      const formatCounts = tournaments.reduce((acc, t) => {
        const format = t.tournament_format || 'freezeout';
        acc[format as keyof typeof acc] = (acc[format as keyof typeof acc] || 0) + 1;
        return acc;
      }, {
        freezeout: 0,
        rebuy: 0,
        bounty_knockout: 0,
        turbo: 0,
        deepstack: 0,
        satellite: 0
      });

      // Вычисляем статистики
      const avgBuyIn = tournaments.reduce((sum, t) => sum + t.buy_in, 0) / tournaments.length;
      const avgFieldSize = tournaments.reduce((sum, t) => sum + (t.tournament_registrations?.length || 0), 0) / tournaments.length;
      
      // Анализируем ребаи и адоны
      let totalRebuys = 0;
      let totalAddons = 0;
      let totalPlayers = 0;

      tournaments.forEach(t => {
        const registrations = t.tournament_registrations || [];
        totalPlayers += registrations.length;
        registrations.forEach(r => {
          totalRebuys += r.rebuys || 0;
          totalAddons += r.addons || 0;
        });
      });

      const avgRebuyRate = totalPlayers > 0 ? (totalRebuys / totalPlayers) * 100 : 0;
      const avgAddonRate = totalPlayers > 0 ? (totalAddons / totalPlayers) * 100 : 0;

      setAnalysis({
        totalTournaments: tournaments.length,
        formats: formatCounts,
        avgBuyIn: Math.round(avgBuyIn),
        avgFieldSize: Math.round(avgFieldSize),
        avgRebuyRate: Math.round(avgRebuyRate),
        avgAddonRate: Math.round(avgAddonRate),
        prizeDistribution: [40, 25, 15, 10, 5, 3, 2] // Типичное распределение призов
      });

    } catch (error: any) {
      console.error('Error analyzing tournament data:', error);
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось проанализировать данные турниров',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeRatingSystemHealth = () => {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Анализ текущих настроек
    let stability = 85;
    let fairness = 90;
    let volatility = 75;
    let coverage = 80;

    // Проверка базовых настроек
    if (config.base_points < 50 || config.base_points > 200) {
      issues.push('Базовые очки выходят за рекомендуемый диапазон для офлайн турниров');
      stability -= 10;
    }

    // Проверка настроек ребаев
    if (config.rebuy_multiplier < 0.8 || config.rebuy_multiplier > 2.0) {
      issues.push('Множитель ребаев не оптимален для офлайн формата');
      fairness -= 5;
      recommendations.push('Установите множитель ребаев в диапазоне 0.8-1.5 для офлайн турниров');
    }

    // Проверка призовых коэффициентов
    if (config.prize_coefficient > 0.005) {
      issues.push('Призовый коэффициент слишком высок для офлайн турниров');
      volatility -= 10;
      recommendations.push('Снизьте призовый коэффициент до 0.001-0.003 для стабильности');
    }

    // Проверка позиционных бонусов
    if (!config.enable_position_bonus) {
      issues.push('Позиционные бонусы отключены');
      fairness -= 10;
      recommendations.push('Включите позиционные бонусы для справедливого распределения очков');
    }

    // Рекомендации для офлайн турниров
    recommendations.push('Включите компенсацию задержек для офлайн регистрации результатов');
    recommendations.push('Настройте бонусы за баунти для knockout турниров');
    recommendations.push('Добавьте модификаторы для turbo и deepstack форматов');

    setHealth({
      stability: Math.max(0, Math.min(100, stability)),
      fairness: Math.max(0, Math.min(100, fairness)),
      volatility: Math.max(0, Math.min(100, volatility)),
      coverage: Math.max(0, Math.min(100, coverage)),
      issues,
      recommendations
    });
  };

  const applyOfflineOptimization = async () => {
    const optimizedConfig = {
      ...config,
      // Оптимизация для офлайн турниров
      base_points: 100, // Стандартные базовые очки
      rebuy_multiplier: 1.2, // Умеренный бонус за ребаи
      addon_multiplier: 1.1, // Небольшой бонус за адоны
      double_rebuy_multiplier: 1.5, // Повышенный бонус за двойные ребаи
      
      // Настройки для разных форматов
      knockout_bonus: 25, // Бонус за нокауты в баунти
      turbo_modifier: 0.9, // Снижение для турбо
      deepstack_modifier: 1.1, // Повышение для дипстека
      
      // Позиционные бонусы
      enable_position_bonus: true,
      first_place_bonus: 50,
      second_place_bonus: 30,
      third_place_bonus: 20,
      top_10_percent_bonus: 15,
      itm_bonus: 10,
      bubble_bonus: 5,
      
      // Контроль волатильности для офлайн
      volatility_control: 1.2,
      prize_coefficient: 0.002,
      
      // Модификаторы поля и бай-ина
      field_size_modifier: true,
      buy_in_modifier: true,
      
      // Временные настройки
      duration_multiplier: true,
      late_entry_penalty: 5,
      
      // Весовые коэффициенты для офлайн
      weights: {
        position_weight: 1.0,
        prize_weight: 0.8,
        field_size_weight: 0.6,
        buy_in_weight: 0.4,
        duration_weight: 0.3,
        performance_weight: 1.2
      }
    };

    try {
      await saveConfig(optimizedConfig);
      toast({
        title: 'Настройки оптимизированы',
        description: 'Система настроена для офлайн покер турниров'
      });
      
      // Повторный анализ после оптимизации
      setTimeout(() => {
        analyzeRatingSystemHealth();
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: 'Ошибка оптимизации',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 85) return 'text-green-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (value: number) => {
    if (value >= 85) return 'default';
    if (value >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Анализ рейтинговой системы</CardTitle>
                <CardDescription>
                  Специализированный анализ для офлайн покер турниров
                </CardDescription>
              </div>
            </div>
            <Button onClick={applyOfflineOptimization} className="bg-primary">
              <Zap className="h-4 w-4 mr-2" />
              Оптимизировать для офлайн
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Анализ данных</TabsTrigger>
          <TabsTrigger value="health">Состояние системы</TabsTrigger>
          <TabsTrigger value="formats">Форматы турниров</TabsTrigger>
          <TabsTrigger value="offline">Офлайн настройки</TabsTrigger>
        </TabsList>

        {/* Tournament Analysis */}
        <TabsContent value="analysis" className="space-y-6">
          {isAnalyzing ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p>Анализируем данные турниров...</p>
              </CardContent>
            </Card>
          ) : analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Всего турниров
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{analysis.totalTournaments}</div>
                  <p className="text-xs text-muted-foreground">Завершенных турниров</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Среднее поле
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{analysis.avgFieldSize}</div>
                  <p className="text-xs text-muted-foreground">Игроков в турнире</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Средний бай-ин
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{analysis.avgBuyIn.toLocaleString()} ₽</div>
                  <p className="text-xs text-muted-foreground">Средняя стоимость</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Ребаи/адоны
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{analysis.avgRebuyRate}%</div>
                  <p className="text-xs text-muted-foreground">Средний процент ребаев</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Format Distribution */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Распределение форматов турниров</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analysis.formats).map(([format, count]) => {
                    const percentage = analysis.totalTournaments > 0 
                      ? (count / analysis.totalTournaments) * 100 
                      : 0;
                    
                    return (
                      <div key={format} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">
                            {format.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* System Health */}
        <TabsContent value="health" className="space-y-6">
          {health && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(health.stability)}`}>
                      {health.stability}%
                    </div>
                    <p className="text-sm text-muted-foreground">Стабильность</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(health.fairness)}`}>
                      {health.fairness}%
                    </div>
                    <p className="text-sm text-muted-foreground">Справедливость</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(health.volatility)}`}>
                      {health.volatility}%
                    </div>
                    <p className="text-sm text-muted-foreground">Контроль волатильности</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(health.coverage)}`}>
                      {health.coverage}%
                    </div>
                    <p className="text-sm text-muted-foreground">Покрытие форматов</p>
                  </CardContent>
                </Card>
              </div>

              {/* Issues and Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Обнаруженные проблемы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {health.issues.length > 0 ? (
                      <ul className="space-y-2">
                        {health.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Критических проблем не обнаружено
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <Brain className="h-5 w-5" />
                      Рекомендации
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {health.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Format-Specific Settings */}
        <TabsContent value="formats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  Freezeout турниры
                </CardTitle>
                <CardDescription>Стандартные турниры без ребаев</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="default">Базовая конфигурация</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Базовые очки: 100</div>
                    <div>• Позиционные бонусы: включены</div>
                    <div>• Призовый коэффициент: 0.002</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Rebuy турниры
                </CardTitle>
                <CardDescription>Турниры с возможностью ребаев</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="secondary">Множители активны</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Множитель ребаев: {config.rebuy_multiplier}x</div>
                    <div>• Двойной ребай: {config.double_rebuy_multiplier || 1.5}x</div>
                    <div>• Среднее {analysis?.avgRebuyRate || 0}% ребаев</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-600" />
                  Bounty/Knockout
                </CardTitle>
                <CardDescription>Турниры с нокаут бонусами</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="destructive">Бонусы за KO</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Бонус за нокаут: {config.knockout_bonus || 0}</div>
                    <div>• Дополнительная мотивация</div>
                    <div>• Агрессивная игра</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Turbo формат
                </CardTitle>
                <CardDescription>Быстрые турниры</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="outline">Ускоренный</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Модификатор: {config.turbo_modifier || 0.9}x</div>
                    <div>• Быстрые блайнды</div>
                    <div>• Высокая дисперсия</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  DeepStack
                </CardTitle>
                <CardDescription>Турниры с глубокими стеками</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="secondary">Глубокая игра</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Модификатор: {config.deepstack_modifier || 1.1}x</div>
                    <div>• Больше скилла</div>
                    <div>• Меньше удачи</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  Satellite
                </CardTitle>
                <CardDescription>Турниры-сателлиты</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="outline">Квалификация</Badge>
                  <div className="text-sm space-y-1">
                    <div>• Особое распределение</div>
                    <div>• Цель - билеты</div>
                    <div>• Модифицированные очки</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Offline-Specific Settings */}
        <TabsContent value="offline" className="space-y-6">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Эти настройки специально разработаны для офлайн покер турниров и учитывают особенности живой игры.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Компенсация офлайн факторов</CardTitle>
                <CardDescription>
                  Настройки для учета особенностей живых турниров
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Задержка регистрации результатов: {offlineSettings.liveDelayCompensation} мин
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={offlineSettings.liveDelayCompensation}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      liveDelayCompensation: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Компенсация ошибок ввода: {offlineSettings.manualEntryErrors}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={offlineSettings.manualEntryErrors}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      manualEntryErrors: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Физическая работа с фишками</label>
                  <input
                    type="checkbox"
                    checked={offlineSettings.physicalChipHandling}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      physicalChipHandling: e.target.checked
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Дополнительные настройки</CardTitle>
                <CardDescription>
                  Специальные модификаторы для офлайн среды
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Бонус за смену стола: {offlineSettings.seatChangeBonus}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={offlineSettings.seatChangeBonus}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      seatChangeBonus: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Корректировка на чаевые: {offlineSettings.dealerTipAdjustment}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={offlineSettings.dealerTipAdjustment}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      dealerTipAdjustment: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Обновления рейтинга в реальном времени</label>
                  <input
                    type="checkbox"
                    checked={offlineSettings.realTimeRatingUpdates}
                    onChange={(e) => setOfflineSettings(prev => ({
                      ...prev,
                      realTimeRatingUpdates: e.target.checked
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}