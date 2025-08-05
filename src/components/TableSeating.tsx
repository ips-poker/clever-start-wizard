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

  const getPlayerAvatar = (playerId: string) => {
    // Генерируем случайную аватарку из коллекции
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

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }

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
    
    // Обновляем seat_number в базе данных
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

  const closeTable = (tableNumber: number) => {
    const newTables = tables.filter(t => t.table_number !== tableNumber);
    setTables(newTables);
    
    toast({ 
      title: "Стол закрыт", 
      description: `Стол ${tableNumber} удален из списка столов` 
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Главный заголовок в стиле таймера */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-slate-200/60 shadow-floating">
        {/* Декоративные элементы как в приглашениях */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-8 left-8 text-6xl text-slate-400/40 animate-float [animation-delay:0s] font-serif">♠</div>
          <div className="absolute top-16 right-12 text-5xl text-slate-400/30 animate-float [animation-delay:1s] font-serif">♥</div>
          <div className="absolute bottom-16 left-12 text-6xl text-slate-400/40 animate-float [animation-delay:2s] font-serif">♦</div>
          <div className="absolute bottom-8 right-8 text-5xl text-slate-400/30 animate-float [animation-delay:3s] font-serif">♣</div>
        </div>

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-serif font-semibold text-slate-800 tracking-tight mb-2">
                Система рассадки игроков
              </h1>
              <p className="text-lg font-body text-slate-600 font-light">
                Профессиональное управление столами и балансировкой турнира
              </p>
            </div>
            {isSeatingStarted && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-2 font-medium text-base shadow-subtle">
                  ✅ Система активна
                </Badge>
              </div>
            )}
          </div>

          {/* Статистические блоки в стиле таймера */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
              <div className="relative p-6 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-105">
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold text-slate-800 text-center mb-1">{getActivePlayers().length}</div>
                <div className="text-sm font-body font-medium text-slate-600 text-center">Активных игроков</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
              <div className="relative p-6 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-105">
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                    <UserMinus className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold text-slate-800 text-center mb-1">{getEliminatedPlayers().length}</div>
                <div className="text-sm font-body font-medium text-slate-600 text-center">Выбыло</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
              <div className="relative p-6 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-105">
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold text-slate-800 text-center mb-1">{tables.filter(t => t.active_players > 0).length}</div>
                <div className="text-sm font-body font-medium text-slate-600 text-center">Активных столов</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
              <div className="relative p-6 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-105">
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold text-slate-800 text-center mb-1">{Math.round(tables.reduce((sum, t) => sum + (t.average_stack || 0), 0) / Math.max(tables.length, 1))}</div>
                <div className="text-sm font-body font-medium text-slate-600 text-center">Ср. стек (BB)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Уведомления в стиле таймера */}
      {isFinalTableReady && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border border-amber-200/60 shadow-accent">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10"></div>
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl animate-pulse-glow">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-semibold text-amber-800 mb-1">Готов к формированию финального стола!</h3>
                <p className="text-amber-700 font-body">Осталось {getActivePlayers().length} игроков. Самое время создать финальный стол.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Выбывшие игроки в премиальном стиле */}
      {getEliminatedPlayers().length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-red-50/30 border border-slate-200/60 shadow-floating">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5"></div>
          <div className="relative">
            <div className="p-6 border-b border-slate-200/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                  <UserMinus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-semibold text-slate-800">Выбывшие игроки</h2>
                  <p className="text-slate-600 font-body font-light mt-1">
                    {getEliminatedPlayers().length} игроков покинули турнир. Можно восстановить для возвращения в игру
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEliminatedPlayers().map(player => (
                  <div key={player.player.id} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                    <div className="relative p-5 bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-105">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <img 
                            src={getPlayerAvatar(player.player.id)} 
                            alt={player.player.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif font-semibold text-slate-800 truncate text-lg">{player.player.name}</div>
                          <div className="text-sm text-slate-500 font-body">Исключён из турнира</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium transition-all duration-300 hover:scale-105 shadow-subtle"
                        onClick={() => restorePlayer(player.player.id)}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Восстановить игрока
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Панель управления в стиле таймера */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-purple-50/30 border border-slate-200/60 shadow-floating">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5"></div>
        <div className="relative p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-semibold text-slate-800">Панель управления столами</h2>
              <p className="text-slate-600 font-body font-light mt-1">
                Инструменты для управления рассадкой и балансировкой игроков
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {!isSeatingStarted ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                <Button 
                  onClick={startInitialSeating}
                  className="relative flex items-center gap-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 transition-all duration-500 hover:scale-105 shadow-elevated text-lg px-8 py-4 rounded-2xl font-serif font-semibold"
                  disabled={getActivePlayers().length === 0}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-2xl"></div>
                  <Play className="w-6 h-6 group-hover:animate-bounce transition-transform duration-300 relative z-10" />
                  <span className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
                    🚀 ЗАПУСК РАССАДКИ ТУРНИРА
                  </span>
                </Button>
              </div>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                  <Button 
                    onClick={openNewTable}
                    className="relative flex items-center gap-3 bg-white/90 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white transition-all duration-500 hover:scale-105 border border-slate-200/50 px-6 py-3 rounded-xl font-medium text-slate-700"
                    disabled={getActivePlayers().length < maxPlayersPerTable * 2}
                  >
                    <Plus className="w-5 h-5" />
                    <span>➕ Новый стол</span>
                  </Button>
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                  <Button 
                    onClick={checkTableBalance}
                    className="relative flex items-center gap-3 bg-white/90 hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-500 hover:text-white transition-all duration-500 hover:scale-105 border border-slate-200/50 px-6 py-3 rounded-xl font-medium text-slate-700"
                    disabled={balancingInProgress}
                  >
                    <ArrowUpDown className="w-5 h-5" />
                    <span>{balancingInProgress ? '🔄 Анализ...' : '⚖️ Умный баланс'}</span>
                  </Button>
                </div>

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                  <Button 
                    onClick={autoSeatLatePlayers}
                    className="relative flex items-center gap-3 bg-white/90 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white transition-all duration-500 hover:scale-105 border border-slate-200/50 px-6 py-3 rounded-xl font-medium text-slate-700"
                  >
                    <Shuffle className="w-5 h-5" />
                    <span>🎯 Авто-размещение</span>
                  </Button>
                </div>

                <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                      <Button 
                        className="relative flex items-center gap-3 bg-white/90 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 hover:text-white transition-all duration-500 hover:scale-105 border border-slate-200/50 px-6 py-3 rounded-xl font-medium text-slate-700"
                        disabled={!isSeatingStarted}
                      >
                        <Target className="w-5 h-5" />
                        <span>🎯 Переместить игрока</span>
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-floating">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl text-slate-800">Перемещение игрока</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 font-body">Выберите игрока:</label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="bg-white/80 border-slate-200/50">
                            <SelectValue placeholder="Выберите игрока..." />
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
                          <label className="text-sm font-medium text-slate-700 font-body">Целевой стол:</label>
                          <Input
                            type="number"
                            value={targetTable}
                            onChange={(e) => setTargetTable(Number(e.target.value))}
                            min={1}
                            max={tables.length}
                            className="bg-white/80 border-slate-200/50"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 font-body">Целевое место:</label>
                          <Input
                            type="number"
                            value={targetSeat}
                            onChange={(e) => setTargetSeat(Number(e.target.value))}
                            min={1}
                            max={maxPlayersPerTable}
                            className="bg-white/80 border-slate-200/50"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => {
                            if (selectedPlayer) {
                              const playerTable = tables.find(t => 
                                t.seats.some(s => s.player_id === selectedPlayer)
                              );
                              if (playerTable) {
                                movePlayer(selectedPlayer, playerTable.table_number, targetTable, targetSeat);
                              }
                            }
                          }}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium"
                          disabled={!selectedPlayer}
                        >
                          Переместить
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsMoveDialogOpen(false)}
                          className="flex-1 bg-white/80 border-slate-200/50"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {isFinalTableReady && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-2xl blur-lg transition-all duration-500 group-hover:blur-xl"></div>
                    <Button 
                      onClick={createFinalTable}
                      className="relative flex items-center gap-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transition-all duration-500 hover:scale-105 shadow-elevated text-lg px-8 py-4 rounded-2xl font-serif font-semibold"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-2xl"></div>
                      <Crown className="w-6 h-6 group-hover:animate-bounce transition-transform duration-300 relative z-10" />
                      <span className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
                        🏆 СОЗДАТЬ ФИНАЛЬНЫЙ СТОЛ
                      </span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Столы в премиальном стиле */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tables.map(table => (
          <div 
            key={table.table_number} 
            className={`relative group transition-all duration-500 hover:scale-[1.02] ${
              table.is_final_table 
                ? 'animate-pulse-glow' 
                : ''
            }`}
          >
            <div className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-500 group-hover:blur-2xl ${
              table.is_final_table 
                ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30' 
                : 'bg-gradient-to-br from-slate-500/10 to-blue-500/10'
            }`}></div>
            
            <div className={`relative overflow-hidden rounded-3xl border shadow-card hover:shadow-elevated transition-all duration-500 ${
              table.is_final_table 
                ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-amber-200/60' 
                : 'bg-white/90 backdrop-blur-sm border-slate-200/50'
            }`}>
              <div className={`p-6 border-b ${
                table.is_final_table 
                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-amber-200/50' 
                  : 'bg-white/60 border-slate-200/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {table.is_final_table ? (
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl animate-glow">
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-serif font-bold text-amber-800">🏆 ФИНАЛЬНЫЙ СТОЛ</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-serif font-semibold text-slate-800">Стол {table.table_number}</span>
                      </div>
                    )}
                  </div>
                  {getTableStatusBadge(table)}
                </div>
                
                {table.dealer_position && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/80 border-slate-200/50 text-sm font-body">
                      Дилер: позиция {table.dealer_position}
                    </Badge>
                    {table.average_stack && (
                      <Badge variant="outline" className="bg-white/80 border-slate-200/50 text-sm font-body">
                        Ср. стек: {table.average_stack} BB
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Сетка мест */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {table.seats.map((seat, index) => (
                    <div
                      key={`${table.table_number}-${seat.seat_number}`}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                        seat.player_name 
                          ? 'bg-white/90 border-slate-200/50 shadow-subtle' 
                          : 'bg-slate-50/50 border-dashed border-slate-300/50'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-500 mb-2 text-center">
                        Место {seat.seat_number}
                      </div>
                      
                      {seat.player_name ? (
                        <div className="space-y-3">
                          {/* Аватар игрока */}
                          <div className="flex items-center justify-center">
                            <div className="relative">
                              <img 
                                src={getPlayerAvatar(seat.player_id!)} 
                                alt={seat.player_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${
                                seat.status === 'playing' ? 'bg-green-500' : 
                                seat.status === 'eliminated' ? 'bg-red-500' : 'bg-blue-500'
                              }`}></div>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="font-serif font-semibold text-slate-800 text-sm truncate mb-1" title={seat.player_name}>
                              {seat.player_name}
                            </div>
                            
                            {seat.chips && (
                              <div className="text-xs space-y-1">
                                <div className="font-mono font-bold text-slate-700">{seat.chips.toLocaleString()}</div>
                                {seat.stack_bb && <div className="text-slate-500 font-body">{seat.stack_bb} BB</div>}
                              </div>
                            )}
                          </div>
                          
                          {/* Кнопки управления игроком */}
                          {seat.status !== 'eliminated' && isSeatingStarted && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs bg-white/80 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white transition-all duration-300 border-slate-200/50"
                                onClick={() => {
                                  setSelectedPlayer(seat.player_id!);
                                  setTargetTable(table.table_number);
                                  setIsMoveDialogOpen(true);
                                }}
                              >
                                🔄
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 text-xs bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 hover:scale-105 transition-all duration-300 text-white"
                                onClick={() => eliminatePlayer(seat.player_id!)}
                              >
                                <UserMinus className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs font-body flex flex-col items-center justify-center py-4">
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                            <Plus className="w-4 h-4 text-slate-400" />
                          </div>
                          <span>Свободно</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Действия со столом */}
                {table.active_players > 0 && !table.is_final_table && (
                  <div className={`pt-4 border-t ${table.is_final_table ? 'border-amber-200/50' : 'border-slate-200/30'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-body font-medium text-slate-600">Управление столом:</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-white/80 hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 hover:text-white transition-all duration-300 hover:scale-105 border-slate-200/50"
                          onClick={() => {
                            const newTables = [...tables];
                            const currentTable = newTables.find(t => t.table_number === table.table_number);
                            if (currentTable) {
                              currentTable.dealer_position = (currentTable.dealer_position % currentTable.max_seats) + 1;
                              setTables(newTables);
                            }
                          }}
                          title="Передвинуть позицию дилера"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          🎲 Дилер
                        </Button>
                        
                        {table.active_players <= 3 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white/80 hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-500 hover:text-white transition-all duration-300 hover:scale-105 border-slate-200/50"
                            onClick={() => suggestPlayerMove(table.table_number)}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            💡 Совет
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {table.active_players === 0 && (
                  <div className="pt-4 border-t border-slate-200/30">
                    <Button
                      size="sm"
                      className="w-full text-xs bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 hover:scale-105 transition-all duration-300 text-white"
                      onClick={() => closeTable(table.table_number)}
                    >
                      <X className="w-3 h-3 mr-2" />
                      🗑️ Закрыть пустой стол
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSeating;
