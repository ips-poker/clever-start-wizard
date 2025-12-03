import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trophy, Calculator, Save, RefreshCw, Users, Repeat, Layers, Coins, Award, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface PrizeStructureManagerProps {
  tournamentId: string;
  registeredPlayers: number;
  mode?: 'management' | 'analysis';
}

interface TournamentRegistration {
  player_id: string;
  rebuys?: number;
  addons?: number;
  reentries?: number;
  additional_sets?: number;
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
        .select('player_id, rebuys, addons, reentries, additional_sets')
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
        
        const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
        setTotalPrizePool(totalAmount);
      }
    } catch (error) {
      console.error('Error fetching existing payouts:', error);
    }
  };

  const getPayoutStructure = (playerCount: number): number[] => {
    if (playerCount <= 8) {
      return [60, 40];
    } else if (playerCount <= 11) {
      return [50, 30, 20];
    } else if (playerCount <= 20) {
      return [40, 27, 19, 14];
    } else if (playerCount <= 30) {
      return [36.0, 25.0, 17.5, 12.8, 8.7];
    } else if (playerCount <= 50) {
      return [34.0, 23.0, 16.5, 11.9, 8.0, 6.6];
    } else if (playerCount <= 70) {
      return [31.7, 20.7, 15.3, 10.8, 7.2, 5.8, 4.6, 3.9];
    } else if (playerCount <= 100) {
      return [30.5, 19.5, 13.7, 10.0, 6.7, 5.4, 4.2, 3.7, 3.3, 3.0];
    } else if (playerCount <= 130) {
      return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0];
    } else {
      return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0, 1.8, 1.7];
    }
  };

  const calculatePrizePool = () => {
    const participationFee = tournament.participation_fee || tournament.buy_in || 0;
    const reentryFee = tournament.reentry_fee || tournament.rebuy_cost || 0;
    const additionalFee = tournament.additional_fee || tournament.addon_cost || 0;
    
    const mainTotal = participationFee * registeredPlayers;
    const reentryTotal = registrations.reduce((sum, reg) => {
      const reentries = reg.reentries || 0;
      const rebuys = reg.rebuys || 0;
      const count = reentries + rebuys;
      return sum + (count * reentryFee);
    }, 0);
    const additionalTotal = registrations.reduce((sum, reg) => {
      const additionalSets = reg.additional_sets || 0;
      const addons = reg.addons || 0;
      const count = additionalSets + addons;
      return sum + (count * additionalFee);
    }, 0);
    
    const totalInRubles = mainTotal + reentryTotal + additionalTotal;
    return Math.floor(totalInRubles / 10);
  };

  const calculateAdditionalPlacePercentage = (currentPlaces: PayoutPlace[], newPlaceNumber: number) => {
    if (currentPlaces.length === 0) return 5;
    
    const lastPlace = currentPlaces[currentPlaces.length - 1];
    const newPercentage = Math.max(lastPlace.percentage - 0.5, 1.0);
    
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

    if (autoCalculate) {
      await savePayoutStructure(payouts);
    }
  };

  const savePayoutStructure = async (payouts: PayoutPlace[]) => {
    try {
      const { error: deleteError } = await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournamentId);

      if (deleteError) throw deleteError;

      if (payouts.length > 0) {
        const payoutRecords = payouts.map(payout => ({
          tournament_id: tournamentId,
          place: payout.place,
          percentage: payout.percentage,
          amount: payout.amount,
          rps_points: payout.amount
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

  const getPlaceBadgeStyle = (place: number) => {
    switch (place) {
      case 1:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case 2:
        return "bg-zinc-400/20 text-zinc-300 border-zinc-400/30";
      case 3:
        return "bg-amber-600/20 text-amber-400 border-amber-600/30";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const totalReentries = registrations.reduce((sum, reg) => {
    const reentries = reg.reentries || 0;
    const rebuys = reg.rebuys || 0;
    return sum + reentries + rebuys;
  }, 0);

  const totalAdditionalSets = registrations.reduce((sum, reg) => {
    const additionalSets = reg.additional_sets || 0;
    const addons = reg.addons || 0;
    return sum + additionalSets + addons;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Настройки режима */}
      {mode === 'management' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-card brutal-border">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-3 text-foreground">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                Настройки призового фонда
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Автоматический расчет */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg brutal-border mb-6">
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-primary" />
                  <Label htmlFor="auto-calculate" className="text-foreground">
                    Автоматический расчет при изменениях
                  </Label>
                </div>
                <Switch 
                  id="auto-calculate"
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                />
              </div>
              
              {/* Информация о взносах */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <motion.div 
                  className="p-4 bg-background rounded-lg brutal-border"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-blue-400" />
                    <Label className="text-xs text-muted-foreground tracking-wide uppercase">
                      Орг. взнос
                    </Label>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {(tournament?.participation_fee || tournament?.buy_in || 0).toLocaleString()} ₽
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {(tournament?.starting_chips || 0).toLocaleString()} фишек
                  </div>
                </motion.div>
                
                <motion.div 
                  className="p-4 bg-background rounded-lg brutal-border"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="w-4 h-4 text-green-400" />
                    <Label className="text-xs text-muted-foreground tracking-wide uppercase">
                      Повторный вход
                    </Label>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {(tournament?.reentry_fee || tournament?.rebuy_cost || 0).toLocaleString()} ₽
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {(tournament?.reentry_chips || tournament?.rebuy_chips || 0).toLocaleString()} фишек
                  </div>
                </motion.div>
              </div>
              
              {/* Статистика */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div 
                  className="p-4 bg-background rounded-lg brutal-border text-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{registeredPlayers}</div>
                  <div className="text-xs text-muted-foreground">Игроков</div>
                </motion.div>
                
                <motion.div 
                  className="p-4 bg-background rounded-lg brutal-border text-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Repeat className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{totalReentries}</div>
                  <div className="text-xs text-muted-foreground">Повт. входы</div>
                </motion.div>
                
                <motion.div 
                  className="p-4 bg-background rounded-lg brutal-border text-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Layers className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{totalAdditionalSets}</div>
                  <div className="text-xs text-muted-foreground">Доп. наборы</div>
                </motion.div>
                
                <motion.div 
                  className="p-4 bg-primary/10 rounded-lg brutal-border text-center border-primary/30"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">{totalPrizePool.toLocaleString()}</div>
                  <div className="text-xs text-primary/70">RPS Фонд</div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Управление количеством призовых мест */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg brutal-border"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Призовые места
          </h3>
          <p className="text-sm text-muted-foreground">
            Призовых мест: {isEditing ? editedPayouts.length : payoutPlaces.length} из {registeredPlayers} игроков
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                className="bg-background border-border hover:bg-muted"
              >
                Редактировать
              </Button>
              <Button
                onClick={calculateAutomaticPayouts}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Авто-расчет
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={removePayoutPlace}
                disabled={editedPayouts.length <= 1}
                size="sm"
                variant="outline"
                className="bg-background border-border hover:bg-destructive/20 hover:text-destructive"
                title="Удалить последнее место"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={addPayoutPlace}
                disabled={editedPayouts.length >= registeredPlayers}
                size="sm"
                variant="outline"
                className="bg-background border-border hover:bg-primary/20 hover:text-primary"
                title="Добавить призовое место"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSaveEdits}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
              <Button
                onClick={handleCancelEdits}
                size="sm"
                variant="outline"
                className="bg-background border-border hover:bg-muted"
              >
                Отмена
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Таблица выплат */}
      <AnimatePresence>
        {(payoutPlaces.length > 0 || editedPayouts.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-card brutal-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 bg-background/50">
                        <TableHead className="text-muted-foreground font-medium">Призовое место</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Позиция в турнире</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Процент</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">RPS баллы</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(isEditing ? editedPayouts : payoutPlaces).map((payout, index) => {
                        const eliminationPosition = registeredPlayers - index;
                        return (
                          <motion.tr
                            key={payout.place}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="font-medium">
                              <Badge 
                                variant="outline" 
                                className={`${getPlaceBadgeStyle(payout.place)}`}
                              >
                                <Trophy className="w-3 h-3 mr-1" />
                                {payout.place} место
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-muted-foreground">
                              <span>Позиция {eliminationPosition}</span>
                              {eliminationPosition === registeredPlayers && (
                                <Badge className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                  Победитель
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={payout.percentage}
                                  onChange={(e) => updateEditedPercentage(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-background border-border text-foreground"
                                />
                              ) : (
                                <span className="font-medium text-foreground">{payout.percentage.toFixed(1)}%</span>
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-primary text-right">
                              {isEditing 
                                ? Math.round((totalPrizePool * payout.percentage) / 100).toLocaleString()
                                : payout.amount.toLocaleString()
                              }
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Итоговая статистика */}
                <div className="border-t border-border/50 p-4 bg-background/50">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Итого:</span>
                    <div className="flex gap-6">
                      <span className={`font-bold ${
                        getTotalPercentage(isEditing ? editedPayouts : payoutPlaces) === 100 
                          ? 'text-green-400' 
                          : 'text-destructive'
                      }`}>
                        {getTotalPercentage(isEditing ? editedPayouts : payoutPlaces).toFixed(1)}%
                      </span>
                      <span className="font-bold text-primary">
                        {(isEditing ? editedPayouts : payoutPlaces)
                          .reduce((sum, p) => sum + (isEditing ? Math.round((totalPrizePool * p.percentage) / 100) : p.amount), 0)
                          .toLocaleString()} RPS
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrizeStructureManager;
