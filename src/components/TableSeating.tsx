import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    return registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  };

  const getEliminatedPlayers = () => {
    return registrations.filter(r => r.status === 'eliminated');
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
          player:players(id, name)
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
        table_status: 'active',
        average_stack: activePlayers > 0 ? 
          Math.round(seats.filter(s => s.chips).reduce((sum, s) => sum + (s.chips || 0), 0) / activePlayers) : 0
      });
    }
    
    setTables(newTables);
  };

  const initializeTablesStructure = () => {
    const activePlayers = getActivePlayers();
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
      toast({ title: "Ошибка", description: "Нет активных игроков для рассадки", variant: "destructive" });
      return;
    }

    // Очищаем все seat_number в базе данных
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    // Перемешиваем игроков случайным образом
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
          status: registration.status,
          stack_bb: Math.round((registration.chips || 0) / bigBlind)
        };
        newTables[tableIndex].active_players++;
      }
    });

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
    setIsSeatingStarted(true);
    
    toast({ 
      title: "Начальная рассадка завершена", 
      description: `${shuffledPlayers.length} игроков размещены за ${totalTables} столами` 
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
              console.error('Ошибка обновления места игрока:', error);
            }
          }
        }
      }
      
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

  const eliminatePlayer = async (playerId: string) => {
    const newTables = [...tables];
    let playerFound = false;
    
    newTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.player_id === playerId) {
          // Полностью очищаем место
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

    if (playerFound) {
      // Обновляем статус в базе данных и убираем seat_number
      await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'eliminated',
          seat_number: null
        })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      setTables(newTables);
      
      toast({ 
        title: "Игрок исключен", 
        description: "Место освобождено. Игрок удален из активных игроков." 
      });

      // Вызываем callback для обновления компонента активных игроков
      if (onSeatingUpdate) {
        onSeatingUpdate();
      }

      // Проверяем необходимость балансировки
      checkForTableBreaking(newTables);
    }
  };

  const restorePlayer = async (playerId: string) => {
    try {
      // Возвращаем игрока в статус 'registered'
      await supabase
        .from('tournament_registrations')
        .update({ status: 'registered' })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      // Находим свободное место для восстановленного игрока
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
        // Обновляем локальное состояние
        const newTables = [...tables];
        const targetTable = newTables.find(t => t.table_number === tableWithFreeSpace.table_number);
        if (targetTable) {
          // Получаем данные восстановленного игрока
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
        
        // Сохраняем в базу данных
        const absoluteSeatNumber = (tableWithFreeSpace.table_number - 1) * maxPlayersPerTable + (freeSeatIndex + 1);
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: absoluteSeatNumber })
          .eq('player_id', playerId)
          .eq('tournament_id', tournamentId);

        setTables(newTables);

        toast({ 
          title: "Игрок восстановлен", 
          description: `Игрок посажен за стол ${tableWithFreeSpace.table_number}, место ${freeSeatIndex + 1}` 
        });
      } else {
        toast({ 
          title: "Игрок восстановлен", 
          description: "Игрок возвращен в список активных. Свободных мест нет - используйте автопосадку." 
        });
      }

      // Обновляем компонент активных игроков
      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Ошибка при восстановлении игрока:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось восстановить игрока", 
        variant: "destructive" 
      });
    }
  };

  const closeTable = (tableNumber: number) => {
    const newTables = tables.filter(t => t.table_number !== tableNumber);
    setTables(newTables);
    
    toast({ 
      title: "Стол закрыт", 
      description: `Стол ${tableNumber} удален из списка столов` 
    });
  };

  const checkForTableBreaking = (currentTables: Table[]) => {
    const activeTables = currentTables.filter(table => table.active_players > 0);
    const tablesNeedingBreaking = activeTables.filter(table => table.active_players <= 3);
    
    if (tablesNeedingBreaking.length > 0) {
      toast({
        title: "Требуется балансировка столов",
        description: `За столом ${tablesNeedingBreaking[0].table_number} осталось ${tablesNeedingBreaking[0].active_players} игроков`,
        variant: "destructive"
      });
    }
  };

  const openNewTable = () => {
    const activePlayers = getActivePlayers();
    const currentTables = tables.filter(t => t.active_players > 0);
    
    if (activePlayers.length < maxPlayersPerTable * 2) {
      toast({
        title: "Недостаточно игроков",
        description: "Для открытия нового стола нужно больше игроков",
        variant: "destructive"
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
      description: `Стол ${newTableNumber} готов к заполнению. Пересадите игроков с переполненных столов.`
    });
  };

  const autoSeatLatePlayers = async () => {
    // Находим игроков без места за столом
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

    if (unseatedPlayers.length === 0) {
      toast({
        title: "Все игроки размещены",
        description: "Нет игроков без места за столом",
      });
      return;
    }

    const newTables = [...tables];
    let playersSeated = 0;

    // Стратегия размещения: сначала заполняем недоукомплектованные столы
    for (const player of unseatedPlayers) {
      let placed = false;
      
      // Ищем стол с наименьшим количеством игроков
      const availableTables = newTables
        .filter(table => table.active_players < table.max_seats)
        .sort((a, b) => a.active_players - b.active_players);

      for (const table of availableTables) {
        // Ищем первое свободное место
        const freeSeats = table.seats.filter(seat => !seat.player_id);
        if (freeSeats.length > 0) {
          // Случайно выбираем одно из свободных мест
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

      // Если не удалось разместить - открываем новый стол
      if (!placed && newTables.every(t => t.active_players >= t.max_seats)) {
        const newTableNumber = Math.max(...newTables.map(t => t.table_number)) + 1;
        const seats: TableSeat[] = [];
        
        for (let seatNum = 1; seatNum <= maxPlayersPerTable; seatNum++) {
          seats.push({
            seat_number: seatNum,
            stack_bb: 0
          });
        }

        // Размещаем игрока на первое место нового стола
        seats[0] = {
          seat_number: 1,
          player_id: player.player.id,
          player_name: player.player.name,
          chips: player.chips,
          status: player.status,
          stack_bb: Math.round((player.chips || 0) / bigBlind)
        };

        const newTable: Table = {
          table_number: newTableNumber,
          seats,
          active_players: 1,
          max_seats: maxPlayersPerTable,
          dealer_position: Math.floor(Math.random() * maxPlayersPerTable) + 1,
          table_status: 'active',
          average_stack: player.chips || 0
        };

        newTables.push(newTable);
        playersSeated++;
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
      title: "Автоматическое размещение завершено",
      description: `${playersSeated} игроков размещены за столами`
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
    
    // Находим столы с минимальным и максимальным количеством игроков
    const minPlayers = Math.min(...balanceInfo.map(t => t.players));
    const maxPlayers = Math.max(...balanceInfo.map(t => t.players));
    const difference = maxPlayers - minPlayers;
    
    const tablesNeedingPlayers = balanceInfo.filter(t => t.players === minPlayers);
    const tablesWithExtraPlayers = balanceInfo.filter(t => t.players === maxPlayers);
    
    let message = "📊 УМНЫЙ АНАЛИЗ БАЛАНСИРОВКИ:\n\n";
    
    if (difference <= 1) {
      message += "✅ Столы сбалансированы идеально (разница ≤1 игрока)";
    } else {
      message += `⚠️ Требуется балансировка (разница ${difference} игроков)\n\n`;
      
      // Конкретные рекомендации по пересадке
      if (tablesWithExtraPlayers.length > 0 && tablesNeedingPlayers.length > 0) {
        const sourceTable = tablesWithExtraPlayers[0];
        const targetTable = tablesNeedingPlayers[0];
        
        // Находим игроков с наименьшими стеками для пересадки
        const playersToMove = sourceTable.tableObj.seats
          .filter(seat => seat.player_id && seat.chips)
          .sort((a, b) => (a.chips || 0) - (b.chips || 0))
          .slice(0, Math.floor(difference / 2));
        
        message += "🎯 КОНКРЕТНЫЕ РЕКОМЕНДАЦИИ:\n\n";
        message += `📤 Пересадить СО СТОЛА ${sourceTable.tableNumber}:\n`;
        playersToMove.forEach(player => {
          const stackBB = Math.round((player.chips || 0) / bigBlind);
          message += `  • ${player.player_name} (${stackBB} BB, место ${player.seat_number})\n`;
        });
        
        message += `\n📥 НА СТОЛ ${targetTable.tableNumber} (свободных мест: ${targetTable.maxPlayers - targetTable.players})\n\n`;
        message += "🔄 Порядок действий:\n";
        message += "1. Выберите игрока с наименьшим стеком\n";
        message += "2. Используйте кнопку 'Переместить игрока'\n";
        message += "3. Повторите до выравнивания столов";
      }
      
      message += "\n📊 ТЕКУЩЕЕ СОСТОЯНИЕ:\n";
      tablesNeedingPlayers.forEach(t => {
        message += `🔻 Стол ${t.tableNumber}: ${t.players}/${t.maxPlayers} (нужно +${Math.floor(difference/2)})\n`;
      });
      tablesWithExtraPlayers.forEach(t => {
        message += `🔺 Стол ${t.tableNumber}: ${t.players}/${t.maxPlayers} (можно -${Math.floor(difference/2)})\n`;
      });
    }
    
    toast({ 
      title: "Умный анализ балансировки", 
      description: message,
      duration: 12000
    });
    
    setBalancingInProgress(false);
  };

  const createFinalTable = async () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Слишком много игроков",
        description: `Для финального стола должно остаться не более ${finalTableSize} игроков`,
        variant: "destructive"
      });
      return;
    }

    // Перемешиваем игроков для случайной рассадки
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

    // Размещаем игроков на финальном столе
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

    // Вычисляем средний стек
    const activeSeats = finalTable.seats.filter(s => s.player_id);
    if (activeSeats.length > 0) {
      finalTable.average_stack = Math.round(
        activeSeats.reduce((sum, seat) => sum + (seat.chips || 0), 0) / activeSeats.length
      );
    }

    // Очищаем все seat_number и устанавливаем новые
    await supabase
      .from('tournament_registrations')
      .update({ seat_number: null })
      .eq('tournament_id', tournamentId);

    setTables([finalTable]);
    await updateSeatingInDatabase([finalTable]);
    
    toast({
      title: "🏆 ФИНАЛЬНЫЙ СТОЛ СФОРМИРОВАН!",
      description: `${shuffledPlayers.length} игроков размещены за финальным столом`,
    });
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

  const getSeatColorClass = (seat: TableSeat) => {
    if (!seat.player_id) return 'bg-muted border-muted-foreground/20';
    if (seat.status === 'eliminated') return 'bg-destructive/10 border-destructive/30';
    if (seat.status === 'playing') return 'bg-accent/10 border-accent/30';
    return 'bg-primary/10 border-primary/30';
  };

  const getTableStatusBadge = (table: Table) => {
    if (table.is_final_table) return <Badge variant="destructive" className="bg-gradient-to-r from-yellow-400 to-orange-500">🏆 ФИНАЛ</Badge>;
    if (table.table_status === 'breaking') return <Badge variant="destructive">Ликвидация</Badge>;
    if (table.table_status === 'balancing') return <Badge variant="outline">Балансировка</Badge>;
    if (table.active_players === 0) return <Badge variant="secondary">Пустой</Badge>;
    if (table.active_players <= 3) return <Badge variant="destructive">Требует балансировки</Badge>;
    
    // Умная индикация балансировки
    const activeTables = tables.filter(t => t.active_players > 0);
    if (activeTables.length > 1) {
      const minPlayers = Math.min(...activeTables.map(t => t.active_players));
      const maxPlayers = Math.max(...activeTables.map(t => t.active_players));
      const difference = maxPlayers - minPlayers;
      
      if (difference > 1) {
        if (table.active_players === minPlayers) {
          return <Badge className="bg-blue-500 text-white">🔻 {table.active_players}/{table.max_seats} (нужны игроки)</Badge>;
        }
        if (table.active_players === maxPlayers) {
          return <Badge className="bg-orange-500 text-white">🔺 {table.active_players}/{table.max_seats} (можно пересадить)</Badge>;
        }
      }
    }
    
    return <Badge variant="default" className="bg-green-500 text-white">✅ {table.active_players}/{table.max_seats}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Статистика турнира */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{getActivePlayers().length}</div>
            <div className="text-sm text-muted-foreground">Активных игроков</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{getEliminatedPlayers().length}</div>
            <div className="text-sm text-muted-foreground">Выбыло</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{tables.filter(t => t.active_players > 0).length}</div>
            <div className="text-sm text-muted-foreground">Активных столов</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{Math.round(tables.reduce((sum, t) => sum + (t.average_stack || 0), 0) / Math.max(tables.length, 1))}</div>
            <div className="text-sm text-muted-foreground">Ср. стек (BB)</div>
          </CardContent>
        </Card>
      </div>

      {/* Уведомления */}
      {isFinalTableReady && (
        <Alert className="border-accent bg-accent/10">
          <Trophy className="h-4 w-4" />
          <AlertDescription>
            🏆 Готов к формированию финального стола! Осталось {getActivePlayers().length} игроков.
          </AlertDescription>
        </Alert>
      )}

      {/* Выбывшие игроки */}
      {getEliminatedPlayers().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5" />
              Выбывшие игроки ({getEliminatedPlayers().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {getEliminatedPlayers().map(player => (
                <div key={player.player.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded border">
                  <span className="text-sm truncate">{player.player.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => restorePlayer(player.player.id)}
                  >
                    <UserCheck className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Панель управления */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Система рассадки
          {isSeatingStarted && <Badge variant="outline">Активна</Badge>}
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {!isSeatingStarted ? (
            <Button 
              onClick={startInitialSeating}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              disabled={getActivePlayers().length === 0}
            >
              <Play className="w-4 h-4" />
              ПУСК
            </Button>
          ) : (
            <>
              <Button 
                onClick={openNewTable}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={getActivePlayers().length < maxPlayersPerTable * 2}
              >
                <Plus className="w-4 h-4" />
                Открыть новый стол
              </Button>
              
              <Button 
                onClick={checkTableBalance}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={balancingInProgress}
              >
                <ArrowUpDown className="w-4 h-4" />
                {balancingInProgress ? 'Анализ...' : 'Баланс'}
              </Button>

              <Button 
                onClick={autoSeatLatePlayers}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Авто-размещение
              </Button>

              {isFinalTableReady && (
                <Button 
                  onClick={createFinalTable}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                >
                  <Crown className="w-4 h-4" />
                  ФИНАЛ
                </Button>
              )}
            </>
          )}

          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={!isSeatingStarted}
              >
                <Target className="w-4 h-4" />
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

      {/* Столы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map(table => (
          <Card key={table.table_number} className={`relative ${table.is_final_table ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={table.is_final_table ? 'text-yellow-600 font-bold' : ''}>
                    {table.is_final_table ? '🏆 ФИНАЛЬНЫЙ СТОЛ' : `Стол ${table.table_number}`}
                  </span>
                  {table.dealer_position && (
                    <Badge variant="outline" className="text-xs">
                      D: {table.dealer_position}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getTableStatusBadge(table)}
                  {table.active_players > 0 && table.active_players <= 3 && !table.is_final_table && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => suggestPlayerMove(table.table_number)}
                      className="text-xs"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Балансировка
                    </Button>
                  )}
                  {table.active_players === 0 && !table.is_final_table && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => closeTable(table.table_number)}
                      className="text-xs"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Информация о столе */}
              {table.average_stack && table.average_stack > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                  <span>Средний стек: {Math.round(table.average_stack / bigBlind)} BB</span>
                  <span>Активных: {table.active_players}</span>
                </div>
              )}
              
              {/* Места за столом */}
              <div className="grid grid-cols-3 gap-2">
                {table.seats.map(seat => (
                  <div 
                    key={seat.seat_number}
                    className={`p-3 rounded border text-center text-sm transition-all hover:shadow-md ${getSeatColorClass(seat)} ${
                      seat.seat_number === table.dealer_position ? 'ring-1 ring-blue-400' : ''
                    }`}
                  >
                    <div className="font-bold mb-1 flex items-center justify-center gap-1">
                      #{seat.seat_number}
                      {seat.seat_number === table.dealer_position && <span className="text-blue-500">🎯</span>}
                    </div>
                    
                    {seat.player_name ? (
                      <div className="space-y-1">
                        <div className="truncate font-medium" title={seat.player_name}>
                          {seat.player_name}
                        </div>
                        
                        {seat.chips && (
                          <div className="text-xs text-muted-foreground">
                            {seat.chips.toLocaleString()}
                            {seat.stack_bb && <span className="block">{seat.stack_bb} BB</span>}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Badge 
                            variant={seat.status === 'playing' ? 'default' : seat.status === 'eliminated' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {seat.status === 'playing' ? 'В игре' : 
                             seat.status === 'eliminated' ? 'Выбыл' : 'Готов'}
                          </Badge>
                        </div>

                        {/* Кнопки управления игроком */}
                        {seat.status !== 'eliminated' && isSeatingStarted && (
                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={() => {
                                setSelectedPlayer(seat.player_id!);
                                setTargetTable(table.table_number);
                                setIsMoveDialogOpen(true);
                              }}
                            >
                              ↔️
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 text-xs"
                              onClick={() => eliminatePlayer(seat.player_id!)}
                            >
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">Свободно</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Дополнительные действия для стола */}
              {table.active_players > 0 && !table.is_final_table && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Действия:</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const newTables = [...tables];
                          const currentTable = newTables.find(t => t.table_number === table.table_number);
                          if (currentTable) {
                            currentTable.dealer_position = (currentTable.dealer_position % currentTable.max_seats) + 1;
                            setTables(newTables);
                          }
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
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