import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserX, 
  Target,
  Coins,
  Clock,
  BarChart3,
  Trophy,
  Zap,
  TrendingUp
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  participation_fee: number;
  starting_chips: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  max_players: number;
  players_per_table: number | null;
  reentry_fee?: number;
  additional_fee?: number;
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
  seat_number: number | null;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number;
  is_break: boolean;
}

interface ClubTournamentOverviewProps {
  tournament: Tournament;
  registrations: Registration[];
  blindLevels: BlindLevel[];
  currentTime: number;
}

export function ClubTournamentOverview({
  tournament,
  registrations,
  blindLevels,
  currentTime
}: ClubTournamentOverviewProps) {
  const activePlayers = registrations.filter(r => r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
  const pendingPlayers = registrations.filter(r => r.status === 'registered');
  
  const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const avgStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;
  const bigBlindCount = activePlayers.length > 0 
    ? Math.round(avgStack / (tournament.current_big_blind || 1)) 
    : 0;

  // Calculate tables needed
  const playersPerTable = tournament.players_per_table || 9;
  const tablesNeeded = Math.ceil(activePlayers.length / playersPerTable);

  // Calculate prize pool
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
  const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
  const entries = registrations.length + totalReentries + totalAddons;
  const prizePool = entries * (tournament.participation_fee || 0);
  const rpsPool = Math.floor(prizePool / 10);

  // Chip leader
  const chipLeader = [...registrations]
    .filter(r => r.status === 'playing')
    .sort((a, b) => (b.chips || 0) - (a.chips || 0))[0];

  // Short stack
  const shortStack = [...registrations]
    .filter(r => r.status === 'playing' && r.chips > 0)
    .sort((a, b) => (a.chips || 0) - (b.chips || 0))[0];

  // Blind structure preview
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных игроков</p>
                <p className="text-3xl font-bold text-green-500">{activePlayers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  из {registrations.length} зарегистрированных
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Users className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Выбыло</p>
                <p className="text-3xl font-bold text-red-500">{eliminatedPlayers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingPlayers.length > 0 && `+${pendingPlayers.length} ожидают`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <UserX className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средний стек</p>
                <p className="text-3xl font-bold">{(avgStack / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bigBlindCount} BB
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Призовой фонд</p>
                <p className="text-3xl font-bold text-amber-500">{prizePool.toLocaleString()}₽</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {entries} входов
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Coins className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Столов</p>
                <p className="text-3xl font-bold text-blue-500">{tablesNeeded}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  по {playersPerTable} игроков
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ре-ентри</p>
                <p className="text-3xl font-bold text-purple-500">{totalReentries}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{totalAddons} add-on
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">RPS пул</p>
                <p className="text-3xl font-bold text-primary">{rpsPool.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  очков
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего фишек</p>
                <p className="text-3xl font-bold">{(totalChips / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <Coins className="w-6 h-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chip Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chip Leader */}
        <Card className="bg-card border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Чиплидер
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chipLeader ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{chipLeader.player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {chipLeader.player.elo_rating} ELO
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-500">
                    {((chipLeader.chips || 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((chipLeader.chips || 0) / (tournament.current_big_blind || 1))} BB
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Short Stack */}
        <Card className="bg-card border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-500" />
              Короткий стек
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shortStack && shortStack !== chipLeader ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{shortStack.player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {shortStack.player.elo_rating} ELO
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-500">
                    {((shortStack.chips || 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((shortStack.chips || 0) / (tournament.current_big_blind || 1))} BB
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Нет данных</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blind Structure Preview */}
      <Card className="bg-card border-2 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Структура блайндов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {blindLevels.slice(0, 15).map((level) => (
              <div 
                key={level.level}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  level.level === tournament.current_level 
                    ? 'bg-primary/20 border-2 border-primary/30' 
                    : level.level < tournament.current_level 
                      ? 'opacity-50 bg-muted/30' 
                      : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={level.is_break ? "secondary" : level.level === tournament.current_level ? "default" : "outline"} 
                    className="w-20 justify-center"
                  >
                    {level.is_break ? 'Перерыв' : `Уровень ${level.level}`}
                  </Badge>
                  {!level.is_break && (
                    <span className="font-medium">
                      {level.small_blind}/{level.big_blind}
                      {level.ante && level.ante > 0 && (
                        <span className="text-muted-foreground"> (анте {level.ante})</span>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(level.duration / 60)} мин
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
