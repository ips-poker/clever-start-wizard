import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy,
  Medal,
  Crown,
  Coins,
  TrendingUp,
  Users
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

interface ClubTournamentResultsProps {
  tournament: Tournament;
  registrations: Registration[];
}

export function ClubTournamentResults({
  tournament,
  registrations
}: ClubTournamentResultsProps) {
  const finishedPlayers = registrations
    .filter(r => r.status === 'eliminated' || r.final_position !== null)
    .sort((a, b) => (a.final_position || 999) - (b.final_position || 999));

  // Calculate prize pool
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
  const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
  
  const basePrizePool = registrations.length * (tournament.participation_fee || 0);
  const reentryPrizePool = totalReentries * (tournament.reentry_fee || 0);
  const addonPrizePool = totalAddons * (tournament.additional_fee || 0);
  const totalPrizePool = basePrizePool + reentryPrizePool + addonPrizePool;

  // Standard payout structure
  const getPayoutPercentage = (position: number, totalPlayers: number): number => {
    if (totalPlayers <= 10) {
      if (position === 1) return 100;
      return 0;
    } else if (totalPlayers <= 20) {
      if (position === 1) return 65;
      if (position === 2) return 35;
      return 0;
    } else if (totalPlayers <= 40) {
      if (position === 1) return 50;
      if (position === 2) return 30;
      if (position === 3) return 20;
      return 0;
    } else {
      if (position === 1) return 40;
      if (position === 2) return 25;
      if (position === 3) return 15;
      if (position === 4) return 10;
      if (position === 5) return 10;
      return 0;
    }
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-amber-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getRankColor = (position: number) => {
    if (position === 1) return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
    if (position === 2) return "from-zinc-400/20 to-zinc-400/5 border-zinc-400/30";
    if (position === 3) return "from-amber-700/20 to-amber-700/5 border-amber-700/30";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Prize Pool Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Призовой фонд
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Базовый</p>
              <p className="text-xl font-bold">{basePrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{registrations.length} игроков</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Re-entry</p>
              <p className="text-xl font-bold">{reentryPrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{totalReentries} re-entry</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Addon</p>
              <p className="text-xl font-bold">{addonPrizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">{totalAddons} addon</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm text-primary">Итого</p>
              <p className="text-2xl font-bold text-primary">{totalPrizePool.toLocaleString()}₽</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Structure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Структура выплат
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(pos => {
              const percentage = getPayoutPercentage(pos, registrations.length);
              if (percentage === 0) return null;
              
              const amount = Math.round(totalPrizePool * percentage / 100);
              const player = finishedPlayers.find(p => p.final_position === pos);

              return (
                <div 
                  key={pos}
                  className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${getRankColor(pos) || 'bg-muted/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                      {getRankIcon(pos) || (
                        <span className="font-bold text-muted-foreground">{pos}</span>
                      )}
                    </div>
                    <div>
                      {player ? (
                        <>
                          <p className="font-medium">{player.player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.player.elo_rating} ELO</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">{pos} место</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{amount.toLocaleString()}₽</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Full Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Результаты ({finishedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Турнир ещё не завершён
            </p>
          ) : (
            <div className="space-y-2">
              {finishedPlayers.map((reg, index) => {
                const position = reg.final_position || index + 1;
                const percentage = getPayoutPercentage(position, registrations.length);
                const payout = percentage > 0 ? Math.round(totalPrizePool * percentage / 100) : 0;

                return (
                  <div 
                    key={reg.id}
                    className={`flex items-center gap-4 p-3 rounded-lg ${position <= 3 ? `bg-gradient-to-r ${getRankColor(position)}` : 'hover:bg-muted/50'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                      {getRankIcon(position) || position}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reg.player.avatar_url || undefined} />
                      <AvatarFallback className={position <= 3 ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'}>
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
                            +{reg.reentries} re-entry
                          </Badge>
                        )}
                      </div>
                    </div>

                    {payout > 0 && (
                      <div className="text-right">
                        <p className="font-bold text-green-500">{payout.toLocaleString()}₽</p>
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
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