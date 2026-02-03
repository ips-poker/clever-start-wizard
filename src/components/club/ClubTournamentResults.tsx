import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Trophy,
  Medal,
  Crown,
  Coins,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  Award
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  final_position: number | null;
}

interface Payout {
  place: number;
  percentage: number;
  amount: number;
  rps_points: number;
}

interface ClubTournamentResultsProps {
  tournament: Tournament;
  registrations: Registration[];
}

export function ClubTournamentResults({
  tournament,
  registrations
}: ClubTournamentResultsProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load payouts from database
  useEffect(() => {
    const loadPayouts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('tournament_payouts')
          .select('*')
          .eq('tournament_id', tournament.id)
          .order('place', { ascending: true });

        if (!error && data) {
          setPayouts(data.map(p => ({
            place: p.place,
            percentage: p.percentage,
            amount: p.amount,
            rps_points: p.rps_points || 0
          })));
        }
      } catch (error) {
        console.error('Error loading payouts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPayouts();

    // Subscribe to payout changes
    const channel = supabase
      .channel(`club_payouts_${tournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_payouts',
        filter: `tournament_id=eq.${tournament.id}`
      }, () => loadPayouts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournament.id]);

  const finishedPlayers = useMemo(() => {
    return registrations
      .filter(r => r.status === 'eliminated' || r.final_position !== null)
      .sort((a, b) => (a.final_position || 999) - (b.final_position || 999));
  }, [registrations]);

  // Calculate prize pool
  const prizePoolDetails = useMemo(() => {
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    
    const basePrizePool = registrations.length * (tournament.participation_fee || 0);
    const reentryPrizePool = totalReentries * (tournament.reentry_fee || 0);
    const addonPrizePool = totalAddons * (tournament.additional_fee || 0);
    const totalPrizePool = basePrizePool + reentryPrizePool + addonPrizePool;
    const rpsPool = Math.floor(totalPrizePool / 10);

    return {
      totalReentries,
      totalAddons,
      basePrizePool,
      reentryPrizePool,
      addonPrizePool,
      totalPrizePool,
      rpsPool
    };
  }, [registrations, tournament]);

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-amber-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getRankStyle = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-l-4 border-l-amber-500";
    if (position === 2) return "bg-gradient-to-r from-zinc-400/20 to-zinc-400/5 border-l-4 border-l-zinc-400";
    if (position === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-700/5 border-l-4 border-l-amber-700";
    return "";
  };

  // Get payout for a position
  const getPayoutForPosition = (position: number) => {
    const payout = payouts.find(p => p.place === position);
    if (payout) {
      return { amount: payout.amount, rps: payout.rps_points };
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prize Pool Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Призовой фонд
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Базовый</p>
              <p className="text-xl font-bold">{prizePoolDetails.basePrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{registrations.length} игроков</p>
            </div>
            <div className="text-center p-4 bg-purple-500/10 rounded-lg">
              <p className="text-sm text-purple-500">Re-entry</p>
              <p className="text-xl font-bold">{prizePoolDetails.reentryPrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{prizePoolDetails.totalReentries} re-entry</p>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <p className="text-sm text-blue-500">Add-on</p>
              <p className="text-xl font-bold">{prizePoolDetails.addonPrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{prizePoolDetails.totalAddons} addon</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
              <p className="text-sm text-primary font-medium">ИТОГО</p>
              <p className="text-2xl font-bold text-primary">{prizePoolDetails.totalPrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{prizePoolDetails.rpsPool.toLocaleString()} RPS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Structure from DB */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Структура выплат ({payouts.length} мест)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payouts.map(payout => {
                const player = finishedPlayers.find(p => p.final_position === payout.place);

                return (
                  <div 
                    key={payout.place}
                    className={`flex items-center justify-between p-3 rounded-lg ${getRankStyle(payout.place) || 'bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center font-bold">
                        {getRankIcon(payout.place) || payout.place}
                      </div>
                      <div>
                        {player ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.player.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {player.player.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{player.player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.player.elo_rating} ELO</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">{payout.place} место</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-500">{payout.amount.toLocaleString()}₽</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-muted-foreground">{payout.percentage}%</span>
                        {payout.rps_points > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{payout.rps_points} RPS
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Результаты турнира ({finishedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Турнир ещё не завершён
            </p>
          ) : (
            <div className="space-y-2">
              {finishedPlayers.map((reg) => {
                const position = reg.final_position || 0;
                const payoutInfo = getPayoutForPosition(position);
                const isTop3 = position <= 3;

                return (
                  <div 
                    key={reg.id}
                    className={`flex items-center gap-4 p-3 rounded-lg ${getRankStyle(position) || 'hover:bg-muted/50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      position === 1 ? 'bg-amber-500/20 text-amber-500' :
                      position === 2 ? 'bg-zinc-400/20 text-zinc-400' :
                      position === 3 ? 'bg-amber-700/20 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getRankIcon(position) || position}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reg.player.avatar_url || undefined} />
                      <AvatarFallback className={isTop3 ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'}>
                        {reg.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{reg.player.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {reg.player.elo_rating} ELO
                        </span>
                        {reg.reentries > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{reg.reentries} RE
                          </Badge>
                        )}
                      </div>
                    </div>

                    {payoutInfo && (
                      <div className="text-right">
                        <p className="font-bold text-green-500">{payoutInfo.amount.toLocaleString()}₽</p>
                        {payoutInfo.rps > 0 && (
                          <p className="text-xs text-muted-foreground">+{payoutInfo.rps} RPS</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}