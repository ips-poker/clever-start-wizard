/**
 * Enhanced Player Analytics Dashboard
 * Real HUD stats, charts, and comprehensive analysis
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  User,
  Activity,
  Target,
  Brain,
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  RefreshCw,
  MapPin,
  Zap,
  Award,
  LineChart as LineChartIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateRealHUDStats, 
  getPlayerStyle, 
  detectLeaks,
  RealHUDStats 
} from '@/utils/calculateRealHUDStats';
import { motion } from 'framer-motion';

interface PlayerData {
  id: string;
  player_id: string;
  player_name: string;
  hands_played: number;
  balance: number;
  total_won: number;
  total_lost: number;
  profit: number;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: 'hsl(var(--muted-foreground))'
};

const POSITION_COLORS: Record<string, string> = {
  BTN: '#22c55e',
  CO: '#84cc16',
  HJ: '#eab308',
  MP: '#f97316',
  'UTG+1': '#ef4444',
  UTG: '#dc2626',
  SB: '#8b5cf6',
  BB: '#6366f1'
};

export function EnhancedPlayerAnalytics() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [hudStats, setHudStats] = useState<RealHUDStats | null>(null);
  const [profitHistory, setProfitHistory] = useState<Array<{ hand: number; profit: number; cumulative: number }>>([]);

  const loadPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_balances')
      .select(`
        id,
        player_id,
        balance,
        total_won,
        total_lost,
        hands_played,
        players!inner(name)
      `)
      .order('hands_played', { ascending: false });

    if (error) {
      console.error('Error loading players:', error);
      setLoading(false);
      return;
    }

    const playersWithStats = (data || []).map(p => ({
      id: p.id,
      player_id: p.player_id,
      player_name: (p.players as any)?.name || 'Unknown',
      hands_played: p.hands_played,
      balance: p.balance,
      total_won: p.total_won,
      total_lost: p.total_lost,
      profit: p.total_won - p.total_lost
    }));

    setPlayers(playersWithStats);
    setLoading(false);
  };

  const loadPlayerStats = async (playerId: string) => {
    setStatsLoading(true);
    
    try {
      // Load hand history with actions
      const { data: handPlayers, error: hpError } = await supabase
        .from('poker_hand_players')
        .select(`
          *,
          poker_hands!inner(
            id,
            hand_number,
            pot,
            phase,
            community_cards,
            dealer_seat,
            small_blind_seat,
            big_blind_seat,
            winners,
            poker_tables!inner(small_blind, big_blind)
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (hpError) throw hpError;

      // Load actions for each hand
      const handIds = [...new Set(handPlayers?.map(hp => (hp.poker_hands as any).id) || [])];
      
      const { data: allActions, error: actionsError } = await supabase
        .from('poker_actions')
        .select('*')
        .in('hand_id', handIds)
        .order('action_order');

      if (actionsError) throw actionsError;

      // Group actions by hand
      const actionsByHand: Record<string, any[]> = {};
      allActions?.forEach(action => {
        if (!actionsByHand[action.hand_id]) {
          actionsByHand[action.hand_id] = [];
        }
        actionsByHand[action.hand_id].push(action);
      });

      // Transform to HandRecord format
      const hands = handPlayers?.map(hp => {
        const hand = hp.poker_hands as any;
        const table = hand.poker_tables;
        const actions = actionsByHand[hand.id] || [];
        
        return {
          id: hand.id,
          handNumber: hand.hand_number,
          pot: hand.pot,
          phase: hand.phase,
          communityCards: hand.community_cards || [],
          dealerSeat: hand.dealer_seat,
          smallBlindSeat: hand.small_blind_seat,
          bigBlindSeat: hand.big_blind_seat,
          bigBlind: table.big_blind,
          smallBlind: table.small_blind,
          actions: actions.map(a => ({
            phase: a.phase,
            playerId: a.player_id,
            seatNumber: a.seat_number,
            actionType: a.action_type,
            amount: a.amount
          })),
          players: [{
            playerId: hp.player_id,
            seatNumber: hp.seat_number,
            stackStart: hp.stack_start,
            stackEnd: hp.stack_end,
            holeCards: hp.hole_cards,
            isFolded: hp.is_folded,
            isAllIn: hp.is_all_in,
            wonAmount: hp.won_amount,
            betAmount: hp.bet_amount
          }],
          winners: (hand.winners || []).map((w: any) => ({
            playerId: w.playerId || w.player_id,
            amount: w.amount,
            handName: w.handName || w.hand_name
          }))
        };
      }) || [];

      // Calculate real HUD stats
      const stats = calculateRealHUDStats(hands, playerId);
      setHudStats(stats);

      // Build profit history
      let cumulative = 0;
      const history = hands.slice().reverse().map((hand, index) => {
        const hp = handPlayers?.find(p => (p.poker_hands as any).id === hand.id);
        const bigBlind = hand.bigBlind || 20;
        const wonAmount = hp?.won_amount || 0;
        const betAmount = hp?.bet_amount || 0;
        const handProfit = (wonAmount - betAmount) / bigBlind;
        cumulative += handProfit;
        
        return {
          hand: index + 1,
          profit: handProfit,
          cumulative: cumulative
        };
      });
      setProfitHistory(history);

    } catch (error) {
      console.error('Error loading player stats:', error);
      toast.error('Ошибка загрузки статистики');
    }
    
    setStatsLoading(false);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerStats(selectedPlayer.player_id);
    }
  }, [selectedPlayer]);

  const filteredPlayers = players.filter(p =>
    p.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playerStyle = hudStats ? getPlayerStyle(hudStats) : null;
  const leaks = hudStats ? detectLeaks(hudStats) : [];
  const overallScore = 100 - Math.min(100, leaks.reduce((sum, l) => sum + l.impactBB * 5, 0));

  // Position chart data
  const positionChartData = useMemo(() => {
    if (!hudStats) return [];
    return Object.entries(hudStats.positionStats)
      .filter(([_, stats]) => stats.handsPlayed > 0)
      .map(([position, stats]) => ({
        position,
        vpip: stats.vpip,
        pfr: stats.pfr,
        bbWon: stats.bbWon,
        hands: stats.handsPlayed,
        color: POSITION_COLORS[position] || '#888'
      }));
  }, [hudStats]);

  // Radar chart data for playing style
  const radarData = useMemo(() => {
    if (!hudStats) return [];
    return [
      { stat: 'VPIP', value: Math.min(100, hudStats.vpip * 2), optimal: 50 },
      { stat: 'PFR', value: Math.min(100, hudStats.pfr * 2.5), optimal: 45 },
      { stat: '3-Bet', value: Math.min(100, hudStats.threeBet * 5), optimal: 40 },
      { stat: 'AF', value: Math.min(100, hudStats.afTotal * 25), optimal: 60 },
      { stat: 'C-Bet', value: hudStats.cbet, optimal: 65 },
      { stat: 'WTSD', value: Math.min(100, hudStats.wtsd * 2.5), optimal: 70 }
    ];
  }, [hudStats]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Критично</Badge>;
      case 'warning': return <Badge className="bg-orange-500">Внимание</Badge>;
      default: return <Badge variant="secondary">Инфо</Badge>;
    }
  };

  const formatStat = (value: number, decimals = 1) => {
    return value.toFixed(decimals);
  };

  const exportStats = () => {
    if (!hudStats || !selectedPlayer) return;
    
    const data = {
      player: selectedPlayer.player_name,
      exportDate: new Date().toISOString(),
      stats: hudStats,
      leaks,
      style: playerStyle
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPlayer.player_name}_stats.json`;
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
        <Button onClick={loadPlayers} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
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
                {filteredPlayers.map(player => (
                  <motion.div
                    key={player.id}
                    whileHover={{ scale: 1.01 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedPlayer?.id === player.id 
                        ? 'bg-primary/10 border-primary/50' 
                        : 'hover:bg-muted/50 border-transparent'
                      }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{player.player_name}</span>
                      <Badge variant={player.profit >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {player.profit >= 0 ? '+' : ''}{player.profit.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {player.hands_played.toLocaleString()} рук
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Player Analytics */}
        <Card className="lg:col-span-3">
          {selectedPlayer && hudStats ? (
            <>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <User className="h-5 w-5" />
                    {selectedPlayer.player_name}
                    {playerStyle && (
                      <Badge 
                        variant="outline" 
                        className={`
                          ${playerStyle.color === 'green' ? 'border-green-500 text-green-500' :
                            playerStyle.color === 'red' ? 'border-red-500 text-red-500' :
                            playerStyle.color === 'orange' ? 'border-orange-500 text-orange-500' :
                            playerStyle.color === 'yellow' ? 'border-yellow-500 text-yellow-500' :
                            playerStyle.color === 'purple' ? 'border-purple-500 text-purple-500' :
                            'border-muted-foreground'}
                        `}
                      >
                        {playerStyle.type}
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
                {statsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="overview">Обзор</TabsTrigger>
                      <TabsTrigger value="preflop">Префлоп</TabsTrigger>
                      <TabsTrigger value="postflop">Постфлоп</TabsTrigger>
                      <TabsTrigger value="positions">Позиции</TabsTrigger>
                      <TabsTrigger value="leaks">Утечки</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 mt-4">
                      {/* Key Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                          icon={BarChart3}
                          label="Руки"
                          value={hudStats.handsPlayed.toLocaleString()}
                          color="text-blue-500"
                        />
                        <StatCard
                          icon={hudStats.bbPer100 >= 0 ? TrendingUp : TrendingDown}
                          label="BB/100"
                          value={formatStat(hudStats.bbPer100, 2)}
                          color={hudStats.bbPer100 >= 0 ? 'text-green-500' : 'text-red-500'}
                        />
                        <StatCard
                          icon={DollarSign}
                          label="Профит (BB)"
                          value={formatStat(hudStats.profitBB, 1)}
                          color={hudStats.profitBB >= 0 ? 'text-green-500' : 'text-red-500'}
                        />
                        <StatCard
                          icon={Award}
                          label="Побед"
                          value={`${((hudStats.handsWon / Math.max(1, hudStats.handsPlayed)) * 100).toFixed(1)}%`}
                          color="text-amber-500"
                        />
                      </div>

                      {/* Profit Graph */}
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <LineChartIcon className="h-4 w-4" />
                            График профита (BB)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={profitHistory}>
                                <defs>
                                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                  dataKey="hand" 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                  tickLine={false}
                                />
                                <YAxis 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                  tickLine={false}
                                  tickFormatter={(v) => `${v} BB`}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                  formatter={(value: number) => [`${value.toFixed(2)} BB`, 'Профит']}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="cumulative" 
                                  stroke={CHART_COLORS.success}
                                  fill="url(#profitGradient)"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Style Radar */}
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Профиль игры
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis 
                                  dataKey="stat" 
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                />
                                <PolarRadiusAxis 
                                  angle={30} 
                                  domain={[0, 100]}
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <Radar
                                  name="Текущий"
                                  dataKey="value"
                                  stroke={CHART_COLORS.primary}
                                  fill={CHART_COLORS.primary}
                                  fillOpacity={0.3}
                                />
                                <Radar
                                  name="Оптимально"
                                  dataKey="optimal"
                                  stroke={CHART_COLORS.success}
                                  fill={CHART_COLORS.success}
                                  fillOpacity={0.1}
                                  strokeDasharray="5 5"
                                />
                                <Legend />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Preflop Tab */}
                    <TabsContent value="preflop" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HUDStatCard
                          label="VPIP"
                          value={hudStats.vpip}
                          optimal={{ min: 20, max: 28 }}
                          tooltip="Voluntarily Put In Pot - % рук, где добровольно вложили фишки"
                        />
                        <HUDStatCard
                          label="PFR"
                          value={hudStats.pfr}
                          optimal={{ min: 15, max: 22 }}
                          tooltip="Pre-Flop Raise - % рук с рейзом префлоп"
                        />
                        <HUDStatCard
                          label="3-Bet"
                          value={hudStats.threeBet}
                          optimal={{ min: 6, max: 10 }}
                          tooltip="% рук с 3-бетом"
                        />
                        <HUDStatCard
                          label="Gap"
                          value={hudStats.vpip - hudStats.pfr}
                          optimal={{ min: 0, max: 6 }}
                          tooltip="Разрыв между VPIP и PFR"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HUDStatCard
                          label="Limp"
                          value={hudStats.limp}
                          optimal={{ min: 0, max: 5 }}
                          tooltip="% рук с лимпом"
                        />
                        <HUDStatCard
                          label="Steal"
                          value={hudStats.steal}
                          optimal={{ min: 30, max: 50 }}
                          tooltip="% стилов с BTN/CO/SB"
                        />
                        <HUDStatCard
                          label="Fold to 3-Bet"
                          value={hudStats.foldToThreeBet}
                          optimal={{ min: 40, max: 60 }}
                          tooltip="% фолдов на 3-бет"
                        />
                        <HUDStatCard
                          label="4-Bet"
                          value={hudStats.fourBet}
                          optimal={{ min: 2, max: 5 }}
                          tooltip="% 4-бетов"
                        />
                      </div>
                    </TabsContent>

                    {/* Postflop Tab */}
                    <TabsContent value="postflop" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HUDStatCard
                          label="AF Total"
                          value={hudStats.afTotal}
                          optimal={{ min: 2, max: 3.5 }}
                          isRatio
                          tooltip="Aggression Factor - соотношение агрессивных к пассивным действиям"
                        />
                        <HUDStatCard
                          label="AF Flop"
                          value={hudStats.afFlop}
                          optimal={{ min: 2, max: 4 }}
                          isRatio
                          tooltip="Aggression Factor на флопе"
                        />
                        <HUDStatCard
                          label="AF Turn"
                          value={hudStats.afTurn}
                          optimal={{ min: 1.5, max: 3 }}
                          isRatio
                          tooltip="Aggression Factor на тёрне"
                        />
                        <HUDStatCard
                          label="AF River"
                          value={hudStats.afRiver}
                          optimal={{ min: 1.5, max: 3 }}
                          isRatio
                          tooltip="Aggression Factor на ривере"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HUDStatCard
                          label="C-Bet"
                          value={hudStats.cbet}
                          optimal={{ min: 60, max: 75 }}
                          tooltip="Continuation Bet %"
                        />
                        <HUDStatCard
                          label="Check-Raise"
                          value={hudStats.checkRaise}
                          optimal={{ min: 5, max: 12 }}
                          tooltip="% чек-рейзов"
                        />
                        <HUDStatCard
                          label="WTSD"
                          value={hudStats.wtsd}
                          optimal={{ min: 25, max: 32 }}
                          tooltip="Went To ShowDown - % рук до шоудауна"
                        />
                        <HUDStatCard
                          label="W$SD"
                          value={hudStats.wsd}
                          optimal={{ min: 50, max: 60 }}
                          tooltip="Won $ at ShowDown - % побед на шоудауне"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <HUDStatCard
                          label="WWSF"
                          value={hudStats.wwsf}
                          optimal={{ min: 45, max: 55 }}
                          tooltip="Won When Saw Flop - % побед при виде флопа"
                        />
                        <HUDStatCard
                          label="Donk Bet"
                          value={hudStats.donkBet}
                          optimal={{ min: 0, max: 10 }}
                          tooltip="% донк-бетов"
                        />
                      </div>
                    </TabsContent>

                    {/* Positions Tab */}
                    <TabsContent value="positions" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Профит по позициям (BB)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={positionChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                  dataKey="position" 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                  tickFormatter={(v) => `${v} BB`}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Bar dataKey="bbWon" name="BB выиграно">
                                  {positionChartData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.bbWon >= 0 ? CHART_COLORS.success : CHART_COLORS.danger} 
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">VPIP/PFR по позициям</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={positionChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                  dataKey="position" 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis 
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                  tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Legend />
                                <Bar dataKey="vpip" name="VPIP" fill={CHART_COLORS.info} />
                                <Bar dataKey="pfr" name="PFR" fill={CHART_COLORS.warning} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Position Stats Table */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            {positionChartData.map((pos) => (
                              <div 
                                key={pos.position}
                                className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                              >
                                <div 
                                  className="w-12 h-8 rounded flex items-center justify-center font-bold text-white text-sm"
                                  style={{ backgroundColor: pos.color }}
                                >
                                  {pos.position}
                                </div>
                                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Рук:</span>
                                    <span className="ml-1 font-medium">{pos.hands}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">VPIP:</span>
                                    <span className="ml-1 font-medium">{formatStat(pos.vpip)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">PFR:</span>
                                    <span className="ml-1 font-medium">{formatStat(pos.pfr)}%</span>
                                  </div>
                                  <div>
                                    <span className={pos.bbWon >= 0 ? 'text-green-500' : 'text-red-500'}>
                                      {pos.bbWon >= 0 ? '+' : ''}{formatStat(pos.bbWon)} BB
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Leaks Tab */}
                    <TabsContent value="leaks" className="space-y-4 mt-4">
                      {/* Overall Score */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">Общий рейтинг игры</div>
                              <div className="text-4xl font-bold">{Math.round(overallScore)}/100</div>
                            </div>
                            <div className={`p-4 rounded-full ${
                              overallScore >= 80 ? 'bg-green-500/20' :
                              overallScore >= 60 ? 'bg-yellow-500/20' :
                              overallScore >= 40 ? 'bg-orange-500/20' : 'bg-red-500/20'
                            }`}>
                              <Brain className={`h-10 w-10 ${
                                overallScore >= 80 ? 'text-green-500' :
                                overallScore >= 60 ? 'text-yellow-500' :
                                overallScore >= 40 ? 'text-orange-500' : 'text-red-500'
                              }`} />
                            </div>
                          </div>
                          <Progress 
                            value={overallScore} 
                            className="mt-4 h-2"
                          />
                        </CardContent>
                      </Card>

                      {/* Leaks List */}
                      {leaks.length > 0 ? (
                        <div className="space-y-3">
                          {leaks.map((leak, index) => (
                            <Card key={index} className="border-l-4" style={{
                              borderLeftColor: leak.severity === 'critical' ? '#ef4444' :
                                leak.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                            }}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                                      leak.severity === 'critical' ? 'text-red-500' :
                                      leak.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                                    }`} />
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{leak.category}</span>
                                        {getSeverityBadge(leak.severity)}
                                        <Badge variant="outline" className="text-xs">
                                          -{leak.impactBB.toFixed(1)} BB/100
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{leak.description}</p>
                                      <p className="text-sm text-green-500 mt-2 bg-green-500/10 p-2 rounded">
                                        💡 {leak.recommendation}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <Award className="h-12 w-12 mx-auto text-green-500 mb-3" />
                            <div className="text-lg font-medium">Отлично!</div>
                            <div className="text-sm text-muted-foreground">
                              Значительных утечек в игре не обнаружено
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-20 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>Выберите игрока для просмотра статистики</div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ 
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

function HUDStatCard({
  label,
  value,
  optimal,
  isRatio = false,
  tooltip
}: {
  label: string;
  value: number;
  optimal: { min: number; max: number };
  isRatio?: boolean;
  tooltip?: string;
}) {
  const isOptimal = value >= optimal.min && value <= optimal.max;
  const isLow = value < optimal.min;
  
  const color = isOptimal ? 'text-green-500' : 
                isLow ? 'text-blue-500' : 'text-red-500';
  
  const bgColor = isOptimal ? 'bg-green-500/10' : 
                  isLow ? 'bg-blue-500/10' : 'bg-red-500/10';

  return (
    <div className={`p-4 rounded-lg ${bgColor}`} title={tooltip}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value.toFixed(isRatio ? 2 : 1)}{!isRatio && '%'}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        Оптимум: {optimal.min}{isRatio ? '' : '%'} - {optimal.max}{isRatio ? '' : '%'}
      </div>
    </div>
  );
}

export default EnhancedPlayerAnalytics;
