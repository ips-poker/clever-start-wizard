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
import { Users, ArrowUpDown, Plus, Shuffle, Settings, RotateCcw, UserMinus, MoveRight, Crown, Target } from 'lucide-react';
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
    maxImbalance: 2
  });
  const [isSeated, setIsSeated] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [balanceSuggestion, setBalanceSuggestion] = useState<any>(null);
  const [finalTableEnabled, setFinalTableEnabled] = useState(false);
  const [finalTableSize, setFinalTableSize] = useState(8);
  const [newPlayerSuggestion, setNewPlayerSuggestion] = useState<any>(null);
  const [isNewPlayerDialogOpen, setIsNewPlayerDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSeating();
  }, [tournamentId]);

  useEffect(() => {
    if (isSeated && tables.length > 0) {
      handleRegistrationChanges();
      checkFinalTableCondition();
      checkForNewPlayers();
    } else if (tables.length === 0) {
      generateTablesFromRegistrations();
    }
  }, [registrations]);

  // Проверка условия для финального стола
  const checkFinalTableCondition = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    setFinalTableEnabled(activePlayers.length <= finalTableSize && activePlayers.length > 1);
  };

  // Проверка новых игроков
  const checkForNewPlayers = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    
    activePlayers.forEach(registration => {
      const isSeated = tables.some(table => 
        table.seats.some(seat => seat.player_id === registration.player.id)
      );
      
      if (!isSeated) {
        const suggestion = suggestSeatForNewPlayer(registration.player.id);
        if (suggestion) {
          setNewPlayerSuggestion({
            player: registration,
            suggestion
          });
          setIsNewPlayerDialogOpen(true);
        }
      }
    });
  };

  // Обработка изменений в регистрациях
  const handleRegistrationChanges = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const newTables = [...tables];
    
    // Убираем выбывших игроков из рассадки
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          const playerRegistration = activePlayers.find(r => r.player.id === seat.player_id);
          if (!playerRegistration) {
            // Игрок выбыл - освобождаем место
            seat.player_id = undefined;
            seat.player_name = undefined;
            seat.chips = undefined;
            seat.status = undefined;
            seat.elo_rating = undefined;
            seat.avatar_url = undefined;
            table.active_players = Math.max(0, table.active_players - 1);
          } else {
            // Обновляем данные активного игрока
            seat.player_name = playerRegistration.player.name;
            seat.chips = playerRegistration.chips;
            seat.status = playerRegistration.status;
            seat.elo_rating = playerRegistration.player.elo_rating;
            seat.avatar_url = playerRegistration.player.avatar_url;
          }
        }
      });
    });

    setTables(newTables);
    updateSeatingInDatabase(newTables);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem(`seating_settings_${tournamentId}`);
    if (savedSettings) {
      setSeatingSettings(JSON.parse(savedSettings));
    }
  }, [tournamentId]);

  const loadSavedSeating = async () => {
    try {
      console.log('🪑 Загрузка рассадки...');
      
      const { data: seatingData, error } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          seat_number,
          chips,
          status,
          player:players(id, name, elo_rating, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .not('seat_number', 'is', null);

      if (error) {
        console.error('Ошибка загрузки рассадки:', error);
        generateTablesFromRegistrations();
        return;
      }

      if (seatingData && seatingData.length > 0) {
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
              elo_rating: seatData?.player?.elo_rating,
              avatar_url: seatData?.player?.avatar_url
            });
          }
          
          newTables.push({
            table_number: tableNum,
            seats,
            active_players: seats.filter(s => s.player_id && (s.status === 'registered' || s.status === 'playing')).length
          });
        }
        
        setTables(newTables);
        setIsSeated(true);
        saveSeatingToLocalStorage(newTables);
        console.log('🪑 Рассадка загружена из базы данных', newTables);
      } else {
        console.log('🪑 Нет сохраненной рассадки, создаем пустые столы');
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

  const saveSeatingSettings = (settings: any) => {
    localStorage.setItem(`seating_settings_${tournamentId}`, JSON.stringify(settings));
    setSeatingSettings(settings);
  };

  // Начальная хаотичная рассадка
  const performInitialSeating = async () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    
    if (activePlayers.length < 2) {
      toast({ 
        title: "Недостаточно игроков", 
        description: "Для рассадки нужно минимум 2 игрока" 
      });
      return;
    }

    const totalTables = Math.ceil(activePlayers.length / seatingSettings.maxPlayersPerTable);
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
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
    
    shuffledPlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / seatingSettings.maxPlayersPerTable);
      const seatIndex = index % seatingSettings.maxPlayersPerTable;
      
      if (newTables[tableIndex]) {
        newTables[tableIndex].seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status,
          elo_rating: registration.player.elo_rating,
          avatar_url: registration.player.avatar_url
        };
        newTables[tableIndex].active_players++;
      }
    });
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    setIsSeated(true);
    checkFinalTableCondition();
    toast({ 
      title: "🎯 Рассадка выполнена", 
      description: `${activePlayers.length} игроков рассажены за ${totalTables} стол${totalTables > 1 ? 'а' : ''}` 
    });
  };

  // Открытие нового стола
  const openNewTable = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const currentTableCount = tables.length;
    
    const totalOccupiedSeats = tables.reduce((sum, table) => sum + table.active_players, 0);
    if (totalOccupiedSeats < currentTableCount * seatingSettings.maxPlayersPerTable) {
      toast({
        title: "Новый стол не нужен",
        description: "Есть свободные места за существующими столами"
      });
      return;
    }

    const newTable: Table = {
      table_number: currentTableCount + 1,
      seats: Array.from({ length: seatingSettings.maxPlayersPerTable }, (_, i) => ({
        seat_number: i + 1
      })),
      active_players: 0
    };

    const newTables = [...tables, newTable];
    const suggestion = calculateTableBalance(newTables, activePlayers);
    setBalanceSuggestion(suggestion);
    setIsBalanceDialogOpen(true);
    setTables(newTables);
  };

  // Расчет предложения по балансировке столов
  const calculateTableBalance = (tablesData: Table[], players: any[]) => {
    const playersPerTable = Math.floor(players.length / tablesData.length);
    const extraPlayers = players.length % tablesData.length;
    
    const moves: any[] = [];
    
    tablesData.forEach((table, index) => {
      const targetPlayers = playersPerTable + (index < extraPlayers ? 1 : 0);
      const currentPlayers = table.active_players;
      const difference = currentPlayers - targetPlayers;
      
      if (difference > 0) {
        moves.push({
          fromTable: table.table_number,
          playersToMove: difference,
          type: 'from'
        });
      } else if (difference < 0) {
        moves.push({
          toTable: table.table_number,
          playersNeeded: Math.abs(difference),
          type: 'to'
        });
      }
    });
    
    return { moves, targetDistribution: playersPerTable };
  };

  // Применение балансировки столов
  const applyTableBalance = async () => {
    if (!balanceSuggestion) return;
    
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const newTables = [...tables];
    
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        seat.player_id = undefined;
        seat.player_name = undefined;
        seat.chips = undefined;
        seat.status = undefined;
        seat.elo_rating = undefined;
        seat.avatar_url = undefined;
      });
      table.active_players = 0;
    });
    
    activePlayers.forEach((registration, index) => {
      const tableIndex = index % newTables.length;
      const targetTable = newTables[tableIndex];
      
      const emptySeat = targetTable.seats.find(seat => !seat.player_id);
      if (emptySeat) {
        emptySeat.player_id = registration.player.id;
        emptySeat.player_name = registration.player.name;
        emptySeat.chips = registration.chips;
        emptySeat.status = registration.status;
        emptySeat.elo_rating = registration.player.elo_rating;
        emptySeat.avatar_url = registration.player.avatar_url;
        targetTable.active_players++;
      }
    });
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    setIsBalanceDialogOpen(false);
    setBalanceSuggestion(null);
    toast({ title: "⚖️ Столы сбалансированы", description: "Игроки равномерно распределены по столам" });
  };

  // Рассадка финального стола
  const createFinalTable = async () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Слишком много игроков",
        description: `Для финального стола должно быть не более ${finalTableSize} игроков`
      });
      return;
    }

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
    const finalTable: Table = {
      table_number: 1,
      seats: Array.from({ length: finalTableSize }, (_, i) => ({
        seat_number: i + 1
      })),
      active_players: 0
    };
    
    shuffledPlayers.forEach((registration, index) => {
      if (index < finalTableSize) {
        finalTable.seats[index] = {
          seat_number: index + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status,
          elo_rating: registration.player.elo_rating,
          avatar_url: registration.player.avatar_url
        };
        finalTable.active_players++;
      }
    });
    
    setTables([finalTable]);
    await updateSeatingInDatabase([finalTable]);
    setFinalTableEnabled(false);
    toast({ 
      title: "👑 Финальный стол создан", 
      description: `${activePlayers.length} игроков рассажены за финальный стол` 
    });
  };

  // Предложение оптимального места для нового игрока
  const suggestSeatForNewPlayer = (playerId: string) => {
    const playerRegistration = registrations.find(r => r.player.id === playerId);
    if (!playerRegistration) return null;

    let bestTable = null;
    let minPlayers = Infinity;
    
    tables.forEach(table => {
      if (table.active_players < seatingSettings.maxPlayersPerTable && table.active_players < minPlayers) {
        minPlayers = table.active_players;
        bestTable = table;
      }
    });
    
    if (bestTable) {
      const emptySeat = bestTable.seats.find(seat => !seat.player_id);
      if (emptySeat) {
        return {
          table: bestTable.table_number,
          seat: emptySeat.seat_number,
          reason: `Стол ${bestTable.table_number} имеет меньше всего игроков (${bestTable.active_players})`
        };
      }
    }
    
    return null;
  };

  // Добавление нового игрока на предложенное место
  const addPlayerToSuggestedSeat = async (playerId: string, tableNum: number, seatNum: number) => {
    const playerRegistration = registrations.find(r => r.player.id === playerId);
    if (!playerRegistration) return;

    const newTables = [...tables];
    const targetTable = newTables.find(t => t.table_number === tableNum);
    const targetSeat = targetTable?.seats.find(s => s.seat_number === seatNum);
    
    if (targetTable && targetSeat && !targetSeat.player_id) {
      targetSeat.player_id = playerRegistration.player.id;
      targetSeat.player_name = playerRegistration.player.name;
      targetSeat.chips = playerRegistration.chips;
      targetSeat.status = playerRegistration.status;
      targetSeat.elo_rating = playerRegistration.player.elo_rating;
      targetSeat.avatar_url = playerRegistration.player.avatar_url;
      targetTable.active_players++;
      
      setTables(newTables);
      await updateSeatingInDatabase(newTables);
      setIsNewPlayerDialogOpen(false);
      setNewPlayerSuggestion(null);
      toast({
        title: "Игрок добавлен",
        description: `${playerRegistration.player.name} посажен за стол ${tableNum}, место ${seatNum}`
      });
    }
  };

  const generateTablesFromRegistrations = () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
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
    console.log('🪑 Столы созданы без рассадки');
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    try {
      console.log('🪑 Обновление рассадки в базе данных...');
      
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('tournament_id', tournamentId);
      
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
            } else {
              console.log(`✅ Игрок ${seat.player_name} пересажен на место ${seatNumber}`);
            }
          }
        }
      }
      
      saveSeatingToLocalStorage(tablesData);
      console.log('🪑 Рассадка полностью обновлена в базе данных и localStorage');
      
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

  const autoBalanceTables = async () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const totalTables = tables.length;
    
    const newTables = [...tables];
    
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          seat.player_id = undefined;
          seat.player_name = undefined;
          seat.chips = undefined;
          seat.status = undefined;
          seat.elo_rating = undefined;
          seat.avatar_url = undefined;
        }
      });
      table.active_players = 0;
    });
    
    activePlayers.forEach((registration, index) => {
      const tableIndex = index % totalTables;
      const targetTable = newTables[tableIndex];
      
      const emptySeat = targetTable.seats.find(seat => !seat.player_id);
      if (emptySeat) {
        emptySeat.player_id = registration.player.id;
        emptySeat.player_name = registration.player.name;
        emptySeat.chips = registration.chips;
        emptySeat.status = registration.status;
        emptySeat.elo_rating = registration.player.elo_rating;
        emptySeat.avatar_url = registration.player.avatar_url;
        targetTable.active_players++;
      }
    });
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    toast({ title: "⚖️ Столы автоматически сбалансированы" });
  };

  const shuffleSeating = async () => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    
    const newTables = [...tables];
    
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          seat.player_id = undefined;
          seat.player_name = undefined;
          seat.chips = undefined;
          seat.status = undefined;
          seat.elo_rating = undefined;
          seat.avatar_url = undefined;
        }
      });
      table.active_players = 0;
    });
    
    shuffledPlayers.forEach((registration, index) => {
      const tableIndex = Math.floor(index / seatingSettings.maxPlayersPerTable);
      const seatIndex = index % seatingSettings.maxPlayersPerTable;
      
      if (newTables[tableIndex]) {
        newTables[tableIndex].seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status,
          elo_rating: registration.player.elo_rating,
          avatar_url: registration.player.avatar_url
        };
        newTables[tableIndex].active_players++;
      }
    });
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    toast({ title: "🔀 Рассадка перемешана" });
  };

  const movePlayer = async (playerId: string, fromTable: number, toTable: number, toSeat: number) => {
    const newTables = [...tables];
    
    const fromTableObj = newTables.find(t => t.table_number === fromTable);
    const toTableObj = newTables.find(t => t.table_number === toTable);
    
    if (!fromTableObj || !toTableObj) return;
    
    const playerSeat = fromTableObj.seats.find(s => s.player_id === playerId);
    const targetSeat = toTableObj.seats.find(s => s.seat_number === toSeat);
    
    if (!playerSeat || !targetSeat) return;
    
    if (targetSeat.player_id) {
      toast({ title: "Ошибка", description: "Место уже занято", variant: "destructive" });
      return;
    }
    
    targetSeat.player_id = playerSeat.player_id;
    targetSeat.player_name = playerSeat.player_name;
    targetSeat.chips = playerSeat.chips;
    targetSeat.status = playerSeat.status;
    targetSeat.elo_rating = playerSeat.elo_rating;
    targetSeat.avatar_url = playerSeat.avatar_url;
    
    playerSeat.player_id = undefined;
    playerSeat.player_name = undefined;
    playerSeat.chips = undefined;
    playerSeat.status = undefined;
    playerSeat.elo_rating = undefined;
    playerSeat.avatar_url = undefined;
    
    fromTableObj.active_players--;
    toTableObj.active_players++;
    
    setTables(newTables);
    await updateSeatingInDatabase(newTables);
    toast({ title: "Игрок перемещен", description: `${targetSeat.player_name} перемещен на стол ${toTable}` });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и основные кнопки */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Система рассадки
          </h2>
          
          <div className="flex gap-2">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
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
                    <Input
                      id="maxPlayers"
                      type="number"
                      value={seatingSettings.maxPlayersPerTable}
                      onChange={(e) => saveSeatingSettings({
                        ...seatingSettings,
                        maxPlayersPerTable: parseInt(e.target.value) || 9
                      })}
                      min={2}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="finalTableSize">Размер финального стола</Label>
                    <Input
                      id="finalTableSize"
                      type="number"
                      value={finalTableSize}
                      onChange={(e) => setFinalTableSize(parseInt(e.target.value) || 8)}
                      min={2}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minPlayers">Минимум игроков для двух столов</Label>
                    <Input
                      id="minPlayers"
                      type="number"
                      value={seatingSettings.minPlayersToStartTwoTables}
                      onChange={(e) => saveSeatingSettings({
                        ...seatingSettings,
                        minPlayersToStartTwoTables: parseInt(e.target.value) || 10
                      })}
                      min={4}
                      max={20}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Панель управления рассадкой */}
        <Card>
          <CardHeader>
            <CardTitle>Физические кнопки управления</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Основные кнопки управления */}
              <div className="flex flex-wrap gap-3">
                {!isSeated ? (
                  <Button 
                    onClick={performInitialSeating}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-lg px-6 py-3"
                    size="lg"
                    disabled={registrations.filter(r => r.status === 'registered' || r.status === 'playing').length < 2}
                  >
                    <Target className="h-6 w-6" />
                    🎯 ПУСК - Хаотичная рассадка
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={openNewTable}
                      variant="default"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-lg px-5 py-3"
                    >
                      <Plus className="h-5 w-5" />
                      🆕 Открыть новый стол
                    </Button>
                    
                    <Button 
                      onClick={autoBalanceTables}
                      variant="outline"
                      className="flex items-center gap-2 text-lg px-5 py-3"
                    >
                      <ArrowUpDown className="h-5 w-5" />
                      ⚖️ Сбалансировать столы
                    </Button>

                    <Button 
                      onClick={shuffleSeating}
                      variant="outline"
                      className="flex items-center gap-2 text-lg px-5 py-3"
                    >
                      <Shuffle className="h-5 w-5" />
                      🔀 Перемешать рассадку
                    </Button>

                    {finalTableEnabled && (
                      <Button 
                        onClick={createFinalTable}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-lg px-6 py-3"
                        size="lg"
                      >
                        <Crown className="h-6 w-6" />
                        👑 ФИНАЛ - Финальный стол
                      </Button>
                    )}

                    <Button 
                      onClick={() => {
                        setIsSeated(false);
                        setTables([]);
                        supabase
                          .from('tournament_registrations')
                          .update({ seat_number: null })
                          .eq('tournament_id', tournamentId);
                        localStorage.removeItem(`seating_${tournamentId}`);
                        toast({ title: "Рассадка сброшена" });
                      }}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Сбросить рассадку
                    </Button>
                  </>
                )}
              </div>

              {/* Кнопка пересадки */}
              {isSeated && (
                <div className="border-t pt-4">
                  <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <MoveRight className="h-4 w-4" />
                        Пересадить игрока
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Пересадка игрока</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Выберите игрока</Label>
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
                                      {seat.player_name} (Стол {table.table_number}, Место {seat.seat_number})
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Стол назначения</Label>
                            <Select value={targetTable.toString()} onValueChange={(value) => setTargetTable(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tables.map(table => (
                                  <SelectItem key={table.table_number} value={table.table_number.toString()}>
                                    Стол {table.table_number}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Место назначения</Label>
                            <Select value={targetSeat.toString()} onValueChange={(value) => setTargetSeat(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: seatingSettings.maxPlayersPerTable }, (_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    Место {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            if (selectedPlayer) {
                              const playerSeat = tables.flatMap(t => t.seats).find(s => s.player_id === selectedPlayer);
                              if (playerSeat) {
                                const playerTable = tables.find(t => t.seats.includes(playerSeat));
                                if (playerTable) {
                                  movePlayer(selectedPlayer, playerTable.table_number, targetTable, targetSeat);
                                  setIsMoveDialogOpen(false);
                                }
                              }
                            }
                          }}
                          className="w-full"
                        >
                          Пересадить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
            
            {/* Статистика */}
            {tables.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Всего столов</div>
                    <div className="text-2xl font-bold text-primary">{tables.length}</div>
                  </div>
                  <div>
                    <div className="font-medium">Активных игроков</div>
                    <div className="text-2xl font-bold text-primary">
                      {tables.reduce((sum, table) => sum + table.active_players, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Свободных мест</div>
                    <div className="text-2xl font-bold text-primary">
                      {tables.reduce((sum, table) => sum + (seatingSettings.maxPlayersPerTable - table.active_players), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Средняя заполненность</div>
                    <div className="text-2xl font-bold text-primary">
                      {tables.length > 0 ? Math.round(
                        (tables.reduce((sum, table) => sum + table.active_players, 0) / (tables.length * seatingSettings.maxPlayersPerTable)) * 100
                      ) : 0}%
                    </div>
                  </div>
                </div>
                
                {finalTableEnabled && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">
                      🏆 Готов к созданию финального стола! 
                      ({registrations.filter(r => r.status === 'registered' || r.status === 'playing').length} игроков)
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Диалог балансировки столов */}
        <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Балансировка столов</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {balanceSuggestion && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium mb-2">Рекомендация по балансировке:</h4>
                  <div className="text-sm space-y-1">
                    {balanceSuggestion.moves.map((move: any, index: number) => (
                      <div key={index}>
                        {move.type === 'from' && `Пересадить ${move.playersToMove} игрок(ов) со стола ${move.fromTable}`}
                        {move.type === 'to' && `На стол ${move.toTable} нужно добавить ${move.playersNeeded} игрок(ов)`}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    Целевое распределение: по {balanceSuggestion.targetDistribution} игроков за столом
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={applyTableBalance} className="flex-1">
                  Применить балансировку
                </Button>
                <Button variant="outline" onClick={() => setIsBalanceDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Диалог для нового игрока */}
        <Dialog open={isNewPlayerDialogOpen} onOpenChange={setIsNewPlayerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Предложение места для нового игрока</DialogTitle>
            </DialogHeader>
            {newPlayerSuggestion && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium mb-2">
                    Новый игрок: {newPlayerSuggestion.player.player.name}
                  </h4>
                  <div className="text-sm">
                    <div>Предлагаемое место: Стол {newPlayerSuggestion.suggestion.table}, Место {newPlayerSuggestion.suggestion.seat}</div>
                    <div className="text-gray-600 mt-1">{newPlayerSuggestion.suggestion.reason}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => addPlayerToSuggestedSeat(
                      newPlayerSuggestion.player.player.id,
                      newPlayerSuggestion.suggestion.table,
                      newPlayerSuggestion.suggestion.seat
                    )}
                    className="flex-1"
                  >
                    Посадить на предложенное место
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsNewPlayerDialogOpen(false);
                      setNewPlayerSuggestion(null);
                    }}
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Отображение столов */}
      {tables.length > 0 && (
        <div className="grid gap-6">
          {tables.map((table) => (
            <Card key={table.table_number} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Стол {table.table_number}
                  </CardTitle>
                  <Badge variant={table.active_players === seatingSettings.maxPlayersPerTable ? "destructive" : "secondary"}>
                    {table.active_players}/{seatingSettings.maxPlayersPerTable}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {table.seats.map((seat) => (
                    <div
                      key={seat.seat_number}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        seat.player_id
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-muted border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Место {seat.seat_number}
                        </div>
                      </div>
                      
                      {seat.player_id ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={seat.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {seat.player_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {seat.player_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Фишки: {seat.chips?.toLocaleString()}</div>
                            {seat.elo_rating && (
                              <div>Рейтинг: {seat.elo_rating}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Свободно
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
    </div>
  );
};

export default TableSeating;