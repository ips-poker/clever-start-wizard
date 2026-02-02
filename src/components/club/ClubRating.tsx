import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  Crown,
  Loader2,
  Users,
  Target,
  Award
} from "lucide-react";

interface RankedPlayer {
  rank: number;
  id: string;
  name: string;
  avatar_url: string | null;
  elo_rating: number;
  games_played: number;
  wins: number;
  winRate: number;
  change?: number;
}

export function ClubRating() {
  const { club } = useClub();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");

  // Fetch club rating
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["club-rating", club?.id, period],
    queryFn: async () => {
      if (!club?.id) return [];

      const { data, error } = await supabase
        .from('clan_members')
        .select(`
          player:players(
            id,
            name,
            avatar_url,
            elo_rating,
            games_played,
            wins
          )
        `)
        .eq('clan_id', club.id);

      if (error) throw error;

      // Transform and sort by ELO
      const rankedPlayers: RankedPlayer[] = data
        .map(m => m.player)
        .filter(Boolean)
        .map(p => ({
          id: p!.id,
          name: p!.name,
          avatar_url: p!.avatar_url,
          elo_rating: p!.elo_rating || 1000,
          games_played: p!.games_played || 0,
          wins: p!.wins || 0,
          winRate: p!.games_played ? Math.round((p!.wins / p!.games_played) * 100) : 0,
          rank: 0,
          change: Math.floor(Math.random() * 100) - 50 // Mock change for now
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      return rankedPlayers;
    },
    enabled: !!club?.id
  });

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const topPlayers = players.slice(0, 3);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
    if (rank === 2) return "from-zinc-400/20 to-zinc-400/5 border-zinc-400/30";
    if (rank === 3) return "from-amber-700/20 to-amber-700/5 border-amber-700/30";
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Рейтинг клуба</h2>
          <p className="text-sm text-muted-foreground">
            {players.length} игроков в рейтинге
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск игрока..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {topPlayers.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {/* 2nd place */}
          <Card className={`bg-gradient-to-b ${getRankColor(2)} border mt-6`}>
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarImage src={topPlayers[1]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-zinc-400/20 text-zinc-300 text-xl">
                    {topPlayers[1]?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-zinc-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="font-medium mt-3 truncate text-sm">{topPlayers[1]?.name}</h3>
              <p className="text-xl font-bold text-zinc-400">{topPlayers[1]?.elo_rating}</p>
            </CardContent>
          </Card>

          {/* 1st place */}
          <Card className={`bg-gradient-to-b ${getRankColor(1)} border`}>
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-20 w-20 mx-auto ring-2 ring-amber-500/50">
                  <AvatarImage src={topPlayers[0]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-500/20 text-amber-500 text-2xl">
                    {topPlayers[0]?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold mt-3 truncate">{topPlayers[0]?.name}</h3>
              <p className="text-2xl font-bold text-amber-500">{topPlayers[0]?.elo_rating}</p>
            </CardContent>
          </Card>

          {/* 3rd place */}
          <Card className={`bg-gradient-to-b ${getRankColor(3)} border mt-6`}>
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarImage src={topPlayers[2]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-700/20 text-amber-700 text-xl">
                    {topPlayers[2]?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-amber-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="font-medium mt-3 truncate text-sm">{topPlayers[2]?.name}</h3>
              <p className="text-xl font-bold text-amber-700">{topPlayers[2]?.elo_rating}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего игр</p>
                <p className="text-2xl font-bold">
                  {players.reduce((sum, p) => sum + p.games_played, 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-primary">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средний ELO</p>
                <p className="text-2xl font-bold">
                  {players.length ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Топ ELO</p>
                <p className="text-2xl font-bold">
                  {topPlayers[0]?.elo_rating || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-amber-500">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold">
                  {players.filter(p => p.games_played > 0).length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-green-500">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Rating Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Полный рейтинг</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPlayers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? "Игроки не найдены" : "Нет данных рейтинга"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {getRankIcon(player.rank) || (
                      <span className="text-lg font-bold text-muted-foreground">
                        {player.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{player.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{player.games_played} игр</span>
                      <span>{player.winRate}% побед</span>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="text-right">
                    <p className="text-lg font-bold">{player.elo_rating}</p>
                    {player.change !== undefined && (
                      <div className={`flex items-center justify-end gap-1 text-sm ${
                        player.change > 0 ? 'text-green-500' : player.change < 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {player.change > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : player.change < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : null}
                        <span>{player.change > 0 ? '+' : ''}{player.change}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}