import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Edit,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Clock,
  Gamepad2,
  Shield,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
}

export function OnlinePokerManagement() {
  const [activeTab, setActiveTab] = useState('credits');
  const [players, setPlayers] = useState<PlayerBalance[]>([]);
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBalance | null>(null);
  const [creditAmount, setCreditAmount] = useState('1000');
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<PokerTable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPlayers(), loadTables()]);
    setLoading(false);
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

    // Get player counts for each table
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

  const totalCredits = players.reduce((sum, p) => sum + p.balance, 0);
  const totalWon = players.reduce((sum, p) => sum + p.total_won, 0);
  const totalLost = players.reduce((sum, p) => sum + p.total_lost, 0);
  const activeTables = tables.filter(t => t.status === 'playing').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление онлайн-покером</h2>
          <p className="text-muted-foreground">Кредиты игроков, столы и настройки движка</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего кредитов</p>
                <p className="text-xl font-bold">{totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Table2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активных столов</p>
                <p className="text-xl font-bold">{activeTables} / {tables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Выиграно всего</p>
                <p className="text-xl font-bold">{totalWon.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Users className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Игроков</p>
                <p className="text-xl font-bold">{players.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credits" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Кредиты</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-2">
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Столы</span>
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-2">
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Движок</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Инструменты</span>
          </TabsTrigger>
        </TabsList>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Управление кредитами игроков
              </CardTitle>
              <CardDescription>
                Добавляйте и снимайте кредиты с балансов игроков
              </CardDescription>
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
                        {table.rake_percent > 0 && <Badge variant="outline">Рейк {table.rake_percent}%</Badge>}
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

        {/* Engine Tab */}
        <TabsContent value="engine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Покерный движок - Функционал
              </CardTitle>
              <CardDescription>
                Текущие возможности и статус движка
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-500 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Реализовано ✓
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Texas Hold'em (No Limit)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Криптографическая тасовка карт
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Расчет побочных банков (Side Pots)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Автоматический расчет победителей
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Таймауты и авто-фолд
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Real-time синхронизация
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Авто-старт раздачи
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">✓</Badge>
                      Чат и эмодзи реакции
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-yellow-500 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Требует доработки
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Транзакции в БД (атомарность)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Корректный минимальный рейз
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Опция BB (чек на большом блайнде)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Run It Twice/Three
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Страддл / Mississippi Straddle
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Bomb Pot механика
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      Персистентный Time Bank
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline">○</Badge>
                      История рук с реплеером
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Инструменты администратора
              </CardTitle>
              <CardDescription>
                Поэтапный план инструментов для полного управления
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stage 1 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge>Этап 1</Badge>
                  Базовое управление (Реализовано)
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg bg-green-500/10">
                    <div className="font-medium">✓ Управление кредитами</div>
                    <div className="text-sm text-muted-foreground">Добавление/снятие баланса игроков</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-green-500/10">
                    <div className="font-medium">✓ Создание столов</div>
                    <div className="text-sm text-muted-foreground">Настройка блайндов, buy-in, лимитов</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-green-500/10">
                    <div className="font-medium">✓ Статистика игроков</div>
                    <div className="text-sm text-muted-foreground">Просмотр выигрышей и проигрышей</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-green-500/10">
                    <div className="font-medium">✓ Управление статусом столов</div>
                    <div className="text-sm text-muted-foreground">Старт/пауза/удаление столов</div>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Этап 2</Badge>
                  Расширенное управление (Запланировано)
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Массовое начисление кредитов</div>
                    <div className="text-sm text-muted-foreground">Начисление всем игрокам сразу</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ История транзакций</div>
                    <div className="text-sm text-muted-foreground">Лог всех операций с балансами</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Бан/кик игроков</div>
                    <div className="text-sm text-muted-foreground">Блокировка нарушителей</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Шаблоны столов</div>
                    <div className="text-sm text-muted-foreground">Быстрое создание из шаблонов</div>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">Этап 3</Badge>
                  Продвинутые инструменты
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Мониторинг игр в реальном времени</div>
                    <div className="text-sm text-muted-foreground">Наблюдение за активными столами</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Анти-коллюзия система</div>
                    <div className="text-sm text-muted-foreground">Детекция сговора игроков</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Реплеер рук</div>
                    <div className="text-sm text-muted-foreground">Просмотр истории раздач</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Экспорт статистики</div>
                    <div className="text-sm text-muted-foreground">CSV/PDF отчеты</div>
                  </div>
                </div>
              </div>

              {/* Stage 4 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">Этап 4</Badge>
                  Турнирный покер онлайн
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Создание MTT турниров</div>
                    <div className="text-sm text-muted-foreground">Multi-table tournaments</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Sit & Go турниры</div>
                    <div className="text-sm text-muted-foreground">Быстрые турниры на 1 стол</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Структура блайндов онлайн</div>
                    <div className="text-sm text-muted-foreground">Авто-повышение уровней</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">○ Призовые выплаты</div>
                    <div className="text-sm text-muted-foreground">Автоматическое распределение</div>
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
              Игрок: {selectedPlayer?.player_name} (текущий баланс: {selectedPlayer?.balance.toLocaleString()})
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
            <div className="flex gap-2">
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
    </div>
  );
}
