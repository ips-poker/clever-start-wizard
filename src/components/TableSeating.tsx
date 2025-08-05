import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, ArrowUpDown, Plus, Shuffle, Settings, RotateCcw, UserMinus, MoveRight, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TableSeat {
  seat_number: number;
  player_id?: string;
  player_name?: string;
  chips?: number;
  status?: string;
  avatar_url?: string;
  elo_rating?: number;
}

interface Table {
  table_number: number;
  seats: TableSeat[];
  active_players: number;
}

interface TableSeatingProps {
  tournamentId: string;
  registrations: any[];
  tournamentStatus: string;
  maxPlayersPerTable?: number;
  onSeatingUpdate?: () => void;
}

const TableSeating = ({ 
  tournamentId, 
  registrations, 
  tournamentStatus,
  maxPlayersPerTable = 9,
  onSeatingUpdate 
}: TableSeatingProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [targetTable, setTargetTable] = useState<number>(1);
  const [targetSeat, setTargetSeat] = useState<number>(1);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seatingSettings, setSeatingSettings] = useState({
    maxPlayersPerTable: maxPlayersPerTable,
    minPlayersToStartTwoTables: 10,
    maxImbalance: 2 // максимальная разница в игроках между столами
  });
  const [isSeated, setIsSeated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 TableSeating - registrations изменились:', {
      totalRegistrations: registrations.length,
      activeRegistrations: registrations.filter(r => r.status === 'registered' || r.status === 'playing').length,
      eliminatedRegistrations: registrations.filter(r => r.status === 'eliminated').length
    });
    loadSavedSeating();
  }, [tournamentId, registrations]); // ✅ Перезагружаем при изменении registrations

  useEffect(() => {
    if (tables.length === 0 || registrations.length > 0) {
      updateTablesWithCurrentRegistrations();
    }
  }, [registrations, seatingSettings.maxPlayersPerTable]);

  useEffect(() => {
    const savedSettings = localStorage.getItem(`seating_settings_${tournamentId}`);
    if (savedSettings) {
      setSeatingSettings(JSON.parse(savedSettings));
    }
  }, [tournamentId]);

  useEffect(() => {
    // Проверяем рассадку при запуске турнира
    const savedSeating = localStorage.getItem(`seating_${tournamentId}`);
    setIsSeated(!!savedSeating);
  }, [tournamentId]);

  const loadSavedSeating = async () => {
    try {
      console.log('🔍 Загрузка рассадки для турнира:', tournamentId);
      
      // Очищаем старые данные из localStorage если они есть
      const savedSeating = localStorage.getItem(`seating_${tournamentId}`);
      if (savedSeating) {
        console.log('🗑️ Очищаем старую рассадку из localStorage');
        localStorage.removeItem(`seating_${tournamentId}`);
      }

      // ВСЕГДА загружаем из базы данных для обеспечения синхронизации
      const { data: seatingData, error } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          seat_number,
          chips,
          status,
          player:players(id, name, elo_rating)
        `)
        .eq('tournament_id', tournamentId)
        .not('seat_number', 'is', null)
        .in('status', ['registered', 'playing']); // ✅ ТОЛЬКО АКТИВНЫЕ ИГРОКИ

      console.log('🔍 Данные рассадки из БД:', { seatingData, error });

      if (error) {
        console.error('❌ Ошибка загрузки рассадки:', error);
        updateTablesWithCurrentRegistrations();
        return;
      }

      if (seatingData && seatingData.length > 0) {
        console.log('✅ Найдена рассадка в БД, создаем столы');
        // Создаем столы на основе сохраненной рассадки
        const maxSeatNumber = Math.max(...seatingData.map(s => s.seat_number || 0));
        const totalTables = Math.ceil(maxSeatNumber / seatingSettings.maxPlayersPerTable);
        
        const newTables: Table[] = [];
        
        for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
          const seats: TableSeat[] = [];
          
          for (let seatNum = 1; seatNum <= seatingSettings.maxPlayersPerTable; seatNum++) {
            const seatData = seatingData.find(s => s.seat_number === ((tableNum - 1) * seatingSettings.maxPlayersPerTable + seatNum));
            
            seats.push({
              seat_number: seatNum,
              player_id: seatData?.player_id,
              player_name: seatData?.player?.name,
              chips: seatData?.chips,
              status: seatData?.status,
              elo_rating: seatData?.player?.elo_rating
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
        console.log('🪑 Рассадка загружена из базы данных:', newTables);
      } else {
        console.log('📋 Рассадка не найдена в БД, создаем на основе регистраций');
        updateTablesWithCurrentRegistrations();
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке рассадки:', error);
      updateTablesWithCurrentRegistrations();
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

  // Сохранение настроек рассадки
  const saveSeatingSettings = (settings: any) => {
    localStorage.setItem(`seating_settings_${tournamentId}`, JSON.stringify(settings));
    setSeatingSettings(settings);
  };

  // Профессиональная рассадка
  const performInitialSeating = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    
    console.log('🎯 Начало рассадки:', {
      totalRegistrations: registrations.length,
      activePlayers: activePlayers.length,
      eliminatedPlayers: registrations.filter(r => r.status === 'eliminated').length
    });
    
    // Проверяем минимальное количество игроков для двух столов
    if (activePlayers.length < seatingSettings.minPlayersToStartTwoTables) {
      toast({ 
        title: "Недостаточно игроков", 
        description: `Для рассадки за два стола нужно минимум ${seatingSettings.minPlayersToStartTwoTables} игроков` 
      });
      return;
    }

    const totalTables = Math.ceil(activePlayers.length / seatingSettings.maxPlayersPerTable);
    
    // Перемешиваем игроков в случайном порядке
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
    const newTables: Table[] = [];
    
    // Создаем столы
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= seatingSettings.maxPlayersPerTable; seatNum++) {
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
    
    // Распределяем игроков в хаотичном порядке
    shuffledPlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / seatingSettings.maxPlayersPerTable);
      const seatIndex = index % seatingSettings.maxPlayersPerTable;
      
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
    setIsSeated(true);
    toast({ title: "Рассадка выполнена", description: "Игроки рассажены в случайном порядке" });
  };

  const updateTablesWithCurrentRegistrations = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    
    console.log('🔄 Обновление столов с текущими регистрациями:', {
      totalRegistrations: registrations.length,
      activePlayersCount: activePlayers.length,
      activePlayersData: activePlayers.map(p => ({ name: p.player?.name || 'Unknown', status: p.status, seat_number: p.seat_number }))
    });
    
    if (activePlayers.length === 0) {
      setTables([]);
      console.log('🪑 Нет активных игроков, столы очищены');
      return;
    }
    
    const totalTables = Math.ceil(activePlayers.length / seatingSettings.maxPlayersPerTable);
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= seatingSettings.maxPlayersPerTable; seatNum++) {
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
    
    setTables(newTables);
    console.log(`🪑 Создано ${totalTables} столов для ${activePlayers.length} активных игроков`);
  };

  const generateTablesFromRegistrations = () => {
    updateTablesWithCurrentRegistrations();
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    try {
      console.log('🪑 Обновление рассадки в базе данных...');
      
      for (const table of tablesData) {
        for (const seat of table.seats) {
          if (seat.player_id) {
            const seatNumber = (table.table_number - 1) * seatingSettings.maxPlayersPerTable + seat.seat_number;
            
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
      const tableIndex = Math.floor(index / seatingSettings.maxPlayersPerTable);
      const seatIndex = index % seatingSettings.maxPlayersPerTable;
      
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
    const absoluteSeatNumber = (toTable - 1) * seatingSettings.maxPlayersPerTable + toSeat;
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

  // Улучшенная проверка баланса столов
  const checkTableBalance = () => {
    if (tables.length < 2) return null;
    
    const tableCounts = tables.map(t => ({ table: t.table_number, count: t.active_players }))
                            .filter(t => t.count > 0) // только столы с игроками
                            .sort((a, b) => b.count - a.count);
    
    if (tableCounts.length < 2) return null;
    
    const maxTable = tableCounts[0];
    const minTable = tableCounts[tableCounts.length - 1];
    
    // Если разница больше 1, нужна балансировка
    if (maxTable.count - minTable.count > 1) {
      return { fromTable: maxTable.table, toTable: minTable.table, difference: maxTable.count - minTable.count };
    }
    
    return null;
  };

  // Улучшенная умная балансировка
  const smartTableBalance = () => {
    const imbalance = checkTableBalance();
    if (!imbalance) {
      toast({ title: "Столы сбалансированы", description: "Балансировка не требуется" });
      return;
    }

    toast({
      title: "Требуется балансировка",
      description: `Переместите игрока со стола ${imbalance.fromTable} (перевес: ${imbalance.difference}) на стол ${imbalance.toTable}`,
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      {/* Настройки рассадки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Профессиональная рассадка
            </div>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки рассадки</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxPlayers">Максимум игроков за столом</Label>
                    <Select 
                      value={seatingSettings.maxPlayersPerTable.toString()} 
                      onValueChange={(v) => saveSeatingSettings({...seatingSettings, maxPlayersPerTable: Number(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 игроков</SelectItem>
                        <SelectItem value="9">9 игроков</SelectItem>
                        <SelectItem value="10">10 игроков</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="minTwoTables">Минимум игроков для двух столов</Label>
                    <Input
                      id="minTwoTables"
                      type="number"
                      min="6"
                      max="20"
                      value={seatingSettings.minPlayersToStartTwoTables}
                      onChange={(e) => saveSeatingSettings({...seatingSettings, minPlayersToStartTwoTables: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxImbalance">Максимальная разница между столами</Label>
                    <Input
                      id="maxImbalance"
                      type="number"
                      min="1"
                      max="5"
                      value={seatingSettings.maxImbalance}
                      onChange={(e) => saveSeatingSettings({...seatingSettings, maxImbalance: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {!isSeated && (
              <Button 
                onClick={performInitialSeating}
                className="flex items-center gap-2"
                disabled={registrations.filter(r => r.status === 'registered' || r.status === 'playing').length < seatingSettings.minPlayersToStartTwoTables}
              >
                <Users className="w-4 h-4" />
                Осуществить рассадку
              </Button>
            )}
            
            <Button 
              onClick={smartTableBalance}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!isSeated}
            >
              <ArrowUpDown className="w-4 h-4" />
              Проверить баланс
            </Button>
            
            <Button 
              onClick={shuffleSeating}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={tournamentStatus === 'running' || tournamentStatus === 'paused' || !isSeated}
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
                  disabled={!isSeated}
                >
                  <UserMinus className="w-4 h-4" />
                  Переместить игрока
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Профессиональная пересадка</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Игрок для пересадки</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите игрока" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.flatMap(table =>
                          table.seats
                            .filter(seat => seat.player_id)
                            .map(seat => (
                              <SelectItem key={seat.player_id} value={seat.player_id!}>
                                {seat.player_name} (Стол {table.table_number}, место {seat.seat_number})
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Целевой стол</Label>
                    <Select value={targetTable.toString()} onValueChange={(v) => setTargetTable(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map(table => (
                          <SelectItem key={table.table_number} value={table.table_number.toString()}>
                            Стол {table.table_number} ({table.active_players}/{seatingSettings.maxPlayersPerTable})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Целевое место</Label>
                    <Select value={targetSeat.toString()} onValueChange={(v) => setTargetSeat(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: seatingSettings.maxPlayersPerTable }, (_, i) => i + 1).map(seat => {
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
                      const currentTable = tables.find(t => 
                        t.seats.some(s => s.player_id === selectedPlayer)
                      )?.table_number || 1;
                      
                      movePlayer(selectedPlayer, currentTable, targetTable, targetSeat);
                    }}
                    disabled={!selectedPlayer}
                    className="w-full"
                  >
                    Переместить игрока
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Статистика и предупреждения */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span>Игроков: {registrations.filter(r => r.status === 'registered' || r.status === 'playing').length}</span>
              <span>Столов: {tables.length}</span>
              <span>Настройка: {seatingSettings.maxPlayersPerTable} макс/стол</span>
              {checkTableBalance() && (
                <Badge variant="destructive">Нужна балансировка</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Столы в стиле приглашений */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tables.map(table => (
          <Card key={table.table_number} className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white/20 to-purple-50/30" />
            
            <CardHeader className="relative bg-white/50 border-b border-gray-200/30 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center font-bold border shadow-sm transition-all duration-300
                    ${checkTableBalance()?.fromTable === table.table_number 
                      ? 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700 border-red-200/70 animate-pulse shadow-red-200/50' 
                      : checkTableBalance()?.toTable === table.table_number
                      ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border-green-200/70 animate-pulse shadow-green-200/50'
                      : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border-blue-200/50'
                    }
                  `}>
                    {table.table_number}
                  </div>
                  <span className="text-lg font-light text-gray-800">Стол {table.table_number}</span>
                  {checkTableBalance()?.fromTable === table.table_number && (
                    <Badge className="text-xs bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200/70 animate-bounce">
                      📤 Убрать игрока
                    </Badge>
                  )}
                  {checkTableBalance()?.toTable === table.table_number && (
                    <Badge className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200/70 animate-bounce">
                      📥 Принять игрока
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`text-sm px-3 py-1 font-light border ${
                      table.active_players <= seatingSettings.maxPlayersPerTable / 2 
                        ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200/70" 
                        : "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200/70"
                    }`}
                  >
                    {table.active_players}/{seatingSettings.maxPlayersPerTable}
                  </Badge>
                  {checkTableBalance()?.fromTable === table.table_number && (
                    <Badge className="text-xs animate-pulse bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border border-yellow-200/70">
                      ⚡ Балансировка
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative space-y-3 p-6 bg-white/40 backdrop-blur-sm">
              {/* Сетка мест в стиле приглашений */}
              <div className="grid grid-cols-3 gap-3">
                {table.seats.map(seat => (
                  <div 
                    key={seat.seat_number}
                    className={`
                      relative p-3 rounded-xl border transition-all duration-300 hover:scale-105
                      ${seat.player_id 
                        ? 'bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-sm hover:shadow-md' 
                        : 'bg-white/30 backdrop-blur-sm border-dashed border-gray-300/50 hover:border-blue-300/50 hover:bg-white/50'
                      }
                    `}
                  >
                    {/* Номер места в стиле приглашений */}
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300/50 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                      {seat.seat_number}
                    </div>
                    
                    {seat.player_id ? (
                      <div className="space-y-3">
                        {/* Красиво размещенное имя и аватар */}
                        <div className="text-center">
                          <Avatar className="w-12 h-12 mx-auto border-2 border-white/70 shadow-md">
                            <AvatarImage 
                              src={registrations.find(r => r.player.id === seat.player_id)?.player.avatar_url || ''} 
                              alt={seat.player_name || ''} 
                            />
                            <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50">
                              {seat.player_name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-800 truncate px-1" title={seat.player_name}>
                              {seat.player_name}
                            </div>
                            <div className="text-xs text-gray-500 font-light flex items-center justify-center gap-1 mt-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm"></span>
                              {registrations.find(r => r.player.id === seat.player_id)?.player.elo_rating || 1200}
                            </div>
                          </div>
                        </div>
                        
                        {/* Кнопка перемещения с рейтингом */}
                        {isSeated && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-8 bg-white/60 border border-gray-200/50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200/50 transition-all duration-300 group text-xs"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <MoveRight className="w-3 h-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
                                  <span className="font-medium text-gray-700 group-hover:text-blue-700">
                                    {registrations.find(r => r.player.id === seat.player_id)?.player.elo_rating || 1200}
                                  </span>
                                </div>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white/90 backdrop-blur-sm border border-gray-200/50">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3 text-gray-800 font-light">
                                  <Avatar className="w-8 h-8 border border-gray-200/50">
                                    <AvatarImage 
                                      src={registrations.find(r => r.player.id === seat.player_id)?.player.avatar_url || ''} 
                                      alt={seat.player_name || ''} 
                                    />
                                    <AvatarFallback className="text-xs font-light bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
                                      {seat.player_name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  Переместить {seat.player_name}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="text-sm text-gray-500 font-light bg-white/50 p-3 rounded-lg border border-gray-200/30">
                                  Текущее местоположение: Стол {table.table_number}, место {seat.seat_number}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-600 font-light">Целевой стол</Label>
                                    <Select 
                                      value={targetTable.toString()} 
                                      onValueChange={(v) => setTargetTable(Number(v))}
                                    >
                                      <SelectTrigger className="bg-white/50 border border-gray-200/50">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tables.filter(t => t.table_number !== table.table_number).map(t => (
                                          <SelectItem key={t.table_number} value={t.table_number.toString()}>
                                            Стол {t.table_number} ({t.active_players}/{seatingSettings.maxPlayersPerTable})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-gray-600 font-light">Целевое место</Label>
                                    <Select 
                                      value={targetSeat.toString()} 
                                      onValueChange={(v) => setTargetSeat(Number(v))}
                                    >
                                      <SelectTrigger className="bg-white/50 border border-gray-200/50">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: seatingSettings.maxPlayersPerTable }, (_, i) => i + 1).map(seatNum => {
                                          const targetTableObj = tables.find(t => t.table_number === targetTable);
                                          const seatTaken = targetTableObj?.seats.find(s => s.seat_number === seatNum)?.player_id;
                                          return (
                                            <SelectItem 
                                              key={seatNum} 
                                              value={seatNum.toString()} 
                                              disabled={!!seatTaken}
                                            >
                                              Место {seatNum} {seatTaken ? '(занято)' : '(свободно)'}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <Button 
                                  onClick={() => movePlayer(seat.player_id!, table.table_number, targetTable, targetSeat)}
                                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:shadow-lg transition-all duration-300"
                                  disabled={!targetTable || !targetSeat}
                                >
                                  <MoveRight className="w-4 h-4 mr-2" />
                                  Переместить игрока
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <div className="text-2xl opacity-50">💺</div>
                          <div className="text-xs font-light">Свободно</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Действия стола в стиле приглашений */}
              {table.active_players > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200/30">
                  <div className="text-xs text-gray-500 font-light">
                    Игроков за столом: {table.active_players}
                  </div>
                  {table.active_players < seatingSettings.maxPlayersPerTable / 2 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => smartTableBalance()}
                      className="text-xs h-7 bg-white/50 border border-yellow-200/50 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-300/50 transition-all duration-300"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Подсказка
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TableSeating;