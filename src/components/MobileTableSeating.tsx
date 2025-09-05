import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Shuffle, 
  Play, 
  UserMinus, 
  RotateCcw, 
  ArrowUpDown,
  Crown,
  Settings
} from 'lucide-react';

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  seat_number?: number;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
}

interface TableSeat {
  seat_number: number;
  player_id?: string;
  player_name?: string;
  chips?: number;
  status?: string;
  stack_bb?: number;
}

interface Table {
  table_number: number;
  seats: TableSeat[];
  active_players: number;
  max_seats: number;
  dealer_position: number;
  table_status: 'active' | 'breaking' | 'balancing' | 'final';
}

interface MobileTableSeatingProps {
  tournamentId: string;
  registrations: Registration[];
  onSeatingUpdate?: () => void;
  maxPlayersPerTable?: number;
  finalTableSize?: number;
  bigBlind?: number;
}

const MobileTableSeating = ({ 
  tournamentId, 
  registrations, 
  onSeatingUpdate,
  maxPlayersPerTable = 9,
  finalTableSize = 9,
  bigBlind = 20
}: MobileTableSeatingProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isSeatingStarted, setIsSeatingStarted] = useState(false);
  const [isFinalTableReady, setIsFinalTableReady] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [targetTable, setTargetTable] = useState<number>(1);
  const [targetSeat, setTargetSeat] = useState<number>(1);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSeating();
  }, [tournamentId]);

  useEffect(() => {
    checkFinalTableReadiness();
  }, [tables, finalTableSize]);

  const checkFinalTableReadiness = () => {
    const activePlayers = getActivePlayers();
    const readyForFinal = activePlayers.length <= finalTableSize && activePlayers.length > 1;
    setIsFinalTableReady(readyForFinal);
  };

  const getActivePlayers = () => {
    return registrations.filter(r => 
      r.status === 'registered' || 
      r.status === 'playing' || 
      r.status === 'confirmed' ||
      (!r.status || r.status === 'active')
    );
  };

  const getPlayerAvatar = (playerId: string) => {
    const player = registrations.find(r => r.player.id === playerId);
    if (player?.player.avatar_url) {
      return player.player.avatar_url;
    }
    
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  const loadSavedSeating = async () => {
    try {
      const { data: seatingData, error } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          seat_number,
          chips,
          status,
          player:players(id, name, avatar_url, user_id)
        `)
        .eq('tournament_id', tournamentId)
        .not('seat_number', 'is', null);

      if (error) {
        console.error('Ошибка загрузки рассадки:', error);
        return;
      }

      if (seatingData && seatingData.length > 0) {
        reconstructTablesFromDatabase(seatingData);
        setIsSeatingStarted(true);
      }
    } catch (error) {
      console.error('Ошибка при загрузке рассадки:', error);
    }
  };

  const reconstructTablesFromDatabase = (seatingData: any[]) => {
    const maxSeatNumber = Math.max(...seatingData.map(s => s.seat_number || 0));
    const totalTables = Math.ceil(maxSeatNumber / maxPlayersPerTable);
    
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= maxPlayersPerTable; seatNum++) {
        const seatData = seatingData.find(s => s.seat_number === ((tableNum - 1) * maxPlayersPerTable + seatNum));
        
        seats.push({
          seat_number: seatNum,
          player_id: seatData?.player_id,
          player_name: seatData?.player?.name,
          chips: seatData?.chips,
          status: seatData?.status,
          stack_bb: seatData?.chips ? Math.round(seatData.chips / bigBlind) : undefined
        });
      }
      
      const activePlayers = seats.filter(s => s.player_id && s.status !== 'eliminated').length;
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: activePlayers,
        max_seats: maxPlayersPerTable,
        dealer_position: 1,
        table_status: 'active'
      });
    }
    
    setTables(newTables);
  };

  const startInitialSeating = async () => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) {
      toast({ title: "Ошибка", description: "Нет активных игроков для рассадки", variant: "destructive" });
      return;
    }

    // Clear existing seating
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    const totalTables = Math.ceil(shuffledPlayers.length / maxPlayersPerTable);
    
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= maxPlayersPerTable; seatNum++) {
        seats.push({
          seat_number: seatNum,
          stack_bb: 0
        });
      }
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: 0,
        max_seats: maxPlayersPerTable,
        dealer_position: Math.floor(Math.random() * maxPlayersPerTable) + 1,
        table_status: 'active'
      });
    }
    
    shuffledPlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / maxPlayersPerTable);
      const seatIndex = index % maxPlayersPerTable;
      
      if (newTables[tableIndex]) {
        newTables[tableIndex].seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status,
          stack_bb: Math.round((registration.chips || 0) / bigBlind)
        };
        newTables[tableIndex].active_players++;
      }
    });
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    setIsSeatingStarted(true);
    
    toast({ 
      title: "Рассадка завершена", 
      description: `${shuffledPlayers.length} игроков рассажено за ${totalTables} столов`
    });
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    try {
      for (const table of tablesData) {
        for (const seat of table.seats) {
          if (seat.player_id) {
            const seatNumber = (table.table_number - 1) * maxPlayersPerTable + seat.seat_number;
            
            const { error } = await supabase
              .from('tournament_registrations')
              .update({ seat_number: seatNumber })
              .eq('player_id', seat.player_id)
              .eq('tournament_id', tournamentId);
              
            if (error) {
              console.error('Error updating player seat:', error);
            }
          }
        }
      }
      
      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error updating seating:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сохранить рассадку", 
        variant: "destructive"
      });
    }
  };

  const movePlayer = async () => {
    if (!selectedPlayer || !targetTable || !targetSeat) return;

    const newTables = [...tables];
    const sourceTable = newTables.find(t => t.seats.some(s => s.player_id === selectedPlayer));
    const destTable = newTables.find(t => t.table_number === targetTable);
    
    if (!sourceTable || !destTable) return;

    // Check if target seat is available
    if (destTable.seats[targetSeat - 1].player_id) {
      toast({ title: "Ошибка", description: "Место занято", variant: "destructive" });
      return;
    }

    // Find and remove player from source table
    const sourceSeat = sourceTable.seats.find(s => s.player_id === selectedPlayer);
    if (sourceSeat) {
      sourceSeat.player_id = undefined;
      sourceSeat.player_name = undefined;
      sourceSeat.chips = undefined;
      sourceSeat.status = undefined;
      sourceSeat.stack_bb = undefined;
      sourceTable.active_players--;
    }

    // Add player to destination table
    const player = registrations.find(r => r.player.id === selectedPlayer);
    if (player) {
      destTable.seats[targetSeat - 1] = {
        seat_number: targetSeat,
        player_id: selectedPlayer,
        player_name: player.player.name,
        chips: player.chips,
        status: player.status,
        stack_bb: Math.round((player.chips || 0) / bigBlind)
      };
      destTable.active_players++;
    }

    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    setIsMoveDialogOpen(false);
    setSelectedPlayer('');
    
    toast({ 
      title: "Игрок перемещен", 
      description: `Игрок перемещен за стол ${targetTable}, место ${targetSeat}`
    });
  };

  const createFinalTable = async () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Слишком много игроков",
        description: `Финальный стол требует ${finalTableSize} или меньше игроков`,
        variant: "destructive"
      });
      return;
    }

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
    const finalTable: Table = {
      table_number: 1,
      seats: Array.from({ length: finalTableSize }, (_, i) => ({
        seat_number: i + 1,
        stack_bb: 0
      })),
      active_players: shuffledPlayers.length,
      max_seats: finalTableSize,
      dealer_position: Math.floor(Math.random() * finalTableSize) + 1,
      table_status: 'final'
    };

    shuffledPlayers.forEach((registration, index) => {
      finalTable.seats[index] = {
        seat_number: index + 1,
        player_id: registration.player.id,
        player_name: registration.player.name,
        chips: registration.chips,
        status: registration.status,
        stack_bb: Math.round((registration.chips || 0) / bigBlind)
      };
    });

    setTables([finalTable]);
    await updateSeatingInDatabase([finalTable]);
    
    toast({ 
      title: "Финальный стол создан", 
      description: `${shuffledPlayers.length} игроков за финальным столом`
    });
  };

  const activePlayers = getActivePlayers();

  return (
    <div className="space-y-4">
      {/* Seating Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Управление рассадкой
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isSeatingStarted ? (
            <Button 
              onClick={startInitialSeating}
              className="w-full h-12 text-lg"
              disabled={activePlayers.length === 0}
            >
              <Shuffle className="w-5 h-5 mr-2" />
              Начать рассадку ({activePlayers.length} игроков)
            </Button>
          ) : (
            <>
              <Button 
                onClick={startInitialSeating}
                variant="outline" 
                className="w-full"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Перерассадить всех
              </Button>
              
              {isFinalTableReady && (
                <Button 
                  onClick={createFinalTable}
                  variant="default"
                  className="w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Создать финальный стол
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tables */}
      {tables.map((table) => (
        <Card key={table.table_number} className={table.table_status === 'final' ? 'border-yellow-500 bg-yellow-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {table.table_status === 'final' ? (
                  <Crown className="h-5 w-5 text-yellow-600" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
                {table.table_status === 'final' ? 'Финальный стол' : `Стол ${table.table_number}`}
              </div>
              <Badge variant={table.active_players > 0 ? "default" : "secondary"}>
                {table.active_players}/{table.max_seats}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {table.seats.map((seat) => (
                <div 
                  key={seat.seat_number} 
                  className={`
                    p-3 border rounded-lg text-center min-h-[80px] flex flex-col justify-center
                    ${seat.player_id ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}
                    ${table.dealer_position === seat.seat_number ? 'ring-2 ring-yellow-400' : ''}
                  `}
                  onClick={() => {
                    if (seat.player_id) {
                      setSelectedPlayer(seat.player_id);
                      setTargetTable(table.table_number);
                      setIsMoveDialogOpen(true);
                    }
                  }}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    Место {seat.seat_number}
                    {table.dealer_position === seat.seat_number && ' (D)'}
                  </div>
                  
                  {seat.player_id ? (
                    <>
                      <Avatar className="w-8 h-8 mx-auto mb-1">
                        <AvatarImage src={getPlayerAvatar(seat.player_id)} />
                        <AvatarFallback className="text-xs">
                          {seat.player_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs font-medium truncate">
                        {seat.player_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {seat.chips?.toLocaleString()}
                      </div>
                      {seat.stack_bb !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {seat.stack_bb} BB
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">Пусто</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {tables.length === 0 && isSeatingStarted && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Рассадка не создана</p>
          </CardContent>
        </Card>
      )}

      {/* Move Player Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить игрока</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Стол</label>
              <Select value={targetTable.toString()} onValueChange={(value) => setTargetTable(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.table_number} value={table.table_number.toString()}>
                      {table.table_status === 'final' ? 'Финальный стол' : `Стол ${table.table_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Место</label>
              <Select value={targetSeat.toString()} onValueChange={(value) => setTargetSeat(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxPlayersPerTable }, (_, i) => i + 1).map((seatNum) => {
                    const table = tables.find(t => t.table_number === targetTable);
                    const seat = table?.seats[seatNum - 1];
                    const isOccupied = seat?.player_id;
                    
                    return (
                      <SelectItem 
                        key={seatNum} 
                        value={seatNum.toString()}
                        disabled={!!isOccupied}
                      >
                        Место {seatNum} {isOccupied ? '(занято)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={movePlayer} className="flex-1">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Переместить
              </Button>
              <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileTableSeating;