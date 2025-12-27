// ============================================
// ENGINE MONITORING PANEL - Мониторинг покерного движка
// ============================================
// Расширенный мониторинг состояния VPS движка, столов и рук

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Activity,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  WifiOff,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Eye,
  Clock,
  Users,
  Gamepad2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface TableStatus {
  id: string;
  name: string;
  status: string;
  players_count: number;
  max_players: number;
  current_hand_id: string | null;
  game_type: string;
  small_blind: number;
  big_blind: number;
  tournament_id: string | null;
}

interface HandInfo {
  id: string;
  hand_number: number;
  phase: string;
  pot: number;
  current_player_seat: number | null;
  created_at: string;
  started_at: string;
  completed_at: string | null;
  table_name?: string;
}

interface EngineStats {
  activeTables: number;
  totalPlayers: number;
  activeHands: number;
  handsPerMinute: number;
  avgHandDuration: number;
  serverUptime: number;
  lastUpdate: Date;
}

export function EngineMonitoringPanel() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [activeHands, setActiveHands] = useState<HandInfo[]>([]);
  const [recentHands, setRecentHands] = useState<HandInfo[]>([]);
  const [stats, setStats] = useState<EngineStats>({
    activeTables: 0,
    totalPlayers: 0,
    activeHands: 0,
    handsPerMinute: 0,
    avgHandDuration: 0,
    serverUptime: 0,
    lastUpdate: new Date()
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      // Fetch tables with player counts
      const { data: tablesData } = await supabase
        .from('poker_tables')
        .select(`
          id,
          name,
          status,
          max_players,
          current_hand_id,
          game_type,
          small_blind,
          big_blind,
          tournament_id
        `)
        .order('created_at', { ascending: false });
      
      if (tablesData) {
        // Get player counts for each table
        const tableIds = tablesData.map(t => t.id);
        const { data: playerCounts } = await supabase
          .from('poker_table_players')
          .select('table_id')
          .in('table_id', tableIds);
        
        const countMap = new Map<string, number>();
        playerCounts?.forEach(p => {
          countMap.set(p.table_id, (countMap.get(p.table_id) || 0) + 1);
        });
        
        const enrichedTables = tablesData.map(t => ({
          ...t,
          players_count: countMap.get(t.id) || 0
        }));
        
        setTables(enrichedTables);
        
        // Update stats
        const activeTables = enrichedTables.filter(t => t.status === 'playing').length;
        const totalPlayers = enrichedTables.reduce((sum, t) => sum + t.players_count, 0);
        const activeHandsCount = enrichedTables.filter(t => t.current_hand_id).length;
        
        setStats(prev => ({
          ...prev,
          activeTables,
          totalPlayers,
          activeHands: activeHandsCount,
          lastUpdate: new Date()
        }));
      }
      
      // Fetch active hands
      const { data: handsData } = await supabase
        .from('poker_hands')
        .select(`
          id,
          hand_number,
          phase,
          pot,
          current_player_seat,
          created_at,
          started_at,
          completed_at,
          poker_tables (name)
        `)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (handsData) {
        const enrichedHands = handsData.map(h => ({
          ...h,
          table_name: (h.poker_tables as any)?.name || 'Unknown'
        }));
        setActiveHands(enrichedHands);
      }
      
      // Fetch recent completed hands
      const { data: recentData } = await supabase
        .from('poker_hands')
        .select(`
          id,
          hand_number,
          phase,
          pot,
          current_player_seat,
          created_at,
          started_at,
          completed_at,
          poker_tables (name)
        `)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20);
      
      if (recentData) {
        const enrichedRecent = recentData.map(h => ({
          ...h,
          table_name: (h.poker_tables as any)?.name || 'Unknown'
        }));
        setRecentHands(enrichedRecent);
        
        // Calculate hands per minute and avg duration
        if (enrichedRecent.length > 1) {
          const completedHands = enrichedRecent.filter(h => h.completed_at && h.started_at);
          if (completedHands.length > 0) {
            const durations = completedHands.map(h => {
              const start = new Date(h.started_at).getTime();
              const end = new Date(h.completed_at!).getTime();
              return (end - start) / 1000;
            });
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            
            setStats(prev => ({
              ...prev,
              avgHandDuration: Math.round(avgDuration)
            }));
          }
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching engine data:', err);
      setLoading(false);
    }
  }, []);
  
  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);
  
  // Check WS connection status
  useEffect(() => {
    const checkWsStatus = async () => {
      try {
        // Check WS status based on table activity
        const hasActiveHands = tables.some(t => t.current_hand_id);
        setWsConnected(hasActiveHands || tables.length > 0);
      } catch {
        setWsConnected(false);
      }
    };
    
    checkWsStatus();
  }, [tables]);
  
  const cleanupStuckHands = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_stuck_poker_hands');
      if (error) throw error;
      toast.success(`Очищено ${data || 0} зависших рук`);
      fetchData();
    } catch (err) {
      toast.error('Ошибка очистки');
    }
  };
  
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'preflop': return 'bg-blue-500/20 text-blue-400';
      case 'flop': return 'bg-green-500/20 text-green-400';
      case 'turn': return 'bg-yellow-500/20 text-yellow-400';
      case 'river': return 'bg-orange-500/20 text-orange-400';
      case 'showdown': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'playing': return <Play className="h-3 w-3 text-green-500" />;
      case 'waiting': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'paused': return <Pause className="h-3 w-3 text-orange-500" />;
      default: return <XCircle className="h-3 w-3 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Столов</p>
                <p className="text-lg font-bold">{stats.activeTables}/{tables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Игроков</p>
                <p className="text-lg font-bold">{stats.totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Активных рук</p>
                <p className="text-lg font-bold">{activeHands.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Ср. длит. руки</p>
                <p className="text-lg font-bold">{stats.avgHandDuration}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="h-4 w-4 text-cyan-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">WebSocket</p>
                <p className="text-lg font-bold">{wsConnected ? 'Online' : 'Offline'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Обновлено</p>
                <p className="text-xs font-mono">{format(stats.lastUpdate, 'HH:mm:ss')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
        <Button 
          size="sm" 
          variant={autoRefresh ? 'default' : 'outline'}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          Авто-обновление
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-orange-500"
          onClick={cleanupStuckHands}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Очистить зависшие
        </Button>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Tables */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Активные столы ({tables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {tables.map(table => (
                  <div 
                    key={table.id}
                    className="p-2 bg-muted/50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(table.status)}
                      <div>
                        <p className="text-sm font-medium">{table.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {table.small_blind}/{table.big_blind} • {table.game_type}
                          {table.tournament_id && ' • Турнир'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {table.players_count}/{table.max_players}
                      </Badge>
                      {table.current_hand_id && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {tables.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет активных столов
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Active Hands */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Текущие раздачи ({activeHands.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {activeHands.map(hand => (
                  <div 
                    key={hand.id}
                    className="p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">#{hand.hand_number}</span>
                        <span className="text-xs text-muted-foreground">{hand.table_name}</span>
                      </div>
                      <Badge className={`text-xs ${getPhaseColor(hand.phase)}`}>
                        {hand.phase}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Пот: ${hand.pot}</span>
                      <span>Seat: {hand.current_player_seat ?? '-'}</span>
                      <span>{format(new Date(hand.started_at), 'HH:mm:ss')}</span>
                    </div>
                  </div>
                ))}
                {activeHands.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет активных раздач
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Hands */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Последние завершённые раздачи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Стол</th>
                  <th className="p-2 text-center">Пот</th>
                  <th className="p-2 text-center">Длительность</th>
                  <th className="p-2 text-right">Завершено</th>
                </tr>
              </thead>
              <tbody>
                {recentHands.map(hand => {
                  const duration = hand.completed_at && hand.started_at
                    ? Math.round((new Date(hand.completed_at).getTime() - new Date(hand.started_at).getTime()) / 1000)
                    : 0;
                  
                  return (
                    <tr key={hand.id} className="border-t">
                      <td className="p-2">#{hand.hand_number}</td>
                      <td className="p-2">{hand.table_name}</td>
                      <td className="p-2 text-center font-mono">${hand.pot}</td>
                      <td className="p-2 text-center">{duration}s</td>
                      <td className="p-2 text-right font-mono">
                        {hand.completed_at && format(new Date(hand.completed_at), 'HH:mm:ss')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default EngineMonitoringPanel;
