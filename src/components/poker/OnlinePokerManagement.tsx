import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  CreditCard,
  Table2,
  Users,
  Settings,
  Plus,
  Minus,
  RefreshCw,
  Trash2,
  Eye,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Clock,
  Gamepad2,
  Shield,
  Zap,
  Ban,
  History,
  AlertTriangle,
  CheckCircle,
  Activity,
  UserX,
  Coins,
  Download,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlayerBanList } from './admin/PlayerBanList';
import { CreditTransactions, addTransaction } from './admin/CreditTransactions';
import { HandDetailsViewer } from './admin/HandDetailsViewer';
import { CreatePlayerWithBalance } from './admin/CreatePlayerWithBalance';
import { StatsExport } from './admin/StatsExport';
import { DiamondManagement } from './admin/DiamondManagement';
import { OnlineTournamentManager } from './admin/OnlineTournamentManager';
import { Gem, Trophy } from 'lucide-react';

interface PlayerBalance {
  id: string;
  player_id: string;
  player_name: string;
  balance: number;
  total_won: number;
  total_lost: number;
  hands_played: number;
}

interface PokerTable {
  id: string;
  name: string;
  status: string;
  game_type: string;
  table_type: string;
  small_blind: number;
  big_blind: number;
  ante: number;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  action_time_seconds: number;
  time_bank_seconds: number;
  auto_start_enabled: boolean;
  straddle_enabled: boolean;
  run_it_twice_enabled: boolean;
  bomb_pot_enabled: boolean;
  chat_enabled: boolean;
  rake_percent: number;
  rake_cap: number;
  players_count?: number;
  current_hand_id?: string;
}

interface ActivePlayer {
  id: string;
  player_id: string;
  player_name: string;
  table_id: string;
  table_name: string;
  seat_number: number;
  stack: number;
  status: string;
  joined_at: string;
}

interface HandHistory {
  id: string;
  hand_number: number;
  table_name: string;
  phase: string;
  pot: number;
  created_at: string;
  completed_at: string | null;
  winners: any;
}

