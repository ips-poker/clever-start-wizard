import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Shuffle, 
  ArrowUpDown,
  Trophy,
  Target,
  RotateCcw,
  UserMinus,
  Move
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number | null;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
  position?: number;
  eliminated_at?: string;
  final_position?: number;
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
  average_stack?: number;
}

interface MobileTableSeatingProps {
  tournament: Tournament;
  registrations: Registration[];
  onSeatingUpdate: () => void;
}

export const MobileTableSeating = ({ 
  tournament, 
  registrations, 
  onSeatingUpdate 
}: MobileTableSeatingProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isSeatingStarted, setIsSeatingStarted] = useState(false);
  const [maxPlayersPerTable] = useState(9);
  const [finalTableSize] = useState(9);
  const [bigBlind] = useState(20);
  const [selectedPlayer, setSelectedPlayer] = useState<Registration | null>(null);
  const [targetSeat, setTargetSeat] = useState<{tableNumber: number, seatNumber: number} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSeating();
  }, [tournament.id]);

  useEffect(() => {
    if (tables.length === 0 && registrations.length > 0) {
      initializeTablesStructure();
    }
  }, [registrations, maxPlayersPerTable]);

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
        .eq('tournament_id', tournament.id)
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
        table_status: 'active',
        average_stack: activePlayers > 0 ? 
          Math.round(seats.filter(s => s.chips).reduce((sum, s) => sum + (s.chips || 0), 0) / activePlayers) : 0
      });
    }
    
    setTables(newTables);
  };

  const initializeTablesStructure = () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length === 0) {
      return;
    }
    
    const totalTables = Math.ceil(activePlayers.length / maxPlayersPerTable);
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
        dealer_position: 1,
        table_status: 'active',
        average_stack: 0
      });
    }
    
    setTables(newTables);
  };

  const startInitialSeating = async () => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) {
      toast({ 
        title: "Ошибка", 
        description: "Нет активных игроков для рассадки", 
        variant: "destructive" 
      });
      return;
    }

    // Сбрасываем все места
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournament.id);

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
        table_status: 'active',
        average_stack: 0
      });
    }
    
    // Рассаживаем игроков
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

    // Рассчитываем средний стек
    newTables.forEach(table => {
      const activeSeats = table.seats.filter(s => s.player_id);
      if (activeSeats.length > 0) {
        table.average_stack = Math.round(
          activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length
        );
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
            
            await supabase
              .from('tournament_registrations')
              .update({ seat_number: seatNumber })
              .eq('player_id', seat.player_id)
              .eq('tournament_id', tournament.id);
          }
        }
      }
      
      onSeatingUpdate();
    } catch (error) {
      console.error('Error updating seating:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сохранить рассадку", 
        variant: "destructive"
      });
    }
  };

  const resetSeating = async () => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('tournament_id', tournament.id);

      setTables([]);
      setIsSeatingStarted(false);
      initializeTablesStructure();
      onSeatingUpdate();
      
      toast({ 
        title: "Рассадка сброшена", 
        description: "Все места освобождены"
      });
    } catch (error) {
      console.error('Error resetting seating:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сбросить рассадку", 
        variant: "destructive"
      });
    }
  };

  const movePlayerToSeat = async (playerId: string, newTableNumber: number, newSeatNumber: number) => {
    try {
      // Освобождаем старое место
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      // Занимаем новое место
      const newSeatNumberDb = (newTableNumber - 1) * maxPlayersPerTable + newSeatNumber;
      
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: newSeatNumberDb })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      // Обновляем локальные данные
      loadSavedSeating();
      onSeatingUpdate();
      
      toast({
        title: "Игрок пересажен",
        description: `Игрок пересажен за стол ${newTableNumber}, место ${newSeatNumber}`
      });
    } catch (error) {
      console.error('Error moving player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось пересадить игрока",
        variant: "destructive"
      });
    }
  };

  const removePlayerFromSeat = async (playerId: string) => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      loadSavedSeating();
      onSeatingUpdate();
      
      toast({
        title: "Игрок убран со места",
        description: "Игрок убран с текущего места"
      });
    } catch (error) {
      console.error('Error removing player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось убрать игрока с места",
        variant: "destructive"
      });
    }
  };

  const activePlayers = getActivePlayers();
  const isFinalTableReady = activePlayers.length <= finalTableSize && activePlayers.length > 1;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <div className="font-semibold">{activePlayers.length}</div>
              <div className="text-xs text-muted-foreground">Игроков</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-semibold">{tables.length}</div>
              <div className="text-xs text-muted-foreground">Столов</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="font-semibold">{Math.round(activePlayers.length > 0 ? 
                registrations.filter(r => r.chips).reduce((sum, r) => sum + r.chips, 0) / activePlayers.length : 0
              ).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Средний стек</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {!isSeatingStarted ? (
          <Button
            onClick={startInitialSeating}
            disabled={activePlayers.length === 0}
            className="w-full"
            size="lg"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Начать рассадку ({activePlayers.length} игроков)
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={startInitialSeating}
              variant="outline"
              className="w-full"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Перерассадить игроков
            </Button>
            
            <Button
              onClick={resetSeating}
              variant="destructive"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Сбросить рассадку
            </Button>
          </div>
        )}

        {isFinalTableReady && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">
                Готов финальный стол! ({activePlayers.length} игроков)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tables */}
      {tables.length > 0 && (
        <div className="space-y-3">
          {tables.map((table) => (
            <Card key={table.table_number}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Стол {table.table_number}</span>
                  <Badge variant="outline">
                    {table.active_players}/{table.max_seats}
                  </Badge>
                </CardTitle>
                {table.average_stack > 0 && (
                  <CardDescription className="text-xs">
                    Средний стек: {table.average_stack.toLocaleString()} ({Math.round(table.average_stack / bigBlind)} BB)
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {table.seats.map((seat) => (
                    <div 
                      key={seat.seat_number}
                      className={`p-2 rounded-lg border ${
                        seat.player_id 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-muted/50 border-muted'
                      }`}
                    >
                      {seat.player_id ? (
                        <div 
                          className="flex items-center gap-1"
                          onClick={() => {
                            const player = registrations.find(r => r.player.id === seat.player_id);
                            if (player) setSelectedPlayer(player);
                          }}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={getPlayerAvatar(seat.player_id)} />
                            <AvatarFallback className="text-xs">
                              {seat.player_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {seat.player_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {seat.chips?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-center text-xs text-muted-foreground py-1 cursor-pointer hover:bg-primary/10 rounded"
                          onClick={() => setTargetSeat({tableNumber: table.table_number, seatNumber: seat.seat_number})}
                        >
                          Место {seat.seat_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tables.length === 0 && activePlayers.length > 0 && (
        <div className="text-center text-muted-foreground py-8">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Нажмите "Начать рассадку" чтобы разместить игроков за столами</p>
        </div>
      )}

      {/* Player Move Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPlayer ? getPlayerAvatar(selectedPlayer.player.id) : undefined} />
                <AvatarFallback>
                  {selectedPlayer?.player.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {selectedPlayer?.player.name}
            </DialogTitle>
            <DialogDescription>
              Управление игроком
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <div>Фишки: {selectedPlayer.chips.toLocaleString()}</div>
                {selectedPlayer.seat_number && (
                  <div>Текущее место: {selectedPlayer.seat_number}</div>
                )}
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    removePlayerFromSeat(selectedPlayer.player.id);
                    setSelectedPlayer(null);
                  }}
                  className="w-full"
                  variant="destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Убрать с места
                </Button>
                
                <Button
                  onClick={() => {
                    setSelectedPlayer(null);
                    setTargetSeat(null);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Move className="h-4 w-4 mr-2" />
                  Выбрать новое место
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Seat Selection Dialog */}
      <Dialog open={!!targetSeat} onOpenChange={() => setTargetSeat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Выбор игрока</DialogTitle>
            <DialogDescription>
              Выберите игрока для места {targetSeat?.seatNumber} за столом {targetSeat?.tableNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activePlayers.filter(p => !p.seat_number).map((registration) => (
              <div 
                key={registration.id}
                className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-secondary/50"
                onClick={() => {
                  if (targetSeat) {
                    movePlayerToSeat(registration.player.id, targetSeat.tableNumber, targetSeat.seatNumber);
                  }
                  setTargetSeat(null);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getPlayerAvatar(registration.player.id)} />
                  <AvatarFallback>
                    {registration.player.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{registration.player.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {registration.chips.toLocaleString()} фишек
                  </div>
                </div>
              </div>
            ))}
            
            {activePlayers.filter(p => !p.seat_number).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Все игроки уже рассажены
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};