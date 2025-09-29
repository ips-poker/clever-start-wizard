import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  DollarSign, 
  Target,
  BarChart3,
  Settings,
  Zap,
  Award,
  Activity,
  Eye,
  RefreshCw,
  Calendar,
  Calculator,
  Gauge,
  Star,
  Trophy,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface TournamentFormat {
  id: string;
  name: string;
  category: 'standard' | 'turbo' | 'special';
  characteristics: {
    speed: 'slow' | 'medium' | 'fast' | 'ultra-fast';
    variance: 'low' | 'medium' | 'high' | 'extreme';
    skill_factor: number; // 0-1
    luck_factor: number; // 0-1
  };
  recommended_rps: {
    base_points: number;
    prize_coefficient: number;
    position_weight: number;
    field_size_weight: number;
    volatility_control: number;
  };
  warnings: string[];
  optimal_settings: {
    min_players: number;
    max_players: number;
    ideal_duration: number;
    starting_chips_multiplier: number;
    blind_structure: 'standard' | 'turbo' | 'hyper-turbo';
  };
}

interface AnalysisResult {
  overall_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  warnings: string[];
  predictions: {
    expected_duration: number;
    likely_field_size: number;
    rating_volatility: number;
    skill_vs_luck_ratio: number;
  };
  rps_adjustments: {
    suggested_profile: string;
    custom_multipliers: Record<string, number>;
    reasoning: string;
  };
}

interface TournamentData {
  id?: string;
  name: string;
  tournament_format: string;
  buy_in: number;
  starting_chips: number;
  max_players: number;
  rebuy_cost?: number;
  addon_cost?: number;
  timer_duration?: number;
}

const TOURNAMENT_FORMATS: Record<string, TournamentFormat> = {
  'freezeout': {
    id: 'freezeout',
    name: 'Freezeout',
    category: 'standard',
    characteristics: {
      speed: 'medium',
      variance: 'medium',
      skill_factor: 0.75,
      luck_factor: 0.25
    },
    recommended_rps: {
      base_points: 100,
      prize_coefficient: 15,
      position_weight: 0.4,
      field_size_weight: 0.3,
      volatility_control: 0.7
    },
    warnings: [],
    optimal_settings: {
      min_players: 6,
      max_players: 180,
      ideal_duration: 240,
      starting_chips_multiplier: 100,
      blind_structure: 'standard'
    }
  },
  'rebuy': {
    id: 'rebuy',
    name: 'Rebuy',
    category: 'standard',
    characteristics: {
      speed: 'medium',
      variance: 'high',
      skill_factor: 0.65,
      luck_factor: 0.35
    },
    recommended_rps: {
      base_points: 120,
      prize_coefficient: 12,
      position_weight: 0.35,
      field_size_weight: 0.4,
      volatility_control: 0.8
    },
    warnings: ['Высокая волатильность из-за ребаев', 'Требует корректировки RPS по количеству ребаев'],
    optimal_settings: {
      min_players: 8,
      max_players: 200,
      ideal_duration: 300,
      starting_chips_multiplier: 80,
      blind_structure: 'standard'
    }
  },
  'turbo': {
    id: 'turbo',
    name: 'Turbo',
    category: 'turbo',
    characteristics: {
      speed: 'fast',
      variance: 'high',
      skill_factor: 0.55,
      luck_factor: 0.45
    },
    recommended_rps: {
      base_points: 80,
      prize_coefficient: 18,
      position_weight: 0.3,
      field_size_weight: 0.5,
      volatility_control: 0.9
    },
    warnings: ['Быстрые блайнды увеличивают фактор удачи', 'Сокращенное время для принятия решений'],
    optimal_settings: {
      min_players: 6,
      max_players: 120,
      ideal_duration: 120,
      starting_chips_multiplier: 100,
      blind_structure: 'turbo'
    }
  },
  'hyper-turbo': {
    id: 'hyper-turbo',
    name: 'Hyper Turbo',
    category: 'turbo',
    characteristics: {
      speed: 'ultra-fast',
      variance: 'extreme',
      skill_factor: 0.35,
      luck_factor: 0.65
    },
    recommended_rps: {
      base_points: 60,
      prize_coefficient: 25,
      position_weight: 0.2,
      field_size_weight: 0.6,
      volatility_control: 1.0
    },
    warnings: ['Экстремально высокий фактор удачи', 'Минимальное время для скилла', 'Не рекомендуется для серьезной оценки навыков'],
    optimal_settings: {
      min_players: 6,
      max_players: 80,
      ideal_duration: 60,
      starting_chips_multiplier: 100,
      blind_structure: 'hyper-turbo'
    }
  },
  'bounty': {
    id: 'bounty',
    name: 'Bounty',
    category: 'special',
    characteristics: {
      speed: 'medium',
      variance: 'high',
      skill_factor: 0.6,
      luck_factor: 0.4
    },
    recommended_rps: {
      base_points: 110,
      prize_coefficient: 10,
      position_weight: 0.25,
      field_size_weight: 0.35,
      volatility_control: 0.85
    },
    warnings: ['Изменённая стратегия из-за наград', 'Требует специальной обработки нокаутов'],
    optimal_settings: {
      min_players: 9,
      max_players: 150,
      ideal_duration: 240,
      starting_chips_multiplier: 100,
      blind_structure: 'standard'
    }
  },
  'deepstack': {
    id: 'deepstack',
    name: 'Deepstack',
    category: 'standard',
    characteristics: {
      speed: 'slow',
      variance: 'low',
      skill_factor: 0.85,
      luck_factor: 0.15
    },
    recommended_rps: {
      base_points: 130,
      prize_coefficient: 20,
      position_weight: 0.5,
      field_size_weight: 0.2,
      volatility_control: 0.6
    },
    warnings: ['Длительные турниры требуют выносливости'],
    optimal_settings: {
      min_players: 8,
      max_players: 120,
      ideal_duration: 480,
      starting_chips_multiplier: 200,
      blind_structure: 'standard'
    }
  }
};

