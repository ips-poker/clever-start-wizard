import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  Calculator, 
  Trophy, 
  TrendingUp, 
  Save, 
  RotateCcw,
  Info,
  AlertTriangle,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  Award,
  Activity,
  CheckCircle,
  XCircle,
  Users,
  Star,
  Gauge,
  LinkIcon,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Tournament {
  id: string;
  name: string;
  status: string;
  buy_in: number;
  max_players: number;
  tournament_format: string;
  rebuy_cost: number;
  addon_cost: number;
  starting_chips: number;
}

interface IntegratedSettingsProps {
  selectedTournament?: Tournament | null;
  onTournamentUpdate?: () => void;
}

interface PayoutPlace {
  place: number;
  percentage: number;
  amount: number;
}

interface RatingImpact {
  scenario: string;
  basePoints: number;
  prizePoints: number;
  positionBonus: number;
  totalChange: number;
  estimatedNewRating: number;
}

export default function IntegratedTournamentRatingSettings({ 
  selectedTournament, 
  onTournamentUpdate 
}: IntegratedSettingsProps) {
  const { config, saveConfig, isLoading } = useRatingSystemConfig();
  const { activeProfile, profiles } = useRatingProfiles();
  const [localConfig, setLocalConfig] = useState(config);
  const [payoutStructure, setPayoutStructure] = useState<PayoutPlace[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState(0);
  const [totalPrizePool, setTotalPrizePool] = useState(0);
  const [ratingImpacts, setRatingImpacts] = useState<RatingImpact[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentData();
    }
  }, [selectedTournament]);

  useEffect(() => {
    calculateRatingImpacts();
  }, [localConfig, payoutStructure, totalPrizePool]);

  const loadTournamentData = async () => {
    if (!selectedTournament) return;

    try {
      // Загрузка регистраций
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .eq('status', 'confirmed');

      setRegisteredPlayers(registrations?.length || 0);

      // Загрузка существующих выплат
      const { data: payouts } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('place');

      if (payouts && payouts.length > 0) {
        setPayoutStructure(payouts.map(p => ({
          place: p.place,
          percentage: p.percentage,
          amount: p.amount
        })));
        setTotalPrizePool(payouts.reduce((sum, p) => sum + p.amount, 0));
      } else {
        calculateDefaultPayouts();
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    }
  };

  const calculateDefaultPayouts = () => {
    if (!selectedTournament || registeredPlayers === 0) return;

    const totalPool = (selectedTournament.buy_in * registeredPlayers);
    setTotalPrizePool(totalPool);

    // Стандартная структура выплат для офлайн турниров
    const payoutPercentages = getPayoutPercentages(registeredPlayers);
    const newPayouts = payoutPercentages.map((percentage, index) => ({
      place: index + 1,
      percentage: percentage * 100,
      amount: Math.round(totalPool * percentage)
    }));

    setPayoutStructure(newPayouts);
  };

  const getPayoutPercentages = (playerCount: number): number[] => {
    if (playerCount >= 50) return [0.35, 0.25, 0.15, 0.10, 0.08, 0.07];
    if (playerCount >= 30) return [0.40, 0.30, 0.20, 0.10];
    if (playerCount >= 20) return [0.50, 0.30, 0.20];
    if (playerCount >= 10) return [0.60, 0.40];
    return [1.0];
  };

  const calculateRatingImpacts = () => {
    if (!selectedTournament || !activeProfile) return;

    const scenarios = [
      { name: 'Победа (1 место)', position: 1, rebuys: 0, startRating: 1500 },
      { name: 'Призовое место (3)', position: 3, rebuys: 1, startRating: 1500 },
      { name: 'Средний результат (10)', position: 10, rebuys: 0, startRating: 1500 },
      { name: 'Раннее выбывание', position: registeredPlayers - 2, rebuys: 2, startRating: 1500 }
    ];

    const impacts = scenarios.map(scenario => {
      // Базовые очки
      let basePoints = localConfig.base_points + localConfig.participation_bonus;
      
      // Позиционные бонусы
      let positionBonus = 0;
      if (scenario.position === 1) positionBonus += localConfig.first_place_bonus;
      if (scenario.position === 2) positionBonus += localConfig.second_place_bonus;
      if (scenario.position === 3) positionBonus += localConfig.third_place_bonus;
      if (scenario.position <= 3) positionBonus += localConfig.top_3_bonus;

      // Призовые очки (если есть выплаты)
      let prizePoints = 0;
      const prizePlace = payoutStructure.find(p => p.place === scenario.position);
      if (prizePlace) {
        prizePoints = Math.round(prizePlace.amount * localConfig.prize_coefficient / 100);
        prizePoints = Math.min(prizePoints, localConfig.max_prize_points);
        prizePoints = Math.max(prizePoints, localConfig.min_prize_points);
      }

      // Модификаторы ребаев
      const rebuyModifier = scenario.rebuys * localConfig.rebuy_multiplier;

      const totalChange = basePoints + positionBonus + prizePoints + rebuyModifier;

      return {
        scenario: scenario.name,
        basePoints,
        prizePoints,
        positionBonus,
        totalChange,
        estimatedNewRating: scenario.startRating + totalChange
      };
    });

    setRatingImpacts(impacts);
  };

  const saveAllSettings = async () => {
    setIsSaving(true);
    try {
      // Сохраняем конфигурацию рейтингов
      await saveConfig(localConfig);

      // Сохраняем структуру выплат если выбран турнир
      if (selectedTournament && payoutStructure.length > 0) {
        // Удаляем старые выплаты
        await supabase
          .from('tournament_payouts')
          .delete()
          .eq('tournament_id', selectedTournament.id);

        // Добавляем новые
        const payoutsToInsert = payoutStructure.map(payout => ({
          tournament_id: selectedTournament.id,
          place: payout.place,
          percentage: payout.percentage / 100,
          amount: payout.amount
        }));

        await supabase
          .from('tournament_payouts')
          .insert(payoutsToInsert);
      }

      toast({
        title: 'Настройки сохранены',
        description: 'Конфигурация рейтингов и призовой структуры обновлена'
      });

      onTournamentUpdate?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfigField = (field: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePayoutPlace = (place: number, field: 'percentage' | 'amount', value: number) => {
    setPayoutStructure(prev => prev.map(p => 
      p.place === place 
        ? { ...p, [field]: value }
        : p
    ));
  };

  const addPayoutPlace = () => {
    const newPlace = payoutStructure.length + 1;
    setPayoutStructure(prev => [...prev, {
      place: newPlace,
      percentage: 5,
      amount: Math.round(totalPrizePool * 0.05)
    }]);
  };

  const removePayoutPlace = (place: number) => {
    setPayoutStructure(prev => prev.filter(p => p.place !== place));
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-primary mx-auto mb-4"></div>
          <p>Загрузка настроек...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Заголовок с информацией о турнире */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-poker-border shadow-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-poker-primary/10 rounded-lg">
                <LinkIcon className="h-6 w-6 text-poker-primary" />
              </div>
              <div>
                <CardTitle className="text-poker-text-primary">
                  Интегрированные настройки турнира и RPS
                </CardTitle>
                <p className="text-poker-text-muted mt-1">
                  {selectedTournament 
                    ? `${selectedTournament.name} • ${registeredPlayers} игроков`
                    : 'Выберите турнир для настройки интегрированных параметров'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeProfile && (
                <Badge variant="outline" className="bg-white/50">
                  {activeProfile.name}
                </Badge>
              )}
              {selectedTournament && (
                <Badge className="bg-poker-primary text-white">
                  {selectedTournament.tournament_format || 'Freezeout'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="rating" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Рейтинги</span>
          </TabsTrigger>
          <TabsTrigger value="prizes" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Призы</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Интеграция</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">Предпросмотр</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Статистика турнира */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Турнир
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Игроки:</span>
                  <span className="font-semibold">{registeredPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Бай-ин:</span>
                  <span className="font-semibold">{selectedTournament?.buy_in || 0} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Призовой фонд:</span>
                  <span className="font-semibold text-green-600">{totalPrizePool.toLocaleString()} ₽</span>
                </div>
              </CardContent>
            </Card>

            {/* Статистика RPS */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Pool-Based RPS система
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Очков в фонде:</span>
                  <span className="font-semibold">{Math.floor((selectedTournament?.buy_in || 1000) * registeredPlayers / 10)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Коэффициент:</span>
                  <span className="font-semibold">1000₽ = 100 очков</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-poker-text-muted">Система:</span>
                  <span className="font-semibold text-blue-600">Pool-Based</span>
                </div>
              </CardContent>
            </Card>

            {/* Интеграция */}
            <Card className="bg-gradient-card border-poker-border shadow-minimal">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Интеграция
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-poker-text-muted">RPS ↔ Призы:</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-poker-text-muted">Автоматический расчёт:</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-poker-text-muted">Синхронизация:</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedTournament && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Турнир активен:</strong> Изменения настроек рейтингов будут применены к текущему турниру "{selectedTournament.name}".
                Новая Pool-Based система автоматически рассчитывает очки на основе призового фонда турнира.
                <br />
                <strong>💡 Совет:</strong> Используйте кнопку "Пересчитать рейтинги" во вкладке "Анализ" для пересчета существующих турниров с новой системой.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="rating" className="space-y-6">
          {/* Уведомление о новой системе */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>🎯 Новая Pool-Based RPS система:</strong> Теперь рейтинговые очки рассчитываются на основе призового фонда турнира. 
              Каждые 1000₽ бай-ина = 100 очков в призовом фонде для распределения среди призёров. 
              Бонусы за участие, ребаи и аддоны больше не начисляются.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Основные настройки рейтинга */}
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-poker-accent" />
                  Основные параметры RPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Базовые очки */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Базовые очки за турнир</Label>
                  <Input
                    type="number"
                    value={localConfig.base_points}
                    onChange={(e) => updateConfigField('base_points', parseInt(e.target.value))}
                    className="border-poker-border focus:border-poker-accent"
                  />
                  <p className="text-xs text-poker-text-muted">
                    Минимальное количество очков за участие в турнире
                  </p>
                </div>

                {/* Бонус за участие */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Бонус за участие</Label>
                  <Input
                    type="number"
                    value={localConfig.participation_bonus}
                    onChange={(e) => updateConfigField('participation_bonus', parseInt(e.target.value))}
                    className="border-poker-border focus:border-poker-accent"
                  />
                </div>

                {/* Призовой коэффициент */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Призовой коэффициент (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={localConfig.prize_coefficient}
                    onChange={(e) => updateConfigField('prize_coefficient', parseFloat(e.target.value))}
                    className="border-poker-border focus:border-poker-accent"
                  />
                  <p className="text-xs text-poker-text-muted">
                    Процент от призовой суммы, добавляемый к рейтингу
                  </p>
                </div>

                <Separator />

                {/* Позиционные бонусы */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Позиционные бонусы</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">1 место</Label>
                      <Input
                        type="number"
                        value={localConfig.first_place_bonus}
                        onChange={(e) => updateConfigField('first_place_bonus', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">2 место</Label>
                      <Input
                        type="number"
                        value={localConfig.second_place_bonus}
                        onChange={(e) => updateConfigField('second_place_bonus', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">3 место</Label>
                      <Input
                        type="number"
                        value={localConfig.third_place_bonus}
                        onChange={(e) => updateConfigField('third_place_bonus', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Топ-3 бонус</Label>
                      <Input
                        type="number"
                        value={localConfig.top_3_bonus}
                        onChange={(e) => updateConfigField('top_3_bonus', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Модификаторы для офлайн покера */}
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-poker-accent" />
                  Модификаторы офлайн покера
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ребай модификатор */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Мультипликатор ребаев</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={localConfig.rebuy_multiplier}
                    onChange={(e) => updateConfigField('rebuy_multiplier', parseFloat(e.target.value))}
                    className="border-poker-border focus:border-poker-accent"
                  />
                  <p className="text-xs text-poker-text-muted">
                    Влияние ребаев на изменение рейтинга (может быть отрицательным)
                  </p>
                </div>

                {/* Аддон модификатор */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Мультипликатор аддонов</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={localConfig.addon_multiplier}
                    onChange={(e) => updateConfigField('addon_multiplier', parseFloat(e.target.value))}
                    className="border-poker-border focus:border-poker-accent"
                  />
                </div>

                {/* Учёт размера поля */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Учёт размера поля</Label>
                    <Switch
                      checked={localConfig.field_size_modifier}
                      onCheckedChange={(checked) => updateConfigField('field_size_modifier', checked)}
                    />
                  </div>
                  <p className="text-xs text-poker-text-muted">
                    Увеличение очков за победы в больших турнирах
                  </p>
                </div>

                {/* Учёт бай-ина */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Учёт размера бай-ина</Label>
                    <Switch
                      checked={localConfig.buy_in_modifier}
                      onCheckedChange={(checked) => updateConfigField('buy_in_modifier', checked)}
                    />
                  </div>
                  <p className="text-xs text-poker-text-muted">
                    Дополнительные очки в дорогих турнирах
                  </p>
                </div>

                <Separator />

                {/* Ограничения */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Ограничения рейтинга</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Мин. рейтинг</Label>
                      <Input
                        type="number"
                        value={localConfig.min_rating}
                        onChange={(e) => updateConfigField('min_rating', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Макс. рейтинг</Label>
                      <Input
                        type="number"
                        value={localConfig.max_rating}
                        onChange={(e) => updateConfigField('max_rating', parseInt(e.target.value))}
                        className="border-poker-border focus:border-poker-accent"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-6">
          {selectedTournament ? (
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-poker-accent" />
                  Призовая структура турнира
                </CardTitle>
                <p className="text-poker-text-muted mt-1">
                  Настройка распределения призового фонда и интеграция с рейтинговой системой
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Информация о призовом фонде */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalPrizePool.toLocaleString()} ₽</div>
                    <div className="text-sm text-blue-600/80">Общий призовой фонд</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{payoutStructure.length}</div>
                    <div className="text-sm text-green-600/80">Призовых мест</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((payoutStructure.length / registeredPlayers) * 100)}%
                    </div>
                    <div className="text-sm text-purple-600/80">В призах</div>
                  </div>
                </div>

                {/* Таблица выплат */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Структура выплат</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addPayoutPlace}
                      className="border-poker-border"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Добавить место
                    </Button>
                  </div>

                  <div className="border border-poker-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 border-b border-poker-border font-medium text-sm">
                      <div>Место</div>
                      <div>Процент</div>
                      <div>Сумма</div>
                      <div>RPS очки</div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {payoutStructure.map((payout, index) => {
                        const rpsPoints = Math.round(payout.amount * localConfig.prize_coefficient / 100);
                        const clampedPoints = Math.min(
                          Math.max(rpsPoints, localConfig.min_prize_points),
                          localConfig.max_prize_points
                        );
                        
                        return (
                          <div key={payout.place} className="grid grid-cols-4 gap-4 p-3 border-b border-poker-border last:border-b-0 hover:bg-gray-50">
                            <div className="font-medium">{payout.place}</div>
                            <div>
                              <Input
                                type="number"
                                step="0.1"
                                value={payout.percentage}
                                onChange={(e) => updatePayoutPlace(payout.place, 'percentage', parseFloat(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                value={payout.amount}
                                onChange={(e) => updatePayoutPlace(payout.place, 'amount', parseInt(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-600">+{clampedPoints}</span>
                              {payoutStructure.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePayoutPlace(payout.place)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Быстрые шаблоны */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Быстрые шаблоны</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => calculateDefaultPayouts()}
                      className="border-poker-border"
                    >
                      Стандартная структура
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Турбо структура - меньше мест, больше в топ
                        const turboPayouts = [
                          { place: 1, percentage: 70, amount: Math.round(totalPrizePool * 0.7) },
                          { place: 2, percentage: 30, amount: Math.round(totalPrizePool * 0.3) }
                        ];
                        setPayoutStructure(turboPayouts);
                      }}
                      className="border-poker-border"
                    >
                      Турбо (Топ-heavy)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Флэт структура - больше мест, меньше разница
                        const flatCount = Math.min(Math.floor(registeredPlayers / 3), 8);
                        const flatPayouts = Array.from({ length: flatCount }, (_, i) => {
                          const percentage = (100 / flatCount) * (1 - i * 0.1);
                          return {
                            place: i + 1,
                            percentage,
                            amount: Math.round(totalPrizePool * percentage / 100)
                          };
                        });
                        setPayoutStructure(flatPayouts);
                      }}
                      className="border-poker-border"
                    >
                      Плоская структура
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-card border-poker-border shadow-elevated">
              <CardContent className="text-center py-16">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Турнир не выбран</h3>
                <p className="text-gray-500">Выберите турнир для настройки призовой структуры</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-poker-accent" />
                Интеграция RPS с турниром
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTournament ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Статус интеграции */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-poker-text-primary">Статус интеграции</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm">Связь RPS ↔ Призы</span>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm">Автоматический расчёт рейтинга</span>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm">Синхронизация с турниром</span>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Параметры интеграции */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-poker-text-primary">Параметры для турнира</h4>
                    
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-poker-text-muted">Формат турнира:</span>
                        <span className="font-medium">{selectedTournament.tournament_format || 'Freezeout'}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-poker-text-muted">Бай-ин:</span>
                        <span className="font-medium">{selectedTournament.buy_in} ₽</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-poker-text-muted">Ребай:</span>
                        <span className="font-medium">
                          {selectedTournament.rebuy_cost ? `${selectedTournament.rebuy_cost} ₽` : 'Нет'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-poker-text-muted">Аддон:</span>
                        <span className="font-medium">
                          {selectedTournament.addon_cost ? `${selectedTournament.addon_cost} ₽` : 'Нет'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Нет активного турнира</h3>
                  <p className="text-gray-500">Выберите турнир для просмотра параметров интеграции</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-poker-accent" />
                Предпросмотр изменений рейтинга
              </CardTitle>
              <p className="text-poker-text-muted mt-1">
                Симуляция изменения рейтинга для различных результатов в турнире
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {ratingImpacts.length > 0 ? (
                <div className="space-y-4">
                  {ratingImpacts.map((impact, index) => (
                    <motion.div
                      key={impact.scenario}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border border-poker-border rounded-lg bg-white/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-poker-text-primary">{impact.scenario}</h4>
                        <Badge 
                          variant={impact.totalChange > 0 ? "default" : "secondary"}
                          className={impact.totalChange > 0 ? "bg-green-600" : "bg-red-600"}
                        >
                          {impact.totalChange > 0 ? '+' : ''}{impact.totalChange} очков
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-poker-text-muted">Базовые:</span>
                          <div className="font-medium">+{impact.basePoints}</div>
                        </div>
                        <div>
                          <span className="text-poker-text-muted">Позиция:</span>
                          <div className="font-medium">+{impact.positionBonus}</div>
                        </div>
                        <div>
                          <span className="text-poker-text-muted">Призовые:</span>
                          <div className="font-medium">+{impact.prizePoints}</div>
                        </div>
                        <div>
                          <span className="text-poker-text-muted">Новый рейтинг:</span>
                          <div className="font-medium text-blue-600">{impact.estimatedNewRating}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gauge className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Нет данных для предпросмотра</h3>
                  <p className="text-gray-500">Выберите турнир и настройте параметры для просмотра влияния на рейтинг</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Панель действий */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-poker-border shadow-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/10 rounded-lg">
                <Save className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-poker-text-primary">Сохранение настроек</h4>
                <p className="text-sm text-poker-text-muted">
                  Применить все изменения к рейтинговой системе и призовой структуре
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setLocalConfig(config)}
                className="border-poker-border"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
              
              <Button
                onClick={saveAllSettings}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить всё
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}