export function OnlinePokerManagement() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [players, setPlayers] = useState<PlayerBalance[]>([]);
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [handHistory, setHandHistory] = useState<HandHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBalance | null>(null);
  const [creditAmount, setCreditAmount] = useState('1000');
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showMassCreditsDialog, setShowMassCreditsDialog] = useState(false);
  const [showKickPlayerDialog, setShowKickPlayerDialog] = useState(false);
  const [playerToKick, setPlayerToKick] = useState<ActivePlayer | null>(null);
  const [massCreditsAmount, setMassCreditsAmount] = useState('5000');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalWon: 0,
    totalLost: 0,
    activeTables: 0,
    activePlayersCount: 0,
    handsToday: 0,
    stuckHands: 0
  });

  // New table form state
  const [newTable, setNewTable] = useState({
    name: '',
    small_blind: 10,
    big_blind: 20,
    min_buy_in: 400,
    max_buy_in: 2000,
    max_players: 9,
    action_time_seconds: 15,
    time_bank_seconds: 30,
    auto_start_enabled: true,
    straddle_enabled: false,
    run_it_twice_enabled: false,
    bomb_pot_enabled: false,
    chat_enabled: true,
    rake_percent: 0,
    rake_cap: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadPlayers(),
      loadTables(),
      loadActivePlayers(),
      loadHandHistory(),
      loadStats()
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('poker-admin-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_table_players' }, () => {
        loadActivePlayers();
        loadTables();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_hands' }, () => {
        loadHandHistory();
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_balances' }, () => {
        loadPlayers();
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const loadStats = async () => {
    // Get totals
    const { data: balances } = await supabase.from('player_balances').select('balance, total_won, total_lost');
    const { data: tableData } = await supabase.from('poker_tables').select('status');
    const { data: playerData } = await supabase.from('poker_table_players').select('status').eq('status', 'active');
    
    // Get hands today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: handsToday } = await supabase
      .from('poker_hands')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get stuck hands
    const { count: stuckHands } = await supabase
      .from('poker_hands')
      .select('*', { count: 'exact', head: true })
      .is('completed_at', null);

    setStats({
      totalCredits: balances?.reduce((sum, b) => sum + b.balance, 0) || 0,
      totalWon: balances?.reduce((sum, b) => sum + b.total_won, 0) || 0,
      totalLost: balances?.reduce((sum, b) => sum + b.total_lost, 0) || 0,
      activeTables: tableData?.filter(t => t.status === 'playing').length || 0,
      activePlayersCount: playerData?.length || 0,
      handsToday: handsToday || 0,
      stuckHands: stuckHands || 0
    });
  };

  const loadPlayers = async () => {
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
      `);

    if (error) {
      console.error('Error loading players:', error);
      return;
    }

    const playersWithNames = data?.map(pb => ({
      id: pb.id,
      player_id: pb.player_id,
      player_name: (pb.players as any)?.name || 'Unknown',
      balance: pb.balance,
      total_won: pb.total_won,
      total_lost: pb.total_lost,
      hands_played: pb.hands_played,
    })) || [];

    setPlayers(playersWithNames);
  };

  const loadTables = async () => {
    const { data: tablesData, error } = await supabase
      .from('poker_tables')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tables:', error);
      return;
    }

    const tablesWithCounts = await Promise.all(
      (tablesData || []).map(async (table) => {
        const { count } = await supabase
          .from('poker_table_players')
          .select('*', { count: 'exact', head: true })
          .eq('table_id', table.id)
          .eq('status', 'active');

        return { ...table, players_count: count || 0 };
      })
    );

    setTables(tablesWithCounts);
  };

  const loadActivePlayers = async () => {
    const { data, error } = await supabase
      .from('poker_table_players')
      .select(`
        id,
        player_id,
        table_id,
        seat_number,
        stack,
        status,
        joined_at,
        players!inner(name),
        poker_tables!inner(name)
      `)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error loading active players:', error);
      return;
    }

    const activePlayersData = data?.map(ap => ({
      id: ap.id,
      player_id: ap.player_id,
      player_name: (ap.players as any)?.name || 'Unknown',
      table_id: ap.table_id,
      table_name: (ap.poker_tables as any)?.name || 'Unknown',
      seat_number: ap.seat_number,
      stack: ap.stack,
      status: ap.status,
      joined_at: ap.joined_at
    })) || [];

    setActivePlayers(activePlayersData);
  };

  const loadHandHistory = async () => {
    const { data, error } = await supabase
      .from('poker_hands')
      .select(`
        id,
        hand_number,
        phase,
        pot,
        created_at,
        completed_at,
        winners,
        poker_tables!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading hand history:', error);
      return;
    }

    const historyData = data?.map(h => ({
      id: h.id,
      hand_number: h.hand_number,
      table_name: (h.poker_tables as any)?.name || 'Unknown',
      phase: h.phase,
      pot: h.pot,
      created_at: h.created_at,
      completed_at: h.completed_at,
      winners: h.winners
    })) || [];

    setHandHistory(historyData);
  };

  const handleAddCredits = async () => {
    if (!selectedPlayer) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Укажите корректную сумму');
      return;
    }

    const { error } = await supabase
      .from('player_balances')
      .update({ balance: selectedPlayer.balance + amount })
      .eq('id', selectedPlayer.id);

    if (error) {
      toast.error('Ошибка при добавлении кредитов');
      return;
    }

    toast.success(`Добавлено ${amount} кредитов игроку ${selectedPlayer.player_name}`);
    setShowAddCreditsDialog(false);
    loadPlayers();
    loadStats();
  };

  const handleMassCredits = async () => {
    const amount = parseInt(massCreditsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Укажите корректную сумму');
      return;
    }

    // Get all players and update their balances
    const { data: allBalances } = await supabase.from('player_balances').select('id, balance');
    
    if (!allBalances || allBalances.length === 0) {
      toast.error('Нет игроков для начисления');
      return;
    }

    const updates = allBalances.map(b => 
      supabase.from('player_balances').update({ balance: b.balance + amount }).eq('id', b.id)
    );

    await Promise.all(updates);

    toast.success(`Начислено ${amount} кредитов ${allBalances.length} игрокам`);
    setShowMassCreditsDialog(false);
    loadPlayers();
    loadStats();
  };

  const handleRemoveCredits = async (player: PlayerBalance, amount: number) => {
    const newBalance = Math.max(0, player.balance - amount);

    const { error } = await supabase
      .from('player_balances')
      .update({ balance: newBalance })
      .eq('id', player.id);

    if (error) {
      toast.error('Ошибка при снятии кредитов');
      return;
    }

    toast.success(`Снято ${amount} кредитов у игрока ${player.player_name}`);
    loadPlayers();
    loadStats();
  };

  const handleResetBalance = async (player: PlayerBalance) => {
    const { error } = await supabase
      .from('player_balances')
      .update({ balance: 10000 })
      .eq('id', player.id);

    if (error) {
      toast.error('Ошибка при сбросе баланса');
      return;
    }

    toast.success(`Баланс игрока ${player.player_name} сброшен до 10,000`);
    loadPlayers();
    loadStats();
  };

  const handleKickPlayer = async () => {
    if (!playerToKick) return;

    const { error } = await supabase
      .from('poker_table_players')
      .delete()
      .eq('id', playerToKick.id);

    if (error) {
      toast.error('Ошибка при удалении игрока со стола');
      return;
    }

    toast.success(`Игрок ${playerToKick.player_name} удален со стола ${playerToKick.table_name}`);
    setShowKickPlayerDialog(false);
    setPlayerToKick(null);
    loadActivePlayers();
    loadTables();
  };

  const handleCleanupStuckHands = async () => {
    const { data, error } = await supabase.rpc('cleanup_stuck_poker_hands');
    
    if (error) {
      toast.error('Ошибка при очистке застрявших рук');
      return;
    }

    toast.success(`Очищено застрявших рук: ${data || 0}`);
    loadHandHistory();
    loadStats();
    loadTables();
  };

  const handleCreateTable = async () => {
    if (!newTable.name.trim()) {
      toast.error('Укажите название стола');
      return;
    }

    const { error } = await supabase.from('poker_tables').insert({
      name: newTable.name,
      small_blind: newTable.small_blind,
      big_blind: newTable.big_blind,
      min_buy_in: newTable.min_buy_in,
      max_buy_in: newTable.max_buy_in,
      max_players: newTable.max_players,
      action_time_seconds: newTable.action_time_seconds,
      time_bank_seconds: newTable.time_bank_seconds,
      auto_start_enabled: newTable.auto_start_enabled,
      straddle_enabled: newTable.straddle_enabled,
      run_it_twice_enabled: newTable.run_it_twice_enabled,
      bomb_pot_enabled: newTable.bomb_pot_enabled,
      chat_enabled: newTable.chat_enabled,
      rake_percent: newTable.rake_percent,
      rake_cap: newTable.rake_cap,
      game_type: 'holdem',
      table_type: 'cash',
      status: 'waiting',
    });

    if (error) {
      toast.error('Ошибка при создании стола');
      return;
    }

    toast.success('Стол успешно создан');
    setShowCreateTableDialog(false);
    setNewTable({
      name: '',
      small_blind: 10,
      big_blind: 20,
      min_buy_in: 400,
      max_buy_in: 2000,
      max_players: 9,
      action_time_seconds: 15,
      time_bank_seconds: 30,
      auto_start_enabled: true,
      straddle_enabled: false,
      run_it_twice_enabled: false,
      bomb_pot_enabled: false,
      chat_enabled: true,
      rake_percent: 0,
      rake_cap: 0,
    });
    loadTables();
  };

  const handleDeleteTable = async (tableId: string) => {
    // First remove all players from the table
    await supabase.from('poker_table_players').delete().eq('table_id', tableId);
    
    const { error } = await supabase.from('poker_tables').delete().eq('id', tableId);

    if (error) {
      toast.error('Ошибка при удалении стола');
      return;
    }

    toast.success('Стол удален');
    loadTables();
  };

  const handleUpdateTableStatus = async (tableId: string, newStatus: string) => {
    const { error } = await supabase
      .from('poker_tables')
      .update({ status: newStatus })
      .eq('id', tableId);

    if (error) {
      toast.error('Ошибка при обновлении статуса');
      return;
    }

    toast.success(`Статус стола обновлен: ${newStatus}`);
    loadTables();
  };

  const filteredPlayers = players.filter(p =>
    p.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление онлайн-покером</h2>
          <p className="text-muted-foreground">Мониторинг, кредиты, столы и история</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Live Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Кредиты</p>
                <p className="text-lg font-bold">{stats.totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Столы</p>
                <p className="text-lg font-bold">{stats.activeTables}/{tables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">За столами</p>
                <p className="text-lg font-bold">{stats.activePlayersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Рук сегодня</p>
                <p className="text-lg font-bold">{stats.handsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Выиграно</p>
                <p className="text-lg font-bold">{stats.totalWon.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Проиграно</p>
                <p className="text-lg font-bold">{stats.totalLost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${stats.stuckHands > 0 ? 'bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20' : 'border-border/50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stats.stuckHands > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Застряло</p>
                <p className="text-lg font-bold">{stats.stuckHands}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="monitor" className="gap-1">
            <Eye className="h-4 w-4" />
            <span className="hidden lg:inline">Мониторинг</span>
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600">
            <Trophy className="h-4 w-4" />
            <span className="hidden lg:inline">Турниры</span>
          </TabsTrigger>
          <TabsTrigger value="diamonds" className="gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600">
            <Gem className="h-4 w-4" />
            <span className="hidden lg:inline">Алмазы</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-1">
            <CreditCard className="h-4 w-4" />
            <span className="hidden lg:inline">Кредиты</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1">
            <Table2 className="h-4 w-4" />
            <span className="hidden lg:inline">Столы</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">История</span>
          </TabsTrigger>
          <TabsTrigger value="bans" className="gap-1">
            <Ban className="h-4 w-4" />
            <span className="hidden lg:inline">Баны</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">Экспорт</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">Инструменты</span>
          </TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments">
          <OnlineTournamentManager />
        </TabsContent>

        {/* Diamonds Tab */}
        <TabsContent value="diamonds">
          <DiamondManagement />
        </TabsContent>

        {/* Monitor Tab - Live View */}
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active Tables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Активные столы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {tables.map((table) => (
                      <div 
                        key={table.id} 
                        className={`p-3 rounded-lg border ${table.status === 'playing' ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {table.name}
                              {table.status === 'playing' && (
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {table.small_blind}/{table.big_blind} • {table.players_count}/{table.max_players} игроков
                            </div>
                          </div>
                          <Badge variant={table.status === 'playing' ? 'default' : 'secondary'}>
                            {table.status === 'playing' ? 'Игра' : 'Ожидание'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {tables.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">Нет столов</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Players at Tables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Игроки за столами
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {activePlayers.map((player) => (
                      <div 
                        key={player.id} 
                        className={`p-3 rounded-lg border flex items-center justify-between ${player.status === 'active' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-muted/30'}`}
                      >
                        <div>
                          <div className="font-medium">{player.player_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.table_name} • Место {player.seat_number} • {player.stack.toLocaleString()} фишек
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={player.status === 'active' ? 'default' : 'secondary'}>
                            {player.status === 'active' ? 'Активен' : 'Sit Out'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setPlayerToKick(player);
                              setShowKickPlayerDialog(true);
                            }}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {activePlayers.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">Нет игроков за столами</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Hands */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Последние раздачи (Live)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {handHistory.slice(0, 20).map((hand) => (
                    <div 
                      key={hand.id} 
                      className={`p-2 rounded text-sm flex items-center justify-between ${!hand.completed_at ? 'bg-yellow-500/10 border border-yellow-500/20' : 'hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-muted-foreground">#{hand.hand_number}</span>
                        <span>{hand.table_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {hand.phase}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{hand.pot} pot</span>
                        <span className="text-muted-foreground text-xs">{formatTime(hand.created_at)}</span>
                        {hand.completed_at ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Управление кредитами
                  </CardTitle>
                  <CardDescription>
                    Добавляйте и снимайте кредиты с балансов игроков
                  </CardDescription>
                </div>
                <Button onClick={() => setShowMassCreditsDialog(true)} variant="outline">
                  <Coins className="h-4 w-4 mr-2" />
                  Массовое начисление
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Поиск игрока..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Игрок</TableHead>
                      <TableHead className="text-right">Баланс</TableHead>
                      <TableHead className="text-right">Выигрыш</TableHead>
                      <TableHead className="text-right">Проигрыш</TableHead>
                      <TableHead className="text-right">Раздач</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.player_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {player.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-500 font-mono">
                          +{player.total_won.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-500 font-mono">
                          -{player.total_lost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{player.hands_played}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPlayer(player);
                                setShowAddCreditsDialog(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveCredits(player, 1000)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetBalance(player)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPlayers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Игроки не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Управление столами
                </CardTitle>
                <CardDescription>
                  Создавайте и настраивайте покерные столы
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateTableDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать стол
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {tables.map((table) => (
                  <Card key={table.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{table.name}</h3>
                            <Badge variant={table.status === 'playing' ? 'default' : 'secondary'}>
                              {table.status === 'playing' ? 'Игра' : 
                               table.status === 'waiting' ? 'Ожидание' : table.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{table.small_blind}/{table.big_blind} блайнды</span>
                            <span>{table.min_buy_in}-{table.max_buy_in} buy-in</span>
                            <span>{table.players_count}/{table.max_players} игроков</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {table.status === 'waiting' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateTableStatus(table.id, 'playing')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateTableStatus(table.id, 'waiting')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTable(table.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {table.auto_start_enabled && <Badge variant="outline">Авто-старт</Badge>}
                        {table.straddle_enabled && <Badge variant="outline">Страддл</Badge>}
                        {table.run_it_twice_enabled && <Badge variant="outline">Run It Twice</Badge>}
                        {table.bomb_pot_enabled && <Badge variant="outline">Bomb Pot</Badge>}
                        {table.chat_enabled && <Badge variant="outline">Чат</Badge>}
                        {Number(table.rake_percent) > 0 && <Badge variant="outline">Рейк {table.rake_percent}%</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tables.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Нет созданных столов
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История рук
              </CardTitle>
              <CardDescription>
                Последние 50 раздач на всех столах
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Стол</TableHead>
                      <TableHead>Фаза</TableHead>
                      <TableHead className="text-right">Банк</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {handHistory.map((hand) => (
                      <TableRow key={hand.id}>
                        <TableCell className="font-mono">{hand.hand_number}</TableCell>
                        <TableCell>{hand.table_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{hand.phase}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{hand.pot}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(hand.created_at)}
                        </TableCell>
                        <TableCell>
                          {hand.completed_at ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Завершена
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              В процессе
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bans Tab */}
        <TabsContent value="bans" className="space-y-4">
          <PlayerBanList />
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <StatsExport />
          <CreditTransactions />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <CreatePlayerWithBalance />
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Быстрые действия
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleCleanupStuckHands}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Очистить застрявшие руки ({stats.stuckHands})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowMassCreditsDialog(true)}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Массовое начисление кредитов
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowCreateTableDialog(true)}
                >
                  <Table2 className="h-4 w-4 mr-2" />
                  Создать новый стол
                </Button>
              </CardContent>
            </Card>

            {/* Engine Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Статус движка
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span>Poker Engine</span>
                  <Badge variant="default" className="bg-green-500">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span>Realtime Sync</span>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <span>Активных игр</span>
                  <span className="font-bold">{stats.activeTables}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roadmap функций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Мониторинг в реальном времени
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Управление кредитами
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Массовое начисление
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Кик игроков со столов
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    История рук
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Очистка застрявших рук
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <div className="font-medium flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Реплеер рук
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <div className="font-medium flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Бан-лист игроков
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <div className="font-medium flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Экспорт статистики
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Credits Dialog */}
      <Dialog open={showAddCreditsDialog} onOpenChange={setShowAddCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить кредиты</DialogTitle>
            <DialogDescription>
              Игрок: {selectedPlayer?.player_name} (баланс: {selectedPlayer?.balance.toLocaleString()})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Сумма кредитов</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1000, 5000, 10000, 50000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditAmount(amount.toString())}
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCreditsDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddCredits}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Credits Dialog */}
      <Dialog open={showMassCreditsDialog} onOpenChange={setShowMassCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Массовое начисление кредитов</DialogTitle>
            <DialogDescription>
              Начислить кредиты всем {players.length} игрокам
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Сумма на каждого игрока</Label>
              <Input
                type="number"
                value={massCreditsAmount}
                onChange={(e) => setMassCreditsAmount(e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Общая сумма: <span className="font-bold text-foreground">{(parseInt(massCreditsAmount) * players.length).toLocaleString()}</span> кредитов
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMassCreditsDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleMassCredits}>
              <Coins className="h-4 w-4 mr-2" />
              Начислить всем
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Table Dialog */}
      <Dialog open={showCreateTableDialog} onOpenChange={setShowCreateTableDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создать новый стол</DialogTitle>
            <DialogDescription>
              Настройте параметры покерного стола
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Название стола</Label>
              <Input
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                placeholder="Стол NL200"
              />
            </div>
            <div>
              <Label>Макс. игроков</Label>
              <Select
                value={newTable.max_players.toString()}
                onValueChange={(v) => setNewTable({ ...newTable, max_players: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 (Heads-Up)</SelectItem>
                  <SelectItem value="6">6 (Short-Handed)</SelectItem>
                  <SelectItem value="9">9 (Full Ring)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Small Blind</Label>
              <Input
                type="number"
                value={newTable.small_blind}
                onChange={(e) => setNewTable({ ...newTable, small_blind: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Big Blind</Label>
              <Input
                type="number"
                value={newTable.big_blind}
                onChange={(e) => setNewTable({ ...newTable, big_blind: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Min Buy-In</Label>
              <Input
                type="number"
                value={newTable.min_buy_in}
                onChange={(e) => setNewTable({ ...newTable, min_buy_in: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Max Buy-In</Label>
              <Input
                type="number"
                value={newTable.max_buy_in}
                onChange={(e) => setNewTable({ ...newTable, max_buy_in: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Время на ход (сек)</Label>
              <Input
                type="number"
                value={newTable.action_time_seconds}
                onChange={(e) => setNewTable({ ...newTable, action_time_seconds: parseInt(e.target.value) || 15 })}
              />
            </div>
            <div>
              <Label>Time Bank (сек)</Label>
              <Input
                type="number"
                value={newTable.time_bank_seconds}
                onChange={(e) => setNewTable({ ...newTable, time_bank_seconds: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 pt-4">
            <div className="flex items-center justify-between">
              <Label>Авто-старт</Label>
              <Switch
                checked={newTable.auto_start_enabled}
                onCheckedChange={(v) => setNewTable({ ...newTable, auto_start_enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Страддл</Label>
              <Switch
                checked={newTable.straddle_enabled}
                onCheckedChange={(v) => setNewTable({ ...newTable, straddle_enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Чат</Label>
              <Switch
                checked={newTable.chat_enabled}
                onCheckedChange={(v) => setNewTable({ ...newTable, chat_enabled: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTableDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateTable}>
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Player Confirmation */}
      <AlertDialog open={showKickPlayerDialog} onOpenChange={setShowKickPlayerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить игрока со стола?</AlertDialogTitle>
            <AlertDialogDescription>
              Игрок <strong>{playerToKick?.player_name}</strong> будет удален со стола <strong>{playerToKick?.table_name}</strong>. 
              Его фишки ({playerToKick?.stack.toLocaleString()}) будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleKickPlayer} className="bg-red-500 hover:bg-red-600">
              <UserX className="h-4 w-4 mr-2" />
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
