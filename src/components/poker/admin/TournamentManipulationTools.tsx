// ============================================
// TOURNAMENT MANIPULATION TOOLS
// ============================================
// Инструменты для ручного управления турнирами:
// - Перемещение игроков между столами
// - Балансировка столов
// - Ручное выбывание игроков
// - Управление стеками
// - Пауза/возобновление турнира

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users,
  ArrowLeftRight,
  UserMinus,
  Coins,
  Pause,
  Play,
  RefreshCw,
  AlertTriangle,
  Crown,
  ArrowRight,
  Settings2,
  BarChart3,
  Table2,
  Clock,
  Zap
} from 'lucide-react';

interface TournamentPlayer {
  id: string;
  player_id: string;
  player_name: string;
  chips: number;
  table_id: string | null;
  table_name?: string;
  seat_number: number | null;
  status: string;
  rebuys_count: number;
  addons_count: number;
}

interface TournamentTable {
  id: string;
  name: string;
  players_count: number;
  max_players: number;
  status: string;
  current_hand_id: string | null;
}

interface TournamentInfo {
  id: string;
  name: string;
  status: string;
  current_level: number;
  level_end_at: string | null;
  prize_pool: number;
  players_remaining: number;
  players_total: number;
}

interface TournamentManipulationToolsProps {
  tournamentId?: string;
  onRefresh?: () => void;
}

export function TournamentManipulationTools({ 
  tournamentId: propTournamentId,
  onRefresh 
}: TournamentManipulationToolsProps) {
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(propTournamentId || '');
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [tables, setTables] = useState<TournamentTable[]>([]);
  
  // Move player dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);
  const [targetTable, setTargetTable] = useState<string>('');
  const [targetSeat, setTargetSeat] = useState<string>('');
  
  // Eliminate player dialog
  const [eliminateDialogOpen, setEliminateDialogOpen] = useState(false);
  const [playerToEliminate, setPlayerToEliminate] = useState<TournamentPlayer | null>(null);
  
  // Chip adjustment dialog
  const [chipDialogOpen, setChipDialogOpen] = useState(false);
  const [chipPlayer, setChipPlayer] = useState<TournamentPlayer | null>(null);
  const [chipAmount, setChipAmount] = useState('0');
  const [chipOperation, setChipOperation] = useState<'add' | 'remove' | 'set'>('add');
  
  // Use prop or selected tournament
  const tournamentId = propTournamentId || selectedTournamentId;
  
  // Fetch available tournaments
  const fetchTournaments = useCallback(async () => {
    const { data } = await supabase
      .from('online_poker_tournaments')
      .select('id, name, status, current_level, level_end_at, prize_pool')
      .in('status', ['registering', 'running', 'paused'])
      .order('created_at', { ascending: false });
    
    if (data) {
      const enriched = data.map(t => ({
        ...t,
        players_remaining: 0,
        players_total: 0
      }));
      setTournaments(enriched);
      
      // Auto-select first tournament if none selected
      if (!tournamentId && enriched.length > 0) {
        setSelectedTournamentId(enriched[0].id);
      }
    }
  }, [tournamentId]);
  
  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);
  
  const fetchData = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      setLoading(true);
      
      // Fetch tournament info
      const { data: tournamentData } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentData) {
        // Get player counts
        const { count: playersRemaining } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('status', 'playing');
        
        const { count: playersTotal } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId);
        
        setTournament({
          id: tournamentData.id,
          name: tournamentData.name,
          status: tournamentData.status,
          current_level: tournamentData.current_level || 1,
          level_end_at: tournamentData.level_end_at,
          prize_pool: tournamentData.prize_pool || 0,
          players_remaining: playersRemaining || 0,
          players_total: playersTotal || 0
        });
      }
      
      // Fetch participants with player names
      const { data: participantsData } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          id,
          player_id,
          chips,
          table_id,
          seat_number,
          status,
          rebuys_count,
          addons_count,
          players (name)
        `)
        .eq('tournament_id', tournamentId)
        .order('chips', { ascending: false });
      
      if (participantsData) {
        const enrichedPlayers: TournamentPlayer[] = participantsData.map(p => ({
          id: p.id,
          player_id: p.player_id,
          player_name: (p.players as any)?.name || 'Unknown',
          chips: p.chips || 0,
          table_id: p.table_id,
          seat_number: p.seat_number,
          status: p.status,
          rebuys_count: p.rebuys_count || 0,
          addons_count: p.addons_count || 0
        }));
        setPlayers(enrichedPlayers);
      }
      
      // Fetch tables
      const { data: tablesData } = await supabase
        .from('poker_tables')
        .select(`
          id,
          name,
          max_players,
          status,
          current_hand_id
        `)
        .eq('tournament_id', tournamentId);
      
      if (tablesData) {
        // Get player counts per table
        const tableIds = tablesData.map(t => t.id);
        const { data: playerCounts } = await supabase
          .from('poker_table_players')
          .select('table_id')
          .in('table_id', tableIds);
        
        const countMap = new Map<string, number>();
        playerCounts?.forEach(p => {
          countMap.set(p.table_id, (countMap.get(p.table_id) || 0) + 1);
        });
        
        const enrichedTables: TournamentTable[] = tablesData.map(t => ({
          id: t.id,
          name: t.name,
          players_count: countMap.get(t.id) || 0,
          max_players: t.max_players,
          status: t.status,
          current_hand_id: t.current_hand_id
        }));
        setTables(enrichedTables);
      }
      
    } catch (err) {
      console.error('Error fetching tournament data:', err);
      toast.error('Ошибка загрузки данных турнира');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Move player to different table
  const handleMovePlayer = async () => {
    if (!selectedPlayer || !targetTable) return;
    
    try {
      // First remove from current table
      if (selectedPlayer.table_id) {
        await supabase
          .from('poker_table_players')
          .delete()
          .eq('player_id', selectedPlayer.player_id)
          .eq('table_id', selectedPlayer.table_id);
      }
      
      // Add to new table
      const seatNum = targetSeat ? parseInt(targetSeat) : 1;
      await supabase
        .from('poker_table_players')
        .insert({
          player_id: selectedPlayer.player_id,
          table_id: targetTable,
          seat_number: seatNum,
          stack: selectedPlayer.chips,
          status: 'active'
        });
      
      // Update participant record
      await supabase
        .from('online_poker_tournament_participants')
        .update({
          table_id: targetTable,
          seat_number: seatNum
        })
        .eq('id', selectedPlayer.id);
      
      toast.success(`${selectedPlayer.player_name} перемещён на стол`);
      setMoveDialogOpen(false);
      setSelectedPlayer(null);
      setTargetTable('');
      setTargetSeat('');
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error moving player:', err);
      toast.error('Ошибка перемещения игрока');
    }
  };
  
  // Eliminate player
  const handleEliminatePlayer = async () => {
    if (!playerToEliminate) return;
    
    try {
      // Remove from table
      if (playerToEliminate.table_id) {
        await supabase
          .from('poker_table_players')
          .delete()
          .eq('player_id', playerToEliminate.player_id)
          .eq('table_id', playerToEliminate.table_id);
      }
      
      // Calculate finish position
      const playingPlayers = players.filter(p => p.status === 'playing' && p.id !== playerToEliminate.id);
      const finishPosition = playingPlayers.length + 1;
      
      // Update participant status
      await supabase
        .from('online_poker_tournament_participants')
        .update({
          status: 'eliminated',
          chips: 0,
          table_id: null,
          seat_number: null,
          eliminated_at: new Date().toISOString(),
          finish_position: finishPosition
        })
        .eq('id', playerToEliminate.id);
      
      toast.success(`${playerToEliminate.player_name} выбыл на ${finishPosition} месте`);
      setEliminateDialogOpen(false);
      setPlayerToEliminate(null);
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error eliminating player:', err);
      toast.error('Ошибка выбывания игрока');
    }
  };
  
  // Adjust chips
  const handleChipAdjustment = async () => {
    if (!chipPlayer) return;
    
    try {
      const amount = parseInt(chipAmount) || 0;
      let newChips = chipPlayer.chips;
      
      switch (chipOperation) {
        case 'add':
          newChips += amount;
          break;
        case 'remove':
          newChips = Math.max(0, newChips - amount);
          break;
        case 'set':
          newChips = Math.max(0, amount);
          break;
      }
      
      // Update participant
      await supabase
        .from('online_poker_tournament_participants')
        .update({ chips: newChips })
        .eq('id', chipPlayer.id);
      
      // Update table player if seated
      if (chipPlayer.table_id) {
        await supabase
          .from('poker_table_players')
          .update({ stack: newChips })
          .eq('player_id', chipPlayer.player_id)
          .eq('table_id', chipPlayer.table_id);
      }
      
      toast.success(`Стек ${chipPlayer.player_name} обновлён: ${newChips} фишек`);
      setChipDialogOpen(false);
      setChipPlayer(null);
      setChipAmount('0');
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error adjusting chips:', err);
      toast.error('Ошибка изменения стека');
    }
  };
  
  // Balance tables
  const handleBalanceTables = async () => {
    try {
      const { data, error } = await supabase.rpc('balance_tournament_tables', {
        p_tournament_id: tournamentId
      });
      
      if (error) throw error;
      
      toast.success('Столы сбалансированы');
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error balancing tables:', err);
      toast.error('Ошибка балансировки столов');
    }
  };
  
  // Consolidate tables
  const handleConsolidateTables = async () => {
    try {
      const { data, error } = await supabase.rpc('consolidate_tournament_tables', {
        p_tournament_id: tournamentId
      });
      
      if (error) throw error;
      
      toast.success('Столы объединены');
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error consolidating tables:', err);
      toast.error('Ошибка объединения столов');
    }
  };
  
  // Pause/Resume tournament
  const handleTogglePause = async () => {
    if (!tournament) return;
    
    try {
      const newStatus = tournament.status === 'running' ? 'paused' : 'running';
      
      await supabase
        .from('online_poker_tournaments')
        .update({ status: newStatus })
        .eq('id', tournamentId);
      
      toast.success(newStatus === 'paused' ? 'Турнир приостановлен' : 'Турнир возобновлён');
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Error toggling pause:', err);
      toast.error('Ошибка');
    }
  };
  
  const getAvailableSeats = (tableId: string): number[] => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return [];
    
    const occupiedSeats = players
      .filter(p => p.table_id === tableId && p.seat_number !== null)
      .map(p => p.seat_number!);
    
    const allSeats = Array.from({ length: table.max_players }, (_, i) => i + 1);
    return allSeats.filter(s => !occupiedSeats.includes(s));
  };
  
  // Tournament selector UI (when no prop tournamentId)
  if (!propTournamentId && !tournamentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Управление турниром
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Выберите турнир для управления</p>
            {tournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет активных турниров</p>
            ) : (
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="w-64 mx-auto">
                  <SelectValue placeholder="Выберите турнир" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              className="mt-4"
              onClick={fetchTournaments}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить список
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!tournament) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Турнир не найден
      </div>
    );
  }
  
  const playingPlayers = players.filter(p => p.status === 'playing');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated');
  
  return (
    <div className="space-y-4">
      {/* Tournament Selector (if no prop) */}
      {!propTournamentId && tournaments.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-sm">Турнир:</Label>
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Tournament Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{tournament.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Уровень {tournament.current_level}</span>
                <span>Приз: ${tournament.prize_pool}</span>
                <span>Игроков: {tournament.players_remaining}/{tournament.players_total}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
              <Button
                size="sm"
                variant={tournament.status === 'running' ? 'outline' : 'default'}
                onClick={handleTogglePause}
              >
                {tournament.status === 'running' ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Возобновить
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Обновить
        </Button>
        <Button size="sm" variant="outline" onClick={handleBalanceTables}>
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Балансировка столов
        </Button>
        <Button size="sm" variant="outline" onClick={handleConsolidateTables}>
          <Table2 className="h-4 w-4 mr-1" />
          Объединить столы
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tables Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Столы ({tables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {tables.map(table => (
                  <div 
                    key={table.id}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{table.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {table.players_count}/{table.max_players}
                        </Badge>
                        {table.current_hand_id && (
                          <Badge className="bg-green-500/20 text-green-400">
                            <Zap className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {players
                        .filter(p => p.table_id === table.id)
                        .map(p => (
                          <Badge 
                            key={p.id} 
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-primary/20"
                            onClick={() => {
                              setSelectedPlayer(p);
                              setMoveDialogOpen(true);
                            }}
                          >
                            {p.player_name} ({p.chips})
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Players List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Игроки ({playingPlayers.length} активных)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="playing">
              <TabsList className="mb-2">
                <TabsTrigger value="playing" className="text-xs">
                  Играют ({playingPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="eliminated" className="text-xs">
                  Выбыли ({eliminatedPlayers.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="playing">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {playingPlayers.map((player, idx) => (
                      <div 
                        key={player.id}
                        className="p-2 bg-muted/30 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">
                            {idx + 1}.
                          </span>
                          {idx === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                          <span className="text-sm">{player.player_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{player.chips}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setChipPlayer(player);
                                setChipDialogOpen(true);
                              }}
                            >
                              <Coins className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setSelectedPlayer(player);
                                setMoveDialogOpen(true);
                              }}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500"
                              onClick={() => {
                                setPlayerToEliminate(player);
                                setEliminateDialogOpen(true);
                              }}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="eliminated">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {eliminatedPlayers.map(player => (
                      <div 
                        key={player.id}
                        className="p-2 bg-muted/30 rounded flex items-center justify-between opacity-60"
                      >
                        <span className="text-sm">{player.player_name}</span>
                        <span className="text-xs text-muted-foreground">Выбыл</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Move Player Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить игрока</DialogTitle>
            <DialogDescription>
              {selectedPlayer?.player_name} ({selectedPlayer?.chips} фишек)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Целевой стол</Label>
              <Select value={targetTable} onValueChange={setTargetTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите стол" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.players_count}/{table.max_players})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {targetTable && (
              <div className="space-y-2">
                <Label>Место</Label>
                <Select value={targetSeat} onValueChange={setTargetSeat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите место" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSeats(targetTable).map(seat => (
                      <SelectItem key={seat} value={seat.toString()}>
                        Seat {seat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleMovePlayer} disabled={!targetTable || !targetSeat}>
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Eliminate Player Dialog */}
      <AlertDialog open={eliminateDialogOpen} onOpenChange={setEliminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Выбывание игрока
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите выбить {playerToEliminate?.player_name} из турнира?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEliminatePlayer}
              className="bg-red-500 hover:bg-red-600"
            >
              Выбить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Chip Adjustment Dialog */}
      <Dialog open={chipDialogOpen} onOpenChange={setChipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменение стека</DialogTitle>
            <DialogDescription>
              {chipPlayer?.player_name} - текущий стек: {chipPlayer?.chips}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Операция</Label>
              <Select 
                value={chipOperation} 
                onValueChange={(v) => setChipOperation(v as 'add' | 'remove' | 'set')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Добавить</SelectItem>
                  <SelectItem value="remove">Убавить</SelectItem>
                  <SelectItem value="set">Установить</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input
                type="number"
                value={chipAmount}
                onChange={(e) => setChipAmount(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Новый стек: {' '}
                <span className="font-bold">
                  {chipOperation === 'add' 
                    ? (chipPlayer?.chips || 0) + parseInt(chipAmount || '0')
                    : chipOperation === 'remove'
                      ? Math.max(0, (chipPlayer?.chips || 0) - parseInt(chipAmount || '0'))
                      : Math.max(0, parseInt(chipAmount || '0'))
                  }
                </span>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setChipDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleChipAdjustment}>
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TournamentManipulationTools;
