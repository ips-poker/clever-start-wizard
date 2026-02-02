import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, ArrowUpDown, Shuffle, Play, Crown, 
  UserMinus, AlertTriangle, Target, Settings,
  Clock, Trophy, Zap, RotateCcw, UserCheck, X,
  ArrowRight, RefreshCw
} from 'lucide-react';

interface TableSeat {
  seat_number: number;
  player_id?: string;
  player_name?: string;
  chips?: number;
  status?: string;
  avatar_url?: string;
  stack_bb?: number;
}

interface Table {
  table_number: number;
  seats: TableSeat[];
  active_players: number;
  max_seats: number;
  dealer_position: number;
  average_stack?: number;
  table_status: 'active' | 'breaking' | 'balancing' | 'final';
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  seat_number: number | null;
}

interface ClubTableSeatingProps {
  tournamentId: string;
  registrations: Registration[];
  playersPerTable?: number;
  bigBlind?: number;
  onSeatingUpdate?: () => void;
}

export function ClubTableSeating({ 
  tournamentId, 
  registrations, 
  playersPerTable = 9,
  bigBlind = 20,
  onSeatingUpdate 
}: ClubTableSeatingProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [targetTable, setTargetTable] = useState<number>(1);
  const [targetSeat, setTargetSeat] = useState<number>(1);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSeatingStarted, setIsSeatingStarted] = useState(false);
  const [balancingInProgress, setBalancingInProgress] = useState(false);
  const [tableSize, setTableSize] = useState(playersPerTable);
  const { toast } = useToast();

  // Get active players only
  const activePlayers = useMemo(() => 
    registrations.filter(r => r.status === 'playing'), 
    [registrations]
  );

  // Real-time subscription
  useEffect(() => {
    loadSavedSeating();

    const channel = supabase
      .channel(`club-seating-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => loadSavedSeating())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  // Calculate table dissolve info
  const tableDissolveInfo = useMemo(() => {
    if (tables.length <= 1) return {};
    
    const info: Record<number, {
      canDissolve: boolean;
      shouldHighlight: boolean;
      playersToMove: number;
      availableSeats: number;
    }> = {};
    
    const totalActivePlayers = tables.reduce((sum, t) => sum + t.active_players, 0);
    const minTablesNeeded = Math.ceil(totalActivePlayers / tableSize);
    const canReduceTables = tables.filter(t => t.active_players > 0).length > minTablesNeeded;
    
    tables.forEach(table => {
      const availableSeatsOnOtherTables = tables
        .filter(t => t.table_number !== table.table_number)
        .reduce((sum, t) => sum + t.seats.filter(s => !s.player_id).length, 0);
      
      const playersToMove = table.active_players;
      const canDissolve = availableSeatsOnOtherTables >= playersToMove && playersToMove > 0;
      
      const activeTablesWithPlayers = tables.filter(t => t.active_players > 0);
      const minPlayersOnTable = Math.min(...activeTablesWithPlayers.map(t => t.active_players));
      const isSmallestTable = table.active_players === minPlayersOnTable && table.active_players > 0;
      
      info[table.table_number] = {
        canDissolve,
        shouldHighlight: canReduceTables && canDissolve && isSmallestTable,
        playersToMove,
        availableSeats: availableSeatsOnOtherTables
      };
    });
    
    return info;
  }, [tables, tableSize]);

  const loadSavedSeating = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          seat_number,
          chips,
          status,
          player:players(id, name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .not('seat_number', 'is', null)
        .neq('status', 'eliminated');

      if (error) {
        console.error('Error loading seating:', error);
        return;
      }

      if (data && data.length > 0) {
        reconstructTablesFromDatabase(data);
        setIsSeatingStarted(true);
      }
    } catch (error) {
      console.error('Error loading seating:', error);
    }
  };

  const reconstructTablesFromDatabase = (seatingData: any[]) => {
    if (seatingData.length === 0) return;
    
    const savedTableSize = localStorage.getItem(`club_tournament_${tournamentId}_tableSize`);
    const detectedMaxPerTable = savedTableSize ? parseInt(savedTableSize) : tableSize;
    
    if (detectedMaxPerTable !== tableSize) {
      setTableSize(detectedMaxPerTable);
    }
    
    const seatNumbers = seatingData.map(s => s.seat_number);
    const maxSeatNumber = Math.max(...seatNumbers);
    const totalTables = Math.ceil(maxSeatNumber / detectedMaxPerTable);
    
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= detectedMaxPerTable; seatNum++) {
        const seatData = seatingData.find(s => s.seat_number === ((tableNum - 1) * detectedMaxPerTable + seatNum));
        
        seats.push({
          seat_number: seatNum,
          player_id: seatData?.player_id,
          player_name: seatData?.player?.name,
          chips: seatData?.chips,
          status: seatData?.status,
          avatar_url: seatData?.player?.avatar_url,
          stack_bb: seatData?.chips ? Math.round(seatData.chips / bigBlind) : undefined
        });
      }
      
      const activePlayersCount = seats.filter(s => s.player_id && s.status !== 'eliminated').length;
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: activePlayersCount,
        max_seats: detectedMaxPerTable,
        dealer_position: 1,
        table_status: 'active',
        average_stack: activePlayersCount > 0 
          ? Math.round(seats.filter(s => s.chips).reduce((sum, s) => sum + (s.chips || 0), 0) / activePlayersCount) 
          : 0
      });
    }
    
    setTables(newTables);
  };

  // Calculate balanced distribution
  const calculateBalancedDistribution = (totalPlayers: number, maxPerTable: number) => {
    const totalTables = Math.ceil(totalPlayers / maxPerTable);
    const distribution: number[] = [];
    const basePlayersPerTable = Math.floor(totalPlayers / totalTables);
    const tablesWithExtra = totalPlayers % totalTables;
    
    for (let i = 0; i < totalTables; i++) {
      distribution.push(i < tablesWithExtra ? basePlayersPerTable + 1 : basePlayersPerTable);
    }
    
    return distribution;
  };

  // Start initial seating with double randomization
  const startInitialSeating = async () => {
    if (activePlayers.length === 0) {
      toast({ title: "Ошибка", description: "Нет активных игроков для рассадки", variant: "destructive" });
      return;
    }

    // Save table size
    localStorage.setItem(`club_tournament_${tournamentId}_tableSize`, tableSize.toString());
    
    // Update tournament players_per_table
    await supabase
      .from('tournaments')
      .update({ players_per_table: tableSize })
      .eq('id', tournamentId);

    // Clear existing seating
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    // Double randomization: shuffle players AND shuffle seat assignments
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    const distribution = calculateBalancedDistribution(shuffledPlayers.length, tableSize);
    
    const newTables: Table[] = [];
    let playerIndex = 0;
    
    for (let tableNum = 1; tableNum <= distribution.length; tableNum++) {
      const playersAtThisTable = distribution[tableNum - 1];
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= tableSize; seatNum++) {
        seats.push({ seat_number: seatNum });
      }
      
      const table: Table = {
        table_number: tableNum,
        seats,
        active_players: 0,
        max_seats: tableSize,
        dealer_position: Math.floor(Math.random() * tableSize) + 1,
        table_status: 'active',
        average_stack: 0
      };
      
      // Randomize seat positions within table
      const availableSeats = [...Array(tableSize).keys()];
      availableSeats.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < playersAtThisTable && playerIndex < shuffledPlayers.length; i++) {
        const reg = shuffledPlayers[playerIndex];
        const seatIndex = availableSeats[i];
        
        table.seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: reg.player.id,
          player_name: reg.player.name,
          chips: reg.chips,
          status: reg.status,
          avatar_url: reg.player.avatar_url,
          stack_bb: Math.round((reg.chips || 0) / bigBlind)
        };
        table.active_players++;
        playerIndex++;
      }
      
      const activeSeats = table.seats.filter(s => s.player_id);
      if (activeSeats.length > 0) {
        table.average_stack = Math.round(
          activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length
        );
      }
      
      newTables.push(table);
    }
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    setIsSeatingStarted(true);
    
    toast({ 
      title: "Рассадка завершена", 
      description: `${shuffledPlayers.length} игроков за ${newTables.length} столов`
    });
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    for (const table of tablesData) {
      for (const seat of table.seats) {
        if (seat.player_id) {
          const globalSeat = (table.table_number - 1) * tableSize + seat.seat_number;
          
          await supabase
            .from('tournament_registrations')
            .update({ seat_number: globalSeat })
            .eq('tournament_id', tournamentId)
            .eq('player_id', seat.player_id);
        }
      }
    }
    onSeatingUpdate?.();
  };

  // Dissolve table with double randomization
  const dissolveTable = async (tableNumber: number) => {
    const tableToDissolve = tables.find(t => t.table_number === tableNumber);
    if (!tableToDissolve) return;

    const playersToMove = tableToDissolve.seats.filter(s => s.player_id);
    const otherTables = tables.filter(t => t.table_number !== tableNumber);
    
    // Collect all empty seats
    const allEmptySeats: { tableNumber: number; seatNumber: number }[] = [];
    otherTables.forEach(table => {
      table.seats.forEach(seat => {
        if (!seat.player_id) {
          allEmptySeats.push({ 
            tableNumber: table.table_number, 
            seatNumber: seat.seat_number 
          });
        }
      });
    });

    if (allEmptySeats.length < playersToMove.length) {
      toast({ 
        title: "Невозможно расформировать", 
        description: `Нужно ${playersToMove.length} мест, доступно ${allEmptySeats.length}`, 
        variant: "destructive" 
      });
      return;
    }

    // Double randomization
    const shuffledPlayers = [...playersToMove].sort(() => Math.random() - 0.5);
    const shuffledSeats = [...allEmptySeats].sort(() => Math.random() - 0.5);

    // Move players
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const player = shuffledPlayers[i];
      const newSeat = shuffledSeats[i];
      
      const globalSeat = (newSeat.tableNumber - 1) * tableSize + newSeat.seatNumber;
      
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: globalSeat })
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.player_id);
    }

    toast({ 
      title: "Стол расформирован", 
      description: `${shuffledPlayers.length} игроков перемещено`
    });
    
    loadSavedSeating();
  };

  // Professional balance tables using RPC
  const balanceTables = async () => {
    setBalancingInProgress(true);
    
    try {
      const { data, error } = await supabase.rpc('professional_balance_tables', {
        p_tournament_id: tournamentId
      });

      if (error) throw error;

      const result = data as { message?: string } | null;
      toast({ 
        title: "Балансировка завершена", 
        description: result?.message || "Столы уравнены"
      });
      
      loadSavedSeating();
    } catch (error) {
      console.error('Balance error:', error);
      toast({ 
        title: "Ошибка балансировки", 
        variant: "destructive" 
      });
    } finally {
      setBalancingInProgress(false);
    }
  };

  // Move player to specific seat
  const movePlayer = async () => {
    if (!selectedPlayer) return;

    const globalSeat = (targetTable - 1) * tableSize + targetSeat;

    await supabase
      .from('tournament_registrations')
      .update({ seat_number: globalSeat })
      .eq('tournament_id', tournamentId)
      .eq('player_id', selectedPlayer);

    toast({ 
      title: "Игрок перемещён", 
      description: `Стол ${targetTable}, место ${targetSeat}`
    });
    
    setIsMoveDialogOpen(false);
    setSelectedPlayer('');
    loadSavedSeating();
  };

  // Clear all seating
  const clearSeating = async () => {
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    setTables([]);
    setIsSeatingStarted(false);
    toast({ title: "Рассадка очищена" });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Управление рассадкой
          </CardTitle>
          <CardDescription>
            {activePlayers.length} активных игроков • {tables.length} столов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!isSeatingStarted ? (
              <>
                <div className="flex items-center gap-2">
                  <Label>Игроков за столом:</Label>
                  <Select 
                    value={tableSize.toString()} 
                    onValueChange={(v) => setTableSize(parseInt(v))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={startInitialSeating} disabled={activePlayers.length === 0}>
                  <Shuffle className="w-4 h-4 mr-2" />
                  Начать рассадку
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={balanceTables} disabled={balancingInProgress}>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {balancingInProgress ? 'Балансировка...' : 'Уравнять столы'}
                </Button>
                <Button variant="outline" onClick={() => startInitialSeating()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Перерассадка
                </Button>
                <Button variant="destructive" onClick={clearSeating}>
                  <X className="w-4 h-4 mr-2" />
                  Очистить
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tables.map(table => {
          const dissolveInfo = tableDissolveInfo[table.table_number];
          
          return (
            <Card 
              key={table.table_number}
              className={`${dissolveInfo?.shouldHighlight ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    Стол {table.table_number}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {table.active_players}/{table.max_seats}
                    </Badge>
                    {dissolveInfo?.canDissolve && (
                      <Button 
                        size="sm" 
                        variant={dissolveInfo.shouldHighlight ? "default" : "outline"}
                        onClick={() => dissolveTable(table.table_number)}
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Расформировать
                      </Button>
                    )}
                  </div>
                </div>
                {table.average_stack && table.average_stack > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Средний стек: {table.average_stack.toLocaleString()} ({Math.round(table.average_stack / bigBlind)} BB)
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {table.seats.map(seat => (
                    <div 
                      key={seat.seat_number}
                      className={`p-2 rounded-lg text-center text-sm border ${
                        seat.player_id 
                          ? 'bg-primary/10 border-primary/20' 
                          : 'bg-muted/50 border-dashed border-muted-foreground/20'
                      }`}
                    >
                      {seat.player_id ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center">
                            <Avatar className="w-6 h-6">
                              {seat.avatar_url && <AvatarImage src={seat.avatar_url} />}
                              <AvatarFallback className="text-xs">
                                {seat.player_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <p className="font-medium truncate text-xs">{seat.player_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {seat.stack_bb} BB
                          </p>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => {
                              setSelectedPlayer(seat.player_id!);
                              setIsMoveDialogOpen(true);
                            }}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-2">
                          <span className="text-muted-foreground text-xs">Место {seat.seat_number}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {tables.length === 0 && isSeatingStarted && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Нет активных столов. Начните рассадку или добавьте игроков.
          </AlertDescription>
        </Alert>
      )}

      {/* Move Player Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить игрока</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Стол</Label>
              <Select value={targetTable.toString()} onValueChange={v => setTargetTable(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(t => (
                    <SelectItem key={t.table_number} value={t.table_number.toString()}>
                      Стол {t.table_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Место</Label>
              <Select value={targetSeat.toString()} onValueChange={v => setTargetSeat(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: tableSize }, (_, i) => i + 1).map(n => {
                    const table = tables.find(t => t.table_number === targetTable);
                    const seat = table?.seats.find(s => s.seat_number === n);
                    const isOccupied = seat?.player_id && seat.player_id !== selectedPlayer;
                    
                    return (
                      <SelectItem key={n} value={n.toString()} disabled={isOccupied}>
                        Место {n} {isOccupied ? `(${seat?.player_name})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={movePlayer} className="w-full">
              Переместить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
