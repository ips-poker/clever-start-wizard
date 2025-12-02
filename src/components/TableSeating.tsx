import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { 
  Users, ArrowUpDown, Plus, Shuffle, Play, Crown, 
  UserMinus, AlertTriangle, Target, Settings,
  Clock, Trophy, Zap, RotateCcw, UserCheck, X
} from 'lucide-react';

interface TableSeat {
  seat_number: number;
  player_id?: string;
  player_name?: string;
  chips?: number;
  status?: string;
  is_dealer?: boolean;
  is_big_blind?: boolean;
  is_small_blind?: boolean;
  last_action?: string;
  stack_bb?: number;
}

interface Table {
  table_number: number;
  seats: TableSeat[];
  active_players: number;
  max_seats: number;
  is_final_table?: boolean;
  dealer_position: number;
  average_stack?: number;
  table_status: 'active' | 'breaking' | 'balancing' | 'final';
}

interface TableSeatingProps {
  tournamentId: string;
  registrations: any[];
  maxPlayersPerTable?: number;
  finalTableSize?: number;
  bigBlind?: number;
  onSeatingUpdate?: () => void;
}

const TableSeating = ({ 
  tournamentId, 
  registrations, 
  maxPlayersPerTable = 9,
  finalTableSize = 9,
  bigBlind = 20,
  onSeatingUpdate 
}: TableSeatingProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [targetTable, setTargetTable] = useState<number>(1);
  const [targetSeat, setTargetSeat] = useState<number>(1);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSeatingStarted, setIsSeatingStarted] = useState(false);
  const [isBreakingTables, setIsBreakingTables] = useState(false);
  const [newTableSize, setNewTableSize] = useState<number>(maxPlayersPerTable);
  const [balancingInProgress, setBalancingInProgress] = useState(false);
  const [isFinalTableReady, setIsFinalTableReady] = useState(false);
  const [playersPerTable, setPlayersPerTable] = useState<number>(9);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSeating();
  }, [tournamentId]);

  useEffect(() => {
    if (tables.length === 0 && registrations.length > 0) {
      initializeTablesStructure();
    }
  }, [registrations, maxPlayersPerTable]);

  useEffect(() => {
    checkFinalTableReadiness();
  }, [tables, finalTableSize]);

  const checkFinalTableReadiness = () => {
    const activePlayers = getActivePlayers();
    const readyForFinal = activePlayers.length <= finalTableSize && activePlayers.length > 1;
    setIsFinalTableReady(readyForFinal);
  };

  const getActivePlayers = () => {
    // Проверяем все возможные статусы активных игроков
    return registrations.filter(r => 
      r.status === 'registered' || 
      r.status === 'playing' || 
      r.status === 'confirmed' ||
      (!r.status || r.status === 'active')  // На случай если статус не установлен
    );
  };

  const getEliminatedPlayers = () => {
    return registrations.filter(r => r.status === 'eliminated');
  };

  const getPlayerAvatar = (playerId: string) => {
    // Сначала ищем игрока с аватаром из профиля
    const player = registrations.find(r => r.player.id === playerId);
    if (player?.player.avatar_url) {
      return player.player.avatar_url;
    }
    
    // Если нет аватара, используем дефолтный
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
        .not('seat_number', 'is', null)
        .neq('status', 'eliminated'); // Исключаем выбывших игроков

      if (error) {
        console.error('Ошибка загрузки рассадки:', error);
        return;
      }

      if (seatingData && seatingData.length > 0) {
        reconstructTablesFromDatabase(seatingData);
        setIsSeatingStarted(true);
      } else if (seatingData && seatingData.length === 0 && isSeatingStarted) {
        // Если нет активных игроков в рассадке, очищаем столы
        setTables([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке рассадки:', error);
    }
  };

  const reconstructTablesFromDatabase = (seatingData: any[]) => {
    if (seatingData.length === 0) return;
    
    // Восстанавливаем сохраненное значение playersPerTable из localStorage
    const savedPlayersPerTable = localStorage.getItem(`tournament_${tournamentId}_playersPerTable`);
    const detectedMaxPerTable = savedPlayersPerTable ? parseInt(savedPlayersPerTable) : playersPerTable;
    
    // Обновляем state если значение отличается
    if (detectedMaxPerTable !== playersPerTable) {
      setPlayersPerTable(detectedMaxPerTable);
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
          stack_bb: seatData?.chips ? Math.round(seatData.chips / bigBlind) : undefined
        });
      }
      
      const activePlayers = seats.filter(s => s.player_id && s.status !== 'eliminated').length;
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: activePlayers,
        max_seats: detectedMaxPerTable,
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
    console.log('Инициализация столов:', {
      totalRegistrations: registrations.length,
      activePlayers: activePlayers.length,
      playersPerTable,
      registrationStatuses: registrations.map(r => ({name: r.player?.name, status: r.status}))
    });
    
    if (activePlayers.length === 0) {
      console.log('Нет активных игроков для инициализации столов');
      return;
    }
    
    const totalTables = Math.ceil(activePlayers.length / playersPerTable);
    console.log(`Создаем ${totalTables} столов для ${activePlayers.length} игроков`);
    
    const newTables: Table[] = [];
    
    for (let tableNum = 1; tableNum <= totalTables; tableNum++) {
      const seats: TableSeat[] = [];
      
      for (let seatNum = 1; seatNum <= playersPerTable; seatNum++) {
        seats.push({
          seat_number: seatNum,
          stack_bb: 0
        });
      }
      
      newTables.push({
        table_number: tableNum,
        seats,
        active_players: 0,
        max_seats: playersPerTable,
        dealer_position: 1,
        table_status: 'active',
        average_stack: 0
      });
    }
    
    console.log('Созданные столы:', newTables);
    setTables(newTables);
  };

  // Функция для расчета сбалансированного распределения игроков по столам
  const calculateBalancedDistribution = (totalPlayers: number, maxPerTable: number) => {
    const totalTables = Math.ceil(totalPlayers / maxPerTable);
    const distribution: number[] = [];
    
    // Базовое количество игроков за столом
    const basePlayersPerTable = Math.floor(totalPlayers / totalTables);
    // Количество столов с дополнительным игроком
    const tablesWithExtra = totalPlayers % totalTables;
    
    for (let i = 0; i < totalTables; i++) {
      if (i < tablesWithExtra) {
        distribution.push(basePlayersPerTable + 1);
      } else {
        distribution.push(basePlayersPerTable);
      }
    }
    
    return distribution;
  };

  const startInitialSeating = async () => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) {
      toast({ title: "Ошибка", description: "Нет активных игроков для рассадки", variant: "destructive" });
      return;
    }

    // Сохраняем playersPerTable в localStorage для восстановления после перезагрузки
    localStorage.setItem(`tournament_${tournamentId}_playersPerTable`, playersPerTable.toString());

    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    const distribution = calculateBalancedDistribution(shuffledPlayers.length, playersPerTable);
    
    const newTables: Table[] = [];
    let playerIndex = 0;
    
    // Создаем столы согласно сбалансированному распределению
    for (let tableNum = 1; tableNum <= distribution.length; tableNum++) {
      const playersAtThisTable = distribution[tableNum - 1];
      const seats: TableSeat[] = [];
      
      // Создаем места по максимальному количеству для этого стола
      for (let seatNum = 1; seatNum <= playersPerTable; seatNum++) {
        seats.push({
          seat_number: seatNum,
          stack_bb: 0
        });
      }
      
      const table: Table = {
        table_number: tableNum,
        seats,
        active_players: 0,
        max_seats: playersPerTable,
        dealer_position: Math.floor(Math.random() * playersPerTable) + 1,
        table_status: 'active',
        average_stack: 0
      };
      
      // Рассаживаем игроков за этот стол рандомно
      const availableSeats = [...Array(playersPerTable).keys()];
      availableSeats.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < playersAtThisTable && playerIndex < shuffledPlayers.length; i++) {
        const registration = shuffledPlayers[playerIndex];
        const seatIndex = availableSeats[i];
        
        table.seats[seatIndex] = {
          seat_number: seatIndex + 1,
          player_id: registration.player.id,
          player_name: registration.player.name,
          chips: registration.chips,
          status: registration.status,
          stack_bb: Math.round((registration.chips || 0) / bigBlind)
        };
        table.active_players++;
        playerIndex++;
      }
      
      // Рассчитываем средний стек
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
    
    const minPlayers = Math.min(...distribution);
    const maxPlayers = Math.max(...distribution);
    
    toast({ 
      title: "Рассадка завершена", 
      description: `${shuffledPlayers.length} игроков рассажено за ${newTables.length} столов (${minPlayers}-${maxPlayers} игроков/стол)`,
      className: "font-medium"
    });
  };

  const updateSeatingInDatabase = async (tablesData: Table[]) => {
    try {
      for (const table of tablesData) {
        for (const seat of table.seats) {
          if (seat.player_id) {
            const seatNumber = (table.table_number - 1) * playersPerTable + seat.seat_number;
            
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
        variant: "destructive",
        className: "font-medium"
      });
    }
  };


  const eliminatePlayer = async (playerId: string) => {
    const playerRegistration = registrations.find(r => r.player_id === playerId);
    if (!playerRegistration) {
      console.error('Регистрация игрока не найдена');
      return;
    }

    // МГНОВЕННО обновляем UI локально
    const newTables = [...tables];
    let playerFound = false;
    
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id === playerId) {
          seat.status = undefined;
          seat.player_id = undefined;
          seat.player_name = undefined;
          seat.chips = undefined;
          seat.stack_bb = undefined;
          table.active_players--;
          playerFound = true;
        }
      });
    });

    if (!playerFound) return;

    setTables(newTables);
    
    toast({ 
      title: "Игрок выбыл", 
      description: `Игрок исключен`,
      className: "font-medium"
    });

    try {
      // Сначала обнуляем seat_number
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      // Затем перераспределяем фишки и обновляем статус
      await supabase.rpc('redistribute_chips_on_elimination', {
        eliminated_player_id: playerId,
        tournament_id_param: tournamentId
      });

      // Перезагружаем данные для синхронизации
      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
      await loadSavedSeating();
    } catch (error) {
      console.error('Ошибка выбывания игрока:', error);
    }
  };

  const recalculatePositions = async () => {
    try {
      // Пересчитываем финальные позиции для всех выбывших игроков
      await supabase.rpc('calculate_final_positions', {
        tournament_id_param: tournamentId
      });

      toast({ 
        title: "Позиции пересчитаны", 
        description: "Финальные позиции всех выбывших игроков обновлены согласно времени выбывания.",
        className: "font-medium"
      });

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error recalculating positions:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось пересчитать позиции", 
        variant: "destructive",
        className: "font-medium"
      });
    }
  };

  const restorePlayer = async (playerId: string) => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({ status: 'registered' })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      let tableWithFreeSpace = null;
      let freeSeatIndex = -1;
      
      for (const table of tables) {
        const freeIndex = table.seats.findIndex(seat => !seat.player_id);
        if (freeIndex !== -1) {
          tableWithFreeSpace = table;
          freeSeatIndex = freeIndex;
          break;
        }
      }

      if (tableWithFreeSpace && freeSeatIndex !== -1) {
        const newTables = [...tables];
        const targetTable = newTables.find(t => t.table_number === tableWithFreeSpace.table_number);
        if (targetTable) {
          const restoredPlayer = registrations.find(r => r.player.id === playerId);
          if (restoredPlayer) {
            targetTable.seats[freeSeatIndex] = {
              seat_number: freeSeatIndex + 1,
              player_id: playerId,
              player_name: restoredPlayer.player.name,
              chips: restoredPlayer.chips,
              status: 'registered',
              stack_bb: Math.round((restoredPlayer.chips || 0) / bigBlind)
            };
            targetTable.active_players++;
          }
        }
        
        const absoluteSeatNumber = (tableWithFreeSpace.table_number - 1) * playersPerTable + (freeSeatIndex + 1);
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: absoluteSeatNumber })
          .eq('player_id', playerId)
          .eq('tournament_id', tournamentId);

        setTables(newTables);

        toast({ 
          title: "Игрок восстановлен", 
          description: `Игрок посажен за стол ${tableWithFreeSpace.table_number}, место ${freeSeatIndex + 1}`,
          className: "font-medium"
        });
      } else {
        toast({ 
          title: "Игрок восстановлен", 
          description: "Игрок возвращен в активный список. Нет свободных мест - используйте авто-рассадку.",
          className: "font-medium"
        });
      }

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error restoring player:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось восстановить игрока", 
        variant: "destructive",
        className: "font-medium"
      });
    }
  };

  const createFinalTable = async () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Слишком много игроков",
        description: `Финальный стол требует ${finalTableSize} или меньше игроков`,
        variant: "destructive",
        className: "font-medium"
      });
      return;
    }

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    const seats: TableSeat[] = [];
    
    for (let seatNum = 1; seatNum <= finalTableSize; seatNum++) {
      seats.push({
        seat_number: seatNum,
        stack_bb: 0
      });
    }

    const finalTable: Table = {
      table_number: 1,
      seats,
      active_players: 0,
      max_seats: finalTableSize,
      dealer_position: Math.floor(Math.random() * finalTableSize) + 1,
      table_status: 'final',
      is_final_table: true,
      average_stack: 0
    };

    shuffledPlayers.forEach((registration, index) => {
      if (index < finalTableSize) {
        finalTable.seats[index].player_id = registration.player.id;
        finalTable.seats[index].player_name = registration.player.name;
        finalTable.seats[index].chips = registration.chips;
        finalTable.seats[index].status = registration.status;
        finalTable.seats[index].stack_bb = Math.round((registration.chips || 0) / bigBlind);
        finalTable.active_players++;
      }
    });

    const activeSeats = finalTable.seats.filter(s => s.player_id);
    if (activeSeats.length > 0) {
      finalTable.average_stack = Math.round(
        activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length
      );
    }

    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    setTables([finalTable]);
    await updateSeatingInDatabase([finalTable]);
    
    toast({
      title: "🏆 ФИНАЛЬНЫЙ СТОЛ СФОРМИРОВАН!",
      description: `${shuffledPlayers.length} игроков рассажено за финальный стол`,
      className: "font-bold text-lg"
    });
  };

  const autoSeatLatePlayers = async () => {
    const seatedPlayerIds = new Set();
    tables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id) {
          seatedPlayerIds.add(seat.player_id);
        }
      });
    });

    const unseatedPlayers = getActivePlayers().filter(player => 
      !seatedPlayerIds.has(player.player.id)
    );

    console.log('Авто-рассадка:', {
      totalActivePlayers: getActivePlayers().length,
      seatedPlayerIds: Array.from(seatedPlayerIds),
      unseatedPlayers: unseatedPlayers.map(p => p.player?.name),
      unseatedCount: unseatedPlayers.length,
      currentTables: tables.length
    });

    if (unseatedPlayers.length === 0) {
      toast({
        title: "Все игроки рассажены",
        description: "Нет игроков без мест",
        className: "font-medium"
      });
      return;
    }

    let newTables = [...tables];
    let playersSeated = 0;

    // Сначала пытаемся рассадить в существующие столы
    for (const player of unseatedPlayers) {
      let placed = false;
      
      const availableTables = newTables
        .filter(table => table.active_players < table.max_seats)
        .sort((a, b) => a.active_players - b.active_players);

      for (const table of availableTables) {
        const freeSeats = table.seats.filter(seat => !seat.player_id);
        if (freeSeats.length > 0) {
          const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
          
          randomSeat.player_id = player.player.id;
          randomSeat.player_name = player.player.name;
          randomSeat.chips = player.chips;
          randomSeat.status = player.status;
          randomSeat.stack_bb = Math.round((player.chips || 0) / bigBlind);
          
          table.active_players++;
          playersSeated++;
          placed = true;
          break;
        }
      }
      
      // Если не удалось разместить в существующие столы, создаем новые
      if (!placed) {
        const remainingUnseated = unseatedPlayers.slice(unseatedPlayers.indexOf(player));
        const newTablesNeeded = Math.ceil(remainingUnseated.length / playersPerTable);
        
        for (let i = 0; i < newTablesNeeded; i++) {
          const newTableNumber = Math.max(...newTables.map(t => t.table_number)) + 1;
          const seats: TableSeat[] = [];
          
          for (let seatNum = 1; seatNum <= playersPerTable; seatNum++) {
            seats.push({
              seat_number: seatNum,
              stack_bb: 0
            });
          }

          const newTable: Table = {
            table_number: newTableNumber,
            seats,
            active_players: 0,
            max_seats: playersPerTable,
            dealer_position: Math.floor(Math.random() * playersPerTable) + 1,
            table_status: 'active',
            average_stack: 0
          };

          newTables.push(newTable);
        }
        
        // Рассаживаем оставшихся игроков по новым столам
        let tableIndex = newTables.length - newTablesNeeded;
        for (let i = 0; i < remainingUnseated.length; i++) {
          const currentPlayer = remainingUnseated[i];
          const currentTable = newTables[tableIndex];
          const seatIndex = i % playersPerTable;
          
          if (seatIndex === 0 && i > 0) {
            tableIndex++;
          }
          
          currentTable.seats[seatIndex].player_id = currentPlayer.player.id;
          currentTable.seats[seatIndex].player_name = currentPlayer.player.name;
          currentTable.seats[seatIndex].chips = currentPlayer.chips;
          currentTable.seats[seatIndex].status = currentPlayer.status;
          currentTable.seats[seatIndex].stack_bb = Math.round((currentPlayer.chips || 0) / bigBlind);
          
          currentTable.active_players++;
          playersSeated++;
        }
        
        break; // Выходим из цикла, так как уже обработали всех оставшихся игроков
      }
    }

    // Пересчитываем средние стеки
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

    toast({
      title: "Авто-рассадка завершена",
      description: `${playersSeated} игроков рассажено. Всего столов: ${newTables.length}`,
      className: "font-medium"
    });
  };

  const checkTableBalance = () => {
    setBalancingInProgress(true);
    
    const activeTables = tables.filter(t => t.active_players > 0);
    const balanceInfo = activeTables.map(table => ({
      tableNumber: table.table_number,
      players: table.active_players,
      maxPlayers: table.max_seats,
      tableObj: table
    }));
    
    const minPlayers = Math.min(...balanceInfo.map(t => t.players));
    const maxPlayers = Math.max(...balanceInfo.map(t => t.players));
    const difference = maxPlayers - minPlayers;
    
    let message = "📊 Анализ баланса:\n\n";
    
    if (difference <= 1) {
      message += "✅ Столы идеально сбалансированы (разница ≤1 игрока)";
    } else {
      message += `⚠️ Требуется балансировка (разница ${difference} игроков)\n\n`;
      message += "📊 Текущее состояние:\n";
      balanceInfo.forEach(t => {
        if (t.players === minPlayers) {
          message += `🔻 Стол ${t.tableNumber}: ${t.players}/${t.maxPlayers} (нужны игроки)\n`;
        }
        if (t.players === maxPlayers) {
          message += `🔺 Стол ${t.tableNumber}: ${t.players}/${t.maxPlayers} (можно переместить игроков)\n`;
        }
      });
    }
    
    toast({ 
      title: "Анализ баланса", 
      description: message,
      duration: 8000,
      className: "font-medium"
    });
    
    setBalancingInProgress(false);
  };

  const openNewTable = () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length < maxPlayersPerTable * 2) {
      toast({
        title: "Недостаточно игроков",
        description: "Нужно больше игроков для открытия нового стола",
        variant: "destructive",
        className: "font-medium"
      });
      return;
    }

    const newTableNumber = Math.max(...tables.map(t => t.table_number)) + 1;
    const seats: TableSeat[] = [];
    
    for (let seatNum = 1; seatNum <= maxPlayersPerTable; seatNum++) {
      seats.push({
        seat_number: seatNum,
        stack_bb: 0
      });
    }

    const newTable: Table = {
      table_number: newTableNumber,
      seats,
      active_players: 0,
      max_seats: maxPlayersPerTable,
      dealer_position: 1,
      table_status: 'active',
      average_stack: 0
    };

    const newTables = [...tables, newTable];
    setTables(newTables);

    toast({
      title: "Новый стол открыт",
      description: `Стол ${newTableNumber} готов для игроков.`,
      className: "font-medium"
    });
  };

  const movePlayer = async (playerId: string, fromTable: number, fromSeat: number, toTable: number, toSeat: number) => {
    try {
      // Проверяем, что целевое место свободно
      const targetTableObj = tables.find(t => t.table_number === toTable);
      if (!targetTableObj) {
        toast({
          title: "Ошибка",
          description: "Целевой стол не найден",
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      const targetSeatObj = targetTableObj.seats.find(s => s.seat_number === toSeat);
      if (!targetSeatObj || targetSeatObj.player_id) {
        toast({
          title: "Ошибка", 
          description: "Целевое место занято",
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      // Находим игрока
      const sourceTableObj = tables.find(t => t.table_number === fromTable);
      if (!sourceTableObj) {
        toast({
          title: "Ошибка",
          description: "Исходный стол не найден", 
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      const sourceSeatObj = sourceTableObj.seats.find(s => s.seat_number === fromSeat && s.player_id === playerId);
      if (!sourceSeatObj) {
        toast({
          title: "Ошибка",
          description: "Игрок не найден на исходном месте",
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      // Сначала обновляем в базе данных
      const newAbsoluteSeatNumber = (toTable - 1) * playersPerTable + toSeat;
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ seat_number: newAbsoluteSeatNumber })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      if (error) {
        throw error;
      }

      // Затем обновляем UI
      const newTables = [...tables];
      const newSourceTable = newTables.find(t => t.table_number === fromTable);
      const newTargetTable = newTables.find(t => t.table_number === toTable);

      if (newSourceTable && newTargetTable) {
        // Очищаем исходное место
        const sourceSeat = newSourceTable.seats.find(s => s.seat_number === fromSeat);
        if (sourceSeat) {
          sourceSeat.player_id = undefined;
          sourceSeat.player_name = undefined;
          sourceSeat.chips = undefined;
          sourceSeat.status = undefined;
          sourceSeat.stack_bb = undefined;
          newSourceTable.active_players--;
        }

        // Занимаем новое место
        const targetSeat = newTargetTable.seats.find(s => s.seat_number === toSeat);
        if (targetSeat) {
          targetSeat.player_id = sourceSeatObj.player_id;
          targetSeat.player_name = sourceSeatObj.player_name;
          targetSeat.chips = sourceSeatObj.chips;
          targetSeat.status = sourceSeatObj.status;
          targetSeat.stack_bb = sourceSeatObj.stack_bb;
          newTargetTable.active_players++;
        }

        // Обновляем средний стек для обеих столов
        [newSourceTable, newTargetTable].forEach(table => {
          const activeSeats = table.seats.filter(s => s.player_id);
          table.average_stack = activeSeats.length > 0 
            ? Math.round(activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length)
            : 0;
        });

        setTables(newTables);

        toast({
          title: "Игрок перемещен",
          description: `${sourceSeatObj.player_name} перемещен со стола ${fromTable} места ${fromSeat} за стол ${toTable} место ${toSeat}`,
          className: "font-medium"
        });

        // Перезагружаем данные для синхронизации
        if (onSeatingUpdate) {
          onSeatingUpdate();
        }
        await loadSavedSeating();
      }
    } catch (error) {
      console.error('Error moving player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось переместить игрока",
        variant: "destructive",
        className: "font-medium"
      });
    }
  };

  const closeTable = async (tableNumber: number) => {
    try {
      const tableToClose = tables.find(t => t.table_number === tableNumber);
      if (!tableToClose) {
        toast({
          title: "Ошибка",
          description: "Стол не найден",
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      if (tableToClose.active_players === 0) {
        // Просто удаляем пустой стол
        const newTables = tables.filter(t => t.table_number !== tableNumber);
        setTables(newTables);
        toast({
          title: "Стол закрыт",
          description: `Пустой стол ${tableNumber} удален`,
          className: "font-medium"
        });
        return;
      }

      // Находим столы с свободными местами
      const availableTables = tables.filter(t => 
        t.table_number !== tableNumber && 
        t.active_players < t.max_seats
      );

      if (availableTables.length === 0) {
        toast({
          title: "Невозможно закрыть стол",
          description: "Нет свободных мест за другими столами",
          variant: "destructive",
          className: "font-medium"
        });
        return;
      }

      // Перемещаем игроков
      const playersToMove = tableToClose.seats.filter(s => s.player_id);
      const newTables = [...tables];
      let movedPlayers = 0;

      for (const player of playersToMove) {
        // Находим свободное место
        let placed = false;
        for (const targetTable of availableTables) {
          const freeSeats = targetTable.seats.filter(s => !s.player_id);
          if (freeSeats.length > 0) {
            const freeSeat = freeSeats[0];
            
            // Обновляем место
            freeSeat.player_id = player.player_id;
            freeSeat.player_name = player.player_name;
            freeSeat.chips = player.chips;
            freeSeat.status = player.status;
            freeSeat.stack_bb = player.stack_bb;
            
            // Обновляем счетчики
            const newTargetTable = newTables.find(t => t.table_number === targetTable.table_number);
            if (newTargetTable) {
              newTargetTable.active_players++;
            }

            // Обновляем в БД
            const newAbsoluteSeatNumber = (targetTable.table_number - 1) * playersPerTable + freeSeat.seat_number;
            await supabase
              .from('tournament_registrations')
              .update({ seat_number: newAbsoluteSeatNumber })
              .eq('player_id', player.player_id)
              .eq('tournament_id', tournamentId);

            movedPlayers++;
            placed = true;
            break;
          }
        }

        if (!placed) {
          toast({
            title: "Предупреждение",
            description: `Не удалось переместить ${player.player_name} - нет свободных мест`,
            variant: "destructive",
            className: "font-medium"
          });
        }
      }

      // Удаляем закрытый стол
      const finalTables = newTables.filter(t => t.table_number !== tableNumber);
      
      // Пересчитываем средние стеки
      finalTables.forEach(table => {
        const activeSeats = table.seats.filter(s => s.player_id);
        table.average_stack = activeSeats.length > 0 
          ? Math.round(activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length)
          : 0;
      });

      setTables(finalTables);

      toast({
        title: "Стол закрыт",
        description: `Стол ${tableNumber} закрыт. ${movedPlayers} игроков перемещено.`,
        className: "font-medium"
      });

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error closing table:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось закрыть стол",
        variant: "destructive",
        className: "font-medium"
      });
    }
  };

  const getAvailableSeats = (tableNumber: number) => {
    const table = tables.find(t => t.table_number === tableNumber);
    if (!table) return [];
    
    return table.seats.filter(seat => !seat.player_id).map(seat => seat.seat_number);
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Card */}
      <Card className="bg-card brutal-border overflow-hidden">
        <CardHeader className="bg-secondary/60 border-b-2 border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              Рассадка игроков
            </CardTitle>
            <div>
              {isSeatingStarted ? (
                <Badge className="bg-green-500/20 text-green-500 border-2 border-green-500/50 font-black">
                  АКТИВНА
                </Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground border-2 border-border font-bold">
                  В ОЖИДАНИИ
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Активные</div>
              <div className="text-3xl font-black text-green-500">{getActivePlayers().length}</div>
            </div>
            <div className="text-center p-4 bg-destructive/10 rounded-xl border-2 border-destructive/30">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Выбывшие</div>
              <div className="text-3xl font-black text-destructive">{getEliminatedPlayers().length}</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-xl border-2 border-blue-500/30">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Столы</div>
              <div className="text-3xl font-black text-blue-500">{tables.filter(t => t.active_players > 0).length}</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-xl border-2 border-primary/30">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Ср. стек BB</div>
              <div className="text-3xl font-black text-primary">{Math.round(tables.reduce((sum, t) => sum + (t.average_stack || 0), 0) / Math.max(tables.length, 1))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Table Ready Alert */}
      {isFinalTableReady && (
        <Card className="bg-primary/10 border-2 border-primary/50">
          <CardContent className="p-6 text-center">
            <Crown className="w-10 h-10 mx-auto mb-3 text-primary" />
            <div className="text-xl font-black text-foreground mb-2">Финальный стол готов</div>
            <div className="text-muted-foreground">Осталось {getActivePlayers().length} игроков</div>
          </CardContent>
        </Card>
      )}

      {/* Eliminated Players */}
      {getEliminatedPlayers().length > 0 && (
        <Card className="bg-card brutal-border">
          <CardHeader className="bg-secondary/60 border-b-2 border-border">
            <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
              <div className="p-2 rounded-lg bg-destructive/20 border border-destructive/30">
                <UserMinus className="w-5 h-5 text-destructive" />
              </div>
              Выбывшие игроки ({getEliminatedPlayers().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getEliminatedPlayers().map(player => (
                <Card key={player.player.id} className="bg-secondary/40 border-2 border-border p-4">
                  <div className="text-center">
                    <Avatar className="w-14 h-14 mx-auto mb-3 border-2 border-border">
                      <AvatarImage src={getPlayerAvatar(player.player.id)} alt={player.player.name} />
                      <AvatarFallback className="bg-secondary text-foreground font-black">
                        {player.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-bold text-foreground mb-1">{player.player.name}</div>
                    <Badge className="bg-destructive/20 text-destructive border border-destructive/30 mb-3">Выбыл</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-2 border-green-500/50 text-green-500 hover:bg-green-500/20"
                      onClick={() => restorePlayer(player.player.id)}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Восстановить
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Panel */}
      <Card className="bg-card brutal-border">
        <CardHeader className="bg-secondary/60 border-b-2 border-border">
          <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            Панель управления
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!isSeatingStarted && (
            <div className="mb-6 flex items-center justify-center gap-4">
              <Label className="text-muted-foreground font-bold text-sm uppercase">Игроков за столом:</Label>
              <Select value={playersPerTable.toString()} onValueChange={(value) => setPlayersPerTable(Number(value))}>
                <SelectTrigger className="w-32 bg-secondary/50 border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 игроков</SelectItem>
                  <SelectItem value="9">9 игроков</SelectItem>
                  <SelectItem value="10">10 игроков</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 justify-center">
            {!isSeatingStarted ? (
              <Button 
                onClick={startInitialSeating}
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-3 font-black text-base"
                disabled={getActivePlayers().length === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                НАЧАТЬ РАССАДКУ
              </Button>
            ) : (
              <>
                <Button 
                  onClick={openNewTable}
                  variant="outline"
                  className="border-2 border-border bg-secondary/50 hover:bg-secondary"
                  disabled={getActivePlayers().length < playersPerTable * 2}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Новый стол
                </Button>
                
                <Button 
                  onClick={checkTableBalance}
                  variant="outline"
                  className="border-2 border-border bg-secondary/50 hover:bg-secondary"
                  disabled={balancingInProgress}
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {balancingInProgress ? 'Анализ...' : 'Баланс'}
                </Button>

                <Button 
                  onClick={autoSeatLatePlayers}
                  variant="outline"
                  className="border-2 border-border bg-secondary/50 hover:bg-secondary"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Авто-рассадка
                </Button>

                <Button 
                  onClick={recalculatePositions}
                  variant="outline"
                  className="border-2 border-border bg-secondary/50 hover:bg-secondary"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Позиции
                </Button>

                {isFinalTableReady && (
                  <Button 
                    onClick={createFinalTable}
                    className="bg-primary hover:bg-primary/80 text-primary-foreground px-6 font-black"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    ФИНАЛЬНЫЙ СТОЛ
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Столы в стиле приглашений */}
      {tables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tables.map(table => (
            <Card 
              key={table.table_number} 
              className={`w-full border shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)] ${
                table.is_final_table 
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' 
                  : 'bg-white border-slate-200'
              }`}
              style={{ 
                background: table.is_final_table 
                  ? 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)' 
                  : 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' 
              }}
            >
              <CardContent className="p-0">
                <div className="relative p-6">
                  {/* Заголовок стола */}
                  <div className="text-center mb-6 relative">
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">
                      {table.is_final_table ? 'Финальный стол' : `Стол ${table.table_number}`}
                    </div>
                    <div className="text-lg font-light text-slate-900">
                      {table.active_players}/{table.max_seats} Игроков
                    </div>
                    {table.is_final_table && (
                      <div className="text-yellow-600 text-xs font-light mt-1">🏆 Чемпионский раунд</div>
                    )}
                    
                    {/* Кнопка закрытия стола */}
                    {!table.is_final_table && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-0 right-0 h-6 w-6 p-0 bg-white border-slate-200 text-red-600 hover:bg-red-50"
                        onClick={() => closeTable(table.table_number)}
                        title="Закрыть стол"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="w-full h-px bg-slate-200 mb-6"></div>
                  
                  {/* Места за столом */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {table.seats.map(seat => (
                      <div 
                        key={seat.seat_number} 
                        className={`
                          p-3 rounded-lg text-center transition-all
                          ${seat.player_id 
                            ? 'bg-slate-100 border border-slate-200' 
                            : 'bg-slate-50 border border-slate-100 opacity-50'
                          }
                        `}
                      >
                        <div className="text-xs text-slate-500 mb-1 font-light">Место {seat.seat_number}</div>
                        {seat.player_id ? (
                          <div>
                            <Avatar className="w-10 h-10 mx-auto mb-2">
                              <AvatarImage src={getPlayerAvatar(seat.player_id)} alt={seat.player_name} />
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                                {seat.player_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs font-light text-slate-900 truncate">{seat.player_name}</div>
                            <div className="text-xs text-slate-600 mb-2 font-light">{seat.stack_bb} BB</div>
                            
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-6 px-1 text-xs bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    onClick={() => {
                                      setSelectedPlayer(seat.player_id!);
                                      // Найдем первый доступный стол и место
                                      const tablesWithFreeSeats = tables.filter(t => 
                                        t.table_number !== table.table_number && 
                                        t.seats.some(s => !s.player_id)
                                      );
                                      if (tablesWithFreeSeats.length > 0) {
                                        const firstTable = tablesWithFreeSeats[0];
                                        const firstFreeSeat = firstTable.seats.find(s => !s.player_id);
                                        setTargetTable(firstTable.table_number);
                                        setTargetSeat(firstFreeSeat?.seat_number || 1);
                                      }
                                    }}
                                  >
                                    <ArrowUpDown className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Переместить {seat.player_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Select value={targetTable.toString()} onValueChange={(v) => {
                                        const newTable = Number(v);
                                        setTargetTable(newTable);
                                        // Автоматически выберем первое свободное место на новом столе
                                        const availableSeats = getAvailableSeats(newTable);
                                        if (availableSeats.length > 0) {
                                          setTargetSeat(availableSeats[0]);
                                        }
                                      }}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Выберите стол" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {tables
                                            .filter(t => t.table_number !== table.table_number)
                                            .map(t => {
                                              const freeSeats = getAvailableSeats(t.table_number);
                                              return (
                                                <SelectItem key={t.table_number} value={t.table_number.toString()}>
                                                  Стол {t.table_number} ({freeSeats.length} свободных мест)
                                                </SelectItem>
                                              );
                                            })}
                                        </SelectContent>
                                      </Select>
                                      
                                      <Select value={targetSeat.toString()} onValueChange={(v) => setTargetSeat(Number(v))}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Выберите место" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getAvailableSeats(targetTable).map(seatNum => (
                                            <SelectItem key={seatNum} value={seatNum.toString()}>
                                              Место {seatNum}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="text-sm text-slate-600">
                                      Доступно мест: {getAvailableSeats(targetTable).length}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={() => {
                                          if (seat.player_id) {
                                            movePlayer(
                                              seat.player_id, 
                                              table.table_number, 
                                              seat.seat_number, 
                                              targetTable, 
                                              targetSeat
                                            );
                                          }
                                        }}
                                        className="flex-1"
                                        disabled={getAvailableSeats(targetTable).length === 0}
                                      >
                                        <ArrowUpDown className="w-4 h-4 mr-2" />
                                        Переместить
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-6 px-1 text-xs bg-white border-slate-200 text-red-600 hover:bg-red-50"
                                onClick={() => eliminatePlayer(seat.player_id!)}
                              >
                                <UserMinus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 font-light">Пусто</div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Статистика стола */}
                  {table.active_players > 0 && (
                    <div className="text-center bg-slate-50 rounded-lg py-3">
                      <div className="text-slate-500 text-xs font-light mb-1 tracking-wide uppercase">Средний стек</div>
                      <div className="text-sm font-light text-slate-900">{Math.round(table.average_stack || 0)} фишек</div>
                    </div>
                  )}
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