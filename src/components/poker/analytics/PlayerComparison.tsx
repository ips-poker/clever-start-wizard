/**
 * Player Comparison Tool
 * Compare multiple players side by side with charts and stats
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Search,
  Download,
  User,
  Users,
  RefreshCw,
  X,
  Plus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculateRealHUDStats, RealHUDStats } from '@/utils/calculateRealHUDStats';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerCompareData {
  id: string;
  playerId: string;
  playerName: string;
  handsPlayed: number;
  profit: number;
  stats: RealHUDStats | null;
  color: string;
}

const PLAYER_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function PlayerComparison() {
  const [allPlayers, setAllPlayers] = useState<Array<{
    id: string;
    playerId: string;
    playerName: string;
    handsPlayed: number;
    profit: number;
  }>>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerCompareData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

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

    const players = (data || []).map(p => ({
      id: p.id,
      playerId: p.player_id,
      playerName: (p.players as any)?.name || 'Unknown',
      handsPlayed: p.hands_played,
      profit: p.total_won - p.total_lost
    }));

    setAllPlayers(players);
    setLoading(false);
  };

  const loadPlayerStats = async (playerId: string): Promise<RealHUDStats | null> => {
    try {
      const { data: handPlayers, error } = await supabase
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

      if (error) throw error;

      const handIds = [...new Set(handPlayers?.map(hp => (hp.poker_hands as any).id) || [])];
      
      const { data: allActions } = await supabase
        .from('poker_actions')
        .select('*')
        .in('hand_id', handIds)
        .order('action_order');

      const actionsByHand: Record<string, any[]> = {};
      allActions?.forEach(action => {
        if (!actionsByHand[action.hand_id]) {
          actionsByHand[action.hand_id] = [];
        }
        actionsByHand[action.hand_id].push(action);
      });

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

      return calculateRealHUDStats(hands, playerId);
    } catch (error) {
      console.error('Error loading player stats:', error);
      return null;
    }
  };

  const addPlayer = async (player: typeof allPlayers[0]) => {
    if (selectedPlayers.length >= 8) {
      toast.error('Максимум 8 игроков для сравнения');
      return;
    }

    if (selectedPlayers.find(p => p.playerId === player.playerId)) {
      toast.error('Игрок уже добавлен');
      return;
    }

    setLoadingStats(true);
    const stats = await loadPlayerStats(player.playerId);
    
    setSelectedPlayers(prev => [...prev, {
      ...player,
      stats,
      color: PLAYER_COLORS[prev.length % PLAYER_COLORS.length]
    }]);
    
    setLoadingStats(false);
    toast.success(`${player.playerName} добавлен для сравнения`);
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const filtered = prev.filter(p => p.playerId !== playerId);
      // Reassign colors
      return filtered.map((p, i) => ({
        ...p,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]
      }));
    });
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const filteredPlayers = allPlayers.filter(p =>
    p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedPlayers.find(sp => sp.playerId === p.playerId)
  );

  // Comparison data for bar chart
  const barChartData = useMemo(() => {
    const metrics = ['vpip', 'pfr', 'threeBet', 'cbet', 'wtsd', 'wsd'];
    const labels: Record<string, string> = {
      vpip: 'VPIP',
      pfr: 'PFR',
      threeBet: '3-Bet',
      cbet: 'C-Bet',
      wtsd: 'WTSD',
      wsd: 'W$SD'
    };

    return metrics.map(metric => {
      const point: any = { metric: labels[metric] };
      selectedPlayers.forEach(player => {
        if (player.stats) {
          point[player.playerName] = (player.stats as any)[metric] || 0;
        }
      });
      return point;
    });
  }, [selectedPlayers]);

  // Radar chart data
  const radarData = useMemo(() => {
    const stats = ['VPIP', 'PFR', '3-Bet', 'AF', 'C-Bet', 'WTSD'];
    
    return stats.map(stat => {
      const point: any = { stat };
      selectedPlayers.forEach(player => {
        if (player.stats) {
          let value = 0;
          switch (stat) {
            case 'VPIP': value = Math.min(100, player.stats.vpip * 2); break;
            case 'PFR': value = Math.min(100, player.stats.pfr * 2.5); break;
            case '3-Bet': value = Math.min(100, player.stats.threeBet * 5); break;
            case 'AF': value = Math.min(100, player.stats.afTotal * 25); break;
            case 'C-Bet': value = player.stats.cbet; break;
            case 'WTSD': value = Math.min(100, player.stats.wtsd * 2.5); break;
          }
          point[player.playerName] = value;
        }
      });
      return point;
    });
  }, [selectedPlayers]);

  // Win rate comparison
  const winRateData = useMemo(() => {
    return selectedPlayers
      .filter(p => p.stats)
      .map(player => ({
        name: player.playerName,
        bbPer100: player.stats!.bbPer100,
        color: player.color
      }))
      .sort((a, b) => b.bbPer100 - a.bbPer100);
  }, [selectedPlayers]);

  const exportComparison = () => {
    const data = {
      exportDate: new Date().toISOString(),
      players: selectedPlayers.map(p => ({
        name: p.playerName,
        stats: p.stats
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player_comparison_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Сравнение экспортировано');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Сравнение игроков</h2>
          {selectedPlayers.length > 0 && (
            <Badge variant="secondary">{selectedPlayers.length} выбрано</Badge>
          )}
        </div>
        {selectedPlayers.length >= 2 && (
          <Button onClick={exportComparison} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Экспорт
          </Button>
        )}
      </div>

      {/* Selected Players */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {selectedPlayers.map(player => (
            <motion.div
              key={player.playerId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge 
                variant="outline" 
                className="px-3 py-1.5 flex items-center gap-2"
                style={{ borderColor: player.color, color: player.color }}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: player.color }}
                />
                {player.playerName}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => removePlayer(player.playerId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {selectedPlayers.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Выберите игроков для сравнения из списка ниже
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player Selector */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Добавить игрока
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  filteredPlayers.slice(0, 50).map(player => (
                    <div
                      key={player.playerId}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => addPlayer(player)}
                    >
                      <div>
                        <div className="font-medium">{player.playerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {player.handsPlayed.toLocaleString()} рук
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" disabled={loadingStats}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Comparison Charts */}
        <Card className="lg:col-span-2">
          {selectedPlayers.length >= 2 ? (
            <>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Сравнительный анализ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Win Rate Comparison */}
                <div>
                  <h4 className="text-sm font-medium mb-3">BB/100 Сравнение</h4>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={winRateData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)} BB/100`, 'Win Rate']}
                        />
                        <Bar dataKey="bbPer100" name="BB/100">
                          {winRateData.map((entry, index) => (
                            <motion.rect
                              key={index}
                              fill={entry.bbPer100 >= 0 ? '#22c55e' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stats Bar Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Сравнение статистик</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="metric" 
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
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                        />
                        <Legend />
                        {selectedPlayers.map(player => (
                          <Bar 
                            key={player.playerId}
                            dataKey={player.playerName}
                            fill={player.color}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Профили игры</h4>
                  <div className="h-72">
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
                        {selectedPlayers.map(player => (
                          <Radar
                            key={player.playerId}
                            name={player.playerName}
                            dataKey={player.playerName}
                            stroke={player.color}
                            fill={player.color}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stats Table */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Детальное сравнение</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Метрика</th>
                          {selectedPlayers.map(player => (
                            <th 
                              key={player.playerId} 
                              className="text-right py-2 px-3"
                              style={{ color: player.color }}
                            >
                              {player.playerName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'handsPlayed', label: 'Рук', format: (v: number) => v.toLocaleString() },
                          { key: 'bbPer100', label: 'BB/100', format: (v: number) => v.toFixed(2) },
                          { key: 'vpip', label: 'VPIP', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'pfr', label: 'PFR', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'threeBet', label: '3-Bet', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'afTotal', label: 'AF', format: (v: number) => v.toFixed(2) },
                          { key: 'cbet', label: 'C-Bet', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'wtsd', label: 'WTSD', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'wsd', label: 'W$SD', format: (v: number) => `${v.toFixed(1)}%` },
                          { key: 'wwsf', label: 'WWSF', format: (v: number) => `${v.toFixed(1)}%` },
                        ].map(({ key, label, format }) => (
                          <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground">{label}</td>
                            {selectedPlayers.map(player => {
                              const value = player.stats ? (player.stats as any)[key] : 0;
                              const allValues = selectedPlayers
                                .filter(p => p.stats)
                                .map(p => (p.stats as any)[key] || 0);
                              const isBest = key !== 'handsPlayed' && value === Math.max(...allValues);
                              const isWorst = key !== 'handsPlayed' && value === Math.min(...allValues);
                              
                              return (
                                <td 
                                  key={player.playerId} 
                                  className={`text-right py-2 px-3 font-mono ${
                                    isBest ? 'text-green-500 font-bold' : 
                                    isWorst ? 'text-red-400' : ''
                                  }`}
                                >
                                  {player.stats ? format(value) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-20 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>Выберите минимум 2 игрока для сравнения</div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PlayerComparison;
