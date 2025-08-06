import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Calculator, 
  Users, 
  DollarSign, 
  Star,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';

interface TournamentAnalysis {
  tournament: any;
  participants: any[];
  payoutStructure: any[];
  totalPrizePool: number;
  ratingCalculations: any[];
}

const TournamentAnalysisAndRating = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TournamentAnalysis | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const { toast } = useToast();

  const analyzeTournament = async () => {
    setIsLoading(true);
    try {
      // Получаем последний завершенный турнир
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

      // Получаем участников
      const { data: participants } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          players(name)
        `)
        .eq('tournament_id', tournament.id);

      // Получаем структуру выплат
      const { data: payoutStructure } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('place');

      if (!participants || !payoutStructure) {
        throw new Error('Нет данных турнира');
      }

      // Рассчитываем общий призовой фонд
      let totalPrizePool = 0;
      participants.forEach(p => {
        const rebuys = p.rebuys || 0;
        const addons = p.addons || 0;
        totalPrizePool += tournament.buy_in + 
          (rebuys * (tournament.rebuy_cost || 0)) + 
          (addons * (tournament.addon_cost || 0));
      });

      // Присваиваем корректные позиции (эмулируем порядок вылета)
      // Последний в списке = победитель (1 место)
      const participantsWithPositions = participants.map((p, index) => ({
        ...p,
        corrected_position: participants.length - index // Инвертируем позиции
      }));

      // Рассчитываем рейтинговые очки для каждого участника
      const ratingCalculations = participantsWithPositions.map(participant => {
        const position = participant.corrected_position;
        const rebuys = participant.rebuys || 0;
        const addons = participant.addons || 0;
        
        // Базовые очки за участие
        let rpsChange = 1;
        
        // Бонусы за ребаи и адоны
        rpsChange += rebuys + addons;
        
        // Призовые баллы (только для призовых мест)
        let prizePoints = 0;
        let prizeAmount = 0;
        let isWinner = false;
        
        if (position <= payoutStructure.length) {
          const payout = payoutStructure.find(p => p.place === position);
          if (payout) {
            prizeAmount = (totalPrizePool * payout.percentage) / 100;
            prizePoints = Math.max(1, Math.floor(prizeAmount * 0.001)); // 0.1% от выигрыша
            rpsChange += prizePoints;
            isWinner = true;
          }
        }

        return {
          player_id: participant.player_id,
          player_name: participant.players?.name || 'Unknown',
          position,
          rebuys,
          addons,
          base_points: 1,
          rebuy_addon_points: rebuys + addons,
          prize_points: prizePoints,
          prize_amount: prizeAmount,
          total_rps_change: rpsChange,
          is_winner: isWinner
        };
      });

      // Сортируем по позициям
      ratingCalculations.sort((a, b) => a.position - b.position);

      setAnalysis({
        tournament,
        participants: participantsWithPositions,
        payoutStructure,
        totalPrizePool,
        ratingCalculations
      });

      toast({
        title: "Анализ завершен",
        description: `Турнир "${tournament.name}" проанализирован. ${participants.length} участников, призовой фонд ${totalPrizePool.toLocaleString()}₽`
      });

    } catch (error) {
      console.error('Error analyzing tournament:', error);
      toast({
        title: "Ошибка анализа",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyCorrectRatings = async () => {
    if (!analysis) return;

    setIsLoading(true);
    try {
      // Удаляем старые результаты если есть
      const { error: deleteError } = await supabase
        .from('game_results')
        .delete()
        .eq('tournament_id', analysis.tournament.id);

      if (deleteError) {
        console.warn('No old results to delete:', deleteError);
      }

      // Применяем корректные позиции к регистрациям
      const updatePromises = analysis.ratingCalculations.map(calc => 
        supabase
          .from('tournament_registrations')
          .update({ position: calc.position })
          .eq('tournament_id', analysis.tournament.id)
          .eq('player_id', calc.player_id)
      );

      await Promise.all(updatePromises);

      // Вызываем функцию расчета рейтингов
      const results = analysis.ratingCalculations.map(calc => ({
        player_id: calc.player_id,
        position: calc.position,
        rebuys: calc.rebuys,
        addons: calc.addons
      }));

      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: analysis.tournament.id,
          results
        }
      });

      if (error) {
        console.error('Error from calculate-elo:', error);
        throw error;
      }

      console.log('✅ RPS рейтинги успешно пересчитаны:', data);

      setIsProcessed(true);
      
      toast({
        title: "RPS рейтинги обновлены!",
        description: `Корректные RPS рейтинги присвоены ${analysis.ratingCalculations.length} игрокам`
      });

    } catch (error) {
      console.error('Error applying ratings:', error);
      toast({
        title: "Ошибка применения RPS рейтингов",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500 text-white">🥇 1 место</Badge>;
    if (position === 2) return <Badge className="bg-gray-400 text-white">🥈 2 место</Badge>;
    if (position === 3) return <Badge className="bg-amber-600 text-white">🥉 3 место</Badge>;
    if (position <= 6) return <Badge className="bg-green-600 text-white">🏆 {position} место</Badge>;
    return <Badge variant="outline">{position} место</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            🏆 Комплексный анализ турнира и расстановка рейтингов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={analyzeTournament}
              disabled={isLoading}
              variant="outline"
            >
              <Trophy className="w-4 h-4 mr-2" />
              1. Анализировать турнир
            </Button>
            <Button 
              onClick={applyCorrectRatings}
              disabled={isLoading || !analysis}
              className="bg-green-600 hover:bg-green-700"
            >
              <Star className="w-4 h-4 mr-2" />
              2. Применить корректные рейтинги
            </Button>
          </div>

          {isProcessed && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Рейтинги успешно обновлены!</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Информация о турнире */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Турнир: {analysis.tournament.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.participants.length}
                      </div>
                      <div className="text-sm text-gray-600">Участников</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {analysis.totalPrizePool.toLocaleString()}₽
                      </div>
                      <div className="text-sm text-gray-600">Призовой фонд</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {analysis.payoutStructure.length}
                      </div>
                      <div className="text-sm text-gray-600">Призовых мест</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {analysis.tournament.buy_in.toLocaleString()}₽
                      </div>
                      <div className="text-sm text-gray-600">Бай-ин</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Призовые места и выплаты */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Структура призового фонда
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analysis.payoutStructure.map((payout) => (
                      <div key={payout.place} className="p-3 bg-white rounded-lg border border-yellow-300">
                        <div className="flex items-center justify-between mb-2">
                          {getPositionBadge(payout.place)}
                          <span className="font-bold text-lg">{payout.percentage}%</span>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {payout.amount.toLocaleString()}₽
                          </div>
                          <div className="text-sm text-gray-600">
                            RP: {Math.max(1, Math.floor(payout.amount * 0.001))} очков
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Рейтинговые расчеты */}
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Расчет рейтинговых очков (RP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysis.ratingCalculations.map((calc) => (
                      <div 
                        key={calc.player_id} 
                        className={`p-3 rounded-lg border ${
                          calc.is_winner 
                            ? 'bg-white border-green-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getPositionBadge(calc.position)}
                            <span className="font-medium">{calc.player_name}</span>
                            {calc.is_winner && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-green-600">
                              +{calc.total_rps_change} RP
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <div className="text-gray-600">Участие:</div>
                            <div className="font-medium">+{calc.base_points} RP</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Ребаи/Адоны:</div>
                            <div className="font-medium">+{calc.rebuy_addon_points} RP</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Призовые:</div>
                            <div className="font-medium text-green-600">+{calc.prize_points} RP</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Выигрыш:</div>
                            <div className="font-medium">{calc.prize_amount.toLocaleString()}₽</div>
                          </div>
                        </div>

                        {calc.is_winner && (
                          <div className="mt-2 text-xs text-green-600">
                            🏆 Формула призовых: {calc.prize_amount.toLocaleString()}₽ × 0.1% = {calc.prize_points} RP
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium mb-2 text-blue-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  📊 Ключевые принципы расчета RPS:
                </h4>
                <ul className="text-sm space-y-1 text-blue-700 list-disc list-inside">
                  <li><strong>Позиции:</strong> Кто последний вылетел = 1 место (победитель)</li>
                  <li><strong>Базовые очки:</strong> +1 RP за участие в турнире</li>
                  <li><strong>Активность:</strong> +1 RP за каждый ребай/адон</li>
                  <li><strong>Призовые:</strong> 0.1% от суммы выигрыша как RP (минимум 1 RP)</li>
                  <li><strong>База RPS:</strong> Начальный рейтинг 100 очков, не 1200</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentAnalysisAndRating;