import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trophy, Calculator, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateTotalRPSPool, formatRPSPoints, convertFeeToRPS } from "@/utils/rpsCalculations";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ModernPrizeStructureManagerProps {
  tournamentId: string;
  registeredPlayers: number;
  mode?: 'management' | 'analysis';
}

interface TournamentRegistration {
  player_id: string;
  reentries: number;
  additional_sets: number;
}

interface RPSPayoutPlace {
  place: number;
  percentage: number;
  rps_points: number;
}

const ModernPrizeStructureManager = ({ tournamentId, registeredPlayers, mode = 'management' }: ModernPrizeStructureManagerProps) => {
  const [payoutPlaces, setPayoutPlaces] = useState<RPSPayoutPlace[]>([]);
  const [totalRPSPool, setTotalRPSPool] = useState(0);
  const [tournament, setTournament] = useState<any>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPayouts, setEditedPayouts] = useState<RPSPayoutPlace[]>([]);
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

  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel('rps-structure-sync')
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
      );
    
    channel.subscribe();

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
        .select('player_id, reentries, additional_sets')
        .eq('tournament_id', tournamentId);

      if (registrationsError) throw registrationsError;
      
      // Адаптируем старые данные к новым полям
      const adaptedRegistrations = registrationsData.map(reg => ({
        player_id: reg.player_id,
        reentries: reg.reentries || 0,
        additional_sets: reg.additional_sets || 0
      }));
      
      setRegistrations(adaptedRegistrations);

    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  };

  const fetchExistingPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('place');

      if (error) throw error;

      if (data && data.length > 0) {
        const payouts = data.map(p => ({
          place: p.place,
          percentage: p.percentage,
          rps_points: p.rps_points || 0
        }));
        setPayoutPlaces(payouts);
        
        const totalRPS = payouts.reduce((sum, p) => sum + p.rps_points, 0);
        setTotalRPSPool(totalRPS);
        setAutoCalculate(false);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const calculateRPSPool = () => {
    if (!tournament || !registrations) return 0;

    const activeRegistrations = registrations.filter(r => r.player_id);
    
    // Рассчитываем общий пул RPS по новой системе: каждые 1000₽ = 100 RPS
    let totalRPS = 0;
    
    activeRegistrations.forEach(registration => {
      const participationFee = tournament.participation_fee || 0;
      const reentryFee = tournament.reentry_fee || 0;
      const additionalFee = tournament.additional_fee || 0;
      
      const reentries = registration.reentries || 0;
      const additionalSets = registration.additional_sets || 0;
      
      // Общая сумма взносов этого игрока в рублях
      const playerTotalFee = participationFee + (reentries * reentryFee) + (additionalSets * additionalFee);
      
      // Конвертируем в RPS: 1000₽ = 100 RPS, то есть делим на 10
      totalRPS += Math.floor(playerTotalFee / 10);
    });

    return totalRPS;
  };

  const getProfessionalPayoutStructure = (players: number): number[] => {
    // Профессиональная структура выплат RPS баллов
    if (players < 2) return [];
    if (players === 2) return [65, 35];
    if (players === 3) return [50, 30, 20];
    if (players <= 6) return [40, 25, 20, 15];
    if (players <= 9) return [35, 25, 18, 12, 10];
    if (players <= 18) return [30, 20, 15, 10, 8, 7, 5, 5];
    if (players <= 27) return [25, 18, 13, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2];
    
    // Для больших полей - динамическое распределение
    const prizeablePositions = Math.min(Math.floor(players * 0.15), 20);
    const structure: number[] = [];
    let remainingPercentage = 100;
    
    // Первое место всегда получает больше всего
    const firstPlace = Math.max(20, Math.min(30, Math.floor(100 / prizeablePositions) + 10));
    structure.push(firstPlace);
    remainingPercentage -= firstPlace;
    
    // Распределяем остальные места с убывающими процентами
    for (let i = 1; i < prizeablePositions; i++) {
      const percentage = Math.max(1, Math.floor(remainingPercentage / (prizeablePositions - i)));
      structure.push(percentage);
      remainingPercentage -= percentage;
    }
    
    // Добавляем остаток к последнему месту
    if (remainingPercentage > 0) {
      structure[structure.length - 1] += remainingPercentage;
    }
    
    return structure;
  };

  const calculateAutomaticPayouts = () => {
    if (!registeredPlayers || registeredPlayers < 2) {
      setPayoutPlaces([]);
      setTotalRPSPool(0);
      return;
    }

    const rpsPool = calculateRPSPool();
    setTotalRPSPool(rpsPool);

    const percentages = getProfessionalPayoutStructure(registeredPlayers);
    const newPayouts = percentages.map((percentage, index) => ({
      place: index + 1,
      percentage,
      rps_points: Math.round((rpsPool * percentage) / 100)
    }));

    setPayoutPlaces(newPayouts);
  };

  const savePayoutStructure = async () => {
    if (!tournament) return;

    try {
      // Удаляем старую структуру
      const { error: deleteError } = await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournament.id);

      if (deleteError) throw deleteError;

      // Сохраняем новую структуру с рассчитанными RPS баллами
      const payoutsToInsert = payoutPlaces.map(place => ({
        tournament_id: tournament.id,
        place: place.place,
        percentage: place.percentage,
        amount: 0, // Не используется для RPS системы
        rps_points: place.rps_points // Сохраняем рассчитанные RPS баллы
      }));

      const { error: insertError } = await supabase
        .from('tournament_payouts')
        .insert(payoutsToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Структура призового фонда RPS сохранена",
        description: `Сохранено распределение ${totalRPSPool} RPS баллов на ${payoutPlaces.length} призовых мест`
      });
    } catch (error) {
      console.error('Error saving payout structure:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить структуру выплат",
        variant: "destructive"
      });
    }
  };

  const addPayoutPlace = () => {
    const newPlace = payoutPlaces.length + 1;
    const newPayout = {
      place: newPlace,
      percentage: 5,
      rps_points: Math.round((totalRPSPool * 5) / 100)
    };
    
    const updatedPayouts = [...payoutPlaces, newPayout];
    setPayoutPlaces(updatedPayouts);
    setEditedPayouts(updatedPayouts);
  };

  const removePayoutPlace = (place: number) => {
    const updatedPayouts = payoutPlaces
      .filter(p => p.place !== place)
      .map((p, index) => ({ ...p, place: index + 1 }));
    
    setPayoutPlaces(updatedPayouts);
    setEditedPayouts(updatedPayouts);
  };

  const updatePayoutPercentage = (place: number, newPercentage: number) => {
    const updatedPayouts = payoutPlaces.map(payout =>
      payout.place === place
        ? {
            ...payout,
            percentage: newPercentage,
            rps_points: Math.round((totalRPSPool * newPercentage) / 100)
          }
        : payout
    );
    
    setPayoutPlaces(updatedPayouts);
    setEditedPayouts(updatedPayouts);
  };

  const totalPercentage = payoutPlaces.reduce((sum, p) => sum + p.percentage, 0);
  const totalRPSPoints = payoutPlaces.reduce((sum, p) => sum + p.rps_points, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              Фонд RPS баллов
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
                disabled={mode === 'analysis'}
              />
              <Label className="text-sm">Автоматический расчет</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-xs text-blue-600 tracking-wide uppercase">Участники</Label>
              <div className="text-2xl font-bold text-blue-800">{registeredPlayers}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Label className="text-xs text-green-600 tracking-wide uppercase">Повторные входы</Label>
              <div className="text-xl font-semibold text-green-800">
                {registrations.reduce((sum, reg) => sum + reg.reentries, 0)}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Label className="text-xs text-purple-600 tracking-wide uppercase">Дополнительные наборы</Label>
              <div className="text-xl font-semibold text-purple-800">
                {registrations.reduce((sum, reg) => sum + reg.additional_sets, 0)}
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-xs text-amber-600 tracking-wide uppercase">Общий фонд RPS</Label>
              <div className="text-xl font-bold text-amber-800">{formatRPSPoints(totalRPSPool)}</div>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Фонд RPS баллов формируется согласно новой pool-based системе. 
              Баллы распределяются только среди призеров на основе организационных взносов.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Распределение RPS баллов
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Призовых мест: {payoutPlaces.length} из {registeredPlayers} участников
            </p>
          </div>
          <div className="flex gap-2">
            {mode === 'management' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPayoutPlace}
                  disabled={payoutPlaces.length >= registeredPlayers}
                  title="Добавить призовое место (автоматический расчет %)"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={calculateAutomaticPayouts}
                  title="Пересчитать автоматически"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center font-medium">Место</TableHead>
                  <TableHead className="text-center font-medium">%</TableHead>
                  <TableHead className="text-center font-medium">RPS баллы</TableHead>
                  {mode === 'management' && <TableHead className="text-center font-medium">Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutPlaces.map((payout) => (
                  <TableRow key={payout.place} className="hover:bg-gray-50">
                    <TableCell className="text-center font-medium">
                      <Badge variant="outline" className="font-mono">
                        {payout.place}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={payout.percentage}
                          onChange={(e) => updatePayoutPercentage(payout.place, parseFloat(e.target.value) || 0)}
                          className="w-20 mx-auto"
                        />
                      ) : (
                        <span className="font-medium">{payout.percentage}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary">
                        {formatRPSPoints(payout.rps_points)}
                      </span>
                    </TableCell>
                    {mode === 'management' && (
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePayoutPlace(payout.place)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {payoutPlaces.length > 0 && (
                  <TableRow className="bg-amber-50 font-bold">
                    <TableCell className="text-center">ИТОГО</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={totalPercentage === 100 ? "default" : "destructive"}>
                        {totalPercentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-primary">
                      {formatRPSPoints(totalRPSPoints)}
                    </TableCell>
                    {mode === 'management' && <TableCell></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {payoutPlaces.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Структура фонда RPS баллов не настроена</p>
                <p className="text-sm">Включите автоматический расчет или добавьте места вручную</p>
              </div>
            )}
          </div>

          {mode === 'management' && payoutPlaces.length > 0 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {totalPercentage !== 100 && (
                  <span className="text-orange-600">
                    Внимание: общий процент составляет {totalPercentage.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Отменить' : 'Редактировать'}
                </Button>
                <Button onClick={savePayoutStructure}>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить структуру
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernPrizeStructureManager;