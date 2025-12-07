import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Play,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface PokerTable {
  id: string;
  name: string;
  table_type: string;
  game_type: string;
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  status: string;
  player_count?: number;
}

interface PokerTableLobbyProps {
  playerId: string | null;
  onJoinTable: (tableId: string, buyIn: number) => void;
}

export function PokerTableLobby({ playerId, onJoinTable }: PokerTableLobbyProps) {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<PokerTable | null>(null);
  const [buyInAmount, setBuyInAmount] = useState(1000);
  const [creating, setCreating] = useState(false);
  
  // New table form
  const [newTableName, setNewTableName] = useState('');
  const [newTableSmallBlind, setNewTableSmallBlind] = useState(10);
  const [newTableBigBlind, setNewTableBigBlind] = useState(20);
  const [newTableMinBuyIn, setNewTableMinBuyIn] = useState(400);
  const [newTableMaxBuyIn, setNewTableMaxBuyIn] = useState(2000);

  const fetchTables = async () => {
    setLoading(true);
    try {
      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('poker_tables')
        .select('*')
        .order('created_at', { ascending: false });

      if (tablesError) throw tablesError;

      // Fetch player counts for each table
      const tablesWithCounts = await Promise.all(
        (tablesData || []).map(async (table) => {
          const { count } = await supabase
            .from('poker_table_players')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', table.id)
            .eq('status', 'active');
          
          return { ...table, player_count: count || 0 };
        })
      );

      setTables(tablesWithCounts);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Ошибка загрузки столов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('poker_tables_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'poker_tables' },
        () => fetchTables()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'poker_table_players' },
        () => fetchTables()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.error('Введите название стола');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('poker_tables')
        .insert({
          name: newTableName.trim(),
          small_blind: newTableSmallBlind,
          big_blind: newTableBigBlind,
          min_buy_in: newTableMinBuyIn,
          max_buy_in: newTableMaxBuyIn,
          created_by: playerId
        });

      if (error) throw error;

      toast.success('Стол создан!');
      setCreateOpen(false);
      setNewTableName('');
      fetchTables();
    } catch (error: any) {
      console.error('Error creating table:', error);
      toast.error(error.message || 'Ошибка создания стола');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClick = (table: PokerTable) => {
    setSelectedTable(table);
    setBuyInAmount(table.min_buy_in);
    setJoinOpen(true);
  };

  const handleConfirmJoin = () => {
    if (!selectedTable) return;
    
    if (buyInAmount < selectedTable.min_buy_in || buyInAmount > selectedTable.max_buy_in) {
      toast.error(`Buy-in должен быть от ${selectedTable.min_buy_in} до ${selectedTable.max_buy_in}`);
      return;
    }

    onJoinTable(selectedTable.id, buyInAmount);
    setJoinOpen(false);
  };

  const getStatusBadge = (status: string, playerCount: number, maxPlayers: number) => {
    if (playerCount >= maxPlayers) {
      return <Badge variant="destructive">Полный</Badge>;
    }
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary">Ожидание</Badge>;
      case 'playing':
        return <Badge className="bg-green-500">В игре</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Покерные столы</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTables} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          
          {playerId && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать стол
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый стол</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Название стола</Label>
                    <Input
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      placeholder="Мой покерный стол"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Small Blind</Label>
                      <Input
                        type="number"
                        value={newTableSmallBlind}
                        onChange={(e) => setNewTableSmallBlind(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Big Blind</Label>
                      <Input
                        type="number"
                        value={newTableBigBlind}
                        onChange={(e) => setNewTableBigBlind(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Buy-in</Label>
                      <Input
                        type="number"
                        value={newTableMinBuyIn}
                        onChange={(e) => setNewTableMinBuyIn(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Buy-in</Label>
                      <Input
                        type="number"
                        value={newTableMaxBuyIn}
                        onChange={(e) => setNewTableMaxBuyIn(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleCreateTable} 
                    className="w-full"
                    disabled={creating}
                  >
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Нет доступных столов</p>
            <p className="text-sm text-muted-foreground mt-2">
              Создайте первый стол, чтобы начать играть
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{table.name}</CardTitle>
                  {getStatusBadge(table.status, table.player_count || 0, table.max_players)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Игроки
                    </span>
                    <span className="font-medium">
                      {table.player_count || 0} / {table.max_players}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Блайнды</span>
                    <span className="font-medium">
                      {table.small_blind} / {table.big_blind}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Buy-in
                    </span>
                    <span className="font-medium">
                      {table.min_buy_in} - {table.max_buy_in}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full mt-2"
                    onClick={() => handleJoinClick(table)}
                    disabled={!playerId || (table.player_count || 0) >= table.max_players}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Присоединиться
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Присоединиться к столу</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold">{selectedTable.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Блайнды: {selectedTable.small_blind} / {selectedTable.big_blind}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Сумма Buy-in</Label>
                <Input
                  type="number"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(Number(e.target.value))}
                  min={selectedTable.min_buy_in}
                  max={selectedTable.max_buy_in}
                />
                <p className="text-xs text-muted-foreground">
                  От {selectedTable.min_buy_in} до {selectedTable.max_buy_in}
                </p>
              </div>
              
              <Button onClick={handleConfirmJoin} className="w-full">
                Подтвердить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
