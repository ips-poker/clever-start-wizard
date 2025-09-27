import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trophy, Calculator, Zap, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PayoutStructureProps {
  tournamentId: string;
  registeredPlayers: number;
}

interface TournamentRegistration {
  player_id: string;
  rebuys: number;
  addons: number;
}

interface PayoutPlace {
  place: number;
  percentage: number;
  rp: number;
}

const PayoutStructure = ({ tournamentId, registeredPlayers }: PayoutStructureProps) => {
  const [payoutPlaces, setPayoutPlaces] = useState<PayoutPlace[]>([]);
  const [totalPrizePool, setTotalPrizePool] = useState(0);
  const [baseRP, setBaseRP] = useState(1000);
  const [tournament, setTournament] = useState<any>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  const [isProcessingRatings, setIsProcessingRatings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  useEffect(() => {
    calculateAutomaticPayouts();
  }, [registeredPlayers, tournament, registrations]);

  // Реальная синхронизация данных о ребаях и адонах
  useEffect(() => {
    if (!tournamentId) return;

    // Подписываемся на изменения в таблице регистраций
    const channel = supabase
      .channel('tournament-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          // Перезагружаем данные при любых изменениях
          fetchTournamentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      // Получаем данные турнира
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Получаем регистрации с данными о ребаях и адонах
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select('player_id, rebuys, addons')
        .eq('tournament_id', tournamentId);

      if (registrationsError) throw registrationsError;
      setRegistrations(registrationsData || []);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные турнира",
        variant: "destructive",
      });
    }
  };

  const calculateAutomaticPayouts = async () => {
    if (registeredPlayers === 0 || !tournament) {
      setPayoutPlaces([]);
      setTotalPrizePool(0);
      return;
    }

    // Новая логика расчета призовых мест согласно профессиональной таблице
    const getPayoutStructure = (playerCount: number): number[] => {
      if (playerCount <= 8) {
        return [60, 40]; // 2 места
      } else if (playerCount <= 11) {
        return [50, 30, 20]; // 3 места
      } else if (playerCount <= 20) {
        return [40, 27, 19, 14]; // 4 места
      } else if (playerCount <= 30) {
        return [36.0, 25.0, 17.5, 12.8, 8.7]; // 5 мест
      } else if (playerCount <= 50) {
        return [34.0, 23.0, 16.5, 11.9, 8.0, 6.6]; // 6 мест
      } else if (playerCount <= 70) {
        return [31.7, 20.7, 15.3, 10.8, 7.2, 5.8, 4.6, 3.9]; // 8 мест
      } else if (playerCount <= 100) {
        return [30.5, 19.5, 13.7, 10.0, 6.7, 5.4, 4.2, 3.7, 3.3, 3.0]; // 10 мест
      } else if (playerCount <= 130) {
        return [29.0, 18.7, 13.5, 9.5, 6.5, 5.2, 4.0, 3.4, 2.9, 2.6, 2.4, 2.3]; // 12 мест
      } else {
        return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0, 1.8]; // 13+ мест
      }
    };

    const percentages = getPayoutStructure(registeredPlayers);

    // Расчет призового фонда с учетом ребаев и адонов
    const buyInTotal = tournament.buy_in * registeredPlayers;
    const rebuyTotal = registrations.reduce((sum, reg) => sum + (reg.rebuys * (tournament.rebuy_cost || 0)), 0);
    const addonTotal = registrations.reduce((sum, reg) => sum + (reg.addons * (tournament.addon_cost || 0)), 0);
    
    const totalPrizePool = buyInTotal + rebuyTotal + addonTotal;
    setTotalPrizePool(totalPrizePool);

    // Создаем структуру выплат (ПРАВИЛЬНАЯ логика для покера)
    // В покере призовые места идут от последнего к первому по порядку вылета
    const payouts = percentages.map((percentage, index) => {
      const prizeRank = index + 1; // 1-е место, 2-е место, 3-е место и т.д.
      return {
        place: prizeRank,
        percentage,
        rp: Math.round((totalPrizePool * percentage) / 100)
      };
    });

    setPayoutPlaces(payouts);

    // Сохраняем структуру выплат в БД
    await savePayoutStructure(payouts, totalPrizePool);
  };

  const savePayoutStructure = async (payouts: PayoutPlace[], prizePool: number) => {
    try {
      // Удаляем старые записи
      await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournamentId);

      // Создаем новые записи
      const payoutRecords = payouts.map(payout => ({
        tournament_id: tournamentId,
        place: payout.place,
        percentage: payout.percentage,
        amount: Math.round((prizePool * payout.percentage) / 100)
      }));

      const { error } = await supabase
        .from('tournament_payouts')
        .insert(payoutRecords);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving payout structure:', error);
    }
  };

  const addPayoutPlace = () => {
    const newPlace = payoutPlaces.length + 1;
    const newPayout: PayoutPlace = {
      place: newPlace,
      percentage: 5,
      rp: Math.round((totalPrizePool * 5) / 100)
    };
    
    setPayoutPlaces([...payoutPlaces, newPayout]);
    recalculatePercentages([...payoutPlaces, newPayout]);
  };

  const removePayoutPlace = () => {
    if (payoutPlaces.length <= 1) return;
    
    const newPayouts = payoutPlaces.slice(0, -1);
    setPayoutPlaces(newPayouts);
    recalculatePercentages(newPayouts);
  };

  const recalculatePercentages = (payouts: PayoutPlace[]) => {
    // Автоматически перераспределяем проценты при изменении количества мест
    const totalPercentage = 100;
    const evenPercentage = totalPercentage / payouts.length;
    
    const updatedPayouts = payouts.map((payout, index) => {
      let adjustedPercentage = evenPercentage;
      
      // Первые места получают больший процент
      if (index === 0) adjustedPercentage = evenPercentage * 1.8;
      else if (index === 1) adjustedPercentage = evenPercentage * 1.4;
      else if (index === 2) adjustedPercentage = evenPercentage * 1.1;
      
      return {
        ...payout,
        percentage: Math.round(adjustedPercentage * 100) / 100,
        rp: Math.round((totalPrizePool * adjustedPercentage) / 100)
      };
    });

    // Нормализуем проценты, чтобы общая сумма была 100%
    const totalActualPercentage = updatedPayouts.reduce((sum, p) => sum + p.percentage, 0);
    const adjustmentFactor = 100 / totalActualPercentage;
    
    const normalizedPayouts = updatedPayouts.map(payout => ({
      ...payout,
      percentage: Math.round(payout.percentage * adjustmentFactor * 100) / 100,
      rp: Math.round((totalPrizePool * payout.percentage * adjustmentFactor) / 100)
    }));

    setPayoutPlaces(normalizedPayouts);
  };

  const updatePayoutPercentage = async (index: number, newPercentage: number) => {
    const updatedPayouts = [...payoutPlaces];
    updatedPayouts[index] = {
      ...updatedPayouts[index],
      percentage: newPercentage,
      rp: Math.round((totalPrizePool * newPercentage) / 100)
    };
    setPayoutPlaces(updatedPayouts);
    
    // Сохраняем изменения в БД
    await savePayoutStructure(updatedPayouts, totalPrizePool);
  };

  const getTotalPercentage = () => {
    return payoutPlaces.reduce((sum, payout) => sum + payout.percentage, 0);
  };

  const getTotalRP = () => {
    return payoutPlaces.reduce((sum, payout) => sum + payout.rp, 0);
  };

  // Автоматический расчет рейтингов
  const triggerRatingsCalculation = async () => {
    if (!tournament || tournament.status !== 'finished') {
      toast({
        title: "Невозможно рассчитать рейтинги",
        description: "Турнир должен быть завершен",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingRatings(true);
    
    try {
      // Получить результаты турнира
      const { data: tournamentRegistrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', tournamentId)
        .not('position', 'is', null)
        .order('position');

      if (regError) throw regError;

      if (!tournamentRegistrations || tournamentRegistrations.length === 0) {
        throw new Error('Нет результатов для расчета рейтингов');
      }

      // Вызвать функцию расчета ELO
      const { error: eloError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournamentId,
          results: tournamentRegistrations.map(reg => ({
            player_id: reg.player_id,
            position: reg.position,
            rebuys: reg.rebuys || 0,
            addons: reg.addons || 0
          }))
        }
      });

      if (eloError) throw eloError;

      // Опубликовать результаты
      const { error: publishError } = await supabase
        .from('tournaments')
        .update({ 
          is_published: true,
          finished_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (publishError) throw publishError;

      toast({
        title: "Рейтинги рассчитаны",
        description: `Обновлены рейтинги для ${tournamentRegistrations.length} игроков`,
      });

    } catch (error: any) {
      toast({
        title: "Ошибка расчета рейтингов",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingRatings(false);
    }
  };

  // Автоматическая обработка при завершении турнира
  useEffect(() => {
    if (autoProcessEnabled && tournament?.status === 'finished' && payoutPlaces.length > 0) {
      // Небольшая задержка для корректного расчета
      const timer = setTimeout(() => {
        triggerRatingsCalculation();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [tournament?.status, payoutPlaces.length, autoProcessEnabled]);

  return (
    <div className="space-y-6">
      {/* Автоматизация */}
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Zap className="w-5 h-5 text-poker-accent" />
            Автоматизация обработки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-process">Автоматический расчет рейтингов при завершении</Label>
            <Switch 
              id="auto-process"
              checked={autoProcessEnabled}
              onCheckedChange={setAutoProcessEnabled}
            />
          </div>
          
          {tournament?.status === 'finished' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800">Турнир завершен</h4>
                  <p className="text-sm text-green-600">Готов к автоматической обработке рейтингов</p>
                </div>
                <Button
                  onClick={triggerRatingsCalculation}
                  disabled={isProcessingRatings}
                  size="sm"
                  className="bg-poker-accent hover:bg-poker-accent/90 text-white"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {isProcessingRatings ? 'Обработка...' : 'Обработать сейчас'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Настройки призового фонда */}
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Calculator className="w-5 h-5 text-poker-accent" />
            Настройки призового фонда
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="registered_players">Зарегистрировано игроков</Label>
              <Input
                id="registered_players"
                type="number"
                value={registeredPlayers}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="rebuy_addon_info">Ребаи и Адоны</Label>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Ребаев: {registrations.reduce((sum, reg) => sum + reg.rebuys, 0)} × {tournament?.rebuy_cost || 0} = {registrations.reduce((sum, reg) => sum + (reg.rebuys * (tournament?.rebuy_cost || 0)), 0)}</div>
                <div>Адонов: {registrations.reduce((sum, reg) => sum + reg.addons, 0)} × {tournament?.addon_cost || 0} = {registrations.reduce((sum, reg) => sum + (reg.addons * (tournament?.addon_cost || 0)), 0)}</div>
              </div>
            </div>
            <div>
              <Label htmlFor="total_prize">Общий призовой фонд</Label>
              <div className="text-sm space-y-1">
                <div>Бай-ин: {tournament?.buy_in || 0} × {registeredPlayers} = {(tournament?.buy_in || 0) * registeredPlayers}</div>
                <div className="font-medium text-lg">Итого: {totalPrizePool}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление количеством призовых мест */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-gray-800">Призовые места</h3>
          <p className="text-sm text-gray-600">
            Призовых мест: {payoutPlaces.length} из {registeredPlayers} игроков
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={removePayoutPlace}
            disabled={payoutPlaces.length <= 1}
            size="sm"
            variant="outline"
            className="bg-white/70"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            onClick={addPayoutPlace}
            disabled={payoutPlaces.length >= registeredPlayers}
            size="sm"
            variant="outline"
            className="bg-white/70"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={calculateAutomaticPayouts}
            size="sm"
            className="bg-gradient-button text-white"
          >
            Автоматический расчет
          </Button>
        </div>
      </div>


      {/* Таблица выплат */}
      {payoutPlaces.length > 0 && (
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="text-gray-600 font-medium">Призовое место</TableHead>
                  <TableHead className="text-gray-600 font-medium">Позиция в турнире</TableHead>
                  <TableHead className="text-gray-600 font-medium">Процент (%)</TableHead>
                  <TableHead className="text-gray-600 font-medium">Рейтинг Поинтс (RP)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutPlaces.map((payout, index) => {
                  const eliminationPosition = registeredPlayers - index;
                  return (
                    <TableRow key={payout.place} className="border-gray-200/50 hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          {index < 3 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          {payout.place} место
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-600">
                        Позиция {eliminationPosition}
                        {eliminationPosition === registeredPlayers && (
                          <Badge className="ml-2 bg-yellow-500 text-white text-xs">Победитель</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={payout.percentage}
                          onChange={(e) => updatePayoutPercentage(index, parseFloat(e.target.value) || 0)}
                          className="w-20"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">
                        {payout.rp.toLocaleString()} RP
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Итоговая статистика */}
      {payoutPlaces.length > 0 && (
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {getTotalPercentage().toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Общий процент</div>
                {getTotalPercentage() !== 100 && (
                  <Badge variant="destructive" className="mt-1">
                    Не равно 100%
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {getTotalRP().toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">RP к выплате</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {((getTotalRP() / totalPrizePool) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">От призового фонда</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutStructure;