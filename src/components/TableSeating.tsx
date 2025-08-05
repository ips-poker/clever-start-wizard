import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, ArrowUpDown, Plus, Shuffle } from 'lucide-react';

interface TableSeat {
  seat_number: number;
  player_id?: string;
  player_name?: string;
  chips?: number;
  status?: string;
}

interface Table {
  table_number: number;
  seats: TableSeat[];
  active_players: number;
}

interface TableSeatingProps {
  tournamentId: string;
  registrations: any[];
  maxPlayersPerTable?: number;
  onSeatingUpdate?: () => void;
}

const TableSeating = ({ 
  tournamentId, 
  registrations, 
  maxPlayersPerTable = 9,
  onSeatingUpdate 
}: TableSeatingProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [targetTable, setTargetTable] = useState<number>(1);
  const [targetSeat, setTargetSeat] = useState<number>(1);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSeating();
  }, [tournamentId]);

  useEffect(() => {
    if (tables.length === 0) {
      generateTablesFromRegistrations();
    }
  }, [registrations, maxPlayersPerTable]);

  const loadSavedSeating = async () => {
    try {
      // Сначала пытаемся загрузить из localStorage
      const savedSeating = localStorage.getItem(`seating_${tournamentId}`);
      if (savedSeating) {
        const parsedSeating = JSON.parse(savedSeating);
        setTables(parsedSeating);
        console.log('🪑 Рассадка загружена из localStorage');
        return;
      }

      // Если в localStorage нет данных, загружаем из базы данных
      const { data: seatingData, error } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          seat_number,
          chips,
          status,
          player:players(id, name)
        `)
        .eq('tournament_id', tournamentId)
        .not('seat_number', 'is', null);

      if (error) {
        console.error('Ошибка загрузки рассадки:', error);
        generateTablesFromRegistrations();
        return;
      }

      if (seatingData && seatingData.length > 0) {
        // Создаем столы на основе сохраненной рассадки
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
              status: seatData?.status
            });
          }
          
          newTables.push({
            table_number: tableNum,
            seats,
            active_players: seats.filter(s => s.player_id).length
          });
        }
        
        setTables(newTables);
        saveSeatingToLocalStorage(newTables);
        console.log('🪑 Рассадка загружена из базы данных');
      } else {
        generateTablesFromRegistrations();
      }
    } catch (error) {
      console.error('Ошибка при загрузке рассадки:', error);
      generateTablesFromRegistrations();
    }
  };

  const saveSeatingToLocalStorage = (tablesData: Table[]) => {
    try {
      localStorage.setItem(`seating_${tournamentId}`, JSON.stringify(tablesData));
      console.log('🪑 Рассадка сохранена в localStorage');
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  };

  const generateTablesFromRegistrations = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const totalTables = Math.ceil(activePlayers.length / maxPlayersPerTable);
    
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= maxPlayersPerTable; seatNum++) {
        seats.push({
          seat_number: seatNum
        });
      }
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: 0
      });
    }
    
    // Распределяем игроков по столам
    activePlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / maxPlayersPerTable);
      const seatIndex = index % maxPlayersPerTable;
      
      if (newTables[tableIndex]) {
        newTables[tableIndex].seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status
        };
        newTables[tableIndex].active_players++;
      }
    });
    
    setTables(newTables);
    saveSeatingToLocalStorage(newTables);
    console.log('🪑 Столы сгенерированы из регистраций');
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    try {
      console.log('🪑 Обновление рассадки в базе данных...');
      
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
              console.error('Ошибка обновления места игрока:', error);
            }
          }
        }
      }
      
      saveSeatingToLocalStorage(tablesData);
      console.log('🪑 Рассадка обновлена в базе данных и localStorage');
      
      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Ошибка при обновлении рассадки:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сохранить рассадку", 
        variant: "destructive" 
      });
    }
  };

  const autoBalanceTables = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const totalTables = tables.length;
    
    const newTables = [...tables];
    
    // Очищаем все столы
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          seat.player_id = undefined;
          seat.player_name = undefined;
          seat.chips = undefined;
          seat.status = undefined;
        }
      });
      table.active_players = 0;
    });
    
    // Перераспределяем игроков равномерно
    activePlayers.forEach((registration, index) => {
      const tableIndex = index % totalTables;
      const targetTable = newTables[tableIndex];
      
      // Найдем первое свободное место за столом
      const emptySeat = targetTable.seats.find(seat => !seat.player_id);
      if (emptySeat) {
        emptySeat.player_id = registration.player.id;
        emptySeat.player_name = registration.player.name;
        emptySeat.chips = registration.chips;
        emptySeat.status = registration.status;
        targetTable.active_players++;
      }
    });
    
    setTables(newTables);
    updateSeatingInDatabase(newTables);
    toast({ title: "Столы автоматически сбалансированы" });
  };

  const shuffleSeating = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
    const newTables = [...tables];
    
    // Очищаем все столы
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          seat.player_id = undefined;
          seat.player_name = undefined;
          seat.chips = undefined;
          seat.status = undefined;
        }
      });
      table.active_players = 0;
    });
    
    // Размещаем перемешанных игроков
    shuffledPlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / maxPlayersPerTable);
      const seatIndex = index % maxPlayersPerTable;
      
      if (newTables[tableIndex]) {
        newTables[tableIndex].seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status
        };
        newTables[tableIndex].active_players++;
      }
    });
    
    setTables(newTables);
    updateSeatingInDatabase(newTables);
    toast({ title: "Рассадка перемешана" });
  };

  const movePlayer = async (playerId: string, fromTable: number, toTable: number, toSeat: number) => {
    const newTables = [...tables];
    
    // Найдем игрока в старом месте
    const fromTableObj = newTables.find(t => t.table_number === fromTable);
    const toTableObj = newTables.find(t => t.table_number === toTable);
    
    if (!fromTableObj || !toTableObj) return;
    
    const playerSeat = fromTableObj.seats.find(s => s.player_id === playerId);
    const targetSeat = toTableObj.seats.find(s => s.seat_number === toSeat);
    
    if (!playerSeat || !targetSeat) return;
    
    // Проверяем, свободно ли целевое место
    if (targetSeat.player_id) {
      toast({ title: "Ошибка", description: "Место уже занято", variant: "destructive" });
      return;
    }
    
    // Перемещаем игрока
    targetSeat.player_id = playerSeat.player_id;
    targetSeat.player_name = playerSeat.player_name;
    targetSeat.chips = playerSeat.chips;
    targetSeat.status = playerSeat.status;
    
    // Освобождаем старое место
    playerSeat.player_id = undefined;
    playerSeat.player_name = undefined;
    playerSeat.chips = undefined;
    playerSeat.status = undefined;
    
    // Обновляем счетчики
    fromTableObj.active_players--;
    toTableObj.active_players++;
    
    setTables(newTables);
    updateSeatingInDatabase(newTables);
    
    // Обновляем seat_number в базе данных (дублирующее обновление для надежности)
    const absoluteSeatNumber = (toTable - 1) * maxPlayersPerTable + toSeat;
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: absoluteSeatNumber })
      .eq('player_id', playerId)
      .eq('tournament_id', tournamentId);
    
    toast({ title: "Игрок перемещен", description: `Стол ${toTable}, место ${toSeat}` });
    setIsMoveDialogOpen(false);
  };

  const suggestPlayerMove = (tableNum: number) => {
    const table = tables.find(t => t.table_number === tableNum);
    if (!table) return;
    
    // Найдем стол с наименьшим количеством игроков
    const targetTable = tables.reduce((min, current) => 
      current.active_players < min.active_players ? current : min
    );
    
    if (targetTable.table_number === tableNum) {
      toast({ title: "Рекомендация", description: "Этот стол уже имеет минимальное количество игроков" });
      return;
    }
    
    toast({ 
      title: "Рекомендация пересадки", 
      description: `Пересадите игрока со стола ${tableNum} на стол ${targetTable.table_number}` 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Рассадка за столами
        </h3>
        <div className="flex gap-2">
          <Button 
            onClick={autoBalanceTables}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            Сбалансировать
          </Button>
          <Button 
            onClick={shuffleSeating}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Перемешать
          </Button>
          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Переместить игрока
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Переместить игрока</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Игрок</label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите игрока" />
                    </SelectTrigger>
                    <SelectContent>
                      {registrations
                        .filter(r => r.status === 'registered' || r.status === 'playing')
                        .map(reg => (
                          <SelectItem key={reg.player.id} value={reg.player.id}>
                            {reg.player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Стол</label>
                  <Select value={targetTable.toString()} onValueChange={(v) => setTargetTable(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.table_number} value={table.table_number.toString()}>
                          Стол {table.table_number} ({table.active_players}/{maxPlayersPerTable})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Место</label>
                  <Select value={targetSeat.toString()} onValueChange={(v) => setTargetSeat(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxPlayersPerTable }, (_, i) => i + 1).map(seat => {
                        const table = tables.find(t => t.table_number === targetTable);
                        const seatTaken = table?.seats.find(s => s.seat_number === seat)?.player_id;
                        return (
                          <SelectItem 
                            key={seat} 
                            value={seat.toString()} 
                            disabled={!!seatTaken}
                          >
                            Место {seat} {seatTaken ? '(занято)' : '(свободно)'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => {
                    const currentPlayer = registrations.find(r => r.player.id === selectedPlayer);
                    const currentTable = tables.find(t => 
                      t.seats.some(s => s.player_id === selectedPlayer)
                    )?.table_number || 1;
                    
                    movePlayer(selectedPlayer, currentTable, targetTable, targetSeat);
                  }}
                  disabled={!selectedPlayer}
                  className="w-full"
                >
                  Переместить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <Card key={table.table_number} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Стол {table.table_number}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={table.active_players <= maxPlayersPerTable / 2 ? "destructive" : "default"}>
                    {table.active_players}/{maxPlayersPerTable}
                  </Badge>
                  {table.active_players < maxPlayersPerTable / 2 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => suggestPlayerMove(table.table_number)}
                    >
                      Подсказка
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {table.seats.map(seat => (
                  <div 
                    key={seat.seat_number}
                    className={`p-2 rounded border text-center text-sm ${
                      seat.player_id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-muted border-muted-foreground/20'
                    }`}
                  >
                    <div className="font-medium">#{seat.seat_number}</div>
                    {seat.player_name ? (
                      <div className="space-y-1">
                        <div className="truncate" title={seat.player_name}>
                          {seat.player_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {seat.chips?.toLocaleString()} фишек
                        </div>
                        <Badge 
                          variant={seat.status === 'playing' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {seat.status === 'playing' ? 'Играет' : 'Готов'}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">Свободно</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TableSeating;