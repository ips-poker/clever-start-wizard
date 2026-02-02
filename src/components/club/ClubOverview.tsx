import React, { useState, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubSubscription } from "@/hooks/useClubSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Users, 
  UserCheck, 
  TrendingUp,
  Calendar,
  Star,
  Clock,
  Play,
  Pause,
  Coins,
  BarChart3,
  Activity,
  Award,
  Flame,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Coffee,
  Layers,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Crown,
  Medal,
  DollarSign,
  Timer,
  PieChart,
  Hash
} from "lucide-react";
import { PLAN_NAMES, ROLE_NAMES } from "@/types/club";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface TournamentWithStats {
  id: string;
  name: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_remaining: number | null;
  timer_duration: number | null;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  max_players: number;
  start_time: string;
  registrations_count: number;
  active_players: number;
  total_reentries: number;
  total_addons: number;
  prize_pool: number;
  rps_pool: number;
}

export function ClubOverview() {
  const { club, role, plan, isActive } = useClub();
  const { usage, limits, subscription, hasFeature } = useClubSubscription({ clanId: club?.id });
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch tournaments with statistics
  const { data: tournaments, isLoading: tournamentsLoading, refetch: refetchTournaments } = useQuery({
    queryKey: ["club-tournaments-overview", club?.id, refreshKey],
    queryFn: async (): Promise<TournamentWithStats[]> => {
      if (!club?.id) return [];

      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select(`
          id, name, status, current_level, current_small_blind, current_big_blind,
          timer_remaining, timer_duration, participation_fee, reentry_fee, additional_fee,
          max_players, start_time, created_at
        `)
        .eq('clan_id', club.id)
        .in('status', ['scheduled', 'registration', 'running', 'paused'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error("Error fetching tournaments:", error);
        return [];
      }

      // Get registration stats for each tournament
      const tournamentsWithStats = await Promise.all((tournamentsData || []).map(async (t) => {
        const { data: regs } = await supabase
          .from('tournament_registrations')
          .select('status, reentries, additional_sets')
          .eq('tournament_id', t.id);

        const registrations = regs || [];
        const activePlayers = registrations.filter(r => r.status === 'playing').length;
        const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
        const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
        
        const prizePool = (registrations.length * (t.participation_fee || 0)) + 
                         (totalReentries * (t.reentry_fee || 0)) + 
                         (totalAddons * (t.additional_fee || 0));
        const rpsPool = Math.floor(prizePool / 10);

        return {
          ...t,
          registrations_count: registrations.length,
          active_players: activePlayers,
          total_reentries: totalReentries,
          total_addons: totalAddons,
          prize_pool: prizePool,
          rps_pool: rpsPool
        };
      }));

      return tournamentsWithStats;
    },
    enabled: !!club?.id,
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["club-recent-activity", club?.id],
    queryFn: async () => {
      if (!club?.id) return [];

      const { data } = await supabase
        .from('tournaments')
        .select('id, name, status, finished_at, start_time')
        .eq('clan_id', club.id)
        .eq('status', 'completed')
        .order('finished_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!club?.id
  });

  // Fetch top players
  const { data: topPlayers } = useQuery({
    queryKey: ["club-top-players", club?.id],
    queryFn: async () => {
      if (!club?.id) return [];

      const { data: members } = await supabase
        .from('clan_members')
        .select(`
          player_id,
          player:players(id, name, avatar_url, elo_rating, wins, games_played)
        `)
        .eq('clan_id', club.id)
        .limit(10);

      if (!members) return [];

      const sorted = members
        .filter(m => m.player)
        .sort((a, b) => (b.player?.elo_rating || 0) - (a.player?.elo_rating || 0))
        .slice(0, 5);

      return sorted;
    },
    enabled: !!club?.id
  });

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (!tournaments) return null;

    const running = tournaments.filter(t => t.status === 'running');
    const scheduled = tournaments.filter(t => t.status === 'scheduled' || t.status === 'registration');
    
    const totalPrizePool = tournaments.reduce((sum, t) => sum + t.prize_pool, 0);
    const totalRpsPool = tournaments.reduce((sum, t) => sum + t.rps_pool, 0);
    const totalActivePlayers = running.reduce((sum, t) => sum + t.active_players, 0);
    const totalRegistrations = tournaments.reduce((sum, t) => sum + t.registrations_count, 0);

    return {
      runningCount: running.length,
      scheduledCount: scheduled.length,
      totalPrizePool,
      totalRpsPool,
      totalActivePlayers,
      totalRegistrations
    };
  }, [tournaments]);

  const stats = [
    {
      label: "Активные турниры",
      value: usage?.tournaments || 0,
      max: subscription?.max_tournaments || 0,
      icon: Trophy,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      label: "Участники клуба",
      value: usage?.players || 0,
      max: subscription?.max_players || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Персонал",
      value: usage?.staff || 0,
      max: subscription?.max_staff || 0,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Рейтинг клуба",
      value: club?.total_rating || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchTournaments();
  };

  return (
    <div className="space-y-6">
      {/* Header with Subscription Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{club?.name || 'Ваш клуб'}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant={isActive ? "default" : "destructive"} className="font-medium">
                      {isActive ? "Активна" : "Неактивна"}
                    </Badge>
                    <Badge variant="outline" className="bg-primary/10 font-medium">
                      {PLAN_NAMES[plan]}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {subscription?.expires_at 
                  ? `Действует до ${format(new Date(subscription.expires_at), 'dd MMMM yyyy', { locale: ru })}`
                  : "Бессрочная подписка"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Your Role */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Ваша роль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-base py-1 px-3 mb-2">
              {role ? ROLE_NAMES[role] : 'Неизвестно'}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {role === 'owner' && "Полный доступ ко всем функциям"}
              {role === 'admin' && "Управление турнирами и персоналом"}
              {role === 'director' && "Проведение турниров"}
              {role === 'member' && "Участие в турнирах клуба"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Dashboard - Running Tournaments */}
      {aggregateStats && aggregateStats.runningCount > 0 && (
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg animate-pulse">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-500">LIVE - Турниры в игре</CardTitle>
                  <CardDescription>{aggregateStats.runningCount} активных турниров</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{aggregateStats.totalActivePlayers}</p>
                  <p className="text-xs text-muted-foreground">игроков за столами</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-500">{aggregateStats.totalPrizePool.toLocaleString()} ₽</p>
                  <p className="text-xs text-muted-foreground">общий призовой фонд</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tournaments?.filter(t => t.status === 'running').map((tournament) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-card rounded-xl border border-border hover:border-green-500/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <h4 className="font-medium truncate">{tournament.name}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Уровень {tournament.current_level}
                        </span>
                        <span className="font-mono">
                          {tournament.current_small_blind}/{tournament.current_big_blind}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Timer */}
                      <div className="text-center">
                        <div className={`text-2xl font-mono font-bold ${
                          (tournament.timer_remaining || 0) <= 60 ? 'text-destructive' : 
                          (tournament.timer_remaining || 0) <= 300 ? 'text-amber-500' : 'text-foreground'
                        }`}>
                          {formatTime(tournament.timer_remaining || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">таймер</div>
                      </div>
                      
                      {/* Players */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-500">{tournament.active_players}</div>
                        <div className="text-xs text-muted-foreground">игроков</div>
                      </div>
                      
                      {/* Prize Pool */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-amber-500">{tournament.prize_pool.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">₽ призы</div>
                      </div>
                      
                      {/* RPS */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{tournament.rps_pool.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">RPS</div>
                      </div>
                      
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/external-timer?tournamentId=${tournament.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Timer Progress */}
                  <div className="mt-3">
                    <Progress 
                      value={((tournament.timer_duration || 900) - (tournament.timer_remaining || 0)) / (tournament.timer_duration || 900) * 100} 
                      className="h-1.5"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid with Progress */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const percentage = stat.max ? (stat.value / stat.max) * 100 : 0;
          
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold">
                      {stat.value.toLocaleString()}
                      {stat.max !== undefined && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /{stat.max === 999999 ? '∞' : stat.max.toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                {stat.max && stat.max !== 999999 && (
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="mt-4 h-2" 
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aggregate Overview */}
      {aggregateStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <CardContent className="pt-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold text-amber-500">{aggregateStats.totalPrizePool.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground uppercase">Общий призовой фонд</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="pt-6 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary">{aggregateStats.totalRpsPool.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase">Общий RPS пул</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardContent className="pt-6 text-center">
              <Hash className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-500">{aggregateStats.totalRegistrations}</p>
              <p className="text-xs text-muted-foreground uppercase">Всего регистраций</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardContent className="pt-6 text-center">
              <Timer className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold text-blue-500">{aggregateStats.scheduledCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Запланировано</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tournaments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Ближайшие турниры
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/club-admin?tab=tournaments'}>
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tournaments?.filter(t => t.status === 'scheduled' || t.status === 'registration').slice(0, 4).map((tournament) => (
                <div 
                  key={tournament.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{tournament.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tournament.start_time), 'dd MMM, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono">
                      {tournament.registrations_count}/{tournament.max_players}
                    </Badge>
                    <Badge variant="outline">
                      {tournament.participation_fee?.toLocaleString()} ₽
                    </Badge>
                  </div>
                </div>
              ))}
              
              {(!tournaments || tournaments.filter(t => t.status === 'scheduled' || t.status === 'registration').length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет запланированных турниров</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Топ игроки клуба
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/club-admin?tab=players'}>
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPlayers?.slice(0, 5).map((member, index) => (
                <div 
                  key={member.player_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400' :
                      index === 2 ? 'bg-amber-600/20 text-amber-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index < 3 ? <Medal className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
                    </div>
                    <div>
                      <p className="font-medium">{member.player?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.player?.games_played || 0} игр • {member.player?.wins || 0} побед
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {member.player?.elo_rating || 1000} ELO
                  </Badge>
                </div>
              ))}
              
              {(!topPlayers || topPlayers.length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет участников клуба</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Tournaments */}
      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-500" />
              Недавние завершённые турниры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActivity.map((tournament) => (
                <div 
                  key={tournament.id}
                  className="p-4 bg-green-500/5 rounded-lg border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-green-500" />
                    <span className="font-medium truncate">{tournament.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Завершён {formatDistanceToNow(new Date(tournament.finished_at || tournament.start_time), { addSuffix: true, locale: ru })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              onClick={() => window.location.href = '/director'}
            >
              <Trophy className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
              <p className="font-medium">Tournament Director</p>
              <p className="text-xs text-muted-foreground">Профессиональное управление</p>
            </button>
            
            <button 
              className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              onClick={() => window.location.href = '/rating'}
            >
              <TrendingUp className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
              <p className="font-medium">Рейтинг игроков</p>
              <p className="text-xs text-muted-foreground">ELO и RPS статистика</p>
            </button>
            
            <button 
              className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              onClick={() => window.location.href = '/clans'}
            >
              <Users className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
              <p className="font-medium">Страница клуба</p>
              <p className="text-xs text-muted-foreground">Публичная страница</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Доступные функции
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border text-center ${hasFeature('voice_control') ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border opacity-50'}`}>
              <Activity className={`w-6 h-6 mx-auto mb-2 ${hasFeature('voice_control') ? 'text-green-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">Голосовое управление</p>
              <Badge variant={hasFeature('voice_control') ? "default" : "secondary"} className="mt-1 text-xs">
                {hasFeature('voice_control') ? "Активно" : "Недоступно"}
              </Badge>
            </div>
            
            <div className={`p-4 rounded-lg border text-center ${hasFeature('online_poker') ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border opacity-50'}`}>
              <Coins className={`w-6 h-6 mx-auto mb-2 ${hasFeature('online_poker') ? 'text-green-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">Онлайн покер</p>
              <Badge variant={hasFeature('online_poker') ? "default" : "secondary"} className="mt-1 text-xs">
                {hasFeature('online_poker') ? "Активно" : "Недоступно"}
              </Badge>
            </div>
            
            <div className={`p-4 rounded-lg border text-center ${hasFeature('analytics') ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border opacity-50'}`}>
              <BarChart3 className={`w-6 h-6 mx-auto mb-2 ${hasFeature('analytics') ? 'text-green-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">Аналитика</p>
              <Badge variant={hasFeature('analytics') ? "default" : "secondary"} className="mt-1 text-xs">
                {hasFeature('analytics') ? "Активно" : "Недоступно"}
              </Badge>
            </div>
            
            <div className={`p-4 rounded-lg border text-center ${hasFeature('api_access') ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border opacity-50'}`}>
              <Zap className={`w-6 h-6 mx-auto mb-2 ${hasFeature('api_access') ? 'text-green-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">API доступ</p>
              <Badge variant={hasFeature('api_access') ? "default" : "secondary"} className="mt-1 text-xs">
                {hasFeature('api_access') ? "Активно" : "Недоступно"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