interface Props {
  tournamentData: TournamentData;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  realTimeMode?: boolean;
}

export default function AutomatedTournamentProcessor({ 
  tournamentData, 
  onAnalysisComplete,
  realTimeMode = false
}: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const { config } = useRatingSystemConfig();
  const { toast } = useToast();

  useEffect(() => {
    if (realTimeMode) {
      performAnalysis();
    }
  }, [tournamentData, realTimeMode]);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Загружаем исторические данные
      await loadHistoricalData();
      
      // Анализируем турнир
      const result = await analyzeTournament();
      setAnalysis(result);
      onAnalysisComplete?.(result);
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось выполнить анализ турнира',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count),
          game_results(
            player_id,
            position,
            elo_change
          )
        `)
        .eq('tournament_format', tournamentData.tournament_format)
        .eq('status', 'completed')
        .limit(50);

      if (error) throw error;
      setHistoricalData(data || []);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const analyzeTournament = async (): Promise<AnalysisResult> => {
    const format = TOURNAMENT_FORMATS[tournamentData.tournament_format] || TOURNAMENT_FORMATS['freezeout'];
    
    // Анализ основных параметров
    const chipRatio = tournamentData.starting_chips / tournamentData.buy_in;
    const expectedFieldSize = Math.min(tournamentData.max_players, 
      Math.floor(tournamentData.max_players * 0.7)); // Предполагаем 70% заполненность
    
    // Расчет очков риска
    let riskFactors = [];
    let riskScore = 0;
    
    // Анализ чип-стека
    if (chipRatio < 50) {
      riskFactors.push('Низкий чип-стек увеличивает фактор удачи');
      riskScore += 15;
    } else if (chipRatio > 200) {
      riskFactors.push('Слишком большой чип-стек может затянуть турнир');
      riskScore += 10;
    }
    
    // Анализ размера поля
    if (expectedFieldSize < format.optimal_settings.min_players) {
      riskFactors.push('Мало игроков - низкая статистическая значимость');
      riskScore += 20;
    }
    
    // Анализ бай-ина
    if (tournamentData.buy_in < 500) {
      riskFactors.push('Низкий бай-ин может привести к более слабой игре');
      riskScore += 5;
    }
    
    // Анализ формата
    riskScore += (format.characteristics.luck_factor * 30);
    
    // Исторический анализ
    const historicalStats = analyzeHistoricalPerformance();
    
    // Расчет прогнозов
    const predictions = {
      expected_duration: calculateExpectedDuration(format, chipRatio),
      likely_field_size: expectedFieldSize,
      rating_volatility: format.characteristics.variance === 'extreme' ? 0.9 : 
                        format.characteristics.variance === 'high' ? 0.7 : 0.4,
      skill_vs_luck_ratio: format.characteristics.skill_factor
    };
    
    // Рекомендации по RPS
    const rpsAdjustments = generateRPSRecommendations(format, historicalStats);
    
    // Общие рекомендации
    const recommendations = generateRecommendations(format, chipRatio, expectedFieldSize);
    
    const overallScore = Math.max(0, 100 - riskScore);
    const riskLevel = riskScore > 60 ? 'critical' : 
                     riskScore > 40 ? 'high' : 
                     riskScore > 20 ? 'medium' : 'low';

    return {
      overall_score: overallScore,
      risk_level: riskLevel,
      recommendations,
      warnings: [...format.warnings, ...riskFactors],
      predictions,
      rps_adjustments: rpsAdjustments
    };
  };

  const analyzeHistoricalPerformance = () => {
    if (historicalData.length === 0) return null;
    
    const avgPlayers = historicalData.reduce((sum, t) => 
      sum + (t.tournament_registrations?.[0]?.count || 0), 0) / historicalData.length;
    
    const avgDuration = historicalData.reduce((sum, t) => {
      const start = new Date(t.start_time);
      const end = new Date(t.finished_at || t.start_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0) / historicalData.length;
    
    return {
      avg_players: avgPlayers,
      avg_duration: avgDuration,
      total_tournaments: historicalData.length
    };
  };

  const calculateExpectedDuration = (format: TournamentFormat, chipRatio: number): number => {
    let baseDuration = format.optimal_settings.ideal_duration;
    
    // Корректировка на основе чип-стека
    if (chipRatio < 75) baseDuration *= 0.8;
    if (chipRatio > 150) baseDuration *= 1.3;
    
    return baseDuration;
  };

  const generateRPSRecommendations = (format: TournamentFormat, historicalStats: any) => {
    const suggested = format.recommended_rps;
    
    let reasoning = `Для формата ${format.name}: `;
    
    if (format.characteristics.luck_factor > 0.5) {
      reasoning += 'Увеличен контроль волатильности из-за высокого фактора удачи. ';
    }
    
    if (format.characteristics.speed === 'fast' || format.characteristics.speed === 'ultra-fast') {
      reasoning += 'Снижены базовые очки из-за быстрого формата. ';
    }
    
    return {
      suggested_profile: `${format.name} Optimized`,
      custom_multipliers: {
        base_multiplier: format.characteristics.skill_factor,
        luck_compensation: 1 - format.characteristics.luck_factor,
        speed_adjustment: format.characteristics.speed === 'ultra-fast' ? 0.7 : 
                         format.characteristics.speed === 'fast' ? 0.85 : 1.0
      },
      reasoning
    };
  };

  const generateRecommendations = (format: TournamentFormat, chipRatio: number, fieldSize: number): string[] => {
    const recs = [];
    
    if (chipRatio < 75) {
      recs.push('Рассмотрите увеличение стартового стека до 75-100 бай-инов');
    }
    
    if (fieldSize < format.optimal_settings.min_players) {
      recs.push(`Оптимальное количество игроков: ${format.optimal_settings.min_players}+`);
    }
    
    if (format.characteristics.variance === 'extreme') {
      recs.push('Используйте повышенный контроль волатильности в RPS');
    }
    
    recs.push(`Рекомендуемая структура блайндов: ${format.optimal_settings.blind_structure}`);
    
    return recs;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <Brain className="h-12 w-12 text-poker-primary animate-pulse" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Анализ турнира...</h3>
              <p className="text-poker-text-muted mb-4">
                Проводим глубокий анализ параметров и исторических данных
              </p>
              <Progress value={66} className="w-64 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-poker-text-muted mx-auto mb-4" />
          <p className="text-poker-text-muted mb-4">Анализ не выполнен</p>
          <Button onClick={performAnalysis} className="bg-poker-primary hover:bg-poker-primary/90">
            <Calculator className="w-4 h-4 mr-2" />
            Запустить анализ
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Заголовок с общей оценкой */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-poker-border shadow-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-poker-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-poker-primary" />
              </div>
              <div>
                <CardTitle className="text-poker-text-primary">
                  Автоматический анализ турнира
                </CardTitle>
                <p className="text-poker-text-muted mt-1">
                  Формат: {TOURNAMENT_FORMATS[tournamentData.tournament_format]?.name || tournamentData.tournament_format}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-poker-text-primary">
                  {analysis.overall_score}
                </div>
                <div className="text-sm text-poker-text-muted">из 100</div>
              </div>
              <Badge className={`px-3 py-1 ${getRiskBadgeColor(analysis.risk_level)}`}>
                {analysis.risk_level === 'low' && 'Низкий риск'}
                {analysis.risk_level === 'medium' && 'Средний риск'}
                {analysis.risk_level === 'high' && 'Высокий риск'}
                {analysis.risk_level === 'critical' && 'Критический риск'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="overview">
            <Eye className="w-4 h-4 mr-2" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <TrendingUp className="w-4 h-4 mr-2" />
            Прогнозы
          </TabsTrigger>
          <TabsTrigger value="rps">
            <Settings className="w-4 h-4 mr-2" />
            RPS
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Award className="w-4 h-4 mr-2" />
            Рекомендации
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Общая оценка */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-600" />
                  Общая оценка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress value={analysis.overall_score} className="h-2" />
                  <div className={`text-lg font-semibold ${getRiskColor(analysis.risk_level)}`}>
                    {analysis.overall_score}/100
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Характеристики формата */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Характеристики
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const format = TOURNAMENT_FORMATS[tournamentData.tournament_format];
                  if (!format) return null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-poker-text-muted">Скорость:</span>
                        <Badge variant="outline">{format.characteristics.speed}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-poker-text-muted">Навык:</span>
                        <span className="font-medium">
                          {Math.round(format.characteristics.skill_factor * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-poker-text-muted">Удача:</span>
                        <span className="font-medium">
                          {Math.round(format.characteristics.luck_factor * 100)}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Ключевые параметры */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Параметры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Стартовый стек:</span>
                  <span className="font-medium">
                    {tournamentData.starting_chips.toLocaleString()} фишек
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Макс. игроки:</span>
                  <span className="font-medium">{tournamentData.max_players}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Орг. взнос:</span>
                  <span className="font-medium">{tournamentData.buy_in.toLocaleString()} ₽</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Предупреждения */}
          {analysis.warnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Обнаружены потенциальные проблемы:</strong>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Прогнозы турнира */}
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Прогнозы турнира
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">{Math.round(analysis.predictions.expected_duration)} мин</div>
                    <div className="text-sm text-poker-text-muted">Ожидаемая длительность</div>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="font-semibold">{analysis.predictions.likely_field_size}</div>
                    <div className="text-sm text-poker-text-muted">Ожидаемое поле</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Волатильность рейтинга</span>
                      <span className="text-sm font-medium">
                        {Math.round(analysis.predictions.rating_volatility * 100)}%
                      </span>
                    </div>
                    <Progress value={analysis.predictions.rating_volatility * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Соотношение навык/удача</span>
                      <span className="text-sm font-medium">
                        {Math.round(analysis.predictions.skill_vs_luck_ratio * 100)}%
                      </span>
                    </div>
                    <Progress value={analysis.predictions.skill_vs_luck_ratio * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Исторические данные */}
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Исторические данные
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {historicalData.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-poker-text-muted">Проанализировано турниров:</span>
                      <span className="font-semibold">{historicalData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-poker-text-muted">Средний размер поля:</span>
                      <span className="font-semibold">
                        {Math.round(historicalData.reduce((sum, t) => 
                          sum + (t.tournament_registrations?.[0]?.count || 0), 0) / historicalData.length)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-poker-text-muted">Форматы этого типа:</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {historicalData.length} завершенных
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Info className="h-8 w-8 text-poker-text-muted mx-auto mb-2" />
                    <p className="text-poker-text-muted">
                      Нет исторических данных для этого формата
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rps" className="space-y-6">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Рекомендации по RPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  Рекомендуемый профиль: {analysis.rps_adjustments.suggested_profile}
                </h4>
                <p className="text-sm text-poker-text-muted mb-3">
                  {analysis.rps_adjustments.reasoning}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(analysis.rps_adjustments.custom_multipliers).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <span className="text-sm font-medium">
                        {typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {(() => {
                const format = TOURNAMENT_FORMATS[tournamentData.tournament_format];
                if (!format) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h5 className="font-medium">Рекомендуемые параметры:</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Базовые очки:</span>
                          <span className="font-medium">{format.recommended_rps.base_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Призовой коэффициент:</span>
                          <span className="font-medium">{format.recommended_rps.prize_coefficient}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Вес позиции:</span>
                          <span className="font-medium">{format.recommended_rps.position_weight}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Контроль волатильности:</span>
                          <span className="font-medium">{format.recommended_rps.volatility_control}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="font-medium">Текущие параметры:</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Базовые очки:</span>
                          <span className="font-medium">{config.base_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Призовой коэффициент:</span>
                          <span className="font-medium">{config.prize_coefficient}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Вес позиции:</span>
                          <span className="font-medium">{config.weights.position_weight}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Контроль волатильности:</span>
                          <span className="font-medium">{config.volatility_control}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  Рекомендации по оптимизации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center">
              <Button 
                onClick={performAnalysis}
                className="bg-poker-primary hover:bg-poker-primary/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить анализ
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}