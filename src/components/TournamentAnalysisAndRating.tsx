import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  X,
  BarChart3
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

  const getPlayerAvatar = (playerId: string, playerName: string) => {
    // Используем хеш от ID для выбора аватара
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

      // Проверяем позиции участников
      const participantsWithPositions = participants.map(p => {
        let corrected_position;
        
        if (p.status === 'eliminated' && p.final_position) {
          corrected_position = p.final_position;
        } else if (p.position && p.position > 0) {
          corrected_position = p.position;
        } else {
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
        throw new Error(`
          Не все участники имеют корректные позиции! 
          
          Участники без позиций: ${participantsWithoutPositions.map(p => p.players?.name).join(', ')}
          
          Для корректного анализа призовых мест необходимо:
          1. Завершить игру через рассадку столов (удалить игроков из столов при выбывании)
          2. Для оставшихся игроков установить финальные позиции вручную
          3. Или использовать функцию "Завершить турнир" для автоматического расчета
        `);
      }

      // Сортируем по финальным позициям (1 место = победитель)
      const sortedParticipants = [...participantsWithPositions].sort((a, b) => {
        return a.corrected_position! - b.corrected_position!;
      });

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
        
        let rpsChange = 1;
        rpsChange += rebuys + addons;
        
        let prizePoints = 0;
        let prizeAmount = 0;
        let isWinner = false;
        
        if (position <= finalPayoutStructure.length) {
          const payout = finalPayoutStructure.find(p => p.place === position);
          if (payout) {
            prizeAmount = payout.amount;
            prizePoints = Math.max(1, Math.floor(prizeAmount * 0.001));
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
      const { error: deleteError } = await supabase
        .from('game_results')
        .delete()
        .eq('tournament_id', analysis.tournament.id);

      if (deleteError) {
        console.warn('No old results to delete:', deleteError);
      }

      const updatePromises = analysis.ratingCalculations.map(calc => 
        supabase
          .from('tournament_registrations')
          .update({ position: calc.position })
          .eq('tournament_id', analysis.tournament.id)
          .eq('player_id', calc.player_id)
      );

      await Promise.all(updatePromises);

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
      await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', analysis.tournament.id);

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
    if (position === 1) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-full">
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
            1
          </div>
          <span className="text-yellow-800 font-medium text-sm">Чемпион</span>
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/50 rounded-full">
          <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
            2
          </div>
          <span className="text-gray-700 font-medium text-sm">Финалист</span>
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 rounded-full">
          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
            3
          </div>
          <span className="text-orange-800 font-medium text-sm">Призёр</span>
        </div>
      );
    }
    if (position <= 6) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-full">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
            {position}
          </div>
          <span className="text-green-800 font-medium text-sm">ITM</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200/50 rounded-full">
        <div className="w-6 h-6 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
          {position}
        </div>
        <span className="text-slate-600 font-medium text-sm">Место</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white/50 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50/80 to-gray-50/80 border-b border-white/20">
          <CardTitle className="flex items-center gap-3 text-slate-800 font-medium text-xl">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Анализатор турнира
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={analyzeTournament} 
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Анализируем...
                </div>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Анализировать последний турнир
                </>
              )}
            </Button>
            
            <Button 
              onClick={applyCorrectRatings}
              disabled={isLoading || !analysis}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Star className="w-4 h-4 mr-2" />
              Применить рейтинги
            </Button>
          </div>

          {isProcessed && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl shadow-sm">
              <div className="p-1 bg-green-500 rounded-full">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-green-800 font-medium">Рейтинги успешно обновлены!</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Общая информация о турнире */}
              <Card className="bg-white/50 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-white/20 p-6">
                  <CardTitle className="flex items-center gap-3 text-slate-800 font-medium text-lg">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-md">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    {analysis.tournament.name}
                    <div className="ml-auto">
                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200/50 font-medium px-3 py-1 rounded-full">
                        Завершен
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-2xl font-semibold text-slate-800 mb-1">{analysis.participants.length}</p>
                      <p className="text-sm text-slate-600 font-medium">Участников</p>
                    </div>
                    <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-2xl font-semibold text-green-700 mb-1">{analysis.totalPrizePool.toLocaleString()}₽</p>
                      <p className="text-sm text-slate-600 font-medium">Призовой фонд</p>
                    </div>
                    <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-2xl font-semibold text-purple-700 mb-1">{analysis.payoutStructure.length}</p>
                      <p className="text-sm text-slate-600 font-medium">Призовых мест</p>
                    </div>
                    <div className="text-center p-5 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-2xl font-semibold text-orange-700 mb-1">{analysis.tournament.buy_in.toLocaleString()}₽</p>
                      <p className="text-sm text-slate-600 font-medium">Бай-ин</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Структура призов */}
              <Card className="bg-white/50 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-white/20 p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-slate-800 font-medium text-lg">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      Структура призового фонда
                    </CardTitle>
                    <div className="flex gap-3">
                      {!isEditingPayouts ? (
                        <Button
                          onClick={startEditingPayouts}
                          variant="outline"
                          size="sm"
                          className="bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-all"
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Редактировать
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={savePayoutStructure}
                            disabled={isLoading}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg shadow-lg"
                          >
                            <Save className="w-3 h-3 mr-2" />
                            Сохранить
                          </Button>
                          <Button
                            onClick={cancelEditingPayouts}
                            variant="outline"
                            size="sm"
                            className="bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg shadow-sm"
                          >
                            <X className="w-3 h-3 mr-2" />
                            Отменить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {isEditingPayouts ? (
                    <div className="space-y-4">
                      {editedPayouts.map((payout) => (
                        <div key={payout.place} className="flex items-center gap-4 p-4 bg-gradient-to-r from-white/80 to-slate-50/80 rounded-xl border border-slate-200/50 shadow-sm">
                          {getPositionBadge(payout.place)}
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={payout.percentage}
                              onChange={(e) => updatePayoutPercentage(payout.place, e.target.value)}
                              className="w-20 text-sm border-slate-200 rounded-lg shadow-sm"
                            />
                            <span className="text-slate-600 text-sm font-medium">%</span>
                          </div>
                          <div className="text-sm text-slate-700 font-medium ml-auto">
                            = {Math.floor((analysis.totalPrizePool * payout.percentage) / 100).toLocaleString()}₽
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {analysis.payoutStructure.map((payout) => (
                        <div key={payout.place} className="bg-gradient-to-br from-white/90 to-slate-50/90 rounded-2xl border border-slate-200/50 p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-center mb-4">
                            {getPositionBadge(payout.place)}
                          </div>
                          <div className="text-lg font-medium text-slate-600 mb-2">{payout.percentage}%</div>
                          <div className="text-2xl font-semibold text-green-600 mb-3">
                            {payout.amount.toLocaleString()}₽
                          </div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-full">
                            <Star className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-800 font-medium">
                              {Math.max(1, Math.floor(payout.amount * 0.001))} RPS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Рейтинговые расчеты */}
              <Card className="bg-white/50 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-50/80 to-purple-50/80 border-b border-white/20 p-6">
                  <CardTitle className="flex items-center gap-3 text-slate-800 font-medium text-lg">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-md">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    Расчет рейтинговых очков (RPS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {analysis.ratingCalculations.map((calc) => (
                      <div 
                        key={calc.player_id} 
                        className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                          calc.is_winner 
                            ? 'bg-gradient-to-r from-white/95 to-green-50/90 border-green-200/50 shadow-lg' 
                            : 'bg-gradient-to-r from-white/90 to-slate-50/90 border-slate-200/50 shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 ring-2 ring-white/50 shadow-lg">
                              <AvatarImage 
                                src={getPlayerAvatar(calc.player_id, calc.player_name)} 
                                alt={calc.player_name}
                              />
                              <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-slate-100 to-gray-200 text-slate-700">
                                {getPlayerInitials(calc.player_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-2">
                              {getPositionBadge(calc.position)}
                              <span className="font-medium text-slate-800 text-lg">{calc.player_name}</span>
                            </div>
                            {calc.is_winner && (
                              <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-lg">
                                <Trophy className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200/50 rounded-full">
                              <Star className="w-4 h-4 text-green-600" />
                              <span className="font-semibold text-lg text-green-700">
                                +{calc.total_rps_change} RPS
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-xl shadow-sm">
                            <div className="text-xs text-blue-600 mb-2 font-medium uppercase tracking-wide">Участие</div>
                            <div className="font-semibold text-slate-800">+{calc.base_points} RPS</div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100/50 rounded-xl shadow-sm">
                            <div className="text-xs text-purple-600 mb-2 font-medium uppercase tracking-wide">Ребаи/Адоны</div>
                            <div className="font-semibold text-slate-800">+{calc.rebuy_addon_points} RPS</div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100/50 rounded-xl shadow-sm">
                            <div className="text-xs text-green-600 mb-2 font-medium uppercase tracking-wide">Призовые</div>
                            <div className="font-semibold text-green-700">+{calc.prize_points} RPS</div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 rounded-xl shadow-sm">
                            <div className="text-xs text-amber-600 mb-2 font-medium uppercase tracking-wide">Выигрыш</div>
                            <div className="font-semibold text-slate-800">{calc.prize_amount.toLocaleString()}₽</div>
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