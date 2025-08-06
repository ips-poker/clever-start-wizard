import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trophy, Calculator, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PrizeStructureManagerProps {
  tournamentId: string;
  registeredPlayers: number;
  mode?: 'management' | 'analysis';
}

interface TournamentRegistration {
  player_id: string;
  rebuys: number;
  addons: number;
}

interface PayoutPlace {
  place: number;
  percentage: number;
  amount: number;
}

const PrizeStructureManager = ({ tournamentId, registeredPlayers, mode = 'management' }: PrizeStructureManagerProps) => {
  const [payoutPlaces, setPayoutPlaces] = useState<PayoutPlace[]>([]);
  const [totalPrizePool, setTotalPrizePool] = useState(0);
  const [tournament, setTournament] = useState<any>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPayouts, setEditedPayouts] = useState<PayoutPlace[]>([]);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournamentData();
    fetchExistingPayouts();
  }, [tournamentId]);

  useEffect(() => {
    if (autoCalculate) {
      calculateAutomaticPayouts();
    }
  }, [registeredPlayers, tournament, registrations, autoCalculate]);

  // Реал-тайм синхронизация изменений
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel('prize-structure-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_payouts',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchExistingPayouts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
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
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      const { data: registrationsData, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select('player_id, rebuys, addons')
        .eq('tournament_id', tournamentId);

      if (registrationsError) throw registrationsError;
      setRegistrations(registrationsData || []);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  };

  const fetchExistingPayouts = async () => {
    try {
      const { data: payoutsData, error } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('place');

      if (error) throw error;

      if (payoutsData && payoutsData.length > 0) {
        const payouts = payoutsData.map(p => ({
          place: p.place,
          percentage: p.percentage,
          amount: p.amount
        }));
        setPayoutPlaces(payouts);
        setEditedPayouts(payouts);
        
        // Рассчитываем общий призовой фонд на основе существующих данных
        const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
        setTotalPrizePool(totalAmount);
      }
    } catch (error) {
      console.error('Error fetching existing payouts:', error);
    }
  };

  // Профессиональная таблица распределения призовых процентов
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
      return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0]; // 12 мест
    } else {
      return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0, 1.8, 1.7]; // 14 мест
    }
  };

  const calculatePrizePool = () => {
    const buyInTotal = tournament.buy_in * registeredPlayers;
    const rebuyTotal = registrations.reduce((sum, reg) => sum + (reg.rebuys * (tournament.rebuy_cost || 0)), 0);
    const addonTotal = registrations.reduce((sum, reg) => sum + (reg.addons * (tournament.addon_cost || 0)), 0);
    
    return buyInTotal + rebuyTotal + addonTotal;
  };

  // Автоматический расчет процентов для дополнительных мест
  const calculateAdditionalPlacePercentage = (currentPlaces: PayoutPlace[], newPlaceNumber: number) => {
    if (currentPlaces.length === 0) return 5;
    
    // Берем процент последнего места и уменьшаем на 0.5%
    const lastPlace = currentPlaces[currentPlaces.length - 1];
    const newPercentage = Math.max(lastPlace.percentage - 0.5, 1.0);
    
    // Пропорционально уменьшаем проценты всех предыдущих мест
    const reductionPerPlace = 0.1;
    const adjustedPlaces = currentPlaces.map(place => ({
      ...place,
      percentage: Math.max(place.percentage - reductionPerPlace, 1.0)
    }));
    
    return { adjustedPlaces, newPercentage };
  };

  const calculateAutomaticPayouts = async () => {
    if (registeredPlayers === 0 || !tournament) {
      setPayoutPlaces([]);
      setTotalPrizePool(0);
      return;
    }

    const percentages = getPayoutStructure(registeredPlayers);
    const prizePool = calculatePrizePool();
    setTotalPrizePool(prizePool);

    const payouts = percentages.map((percentage, index) => ({
      place: index + 1,
      percentage,
      amount: Math.round((prizePool * percentage) / 100)
    }));

    setPayoutPlaces(payouts);
    setEditedPayouts(payouts);

    // Автоматически сохраняем в БД, если включен автоматический расчет
    if (autoCalculate) {
      await savePayoutStructure(payouts);
    }
  };

  const savePayoutStructure = async (payouts: PayoutPlace[]) => {
    try {
      // Удаляем старые записи и ждем завершения операции
      const { error: deleteError } = await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournamentId);

      if (deleteError) throw deleteError;

      // Создаем новые записи только если есть что сохранять
      if (payouts.length > 0) {
        const payoutRecords = payouts.map(payout => ({
          tournament_id: tournamentId,
          place: payout.place,
          percentage: payout.percentage,
          amount: payout.amount
        }));

        const { error: insertError } = await supabase
          .from('tournament_payouts')
          .insert(payoutRecords);

        if (insertError) throw insertError;
      }

      toast({
        title: "Сохранено",
        description: "Структура призового фонда обновлена",
      });
    } catch (error) {
      console.error('Error saving payout structure:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить структуру призового фонда",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdits = async () => {
    // Пересчитываем суммы на основе отредактированных процентов
    const totalPrizePool = calculatePrizePool();
    const updatedPayouts = editedPayouts.map(payout => ({
      ...payout,
      amount: Math.round((totalPrizePool * payout.percentage) / 100)
    }));

    setPayoutPlaces(updatedPayouts);
    await savePayoutStructure(updatedPayouts);
    setIsEditing(false);
  };

  const handleCancelEdits = () => {
    setEditedPayouts([...payoutPlaces]);
    setIsEditing(false);
  };

  const updateEditedPercentage = (index: number, newPercentage: number) => {
    const updated = [...editedPayouts];
    updated[index].percentage = newPercentage;
    setEditedPayouts(updated);
  };

  const addPayoutPlace = () => {
    const newPlace = editedPayouts.length + 1;
    const calculation = calculateAdditionalPlacePercentage(editedPayouts, newPlace);
    
    let updatedPayouts: PayoutPlace[];
    let newPercentage: number;
    
    if (typeof calculation === 'object' && 'adjustedPlaces' in calculation) {
      updatedPayouts = calculation.adjustedPlaces;
      newPercentage = calculation.newPercentage;
    } else {
      updatedPayouts = editedPayouts;
      newPercentage = calculation as number;
    }
    
    const newPayout: PayoutPlace = {
      place: newPlace,
      percentage: newPercentage,
      amount: Math.round((totalPrizePool * newPercentage) / 100)
    };
    
    // Обновляем суммы для скорректированных мест
    const finalPayouts = [
      ...updatedPayouts.map(payout => ({
        ...payout,
        amount: Math.round((totalPrizePool * payout.percentage) / 100)
      })),
      newPayout
    ];
    
    setEditedPayouts(finalPayouts);
  };

  const removePayoutPlace = () => {
    if (editedPayouts.length <= 1) return;
    
    const removedPayouts = editedPayouts.slice(0, -1);
    
    // Пропорционально увеличиваем проценты оставшихся мест
    const totalRemovedPercentage = editedPayouts[editedPayouts.length - 1].percentage;
    const increasePerPlace = totalRemovedPercentage / removedPayouts.length;
    
    const adjustedPayouts = removedPayouts.map(payout => ({
      ...payout,
      percentage: payout.percentage + increasePerPlace,
      amount: Math.round((totalPrizePool * (payout.percentage + increasePerPlace)) / 100)
    }));
    
    setEditedPayouts(adjustedPayouts);
  };

  const getTotalPercentage = (payouts: PayoutPlace[]) => {
    return payouts.reduce((sum, payout) => sum + payout.percentage, 0);
  };

  return (
    <div className="space-y-6">
      {/* Настройки режима */}
      {mode === 'management' && (
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-poker-text-primary">
              <Calculator className="w-5 h-5 text-poker-accent" />
              Настройки призового фонда
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="auto-calculate">Автоматический расчет при изменениях</Label>
              <Switch 
                id="auto-calculate"
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Зарегистрировано игроков</Label>
                <Input
                  type="number"
                  value={registeredPlayers}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>Ребаи и Адоны</Label>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Ребаев: {registrations.reduce((sum, reg) => sum + reg.rebuys, 0)} × {tournament?.rebuy_cost || 0}</div>
                  <div>Адонов: {registrations.reduce((sum, reg) => sum + reg.addons, 0)} × {tournament?.addon_cost || 0}</div>
                </div>
              </div>
              <div>
                <Label>Общий призовой фонд</Label>
                <div className="text-2xl font-bold text-poker-text-primary">
                  {totalPrizePool.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Управление количеством призовых мест */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-poker-text-primary">Призовые места</h3>
          <p className="text-sm text-poker-text-secondary">
            Призовых мест: {isEditing ? editedPayouts.length : payoutPlaces.length} из {registeredPlayers} игроков
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                className="bg-white/70"
              >
                Редактировать
              </Button>
              <Button
                onClick={calculateAutomaticPayouts}
                size="sm"
                className="bg-gradient-button text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Автоматический расчет
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={removePayoutPlace}
                disabled={editedPayouts.length <= 1}
                size="sm"
                variant="outline"
                title="Удалить последнее место"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={addPayoutPlace}
                disabled={editedPayouts.length >= registeredPlayers}
                size="sm"
                variant="outline"
                title="Добавить призовое место (автоматический расчет %)"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSaveEdits}
                size="sm"
                className="bg-gradient-button text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
              <Button
                onClick={handleCancelEdits}
                size="sm"
                variant="outline"
              >
                Отменить
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Таблица выплат */}
      {(payoutPlaces.length > 0 || editedPayouts.length > 0) && (
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="text-poker-text-secondary font-medium">Место</TableHead>
                  <TableHead className="text-poker-text-secondary font-medium">Процент</TableHead>
                  <TableHead className="text-poker-text-secondary font-medium">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isEditing ? editedPayouts : payoutPlaces).map((payout, index) => (
                  <TableRow key={payout.place} className="border-gray-200/30">
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="bg-poker-accent/10 text-poker-accent border-poker-accent/20">
                        <Trophy className="w-3 h-3 mr-1" />
                        {payout.place}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={payout.percentage}
                          onChange={(e) => updateEditedPercentage(index, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      ) : (
                        <span className="font-medium">{payout.percentage.toFixed(1)}%</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-poker-text-primary">
                      {isEditing 
                        ? Math.round((totalPrizePool * payout.percentage) / 100).toLocaleString()
                        : payout.amount.toLocaleString()
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Итоговая статистика */}
            <div className="border-t border-gray-200/30 p-4 bg-gray-50/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-poker-text-secondary">Итого:</span>
                <div className="flex gap-4">
                  <span className={`font-medium ${
                    getTotalPercentage(isEditing ? editedPayouts : payoutPlaces) === 100 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {getTotalPercentage(isEditing ? editedPayouts : payoutPlaces).toFixed(1)}%
                  </span>
                  <span className="font-bold text-poker-text-primary">
                    {(isEditing ? editedPayouts : payoutPlaces)
                      .reduce((sum, p) => sum + (isEditing ? Math.round((totalPrizePool * p.percentage) / 100) : p.amount), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrizeStructureManager;