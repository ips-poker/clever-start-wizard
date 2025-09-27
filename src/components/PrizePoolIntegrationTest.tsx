import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Trophy, DollarSign, Star } from 'lucide-react';

interface PayoutData {
  place: number;
  percentage: number;
  amount: number;
}

interface TestData {
  tournament_name: string;
  tournament_id: string;
  total_prize_pool: number;
  payout_structure: PayoutData[];
  players_count: number;
}

const PrizePoolIntegrationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const { toast } = useToast();

  const loadTournamentData = async () => {
    setIsLoading(true);
    try {
      // Получаем последний завершенный турнир с призовым фондом
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'finished')
        .order('finished_at', { ascending: false })
        .limit(1)
        .single();

      if (!tournament) {
        throw new Error('Нет завершенных турниров');
      }

      // Получаем структуру призового фонда
      const { data: payouts } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('place');

      if (!payouts || payouts.length === 0) {
        throw new Error('Нет структуры призового фонда для турнира');
      }

      // Получаем количество участников
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('player_id, rebuys, addons')
        .eq('tournament_id', tournament.id);

      if (!registrations || registrations.length === 0) {
        throw new Error('Нет участников в турнире');
      }

      // Рассчитываем общий призовой фонд
      let totalPrizePool = 0;
      registrations.forEach(reg => {
        const rebuys = reg.rebuys || 0;
        const addons = reg.addons || 0;
        totalPrizePool += tournament.buy_in + 
          (rebuys * (tournament.rebuy_cost || 0)) + 
          (addons * (tournament.addon_cost || 0));
      });

      setTestData({
        tournament_name: tournament.name,
        tournament_id: tournament.id,
        total_prize_pool: totalPrizePool,
        payout_structure: payouts,
        players_count: registrations.length
      });

      toast({
        title: "Данные загружены",
        description: `Турнир "${tournament.name}" с призовым фондом ${totalPrizePool.toLocaleString()}₽`
      });

    } catch (error) {
      console.error('Error loading tournament data:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRatingCalculation = async () => {
    if (!testData) {
      toast({
        title: "Ошибка",
        description: "Сначала загрузите данные турнира",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Создаем тестовые результаты для демонстрации
      const testResults = testData.payout_structure.map((payout, index) => ({
        player_id: `test-player-${index + 1}`,
        position: payout.place,
        rebuys: index % 2, // Чередуем ребаи
        addons: index % 3 === 0 ? 1 : 0 // Каждый третий с адоном
      }));

      console.log('🧪 ТЕСТ ИНТЕГРАЦИИ С ПРИЗОВЫМ ФОНДОМ:', {
        tournament_id: testData.tournament_id,
        total_prize_pool: testData.total_prize_pool,
        payout_structure: testData.payout_structure,
        test_results: testResults
      });

      // Имитируем расчет рейтинговых очков
      const calculations = testData.payout_structure.map((payout, index) => {
        const prizeAmount = (testData.total_prize_pool * payout.percentage) / 100;
        const prizePoints = Math.max(1, Math.floor(prizeAmount * 0.001)); // 0.1% от выигрыша
        const basePoints = 1; // Базовые очки за участие
        const rebuyAddonPoints = testResults[index].rebuys + testResults[index].addons;
        const totalPoints = basePoints + rebuyAddonPoints + prizePoints;

        return {
          place: payout.place,
          percentage: payout.percentage,
          prize_amount: prizeAmount,
          prize_points: prizePoints,
          base_points: basePoints,
          rebuy_addon_points: rebuyAddonPoints,
          total_rps_points: totalPoints
        };
      });

      setCalculationResult(calculations);

      toast({
        title: "Расчет выполнен",
        description: `Рассчитаны очки для ${calculations.length} призовых мест`
      });

    } catch (error) {
      console.error('Error testing calculation:', error);
      toast({
        title: "Ошибка теста",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceBadge = (place: number) => {
    if (place === 1) return <Badge className="bg-yellow-500 text-white">🥇 1 место</Badge>;
    if (place === 2) return <Badge className="bg-gray-400 text-white">🥈 2 место</Badge>;
    if (place === 3) return <Badge className="bg-amber-600 text-white">🥉 3 место</Badge>;
    return <Badge variant="outline">{place} место</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            🧪 Тест интеграции рейтинговой системы с призовым фондом
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={loadTournamentData}
              disabled={isLoading}
              variant="outline"
            >
              <Trophy className="w-4 h-4 mr-2" />
              1. Загрузить данные турнира
            </Button>
            <Button 
              onClick={testRatingCalculation}
              disabled={isLoading || !testData}
            >
              <Star className="w-4 h-4 mr-2" />
              2. Протестировать расчет рейтингов
            </Button>
          </div>

          {testData && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Данные турнира: {testData.tournament_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {testData.total_prize_pool.toLocaleString()}₽
                    </div>
                    <div className="text-sm text-gray-600">Общий призовой фонд</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {testData.payout_structure.length}
                    </div>
                    <div className="text-sm text-gray-600">Призовых мест</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {testData.players_count}
                    </div>
                    <div className="text-sm text-gray-600">Участников</div>
                  </div>
                </div>

                <h4 className="font-medium mb-2">Структура призового фонда:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {testData.payout_structure.map((payout) => (
                    <div key={payout.place} className="flex items-center justify-between p-2 bg-white rounded border">
                      {getPlaceBadge(payout.place)}
                      <span className="font-medium">{payout.percentage}%</span>
                      <span className="text-sm font-bold">{payout.amount.toLocaleString()}₽</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {calculationResult && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg text-green-700">
                  📊 Результаты расчета рейтинговых очков (0.1% от выигрыша)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calculationResult.map((calc: any) => (
                    <div key={calc.place} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        {getPlaceBadge(calc.place)}
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">
                            +{calc.total_rps_points} RP
                          </div>
                          <div className="text-sm text-gray-600">Всего очков</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <div className="text-gray-600">Выигрыш:</div>
                          <div className="font-medium">{calc.prize_amount.toLocaleString()}₽</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Призовые очки:</div>
                          <div className="font-medium text-green-600">+{calc.prize_points} RP</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Участие:</div>
                          <div className="font-medium">+{calc.base_points} RP</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Ребаи/Адоны:</div>
                          <div className="font-medium">+{calc.rebuy_addon_points} RP</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Формула: {calc.prize_amount.toLocaleString()}₽ × 0.1% = {calc.prize_points} RP (min 1)
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium mb-2 text-yellow-800">🔄 Как работает интеграция:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside text-yellow-700">
              <li>Система берет структуру призовых мест из таблицы tournament_payouts</li>
              <li>Рассчитывает общий призовой фонд (бай-ин + ребаи + адоны всех участников)</li>
              <li>Для каждого призового места вычисляет сумму выигрыша</li>
              <li>Присуждает 0.1% от выигрыша как рейтинговые очки (минимум 1 очко)</li>
              <li>Добавляет базовые очки за участие и бонусы за ребаи/адоны</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizePoolIntegrationTest;