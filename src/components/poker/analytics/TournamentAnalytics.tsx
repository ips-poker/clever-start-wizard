/**
 * Tournament Analytics Dashboard
 * ITM%, ROI, Average Stack, Bubble Factor, and comprehensive tournament stats
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  User,
  Target,
  Award,
  DollarSign,
  Percent,
  RefreshCw,
  BarChart3,
  Clock,
  Users,
  Coins,
  Medal,
  Crown,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  playerId: string;
  playerName: string;
  buyIn: number;
  finishPosition: number;
  totalPlayers: number;
  prizeAmount: number;
  rebuys: number;
  addons: number;
  finishedAt: string;
}

interface PlayerTournamentStats {
  playerId: string;
  playerName: string;
  tournamentsPlayed: number;
  totalBuyIns: number;
  totalPrizes: number;
  profit: number;
  roi: number;
  itm: number;
  itmCount: number;
  avgFinish: number;
  avgField: number;
  firstPlaces: number;
  finalTables: number;
  avgStack: number;
  largestPrize: number;
  largestField: number;
  results: TournamentResult[];
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  gold: '#fbbf24',
  silver: '#9ca3af',
  bronze: '#d97706'
};

const POSITION_COLORS = ['#fbbf24', '#9ca3af', '#d97706', '#22c55e', '#3b82f6'];

export function TournamentAnalytics() {
  const [players, setPlayers] = useState<PlayerTournamentStats[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerTournamentStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [allResults, setAllResults] = useState<TournamentResult[]>([]);

  const loadTournamentData = async () => {
    setLoading(true);
    
    try {
      // Load online tournament participants with results
      const { data: participants, error: partError } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          id,
          player_id,
          tournament_id,
          finish_position,
          prize_amount,
          rebuys_count,
          addons_count,
          status,
          eliminated_at,
          players!inner(name),
          online_poker_tournaments!inner(
            name,
            buy_in,
            max_players,
            finished_at,
            status
          )
        `)
        .not('finish_position', 'is', null)
        .order('eliminated_at', { ascending: false });

      if (partError) throw partError;

      // Get player count per tournament
      const tournamentIds = [...new Set(participants?.map(p => p.tournament_id) || [])];
      const playerCounts: Record<string, number> = {};
      
      for (const tId of tournamentIds) {
        const { count } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tId)
          .not('finish_position', 'is', null);
        playerCounts[tId] = count || 0;
      }

      // Transform to results
      const results: TournamentResult[] = (participants || []).map(p => {
        const tournament = p.online_poker_tournaments as any;
        return {
          id: p.id,
          tournamentId: p.tournament_id,
          tournamentName: tournament.name,
          playerId: p.player_id,
          playerName: (p.players as any)?.name || 'Unknown',
          buyIn: tournament.buy_in,
          finishPosition: p.finish_position,
          totalPlayers: playerCounts[p.tournament_id] || tournament.max_players,
          prizeAmount: p.prize_amount || 0,
          rebuys: p.rebuys_count || 0,
          addons: p.addons_count || 0,
          finishedAt: p.eliminated_at || tournament.finished_at
        };
      });

      setAllResults(results);

      // Aggregate by player
      const playerStatsMap: Record<string, PlayerTournamentStats> = {};

      results.forEach(r => {
        if (!playerStatsMap[r.playerId]) {
          playerStatsMap[r.playerId] = {
            playerId: r.playerId,
            playerName: r.playerName,
            tournamentsPlayed: 0,
            totalBuyIns: 0,
            totalPrizes: 0,
            profit: 0,
            roi: 0,
            itm: 0,
            itmCount: 0,
            avgFinish: 0,
            avgField: 0,
            firstPlaces: 0,
            finalTables: 0,
            avgStack: 0,
            largestPrize: 0,
            largestField: 0,
            results: []
          };
        }

        const ps = playerStatsMap[r.playerId];
        ps.tournamentsPlayed++;
        ps.totalBuyIns += r.buyIn * (1 + r.rebuys + r.addons);
        ps.totalPrizes += r.prizeAmount;
        ps.results.push(r);

        // ITM calculation (top ~15%)
        const itmThreshold = Math.ceil(r.totalPlayers * 0.15);
        if (r.finishPosition <= itmThreshold) {
          ps.itmCount++;
        }

        if (r.finishPosition === 1) ps.firstPlaces++;
        
        // Final table (top 9 or 10% of field)
        const ftThreshold = Math.min(9, Math.ceil(r.totalPlayers * 0.1));
        if (r.finishPosition <= ftThreshold) ps.finalTables++;

        if (r.prizeAmount > ps.largestPrize) ps.largestPrize = r.prizeAmount;
        if (r.totalPlayers > ps.largestField) ps.largestField = r.totalPlayers;
      });

      // Calculate derived stats
      Object.values(playerStatsMap).forEach(ps => {
        ps.profit = ps.totalPrizes - ps.totalBuyIns;
        ps.roi = ps.totalBuyIns > 0 ? (ps.profit / ps.totalBuyIns) * 100 : 0;
        ps.itm = ps.tournamentsPlayed > 0 ? (ps.itmCount / ps.tournamentsPlayed) * 100 : 0;
        
        if (ps.results.length > 0) {
          ps.avgFinish = ps.results.reduce((sum, r) => sum + r.finishPosition, 0) / ps.results.length;
          ps.avgField = ps.results.reduce((sum, r) => sum + r.totalPlayers, 0) / ps.results.length;
          
          // Average stack = average percentile finish (higher is better)
          ps.avgStack = ps.results.reduce((sum, r) => {
            const percentile = ((r.totalPlayers - r.finishPosition) / r.totalPlayers) * 100;
            return sum + percentile;
          }, 0) / ps.results.length;
        }
      });

      const sortedPlayers = Object.values(playerStatsMap)
        .sort((a, b) => b.tournamentsPlayed - a.tournamentsPlayed);

      setPlayers(sortedPlayers);
      
    } catch (error) {
      console.error('Error loading tournament data:', error);
      toast.error('Ошибка загрузки данных турниров');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadTournamentData();
  }, []);

  const filteredPlayers = players.filter(p =>
    p.playerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ROI distribution data
  const roiDistribution = useMemo(() => {
    const buckets = [
      { range: '< -50%', count: 0 },
      { range: '-50% to -25%', count: 0 },
      { range: '-25% to 0%', count: 0 },
      { range: '0% to 25%', count: 0 },
      { range: '25% to 50%', count: 0 },
      { range: '> 50%', count: 0 }
    ];

    players.forEach(p => {
      if (p.roi < -50) buckets[0].count++;
      else if (p.roi < -25) buckets[1].count++;
      else if (p.roi < 0) buckets[2].count++;
      else if (p.roi < 25) buckets[3].count++;
      else if (p.roi < 50) buckets[4].count++;
      else buckets[5].count++;
    });

    return buckets;
  }, [players]);

  // Position distribution for selected player
  const positionDistribution = useMemo(() => {
    if (!selectedPlayer) return [];
    
    const distribution: Record<string, number> = {
      '1st': 0,
      '2nd-3rd': 0,
      'Final Table': 0,
      'ITM': 0,
      'Bubble': 0,
      'Early': 0
    };

    selectedPlayer.results.forEach(r => {
      const itmThreshold = Math.ceil(r.totalPlayers * 0.15);
      const ftThreshold = Math.min(9, Math.ceil(r.totalPlayers * 0.1));
      const bubbleRange = Math.ceil(r.totalPlayers * 0.2);

      if (r.finishPosition === 1) distribution['1st']++;
      else if (r.finishPosition <= 3) distribution['2nd-3rd']++;
      else if (r.finishPosition <= ftThreshold) distribution['Final Table']++;
      else if (r.finishPosition <= itmThreshold) distribution['ITM']++;
      else if (r.finishPosition <= bubbleRange) distribution['Bubble']++;
      else distribution['Early']++;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [selectedPlayer]);

  // Profit over time
  const profitOverTime = useMemo(() => {
    if (!selectedPlayer) return [];
    
    let cumulative = 0;
    return selectedPlayer.results
      .slice()
      .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
      .map((r, index) => {
        const buyIn = r.buyIn * (1 + r.rebuys + r.addons);
        const profit = r.prizeAmount - buyIn;
        cumulative += profit;
        
        return {
          tournament: index + 1,
          profit,
          cumulative,
          position: r.finishPosition,
          field: r.totalPlayers
        };
      });
  }, [selectedPlayer]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString() + ' ♦';
  };

  const exportStats = () => {
    if (!selectedPlayer) return;
    
    const data = {
      player: selectedPlayer.playerName,
      exportDate: new Date().toISOString(),
      stats: {
        tournamentsPlayed: selectedPlayer.tournamentsPlayed,
        roi: selectedPlayer.roi,
        itm: selectedPlayer.itm,
        profit: selectedPlayer.profit,
        avgFinish: selectedPlayer.avgFinish,
        firstPlaces: selectedPlayer.firstPlaces,
        finalTables: selectedPlayer.finalTables
      },
      results: selectedPlayer.results
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPlayer.playerName}_tournament_stats.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Статистика экспортирована');
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск игрока..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={loadTournamentData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Турниров</div>
                <div className="text-xl font-bold">{allResults.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Участников</div>
                <div className="text-xl font-bold">{players.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Всего призов</div>
                <div className="text-xl font-bold">
                  {allResults.reduce((sum, r) => sum + r.prizeAmount, 0).toLocaleString()} ♦
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-500">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Ср. ITM</div>
                <div className="text-xl font-bold">
                  {players.length > 0 
                    ? (players.reduce((sum, p) => sum + p.itm, 0) / players.length).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Player List */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Игроки ({filteredPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="p-2 space-y-1">
                {filteredPlayers.map((player, index) => (
                  <motion.div
                    key={player.playerId}
                    whileHover={{ scale: 1.01 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedPlayer?.playerId === player.playerId 
                        ? 'bg-primary/10 border-primary/50' 
                        : 'hover:bg-muted/50 border-transparent'
                      }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <span className={`text-lg ${
                            index === 0 ? 'text-amber-500' :
                            index === 1 ? 'text-gray-400' : 'text-orange-600'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="font-medium truncate">{player.playerName}</span>
                      </div>
                      <Badge 
                        variant={player.roi >= 0 ? 'default' : 'destructive'} 
                        className="text-xs"
                      >
                        {player.roi >= 0 ? '+' : ''}{player.roi.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{player.tournamentsPlayed} турниров</span>
                      <span>•</span>
                      <span>ITM: {player.itm.toFixed(0)}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Player Analytics */}
        <Card className="lg:col-span-3">
          {selectedPlayer ? (
            <>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    {selectedPlayer.playerName}
                    {selectedPlayer.firstPlaces > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-500">
                        {selectedPlayer.firstPlaces} 🏆
                      </Badge>
                    )}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={exportStats}>
                    <Download className="h-4 w-4 mr-1" />
                    Экспорт
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Обзор</TabsTrigger>
                    <TabsTrigger value="stats">Статистика</TabsTrigger>
                    <TabsTrigger value="charts">Графики</TabsTrigger>
                    <TabsTrigger value="history">История</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard
                        icon={Trophy}
                        label="Турниров"
                        value={selectedPlayer.tournamentsPlayed.toString()}
                        color="text-amber-500"
                      />
                      <MetricCard
                        icon={Percent}
                        label="ROI"
                        value={`${selectedPlayer.roi >= 0 ? '+' : ''}${selectedPlayer.roi.toFixed(1)}%`}
                        color={selectedPlayer.roi >= 0 ? 'text-green-500' : 'text-red-500'}
                      />
                      <MetricCard
                        icon={Target}
                        label="ITM%"
                        value={`${selectedPlayer.itm.toFixed(1)}%`}
                        color="text-blue-500"
                      />
                      <MetricCard
                        icon={DollarSign}
                        label="Профит"
                        value={formatCurrency(selectedPlayer.profit)}
                        color={selectedPlayer.profit >= 0 ? 'text-green-500' : 'text-red-500'}
                      />
                    </div>

                    {/* Profit Chart */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">График профита</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={profitOverTime}>
                              <defs>
                                <linearGradient id="profitGradient2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="tournament" 
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(v) => `${v} ♦`}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number, name: string) => [
                                  `${value.toLocaleString()} ♦`,
                                  name === 'cumulative' ? 'Накопительно' : 'Результат'
                                ]}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="cumulative" 
                                stroke={CHART_COLORS.success}
                                fill="url(#profitGradient2)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Position Distribution */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Распределение финишей</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={positionDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ name, percent }) => 
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {positionDistribution.map((_, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={POSITION_COLORS[index % POSITION_COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Stats Tab */}
                  <TabsContent value="stats" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <StatBox
                        label="Вложено"
                        value={formatCurrency(selectedPlayer.totalBuyIns)}
                        subtext="Total Buy-ins"
                      />
                      <StatBox
                        label="Выиграно"
                        value={formatCurrency(selectedPlayer.totalPrizes)}
                        subtext="Total Prizes"
                        positive
                      />
                      <StatBox
                        label="Профит"
                        value={formatCurrency(selectedPlayer.profit)}
                        subtext="Net Profit"
                        positive={selectedPlayer.profit >= 0}
                      />
                      <StatBox
                        label="ROI"
                        value={`${selectedPlayer.roi.toFixed(2)}%`}
                        subtext="Return on Investment"
                        positive={selectedPlayer.roi >= 0}
                      />
                      <StatBox
                        label="ITM%"
                        value={`${selectedPlayer.itm.toFixed(1)}%`}
                        subtext="In The Money"
                      />
                      <StatBox
                        label="ITM раз"
                        value={selectedPlayer.itmCount.toString()}
                        subtext={`из ${selectedPlayer.tournamentsPlayed}`}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <StatBox
                        label="Ср. финиш"
                        value={selectedPlayer.avgFinish.toFixed(1)}
                        subtext="Average Position"
                      />
                      <StatBox
                        label="Ср. поле"
                        value={selectedPlayer.avgField.toFixed(0)}
                        subtext="Average Field"
                      />
                      <StatBox
                        label="Ср. перцентиль"
                        value={`${selectedPlayer.avgStack.toFixed(1)}%`}
                        subtext="Avg Stack Percentile"
                      />
                      <StatBox
                        label="Побед"
                        value={selectedPlayer.firstPlaces.toString()}
                        subtext="1st Places"
                        icon={<Crown className="h-4 w-4 text-amber-500" />}
                      />
                      <StatBox
                        label="Финальных столов"
                        value={selectedPlayer.finalTables.toString()}
                        subtext="Final Tables"
                        icon={<Star className="h-4 w-4 text-purple-500" />}
                      />
                      <StatBox
                        label="Макс. приз"
                        value={formatCurrency(selectedPlayer.largestPrize)}
                        subtext="Largest Prize"
                      />
                    </div>
                  </TabsContent>

                  {/* Charts Tab */}
                  <TabsContent value="charts" className="space-y-4 mt-4">
                    {/* Position vs Field Size */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Позиция vs Размер поля</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="field" 
                                name="Поле"
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                dataKey="position" 
                                name="Позиция"
                                reversed
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <ZAxis range={[50, 200]} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number, name: string) => [
                                  value,
                                  name === 'field' ? 'Поле' : 'Позиция'
                                ]}
                              />
                              <Scatter 
                                data={profitOverTime} 
                                fill={CHART_COLORS.info}
                              />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ROI Over Time */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Динамика результатов</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={profitOverTime}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="tournament" 
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(v) => `${v}`}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar dataKey="profit" name="Результат">
                                {profitOverTime.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.profit >= 0 ? CHART_COLORS.success : CHART_COLORS.danger} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-4">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {selectedPlayer.results
                          .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
                          .map((result, index) => {
                            const itmThreshold = Math.ceil(result.totalPlayers * 0.15);
                            const isITM = result.finishPosition <= itmThreshold;
                            const isWinner = result.finishPosition === 1;
                            
                            return (
                              <Card key={result.id} className={`
                                ${isWinner ? 'border-amber-500/50 bg-amber-500/5' : 
                                  isITM ? 'border-green-500/30 bg-green-500/5' : ''}
                              `}>
                                <CardContent className="py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center font-bold
                                        ${result.finishPosition === 1 ? 'bg-amber-500 text-white' :
                                          result.finishPosition === 2 ? 'bg-gray-400 text-white' :
                                          result.finishPosition === 3 ? 'bg-orange-600 text-white' :
                                          isITM ? 'bg-green-500/20 text-green-500' :
                                          'bg-muted text-muted-foreground'}
                                      `}>
                                        {result.finishPosition}
                                      </div>
                                      <div>
                                        <div className="font-medium">{result.tournamentName}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                          <span>{result.totalPlayers} игроков</span>
                                          <span>•</span>
                                          <span>Buy-in: {result.buyIn} ♦</span>
                                          {result.rebuys > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>+{result.rebuys} ребаев</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-bold ${
                                        result.prizeAmount > 0 ? 'text-green-500' : 'text-muted-foreground'
                                      }`}>
                                        {result.prizeAmount > 0 ? `+${result.prizeAmount.toLocaleString()} ♦` : '—'}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(result.finishedAt).toLocaleDateString('ru-RU')}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-20 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>Выберите игрока для просмотра турнирной статистики</div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ROI Distribution */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Распределение ROI по всем игрокам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" name="Игроков" fill={CHART_COLORS.info} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ 
  label, 
  value, 
  subtext, 
  positive, 
  icon 
}: { 
  label: string; 
  value: string; 
  subtext: string;
  positive?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-bold ${
        positive !== undefined ? (positive ? 'text-green-500' : 'text-red-500') : ''
      }`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{subtext}</div>
    </div>
  );
}

export default TournamentAnalytics;
