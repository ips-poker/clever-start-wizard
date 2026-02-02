import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Calculator, 
  Coins, 
  Zap,
  Save,
  Loader2,
  Plus,
  Minus,
  RefreshCw,
  Medal
} from 'lucide-react';

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  reentries: number;
  additional_sets: number;
}

interface PayoutPlace {
  place: number;
  percentage: number;
  amount: number;
  rpsPoints: number;
}

interface Tournament {
  id: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
}

interface ClubPayoutStructureProps {
  tournamentId: string;
  registrations: Registration[];
  tournament: Tournament;
  onUpdate?: () => void;
}

// Professional payout structure based on player count
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

export function ClubPayoutStructure({ 
  tournamentId, 
  registrations, 
  tournament,
  onUpdate 
}: ClubPayoutStructureProps) {
  const { toast } = useToast();
  const [payoutPlaces, setPayoutPlaces] = useState<PayoutPlace[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const playerCount = registrations.length;

  // Calculate prize pool
  const prizePoolDetails = useMemo(() => {
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    
    const participationTotal = tournament.participation_fee * playerCount;
    const reentryTotal = totalReentries * (tournament.reentry_fee || 0);
    const additionalTotal = totalAddons * (tournament.additional_fee || 0);
    
    const totalPrizePool = participationTotal + reentryTotal + additionalTotal;
    const rpsPool = Math.floor(totalPrizePool / 10); // RPS = 10% от призового фонда
    
    return {
      playerCount,
      totalReentries,
      totalAddons,
      participationTotal,
      reentryTotal,
      additionalTotal,
      totalPrizePool,
      rpsPool
    };
  }, [registrations, tournament, playerCount]);

  // Load existing payouts or calculate new ones
  useEffect(() => {
    loadPayouts();
  }, [tournamentId]);

  // Recalculate when registrations change
  useEffect(() => {
    if (!isLoading) {
      calculateAutomaticPayouts();
    }
  }, [playerCount, prizePoolDetails.totalPrizePool]);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('place', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPayoutPlaces(data.map(p => ({
          place: p.place,
          percentage: p.percentage,
          amount: p.amount,
          rpsPoints: p.rps_points || Math.floor(p.amount / 10)
        })));
      } else {
        calculateAutomaticPayouts();
      }
    } catch (error) {
      console.error('Error loading payouts:', error);
      calculateAutomaticPayouts();
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAutomaticPayouts = () => {
    if (playerCount === 0) {
      setPayoutPlaces([]);
      return;
    }

    const percentages = getPayoutStructure(playerCount);
    const payouts = percentages.map((percentage, index) => ({
      place: index + 1,
      percentage,
      amount: Math.floor((prizePoolDetails.totalPrizePool * percentage) / 100),
      rpsPoints: Math.floor((prizePoolDetails.rpsPool * percentage) / 100)
    }));

    setPayoutPlaces(payouts);
  };

  const updatePayoutPercentage = (index: number, newPercentage: number) => {
    const updatedPayouts = [...payoutPlaces];
    updatedPayouts[index] = {
      ...updatedPayouts[index],
      percentage: newPercentage,
      amount: Math.floor((prizePoolDetails.totalPrizePool * newPercentage) / 100),
      rpsPoints: Math.floor((prizePoolDetails.rpsPool * newPercentage) / 100)
    };
    setPayoutPlaces(updatedPayouts);
  };

  const addPayoutPlace = () => {
    const newPlace = payoutPlaces.length + 1;
    const newPayout: PayoutPlace = {
      place: newPlace,
      percentage: 5,
      amount: Math.floor((prizePoolDetails.totalPrizePool * 5) / 100),
      rpsPoints: Math.floor((prizePoolDetails.rpsPool * 5) / 100)
    };
    setPayoutPlaces([...payoutPlaces, newPayout]);
  };

  const removePayoutPlace = () => {
    if (payoutPlaces.length <= 1) return;
    setPayoutPlaces(payoutPlaces.slice(0, -1));
  };

  const savePayouts = async () => {
    setIsSaving(true);
    try {
      // Delete existing payouts
      await supabase
        .from('tournament_payouts')
        .delete()
        .eq('tournament_id', tournamentId);

      // Insert new payouts
      const { error } = await supabase
        .from('tournament_payouts')
        .insert(payoutPlaces.map(p => ({
          tournament_id: tournamentId,
          place: p.place,
          percentage: p.percentage,
          amount: p.amount,
          rps_points: p.rpsPoints
        })));

      if (error) throw error;

      toast({ title: "Призовая структура сохранена" });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving payouts:', error);
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalPercentage = () => {
    return payoutPlaces.reduce((sum, p) => sum + p.percentage, 0);
  };

  const getTotalRPS = () => {
    return payoutPlaces.reduce((sum, p) => sum + p.rpsPoints, 0);
  };

  const getMedalColor = (place: number) => {
    switch (place) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prize Pool Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Призовой фонд</CardTitle>
                <CardDescription>
                  Автоматический расчет на основе регистраций
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={calculateAutomaticPayouts}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Пересчитать
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase mb-1">Игроков</p>
              <p className="text-2xl font-bold">{prizePoolDetails.playerCount}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase mb-1">Re-entry</p>
              <p className="text-2xl font-bold">{prizePoolDetails.totalReentries}</p>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg text-center border border-amber-500/30">
              <p className="text-xs text-amber-600 uppercase mb-1">Призовой фонд</p>
              <p className="text-2xl font-bold text-amber-500">{prizePoolDetails.totalPrizePool.toLocaleString()} ₽</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center border border-primary/30">
              <p className="text-xs text-primary uppercase mb-1">RPS пул</p>
              <p className="text-2xl font-bold text-primary">{prizePoolDetails.rpsPool.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Breakdown */}
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Взносы:</span>
                <span className="ml-2 font-medium">{prizePoolDetails.participationTotal.toLocaleString()} ₽</span>
              </div>
              <div>
                <span className="text-muted-foreground">Re-entry:</span>
                <span className="ml-2 font-medium">{prizePoolDetails.reentryTotal.toLocaleString()} ₽</span>
              </div>
              <div>
                <span className="text-muted-foreground">Add-on:</span>
                <span className="ml-2 font-medium">{prizePoolDetails.additionalTotal.toLocaleString()} ₽</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Structure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Структура выплат</CardTitle>
                <CardDescription>
                  {payoutPlaces.length} призовых мест • {getTotalPercentage().toFixed(1)}% распределено
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={removePayoutPlace}
                disabled={payoutPlaces.length <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={addPayoutPlace}
                disabled={payoutPlaces.length >= playerCount}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Место</TableHead>
                <TableHead>Процент</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">RPS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutPlaces.map((payout, index) => (
                <TableRow key={payout.place}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Medal className={`w-5 h-5 ${getMedalColor(payout.place)}`} />
                      <span className="font-medium">{payout.place}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={payout.percentage}
                        onChange={(e) => updatePayoutPercentage(index, parseFloat(e.target.value) || 0)}
                        className="w-20 h-8"
                        step="0.1"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {payout.amount.toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-mono">
                      {payout.rpsPoints.toLocaleString()} RPS
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge 
                variant={Math.abs(getTotalPercentage() - 100) < 0.1 ? "default" : "destructive"}
                className="text-sm"
              >
                Итого: {getTotalPercentage().toFixed(1)}%
              </Badge>
              {Math.abs(getTotalPercentage() - 100) >= 0.1 && (
                <span className="text-sm text-destructive">
                  (должно быть 100%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                RPS: {getTotalRPS().toLocaleString()} / {prizePoolDetails.rpsPool.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4 flex justify-end">
            <Button onClick={savePayouts} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Сохранить структуру
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
