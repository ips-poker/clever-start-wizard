import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Gem, Plus, Minus, Search, Users, TrendingUp, TrendingDown, 
  History, Gift, Trophy, ShoppingCart, RefreshCw, Loader2,
  Download, ArrowUpDown, Wallet, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PlayerWithWallet {
  id: string;
  name: string;
  avatar_url: string | null;
  telegram: string | null;
  wallet_balance: number;
  wallet_total_purchased: number;
  wallet_total_spent: number;
  wallet_total_won: number;
}

interface Transaction {
  id: string;
  player_id: string;
  player_name?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  payment_amount: number | null;
  created_at: string;
}

interface Stats {
  total_diamonds: number;
  total_purchased: number;
  total_spent: number;
  total_won: number;
  players_with_balance: number;
  transactions_today: number;
}

const getTransactionLabel = (type: string) => {
  switch (type) {
    case 'purchase': return 'Покупка';
    case 'admin_add': return 'Начисление';
    case 'admin_remove': return 'Списание';
    case 'tournament_entry': return 'Турнир';
    case 'tournament_prize': return 'Приз';
    case 'refund': return 'Возврат';
    case 'bonus': return 'Бонус';
    default: return type;
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'purchase': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'admin_add': case 'bonus': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'admin_remove': case 'tournament_entry': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'tournament_prize': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'refund': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const DiamondManagement: React.FC = () => {
  const [players, setPlayers] = useState<PlayerWithWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingPlayerId, setProcessingPlayerId] = useState<string | null>(null);
  
  // Transaction form state
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'admin_add' | 'admin_remove' | 'bonus'>('admin_add');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [massAmount, setMassAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load players with wallets
      const { data: playersData } = await supabase
        .from('players')
        .select('id, name, avatar_url, telegram')
        .order('name');

      const { data: walletsData } = await supabase
        .from('diamond_wallets')
        .select('*');

      const walletsMap = new Map(walletsData?.map(w => [w.player_id, w]) || []);

      const playersWithWallets: PlayerWithWallet[] = (playersData || []).map(p => ({
        ...p,
        wallet_balance: walletsMap.get(p.id)?.balance || 0,
        wallet_total_purchased: walletsMap.get(p.id)?.total_purchased || 0,
        wallet_total_spent: walletsMap.get(p.id)?.total_spent || 0,
        wallet_total_won: walletsMap.get(p.id)?.total_won || 0,
      }));

      setPlayers(playersWithWallets);

      // Load recent transactions
      const { data: txData } = await supabase
        .from('diamond_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        const txWithNames = txData.map(tx => ({
          ...tx,
          player_name: playersData?.find(p => p.id === tx.player_id)?.name || 'Unknown'
        }));
        setTransactions(txWithNames);
      }

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalDiamonds = playersWithWallets.reduce((sum, p) => sum + p.wallet_balance, 0);
      const totalPurchased = playersWithWallets.reduce((sum, p) => sum + p.wallet_total_purchased, 0);
      const totalSpent = playersWithWallets.reduce((sum, p) => sum + p.wallet_total_spent, 0);
      const totalWon = playersWithWallets.reduce((sum, p) => sum + p.wallet_total_won, 0);
      const playersWithBalance = playersWithWallets.filter(p => p.wallet_balance > 0).length;
      const transactionsToday = txData?.filter(tx => new Date(tx.created_at) >= today).length || 0;

      setStats({
        total_diamonds: totalDiamonds,
        total_purchased: totalPurchased,
        total_spent: totalSpent,
        total_won: totalWon,
        players_with_balance: playersWithBalance,
        transactions_today: transactionsToday
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (playerId: string, amount: number, type: string, description?: string) => {
    setProcessingPlayerId(playerId);
    try {
      const { data, error } = await supabase.rpc('admin_diamond_transaction', {
        p_player_id: playerId,
        p_amount: amount,
        p_type: type,
        p_description: description || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast.success(`Операция выполнена успешно!`);
        loadData();
      } else {
        toast.error(result.error || 'Ошибка операции');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка операции');
    } finally {
      setProcessingPlayerId(null);
    }
  };

  const handleFormTransaction = async () => {
    if (!selectedPlayerId || !transactionAmount) {
      toast.error('Выберите игрока и укажите сумму');
      return;
    }

    const amount = parseInt(transactionAmount);
    const finalAmount = transactionType === 'admin_remove' ? -Math.abs(amount) : Math.abs(amount);

    await handleTransaction(selectedPlayerId, finalAmount, transactionType, transactionDescription);
    
    setSelectedPlayerId('');
    setTransactionAmount('');
    setTransactionDescription('');
  };

  const handleMassBonus = async () => {
    if (!massAmount) {
      toast.error('Укажите сумму');
      return;
    }

    const amount = parseInt(massAmount);
    if (amount <= 0) {
      toast.error('Сумма должна быть положительной');
      return;
    }

    const confirmed = confirm(`Начислить ${amount} алмазов всем ${players.length} игрокам?`);
    if (!confirmed) return;

    setLoading(true);
    let success = 0;
    let failed = 0;

    for (const player of players) {
      try {
        const { data, error } = await supabase.rpc('admin_diamond_transaction', {
          p_player_id: player.id,
          p_amount: amount,
          p_type: 'bonus',
          p_description: 'Массовый бонус'
        });

        if (error || !(data as any)?.success) {
          failed++;
        } else {
          success++;
        }
      } catch {
        failed++;
      }
    }

    toast.success(`Начислено: ${success}, ошибок: ${failed}`);
    setMassAmount('');
    loadData();
  };

  const exportTransactions = () => {
    const csv = [
      ['Дата', 'Игрок', 'Тип', 'Сумма', 'До', 'После', 'Описание'].join(','),
      ...transactions.map(tx => [
        format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm'),
        tx.player_name,
        getTransactionLabel(tx.transaction_type),
        tx.amount,
        tx.balance_before,
        tx.balance_after,
        tx.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diamond_transactions_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.telegram?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Управление алмазами</h2>
            <p className="text-sm text-muted-foreground">Курс: 100 ₽ = 500 💎</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Всего алмазов</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400">{stats.total_diamonds.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Куплено</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.total_purchased.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Потрачено</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stats.total_spent.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Выиграно</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.total_won.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">С балансом</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.players_with_balance}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">За сегодня</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats.transactions_today}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="players">
            <Users className="h-4 w-4 mr-2" />
            Игроки
          </TabsTrigger>
          <TabsTrigger value="operations">
            <Sparkles className="h-4 w-4 mr-2" />
            Операции
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-4">
          <Card>
            <CardHeader>
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
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Игрок</TableHead>
                      <TableHead className="text-right">Баланс</TableHead>
                      <TableHead className="text-right">Куплено</TableHead>
                      <TableHead className="text-right">Потрачено</TableHead>
                      <TableHead className="text-right">Выиграно</TableHead>
                      <TableHead className="text-center">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {player.avatar_url ? (
                              <img src={player.avatar_url} className="h-8 w-8 rounded-full" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                {player.name[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{player.name}</p>
                              {player.telegram && (
                                <p className="text-xs text-muted-foreground">@{player.telegram}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-cyan-400">
                            {player.wallet_balance.toLocaleString()} 💎
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-green-500">
                          {player.wallet_total_purchased.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {player.wallet_total_spent.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-yellow-500">
                          {player.wallet_total_won.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-green-500 border-green-500/30 hover:bg-green-500/10"
                              disabled={processingPlayerId === player.id}
                              onClick={() => {
                                const amount = prompt('Сколько алмазов начислить?');
                                if (amount && parseInt(amount) > 0) {
                                  handleTransaction(player.id, parseInt(amount), 'admin_add', 'Начисление администратором');
                                }
                              }}
                            >
                              {processingPlayerId === player.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-500 border-red-500/30 hover:bg-red-500/10"
                              disabled={processingPlayerId === player.id || player.wallet_balance === 0}
                              onClick={() => {
                                const amount = prompt(`Сколько алмазов списать? (максимум: ${player.wallet_balance})`);
                                if (amount && parseInt(amount) > 0) {
                                  handleTransaction(player.id, -parseInt(amount), 'admin_remove', 'Списание администратором');
                                }
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-cyan-500" />
                  Операция с игроком
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Игрок</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите игрока" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.wallet_balance} 💎)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Тип операции</Label>
                  <Select value={transactionType} onValueChange={(v) => setTransactionType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_add">Начислить</SelectItem>
                      <SelectItem value="admin_remove">Списать</SelectItem>
                      <SelectItem value="bonus">Бонус</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Количество алмазов</Label>
                  <Input
                    type="number"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    placeholder="0"
                    min={1}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Причина (опционально)</Label>
                  <Textarea
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                    placeholder="Описание операции..."
                  />
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  onClick={handleFormTransaction}
                  disabled={!selectedPlayerId || !transactionAmount}
                >
                  <Gem className="h-4 w-4 mr-2" />
                  Выполнить
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  Массовые операции
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-sm text-muted-foreground mb-2">
                    Начислить бонус всем игрокам ({players.length} чел.)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={massAmount}
                      onChange={(e) => setMassAmount(e.target.value)}
                      placeholder="Количество алмазов"
                      min={1}
                    />
                    <Button 
                      variant="outline" 
                      className="border-purple-500/30 hover:bg-purple-500/10"
                      onClick={handleMassBonus}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Начислить
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Курс обмена</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">100 ₽</span>
                      <span className="font-medium">500 💎</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">500 ₽</span>
                      <span className="font-medium">2,500 💎</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">1,000 ₽</span>
                      <span className="font-medium">5,000 💎</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">5,000 ₽</span>
                      <span className="font-medium">25,000 💎</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Турниры</h4>
                  <p className="text-sm text-muted-foreground">
                    Минимальный взнос: <span className="text-cyan-400 font-medium">100 💎</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>История транзакций</CardTitle>
                <Button variant="outline" size="sm" onClick={exportTransactions}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Игрок</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead className="text-right">Баланс</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), 'd MMM HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell className="font-medium">{tx.player_name}</TableCell>
                        <TableCell>
                          <Badge className={getTransactionColor(tx.transaction_type)}>
                            {getTransactionLabel(tx.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {tx.balance_after.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {tx.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiamondManagement;
