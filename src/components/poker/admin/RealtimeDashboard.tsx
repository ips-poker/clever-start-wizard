import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  Users,
  Table2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Zap,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Trophy,
  AlertCircle,
  CheckCircle,
  Circle
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface LiveEvent {
  id: string;
  type: 'hand_start' | 'hand_end' | 'player_join' | 'player_leave' | 'big_pot' | 'all_in' | 'tournament_start' | 'tournament_end';
  message: string;
  timestamp: Date;
  data?: any;
}

interface TableStatus {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  pot: number;
  phase: string;
  stakes: string;
  isActive: boolean;
}

interface TournamentStatus {
  id: string;
  name: string;
  players: number;
  remaining: number;
  level: number;
  prizePool: number;
  status: string;
}

interface MetricData {
  time: string;
  value: number;
}

export function RealtimeDashboard() {
  const [isLive, setIsLive] = useState(true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [tournaments, setTournaments] = useState<TournamentStatus[]>([]);
  const [metrics, setMetrics] = useState({
    activePlayers: 0,
    activeTables: 0,
    activeHands: 0,
    totalPot: 0,
    handsPerMinute: 0,
    avgPotSize: 0
  });
  const [activityData, setActivityData] = useState<MetricData[]>([]);
  const [potData, setPotData] = useState<MetricData[]>([]);
  const channelsRef = useRef<any[]>([]);

  // Add live event
  const addEvent = useCallback((event: Omit<LiveEvent, 'id' | 'timestamp'>) => {
    const newEvent: LiveEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 100));
  }, []);

  // Load tables
  const loadTables = async () => {
    const { data } = await supabase
      .from('poker_tables')
      .select(`
        id,
        name,
        max_players,
        small_blind,
        big_blind,
        status,
        poker_hands!poker_hands_table_id_fkey (
          id,
          phase,
          pot
        ),
        poker_table_players!poker_table_players_table_id_fkey (
          id,
          status
        )
      `)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setTables(data.map(t => ({
        id: t.id,
        name: t.name,
        players: t.poker_table_players?.filter((p: any) => p.status === 'active').length || 0,
        maxPlayers: t.max_players,
        pot: t.poker_hands?.[0]?.pot || 0,
        phase: t.poker_hands?.[0]?.phase || 'waiting',
        stakes: `${t.small_blind}/${t.big_blind}`,
        isActive: t.status === 'playing'
      })));
    }
  };

  // Load tournaments
  const loadTournaments = async () => {
    const { data } = await supabase
      .from('online_poker_tournaments')
      .select(`
        id,
        name,
        max_players,
        current_level,
        prize_pool,
        status,
        online_poker_tournament_participants!online_poker_tournament_participants_tournament_id_fkey (
          id,
          status
        )
      `)
      .in('status', ['registration', 'registering', 'running', 'late_registration'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setTournaments(data.map(t => ({
        id: t.id,
        name: t.name,
        players: t.online_poker_tournament_participants?.length || 0,
        remaining: t.online_poker_tournament_participants?.filter((p: any) => p.status === 'active').length || 0,
        level: t.current_level || 1,
        prizePool: t.prize_pool || 0,
        status: t.status
      })));
    }
  };

  // Load metrics
  const loadMetrics = async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const [
      { count: playersCount },
      { count: tablesCount },
      { count: activeHandsCount },
      { count: recentHandsCount },
      { data: potData }
    ] = await Promise.all([
      supabase.from('poker_table_players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('poker_tables').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
      supabase.from('poker_hands').select('*', { count: 'exact', head: true }).is('completed_at', null),
      supabase.from('poker_hands').select('*', { count: 'exact', head: true }).gte('created_at', oneMinuteAgo.toISOString()),
      supabase.from('poker_hands').select('pot').is('completed_at', null)
    ]);

    const totalPot = potData?.reduce((sum, h) => sum + (h.pot || 0), 0) || 0;
    const avgPot = potData && potData.length > 0 ? totalPot / potData.length : 0;

    setMetrics({
      activePlayers: playersCount || 0,
      activeTables: tablesCount || 0,
      activeHands: activeHandsCount || 0,
      totalPot,
      handsPerMinute: recentHandsCount || 0,
      avgPotSize: avgPot
    });

    // Update activity chart data
    const timeStr = now.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    setActivityData(prev => [...prev.slice(-30), { time: timeStr, value: playersCount || 0 }]);
    setPotData(prev => [...prev.slice(-30), { time: timeStr, value: totalPot }]);
  };

  // Setup realtime subscriptions
  useEffect(() => {
    if (!isLive) {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
      return;
    }

    // Initial load
    loadTables();
    loadTournaments();
    loadMetrics();

    // Hands channel
    const handsChannel = supabase
      .channel('realtime-hands')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'poker_hands' },
        (payload) => {
          addEvent({
            type: 'hand_start',
            message: `Новая раздача #${payload.new.hand_number}`,
            data: payload.new
          });
          loadMetrics();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poker_hands' },
        (payload) => {
          if (payload.new.completed_at && !payload.old?.completed_at) {
            const pot = payload.new.pot || 0;
            if (pot > 1000) {
              addEvent({
                type: 'big_pot',
                message: `Большой пот: ${pot.toLocaleString()} фишек`,
                data: payload.new
              });
            }
            addEvent({
              type: 'hand_end',
              message: `Раздача #${payload.new.hand_number} завершена (пот: ${pot})`,
              data: payload.new
            });
            loadMetrics();
            loadTables();
          }
        }
      )
      .subscribe();

    // Players channel
    const playersChannel = supabase
      .channel('realtime-players')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poker_table_players' },
        (payload) => {
          addEvent({
            type: 'player_join',
            message: `Игрок занял место ${payload.new.seat_number}`,
            data: payload.new
          });
          loadTables();
          loadMetrics();
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'poker_table_players' },
        () => {
          addEvent({
            type: 'player_leave',
            message: 'Игрок покинул стол',
          });
          loadTables();
          loadMetrics();
        }
      )
      .subscribe();

    // Actions channel (for all-ins)
    const actionsChannel = supabase
      .channel('realtime-actions')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poker_actions' },
        (payload) => {
          if (payload.new.action_type === 'all_in') {
            addEvent({
              type: 'all_in',
              message: `All-in! ${payload.new.amount?.toLocaleString()} фишек`,
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    // Tournament channel
    const tournamentsChannel = supabase
      .channel('realtime-tournaments')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'online_poker_tournaments' },
        (payload) => {
          if (payload.new.status === 'running' && payload.old?.status !== 'running') {
            addEvent({
              type: 'tournament_start',
              message: `🏆 Турнир "${payload.new.name}" начался!`,
              data: payload.new
            });
          }
          if (payload.new.status === 'completed' && payload.old?.status !== 'completed') {
            addEvent({
              type: 'tournament_end',
              message: `Турнир "${payload.new.name}" завершён`,
              data: payload.new
            });
          }
          loadTournaments();
        }
      )
      .subscribe();

    channelsRef.current = [handsChannel, playersChannel, actionsChannel, tournamentsChannel];

    // Periodic refresh
    const interval = setInterval(() => {
      loadTables();
      loadTournaments();
      loadMetrics();
    }, 10000);

    return () => {
      clearInterval(interval);
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [isLive, addEvent]);

  const getEventIcon = (type: LiveEvent['type']) => {
    switch (type) {
      case 'hand_start': return <Play className="h-3 w-3 text-green-500" />;
      case 'hand_end': return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'player_join': return <Users className="h-3 w-3 text-purple-500" />;
      case 'player_leave': return <Users className="h-3 w-3 text-gray-500" />;
      case 'big_pot': return <DollarSign className="h-3 w-3 text-yellow-500" />;
      case 'all_in': return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'tournament_start': return <Trophy className="h-3 w-3 text-amber-500" />;
      case 'tournament_end': return <Trophy className="h-3 w-3 text-gray-500" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${isLive ? 'bg-green-500/20' : 'bg-muted'}`}>
            <Activity className={`h-5 w-5 ${isLive ? 'text-green-500' : 'text-muted-foreground'}`} />
            {isLive && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              Real-time Dashboard
              <Badge variant={isLive ? 'default' : 'secondary'}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Мониторинг активности в реальном времени
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isLive ? 'Пауза' : 'Live'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadTables();
              loadTournaments();
              loadMetrics();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={<Users className="h-4 w-4 text-blue-500" />}
          label="Игроки онлайн"
          value={metrics.activePlayers}
          trend={metrics.activePlayers > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          icon={<Table2 className="h-4 w-4 text-green-500" />}
          label="Активные столы"
          value={metrics.activeTables}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4 text-purple-500" />}
          label="Раздачи в игре"
          value={metrics.activeHands}
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4 text-yellow-500" />}
          label="Всего в банках"
          value={metrics.totalPot.toLocaleString()}
          suffix="chips"
        />
        <MetricCard
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          label="Раздач/мин"
          value={metrics.handsPerMinute}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-cyan-500" />}
          label="Ср. банк"
          value={Math.round(metrics.avgPotSize).toLocaleString()}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Игроки онлайн</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#colorPlayers)" 
                    name="Игроки"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Общий банк</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={potData}>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={false}
                    name="Фишки в игре"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events" className="gap-1">
            <Activity className="h-4 w-4" />
            События
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {events.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1">
            <Table2 className="h-4 w-4" />
            Столы
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {tables.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="gap-1">
            <Trophy className="h-4 w-4" />
            Турниры
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {tournaments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Live Events</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEvents([])}>
                  Очистить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <AnimatePresence mode="popLayout">
                  {events.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                      <Eye className="h-5 w-5 mr-2" />
                      Ожидание событий...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {events.map((event) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {getEventIcon(event.type)}
                          <span className="text-sm flex-1">{event.message}</span>
                          <span className="text-xs text-muted-foreground">
                            {event.timestamp.toLocaleTimeString('ru', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-2">
                {tables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет активных столов
                  </div>
                ) : (
                  tables.map((table) => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${table.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="font-medium">{table.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stakes: {table.stakes}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold">{table.players}/{table.maxPlayers}</p>
                          <p className="text-xs text-muted-foreground">игроков</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{table.pot.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">в банке</p>
                        </div>
                        <Badge variant={table.isActive ? 'default' : 'secondary'}>
                          {table.phase}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-2">
                {tournaments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет активных турниров
                  </div>
                ) : (
                  tournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-medium">{tournament.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Уровень {tournament.level}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold">{tournament.remaining}/{tournament.players}</p>
                          <p className="text-xs text-muted-foreground">осталось</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{tournament.prizePool.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">призовой</p>
                        </div>
                        <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
                          {tournament.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  trend,
  suffix 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-1">
              <p className="font-bold text-lg">{value}</p>
              {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
