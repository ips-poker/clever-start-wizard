import React, { useState } from 'react';
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
      // Получаем последний завершенный турнир (поддерживаем оба статуса)
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .or('status.eq.finished,status.eq.completed')
        .order('finished_at', { ascending: false })
        .limit(1)
        .single();

      if (!tournament) {
        throw new Error('Нет завершенных турниров');
      }

      // Проверяем, не был ли уже проанализирован этот турнир
      const { data: existingResults } = await supabase
        .from('game_results')
        .select('id')
        .eq('tournament_id', tournament.id)
        .limit(1);

      if (existingResults && existingResults.length > 0) {
        toast({
          title: "Турнир уже проанализирован",
          description: `Турнир "${tournament.name}" уже имеет результаты расчета рейтингов. Для пересчета используйте кнопку "Пересчитать рейтинги".`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
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

    // Проверяем, не были ли уже применены рейтинги для этого турнира
    const { data: existingResults } = await supabase
      .from('game_results')
      .select('id')
      .eq('tournament_id', analysis.tournament.id);

    if (existingResults && existingResults.length > 0) {
      toast({
        title: "Рейтинги уже применены",
        description: `Для турнира "${analysis.tournament.name}" рейтинги уже были рассчитаны. Для пересчета используйте кнопку "Пересчитать рейтинги".`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Обновляем позиции в регистрациях турнира
      const updatePromises = analysis.ratingCalculations.map(calc => 
        supabase
          .from('tournament_registrations')
          .update({ position: calc.position })
          .eq('tournament_id', analysis.tournament.id)
          .eq('player_id', calc.player_id)
      );

      await Promise.all(updatePromises);

      // Готовим результаты для edge function
      const results = analysis.ratingCalculations.map(calc => ({
        player_id: calc.player_id,
        position: calc.position,
        rebuys: calc.rebuys,
        addons: calc.addons
      }));

      // Вызываем edge function для расчета рейтингов с учетом настроек RPS
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
        description: `Корректные RPS рейтинги присвоены ${analysis.ratingCalculations.length} игрокам с учетом настроек системы`
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
    if (position === 1) return <Badge className="bg-yellow-500/10 text-yellow-800 border-yellow-200">🥇 1 место</Badge>;
    if (position === 2) return <Badge className="bg-gray-400/10 text-gray-800 border-gray-200">🥈 2 место</Badge>;
    if (position === 3) return <Badge className="bg-amber-600/10 text-amber-800 border-amber-200">🥉 3 место</Badge>;
    if (position <= 6) return <Badge className="bg-green-600/10 text-green-800 border-green-200">🏆 {position} место</Badge>;
    return <Badge variant="outline" className="bg-slate-50 text-slate-600">{position} место</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
            <BarChart3 className="w-4 h-4" />
            Анализатор турнира
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={analyzeTournament} 
              disabled={isLoading}
              variant="outline"
              className="bg-white/60 border-gray-200/30 text-gray-700 hover:bg-white/80 font-light flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
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
              variant="outline"
              className="bg-white/60 border-gray-200/30 text-gray-700 hover:bg-white/80 font-light"
            >
              <Star className="w-4 h-4 mr-2" />
              Применить рейтинги
            </Button>
          </div>

          {isProcessed && (
            <div className="flex items-center gap-2 p-3 bg-green-50/50 border border-green-200/30 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-light text-sm">Рейтинги успешно обновлены!</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Общая информация о турнире */}
              <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-gray-700 font-light">
                    <Trophy className="w-4 h-4" />
                    {analysis.tournament.name}
                    <Badge className="bg-green-100/50 text-green-700 border-green-200/30 font-light">Завершен</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
                      <Users className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-light text-gray-800">{analysis.participants.length}</p>
                      <p className="text-xs text-gray-500 font-light">Участников</p>
                    </div>
                    <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
                      <DollarSign className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-light text-green-600">{analysis.totalPrizePool.toLocaleString()}₽</p>
                      <p className="text-xs text-gray-500 font-light">Призовой фонд</p>
                    </div>
                    <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
                      <Trophy className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-light text-purple-600">{analysis.payoutStructure.length}</p>
                      <p className="text-xs text-gray-500 font-light">Призовых мест</p>
                    </div>
                    <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
                      <BarChart3 className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-light text-orange-600">{analysis.tournament.buy_in.toLocaleString()}₽</p>
                      <p className="text-xs text-gray-500 font-light">Бай-ин</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Структура призов */}
              <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                      <DollarSign className="w-4 h-4" />
                      Структура призового фонда
                    </CardTitle>
                    <div className="flex gap-2">
                      {!isEditingPayouts ? (
                        <Button
                          onClick={startEditingPayouts}
                          variant="outline"
                          size="sm"
                          className="bg-white/60 border-gray-200/30 text-gray-700 hover:bg-white/80 font-light text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Редактировать
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={savePayoutStructure}
                            disabled={isLoading}
                            size="sm"
                            variant="outline"
                            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 font-light text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Сохранить
                          </Button>
                          <Button
                            onClick={cancelEditingPayouts}
                            variant="outline"
                            size="sm"
                            className="bg-white/60 border-gray-200/30 text-gray-700 hover:bg-white/80 font-light text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
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
                        <div key={payout.place} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-gray-200/30">
                          {getPositionBadge(payout.place)}
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={payout.percentage}
                              onChange={(e) => updatePayoutPercentage(payout.place, e.target.value)}
                              className="w-16 text-xs border-gray-200/50"
                            />
                            <span className="text-gray-500 text-xs font-light">%</span>
                          </div>
                          <div className="text-xs text-gray-600 font-light">
                            = {Math.floor((analysis.totalPrizePool * payout.percentage) / 100).toLocaleString()}₽
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {analysis.payoutStructure.map((payout) => (
                        <div key={payout.place} className="bg-white/60 rounded-lg border border-gray-200/30 p-4 text-center">
                          <div className="flex items-center justify-center mb-2">
                            {getPositionBadge(payout.place)}
                          </div>
                          <div className="text-sm font-light text-gray-600 mb-1">{payout.percentage}%</div>
                          <div className="text-lg font-light text-green-600 mb-1">
                            {payout.amount.toLocaleString()}₽
                          </div>
                          <div className="text-xs text-gray-500 font-light">
                            RPS: {Math.max(1, Math.floor(payout.amount * 0.001))} очков
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Рейтинговые расчеты */}
              <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                    <Star className="w-4 h-4" />
                    Расчет рейтинговых очков (RPS)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysis.ratingCalculations.map((calc) => (
                      <div 
                        key={calc.player_id} 
                        className={`p-4 rounded-lg border border-gray-200/30 transition-all duration-200 ${
                          calc.is_winner 
                            ? 'bg-white/80' 
                            : 'bg-white/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage 
                                src={getPlayerAvatar(calc.player_id, calc.player_name)} 
                                alt={calc.player_name}
                              />
                              <AvatarFallback className="text-xs font-light bg-gray-100 text-gray-600">
                                {getPlayerInitials(calc.player_name)}
                              </AvatarFallback>
                            </Avatar>
                            {getPositionBadge(calc.position)}
                            <span className="font-light text-gray-800">{calc.player_name}</span>
                            {calc.is_winner && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-right">
                            <div className="font-light text-lg text-green-600">
                              +{calc.total_rps_change} RPS
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="text-center p-2 border border-gray-200/15 rounded bg-white/40">
                            <div className="text-xs text-gray-500 mb-1 font-light">Участие</div>
                            <div className="font-light text-gray-700">+{calc.base_points} RPS</div>
                          </div>
                          <div className="text-center p-2 border border-gray-200/15 rounded bg-white/40">
                            <div className="text-xs text-gray-500 mb-1 font-light">Ребаи/Адоны</div>
                            <div className="font-light text-gray-700">+{calc.rebuy_addon_points} RPS</div>
                          </div>
                          <div className="text-center p-2 border border-gray-200/15 rounded bg-white/40">
                            <div className="text-xs text-gray-500 mb-1 font-light">Призовые</div>
                            <div className="font-light text-green-600">+{calc.prize_points} RPS</div>
                          </div>
                          <div className="text-center p-2 border border-gray-200/15 rounded bg-white/40">
                            <div className="text-xs text-gray-500 mb-1 font-light">Выигрыш</div>
                            <div className="font-light text-gray-700">{calc.prize_amount.toLocaleString()}₽</div>
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