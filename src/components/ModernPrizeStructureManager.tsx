import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trophy, Calculator, Save, RefreshCw, AlertCircle, Users, Repeat, Layers, Coins, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatRPSPoints } from "@/utils/rpsCalculations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

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
    
    let totalRPS = 0;
    
    activeRegistrations.forEach(registration => {
      const participationFee = tournament.participation_fee || 0;
      const reentryFee = tournament.reentry_fee || 0;
      const additionalFee = tournament.additional_fee || 0;
      
      const reentries = registration.reentries || 0;
      const additionalSets = registration.additional_sets || 0;
      
      const playerTotalFee = participationFee + (reentries * reentryFee) + (additionalSets * additionalFee);
      
      totalRPS += Math.floor(playerTotalFee / 10);
    });

    return totalRPS;
  };

  const getProfessionalPayoutStructure = (players: number): number[] => {
    if (players < 2) return [];
    if (players === 2) return [65, 35];
    if (players === 3) return [50, 30, 20];
    if (players <= 6) return [40, 25, 20, 15];
    if (players <= 9) return [35, 25, 18, 12, 10];
    if (players <= 18) return [30, 20, 15, 10, 8, 7, 5, 5];
    if (players <= 27) return [25, 18, 13, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2];
    
    const prizeablePositions = Math.min(Math.floor(players * 0.15), 20);
    const structure: number[] = [];
    let remainingPercentage = 100;
    
    const firstPlace = Math.max(20, Math.min(30, Math.floor(100 / prizeablePositions) + 10));
    structure.push(firstPlace);
    remainingPercentage -= firstPlace;
    
    for (let i = 1; i < prizeablePositions; i++) {
      const percentage = Math.max(1, Math.floor(remainingPercentage / (prizeablePositions - i)));
      structure.push(percentage);
      remainingPercentage -= percentage;
    }
    
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
      const { error: deleteError } = await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournament.id);

      if (deleteError) throw deleteError;

      const payoutsToInsert = payoutPlaces.map(place => ({
        tournament_id: tournament.id,
        place: place.place,
        percentage: place.percentage,
        amount: 0,
        rps_points: place.rps_points
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
  const totalReentries = registrations.reduce((sum, reg) => sum + reg.reentries, 0);
  const totalAdditionalSets = registrations.reduce((sum, reg) => sum + reg.additional_sets, 0);

  const getPlaceBadgeStyle = (place: number) => {
    if (place === 1) return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    if (place === 2) return 'bg-slate-400/20 text-slate-300 border-slate-400/50';
    if (place === 3) return 'bg-orange-600/20 text-orange-400 border-orange-600/50';
    return 'bg-primary/20 text-primary border-primary/50';
  };

  return (
    <div className="space-y-6">
      {/* RPS Pool Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card brutal-border overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-foreground">Фонд RPS баллов</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                  disabled={mode === 'analysis'}
                />
                <Label className="text-sm text-muted-foreground">Авторасчёт</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div 
                className="p-4 bg-primary/10 rounded-lg border border-primary/30"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <Label className="text-xs text-primary uppercase tracking-wider">Участники</Label>
                </div>
                <div className="text-2xl font-bold text-foreground">{registeredPlayers}</div>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-green-500/10 rounded-lg border border-green-500/30"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="w-4 h-4 text-green-400" />
                  <Label className="text-xs text-green-400 uppercase tracking-wider">Re-entry</Label>
                </div>
                <div className="text-xl font-semibold text-foreground">{totalReentries}</div>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <Label className="text-xs text-purple-400 uppercase tracking-wider">Доп. наборы</Label>
                </div>
                <div className="text-xl font-semibold text-foreground">{totalAdditionalSets}</div>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <Label className="text-xs text-amber-400 uppercase tracking-wider">Общий фонд RPS</Label>
                </div>
                <div className="text-xl font-bold text-amber-400">{formatRPSPoints(totalRPSPool)}</div>
              </motion.div>
            </div>

            <Alert className="bg-background/50 border-border/50">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-muted-foreground">
                Фонд RPS баллов формируется согласно pool-based системе. 
                Баллы распределяются только среди призеров на основе организационных взносов.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </motion.div>

      {/* Distribution Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-card brutal-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground">Распределение RPS баллов</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Призовых мест: <span className="text-primary font-medium">{payoutPlaces.length}</span> из {registeredPlayers} участников
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
                    className="border-border text-foreground hover:bg-primary/20 hover:text-primary"
                    title="Добавить призовое место"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={calculateAutomaticPayouts}
                    className="border-border text-foreground hover:bg-primary/20 hover:text-primary"
                    title="Пересчитать автоматически"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background/30 rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-center text-muted-foreground font-medium">Место</TableHead>
                    <TableHead className="text-center text-muted-foreground font-medium">%</TableHead>
                    <TableHead className="text-center text-muted-foreground font-medium">RPS баллы</TableHead>
                    {mode === 'management' && <TableHead className="text-center text-muted-foreground font-medium">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {payoutPlaces.map((payout, index) => (
                      <motion.tr
                        key={payout.place}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-border/30 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="text-center font-medium">
                          <Badge variant="outline" className={`font-mono ${getPlaceBadgeStyle(payout.place)}`}>
                            {payout.place === 1 && <Award className="w-3 h-3 mr-1" />}
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
                              className="w-20 mx-auto bg-background border-border text-foreground"
                            />
                          ) : (
                            <span className="font-medium text-foreground">{payout.percentage}%</span>
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
                              variant="ghost"
                              size="sm"
                              onClick={() => removePayoutPlace(payout.place)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/20"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {payoutPlaces.length > 0 && (
                    <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                      <TableCell className="text-center text-foreground">ИТОГО</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={totalPercentage === 100 
                            ? "bg-green-500/20 text-green-400 border-green-500/50" 
                            : "bg-destructive/20 text-destructive border-destructive/50"
                          }
                        >
                          {totalPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-primary font-bold">
                        {formatRPSPoints(totalRPSPoints)}
                      </TableCell>
                      {mode === 'management' && <TableCell />}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {payoutPlaces.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Нужно минимум 2 участника для формирования призового фонда</p>
              </div>
            )}

            {mode === 'management' && payoutPlaces.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="border-border text-foreground hover:bg-primary/20"
                  >
                    {isEditing ? 'Завершить редактирование' : 'Редактировать %'}
                  </Button>
                </div>
                <Button 
                  onClick={savePayoutStructure}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить структуру
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ModernPrizeStructureManager;
