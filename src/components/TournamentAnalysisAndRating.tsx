import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Calculator, 
  Users, 
  DollarSign, 
  Star,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X
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
  const [isEditingPayouts, setIsEditingPayouts] = useState(false);
  const [editedPayouts, setEditedPayouts] = useState<any[]>([]);
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

      // ВАЖНО: Проверяем реальные позиции из базы данных
      console.log('🔍 Анализ позиций участников:', participants.map(p => ({
        name: p.players?.name,
        position: p.position,
        final_position: p.final_position,
        status: p.status,
        eliminated_at: p.eliminated_at,
        created_at: p.created_at
      })));

      // ПОЗИЦИИ УЖЕ ПРАВИЛЬНЫЕ: final_position теперь корректно рассчитывается функцией calculate_final_positions
      // 1 место = последний выбывший (победитель), 2 место = предпоследний выбывший и т.д.
      const participantsWithPositions = participants.map(p => {
        let corrected_position;
        
        if (p.status === 'eliminated' && p.final_position) {
          // final_position уже рассчитан правильно: 1=победитель, 2=второе место и т.д.
          corrected_position = p.final_position;
        } else if (p.position && p.position > 0) {
          // Для активных игроков или тех, кому вручную установили позицию
          corrected_position = p.position;
        } else {
          // Если нет ни того, ни другого - ошибка
          corrected_position = null;
        }

        return {
          ...p,
          corrected_position
        };
      });

      // Проверяем, что у всех участников есть позиции
      const participantsWithoutPositions = participantsWithPositions.filter(p => p.corrected_position === null || p.corrected_position === undefined);
      
      if (participantsWithoutPositions.length > 0) {
        console.warn('⚠️ ПРОБЛЕМА: У некоторых участников отсутствуют позиции:', participantsWithoutPositions.map(p => p.players?.name));
        
        throw new Error(`
          Не все участники имеют корректные позиции! 
          
          Участники без позиций: ${participantsWithoutPositions.map(p => p.players?.name).join(', ')}
          
          Для корректного анализа призовых мест необходимо:
          1. Завершить игру через рассадку столов (удалить игроков из столов при выбывании)
          2. Для оставшихся игроков установить финальные позиции вручную
          3. Или использовать функцию "Завершить турнир" для автоматического расчета
          
          Игроки выбывают в порядке удаления из рассадки столов.
        `);
      }

      // Сортируем по финальным позициям (1 место = победитель)
      const sortedParticipants = [...participantsWithPositions].sort((a, b) => {
        return a.corrected_position! - b.corrected_position!;
      });

      console.log('✅ Финальные позиции участников:', sortedParticipants.map(p => ({
        name: p.players?.name,
        position: p.corrected_position,
        rebuys: p.rebuys,
        addons: p.addons,
        eliminated_at: p.eliminated_at,
        elimination_order: `${p.eliminated_at ? new Date(p.eliminated_at).toLocaleTimeString() : 'активен'}`
      })));

      const finalParticipants = sortedParticipants;

      // Определяем количество и проценты призовых мест на основе количества участников
      const getPayoutStructure = (playerCount: number) => {
        if (playerCount <= 8) {
          return [{ place: 1, percentage: 60.0 }];
        } else if (playerCount <= 11) {
          return [
            { place: 1, percentage: 50.0 },
            { place: 2, percentage: 30.0 }
          ];
        } else if (playerCount <= 20) {
          return [
            { place: 1, percentage: 40.0 },
            { place: 2, percentage: 27.0 },
            { place: 3, percentage: 19.0 }
          ];
        } else if (playerCount <= 30) {
          return [
            { place: 1, percentage: 36.0 },
            { place: 2, percentage: 25.0 },
            { place: 3, percentage: 17.5 },
            { place: 4, percentage: 14.0 }
          ];
        } else if (playerCount <= 50) {
          return [
            { place: 1, percentage: 34.0 },
            { place: 2, percentage: 23.0 },
            { place: 3, percentage: 16.5 },
            { place: 4, percentage: 11.9 },
            { place: 5, percentage: 8.0 }
          ];
        } else if (playerCount <= 70) {
          return [
            { place: 1, percentage: 31.7 },
            { place: 2, percentage: 20.7 },
            { place: 3, percentage: 15.3 },
            { place: 4, percentage: 10.8 },
            { place: 5, percentage: 7.2 },
            { place: 6, percentage: 6.6 }
          ];
        } else if (playerCount <= 100) {
          return [
            { place: 1, percentage: 30.5 },
            { place: 2, percentage: 19.5 },
            { place: 3, percentage: 13.7 },
            { place: 4, percentage: 10.0 },
            { place: 5, percentage: 6.7 },
            { place: 6, percentage: 5.4 },
            { place: 7, percentage: 4.2 }
          ];
        } else if (playerCount <= 130) {
          return [
            { place: 1, percentage: 29.0 },
            { place: 2, percentage: 18.7 },
            { place: 3, percentage: 13.5 },
            { place: 4, percentage: 9.5 },
            { place: 5, percentage: 6.5 },
            { place: 6, percentage: 5.2 },
            { place: 7, percentage: 4.0 },
            { place: 8, percentage: 3.4 }
          ];
        } else {
          return [
            { place: 1, percentage: 28.0 },
            { place: 2, percentage: 18.0 },
            { place: 3, percentage: 13.0 },
            { place: 4, percentage: 9.3 },
            { place: 5, percentage: 6.3 },
            { place: 6, percentage: 5.0 },
            { place: 7, percentage: 3.9 },
            { place: 8, percentage: 3.3 },
            { place: 9, percentage: 2.9 }
          ];
        }
      };

      // Создаем структуру выплат
      let finalPayoutStructure;
      if (!payoutStructure || payoutStructure.length === 0) {
        // Используем динамическую структуру на основе количества игроков
        const dynamicPayouts = getPayoutStructure(participants.length);
        
        finalPayoutStructure = dynamicPayouts.map(payout => ({
          id: `default-${payout.place}`,
          tournament_id: tournament.id,
          place: payout.place,
          percentage: payout.percentage,
          amount: Math.floor((totalPrizePool * payout.percentage) / 100),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      } else {
        // Пересчитываем суммы для существующей структуры
        finalPayoutStructure = payoutStructure.map(payout => ({
          ...payout,
          amount: Math.floor((totalPrizePool * payout.percentage) / 100)
        }));
      }

      // Рассчитываем рейтинговые очки для каждого участника
      const ratingCalculations = finalParticipants.map(participant => {
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
        
        if (position <= finalPayoutStructure.length) {
          const payout = finalPayoutStructure.find(p => p.place === position);
          if (payout) {
            prizeAmount = payout.amount;
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
        participants: finalParticipants,
        payoutStructure: finalPayoutStructure,
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

  const startEditingPayouts = () => {
    if (!analysis) return;
    setEditedPayouts([...analysis.payoutStructure]);
    setIsEditingPayouts(true);
  };

  const cancelEditingPayouts = () => {
    setIsEditingPayouts(false);
    setEditedPayouts([]);
  };

  const savePayoutStructure = async () => {
    if (!analysis || !editedPayouts.length) return;

    setIsLoading(true);
    try {
      // Удаляем старую структуру
      await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', analysis.tournament.id);

      // Добавляем новую структуру
      const payoutsToInsert = editedPayouts.map(payout => ({
        tournament_id: analysis.tournament.id,
        place: payout.place,
        percentage: parseFloat(payout.percentage),
        amount: Math.floor((analysis.totalPrizePool * parseFloat(payout.percentage)) / 100)
      }));

      const { error } = await supabase
        .from('tournament_payouts')
        .insert(payoutsToInsert);

      if (error) throw error;

      // Обновляем анализ
      const updatedPayoutStructure = payoutsToInsert.map((payout, index) => ({
        ...payout,
        id: `updated-${index}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      setAnalysis({
        ...analysis,
        payoutStructure: updatedPayoutStructure
      });

      setIsEditingPayouts(false);
      setEditedPayouts([]);

      toast({
        title: "Структура призового фонда обновлена",
        description: "Изменения сохранены в базе данных"
      });

    } catch (error) {
      console.error('Error saving payout structure:', error);
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePayoutPercentage = (place: number, percentage: string) => {
    setEditedPayouts(prev => 
      prev.map(payout => 
        payout.place === place 
          ? { ...payout, percentage: parseFloat(percentage) || 0 }
          : payout
      )
    );
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
      <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl group">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-gray-800 text-xl font-light">
            <div className="p-2 bg-purple-100/80 rounded-lg group-hover:bg-purple-200/80 transition-colors">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            Анализ турнира и расчет рейтингов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={analyzeTournament}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-subtle hover:shadow-lg transition-all duration-200"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Анализировать турнир
            </Button>
            <Button 
              onClick={applyCorrectRatings}
              disabled={isLoading || !analysis}
              className="bg-green-600 hover:bg-green-700 text-white shadow-subtle hover:shadow-lg transition-all duration-200"
            >
              <Star className="w-4 h-4 mr-2" />
              Применить рейтинги
            </Button>
          </div>

          {isProcessed && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Рейтинги успешно обновлены!</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Общая информация о турнире */}
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                    <div className="p-2 bg-blue-100/80 rounded-lg">
                      <Trophy className="w-5 h-5 text-blue-600" />
                    </div>
                    {analysis.tournament.name}
                    <Badge className="bg-green-100 text-green-700 border-green-200">Завершен</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center py-3">
                      <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Участников</div>
                      <div className="text-xl font-light text-gray-800">{analysis.participants.length}</div>
                    </div>
                    <div className="text-center py-3">
                      <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Призовой фонд</div>
                      <div className="text-xl font-light text-green-600">{analysis.totalPrizePool.toLocaleString()}₽</div>
                    </div>
                    <div className="text-center py-3">
                      <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Призовых мест</div>
                      <div className="text-xl font-light text-purple-600">{analysis.payoutStructure.length}</div>
                    </div>
                    <div className="text-center py-3">
                      <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Бай-ин</div>
                      <div className="text-xl font-light text-orange-600">{analysis.tournament.buy_in.toLocaleString()}₽</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Структура призов */}
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                      <div className="p-2 bg-yellow-100/80 rounded-lg">
                        <DollarSign className="w-5 h-5 text-yellow-600" />
                      </div>
                      Структура призового фонда
                    </CardTitle>
                    <div className="flex gap-2">
                      {!isEditingPayouts ? (
                        <Button
                          onClick={startEditingPayouts}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Редактировать
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={savePayoutStructure}
                            disabled={isLoading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Сохранить
                          </Button>
                          <Button
                            onClick={cancelEditingPayouts}
                            variant="outline"
                            size="sm"
                            className="border-gray-200 hover:bg-gray-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Отменить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingPayouts ? (
                    <div className="space-y-3">
                      {editedPayouts.map((payout) => (
                        <div key={payout.place} className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-gray-200/50">
                          {getPositionBadge(payout.place)}
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={payout.percentage}
                              onChange={(e) => updatePayoutPercentage(payout.place, e.target.value)}
                              className="w-20 border-gray-200/50"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            = {Math.floor((analysis.totalPrizePool * payout.percentage) / 100).toLocaleString()}₽
                          </div>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 text-center pt-2">
                        Общий процент: {editedPayouts.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysis.payoutStructure.map((payout) => (
                        <div key={payout.place} className="bg-white/80 rounded-lg border border-gray-200/50 p-4 text-center">
                          <div className="flex items-center justify-center mb-3">
                            {getPositionBadge(payout.place)}
                          </div>
                          <div className="text-lg font-light text-gray-600 mb-1">{payout.percentage}%</div>
                          <div className="text-xl font-light text-green-600 mb-2">
                            {payout.amount.toLocaleString()}₽
                          </div>
                          <div className="text-xs text-gray-500">
                            RPS: {Math.max(1, Math.floor(payout.amount * 0.001))} очков
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Рейтинговые расчеты */}
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                    <div className="p-2 bg-green-100/80 rounded-lg">
                      <Star className="w-5 h-5 text-green-600" />
                    </div>
                    Расчет рейтинговых очков (RPS)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysis.ratingCalculations.map((calc) => (
                      <div 
                        key={calc.player_id} 
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          calc.is_winner 
                            ? 'bg-white/90 border-green-300/50 shadow-minimal' 
                            : 'bg-gray-50/80 border-gray-200/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getPositionBadge(calc.position)}
                            <span className="font-medium text-gray-800">{calc.player_name}</span>
                            {calc.is_winner && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-right">
                            <div className="font-light text-lg text-green-600">
                              +{calc.total_rps_change} RPS
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Участие</div>
                            <div className="font-medium text-gray-700">+{calc.base_points} RPS</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Ребаи/Адоны</div>
                            <div className="font-medium text-gray-700">+{calc.rebuy_addon_points} RPS</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Призовые</div>
                            <div className="font-medium text-green-600">+{calc.prize_points} RPS</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Выигрыш</div>
                            <div className="font-medium text-gray-700">{calc.prize_amount.toLocaleString()}₽</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentAnalysisAndRating;