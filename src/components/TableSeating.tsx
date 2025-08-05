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
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `src/assets/avatars/poker-avatar-${avatarIndex}.png`;
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
      toast({ title: "Error", description: "No active players for seating", variant: "destructive" });
      return;
    }

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
        table_status: 'active',
        average_stack: 0
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
      title: "Initial seating completed", 
      description: `${shuffledPlayers.length} players seated at ${totalTables} tables` 
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
        title: "Error", 
        description: "Failed to save seating", 
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
        title: "Player eliminated", 
        description: "Seat freed. Player removed from active players." 
      });

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
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
        
        const absoluteSeatNumber = (tableWithFreeSpace.table_number - 1) * maxPlayersPerTable + (freeSeatIndex + 1);
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: absoluteSeatNumber })
          .eq('player_id', playerId)
          .eq('tournament_id', tournamentId);

        setTables(newTables);

        toast({ 
          title: "Player restored", 
          description: `Player seated at table ${tableWithFreeSpace.table_number}, seat ${freeSeatIndex + 1}` 
        });
      } else {
        toast({ 
          title: "Player restored", 
          description: "Player returned to active list. No free seats - use auto-seating." 
        });
      }

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error restoring player:', error);
      toast({ 
        title: "Error", 
        description: "Failed to restore player", 
        variant: "destructive" 
      });
    }
  };

  const createFinalTable = async () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Too many players",
        description: `Final table requires ${finalTableSize} or fewer players`,
        variant: "destructive"
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
      title: "🏆 FINAL TABLE FORMED!",
      description: `${shuffledPlayers.length} players seated at final table`,
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

    if (unseatedPlayers.length === 0) {
      toast({
        title: "All players seated",
        description: "No players without seats",
      });
      return;
    }

    const newTables = [...tables];
    let playersSeated = 0;

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
    }

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
      title: "Auto-seating completed",
      description: `${playersSeated} players seated at tables`
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
    
    let message = "📊 Balance Analysis:\n\n";
    
    if (difference <= 1) {
      message += "✅ Tables are perfectly balanced (difference ≤1 player)";
    } else {
      message += `⚠️ Balancing required (difference ${difference} players)\n\n`;
      message += "📊 Current state:\n";
      balanceInfo.forEach(t => {
        if (t.players === minPlayers) {
          message += `🔻 Table ${t.tableNumber}: ${t.players}/${t.maxPlayers} (needs players)\n`;
        }
        if (t.players === maxPlayers) {
          message += `🔺 Table ${t.tableNumber}: ${t.players}/${t.maxPlayers} (can move players)\n`;
        }
      });
    }
    
    toast({ 
      title: "Balance Analysis", 
      description: message,
      duration: 8000
    });
    
    setBalancingInProgress(false);
  };

  const openNewTable = () => {
    const activePlayers = getActivePlayers();
    
    if (activePlayers.length < maxPlayersPerTable * 2) {
      toast({
        title: "Not enough players",
        description: "Need more players to open new table",
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
      title: "New table opened",
      description: `Table ${newTableNumber} ready for players.`
    });
  };

  const movePlayer = async (playerId: string, fromTable: number, fromSeat: number, toTable: number, toSeat: number) => {
    try {
      // Проверяем, что целевое место свободно
      const targetTableObj = tables.find(t => t.table_number === toTable);
      if (!targetTableObj) {
        toast({
          title: "Error",
          description: "Target table not found",
          variant: "destructive"
        });
        return;
      }

      const targetSeatObj = targetTableObj.seats.find(s => s.seat_number === toSeat);
      if (!targetSeatObj || targetSeatObj.player_id) {
        toast({
          title: "Error", 
          description: "Target seat is occupied",
          variant: "destructive"
        });
        return;
      }

      // Находим игрока
      const sourceTableObj = tables.find(t => t.table_number === fromTable);
      if (!sourceTableObj) {
        toast({
          title: "Error",
          description: "Source table not found", 
          variant: "destructive"
        });
        return;
      }

      const sourceSeatObj = sourceTableObj.seats.find(s => s.seat_number === fromSeat && s.player_id === playerId);
      if (!sourceSeatObj) {
        toast({
          title: "Error",
          description: "Player not found at source seat",
          variant: "destructive"
        });
        return;
      }

      // Обновляем столы локально
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

        // Обновляем в базе данных
        const newAbsoluteSeatNumber = (toTable - 1) * maxPlayersPerTable + toSeat;
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: newAbsoluteSeatNumber })
          .eq('player_id', playerId)
          .eq('tournament_id', tournamentId);

        toast({
          title: "Player moved",
          description: `${sourceSeatObj.player_name} moved from Table ${fromTable} Seat ${fromSeat} to Table ${toTable} Seat ${toSeat}`
        });

        if (onSeatingUpdate) {
          onSeatingUpdate();
        }
      }
    } catch (error) {
      console.error('Error moving player:', error);
      toast({
        title: "Error",
        description: "Failed to move player",
        variant: "destructive"
      });
    }
  };

  const closeTable = async (tableNumber: number) => {
    try {
      const tableToClose = tables.find(t => t.table_number === tableNumber);
      if (!tableToClose) {
        toast({
          title: "Error",
          description: "Table not found",
          variant: "destructive"
        });
        return;
      }

      if (tableToClose.active_players === 0) {
        // Просто удаляем пустой стол
        const newTables = tables.filter(t => t.table_number !== tableNumber);
        setTables(newTables);
        toast({
          title: "Table closed",
          description: `Empty table ${tableNumber} removed`
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
          title: "Cannot close table",
          description: "No available seats at other tables",
          variant: "destructive"
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
            const newAbsoluteSeatNumber = (targetTable.table_number - 1) * maxPlayersPerTable + freeSeat.seat_number;
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
            title: "Warning",
            description: `Could not move ${player.player_name} - no available seats`,
            variant: "destructive"
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
        title: "Table closed",
        description: `Table ${tableNumber} closed. ${movedPlayers} players relocated.`
      });

      if (onSeatingUpdate) {
        onSeatingUpdate();
      }
    } catch (error) {
      console.error('Error closing table:', error);
      toast({
        title: "Error",
        description: "Failed to close table",
        variant: "destructive"
      });
    }
  };

  const getAvailableSeats = (tableNumber: number) => {
    const table = tables.find(t => t.table_number === tableNumber);
    if (!table) return [];
    
    return table.seats.filter(seat => !seat.player_id).map(seat => seat.seat_number);
  };

  return (
    <div className="min-h-screen bg-slate-50 space-y-6">
      {/* Главная карточка в стиле приглашений */}
      <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
      >
        <CardContent className="p-0">
          {/* Минимальные акцентные линии */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/10 to-transparent"></div>

          <div className="relative p-6">
            {/* Заголовок в стиле приглашений */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg tracking-tight text-slate-900">TABLE SEATING</div>
                  <div className="text-xs text-slate-500 font-medium">Professional Tournament Management</div>
                </div>
              </div>
              <div className="text-right">
                {isSeatingStarted ? (
                  <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                    ACTIVE
                  </div>
                ) : (
                  <div className="bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                    PENDING
                  </div>
                )}
              </div>
            </div>

            {/* Премиальные статистические блоки */}
            <div className="mb-8">
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Активные игроки */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_24px_-8px_rgba(0,0,0,0.12)] transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-2xl font-light text-slate-900">{getActivePlayers().length}</div>
                    </div>
                    <div className="text-slate-600 text-sm font-medium">Active Players</div>
                    <div className="text-slate-400 text-xs mt-1">Currently playing</div>
                  </div>
                </div>

                {/* Выбывшие игроки */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_24px_-8px_rgba(0,0,0,0.12)] transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                        <UserMinus className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-2xl font-light text-slate-900">{getEliminatedPlayers().length}</div>
                    </div>
                    <div className="text-slate-600 text-sm font-medium">Eliminated</div>
                    <div className="text-slate-400 text-xs mt-1">Tournament busts</div>
                  </div>
                </div>
              </div>
              
              {/* Тонкий разделитель */}
              <div className="relative h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                {/* Активные столы */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_24px_-8px_rgba(0,0,0,0.12)] transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-2xl font-light text-slate-900">{tables.filter(t => t.active_players > 0).length}</div>
                    </div>
                    <div className="text-slate-600 text-sm font-medium">Active Tables</div>
                    <div className="text-slate-400 text-xs mt-1">In progress</div>
                  </div>
                </div>

                {/* Средний стек */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_24px_-8px_rgba(0,0,0,0.12)] transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-2xl font-light text-slate-900">{Math.round(tables.reduce((sum, t) => sum + (t.average_stack || 0), 0) / Math.max(tables.length, 1))}</div>
                    </div>
                    <div className="text-slate-600 text-sm font-medium">Avg Stack</div>
                    <div className="text-slate-400 text-xs mt-1">Big blinds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Уведомления в стиле приглашений */}
      {isFinalTableReady && (
        <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-slate-500 text-xs font-medium mb-2 tracking-wide uppercase">Final Table Ready</div>
              <div className="text-lg font-light text-slate-900 mb-2">🏆 {getActivePlayers().length} players remaining</div>
              <div className="text-sm text-slate-600">Tournament ready for final table formation</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Выбывшие игроки в стиле приглашений */}
      {getEliminatedPlayers().length > 0 && (
        <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
          style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
        >
          <CardContent className="p-0">
            <div className="relative p-6">
              <div className="text-center mb-6">
                <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Eliminated Players</div>
                <div className="text-lg font-light text-slate-900">{getEliminatedPlayers().length} players out</div>
              </div>
              
              <div className="w-full h-px bg-slate-200 mb-6"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEliminatedPlayers().map(player => (
                  <div key={player.player.id} className="bg-slate-50 rounded-xl py-4 px-4 text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-3">
                      <AvatarImage src={getPlayerAvatar(player.player.id)} alt={player.player.name} />
                      <AvatarFallback className="bg-slate-200 text-slate-700">
                        {player.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-light text-slate-900 mb-1">{player.player.name}</div>
                    <div className="text-xs text-slate-500 mb-3">Eliminated</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-white border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white transition-all"
                      onClick={() => restorePlayer(player.player.id)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Панель управления в стиле приглашений */}
      <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
      >
        <CardContent className="p-0">
          <div className="relative p-6">
            <div className="text-center mb-6">
              <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Control Panel</div>
              <div className="text-lg font-light text-slate-900">Tournament Management</div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {!isSeatingStarted ? (
                <Button 
                  onClick={startInitialSeating}
                  className="bg-slate-900 text-white hover:bg-slate-700 px-6 py-2 rounded-lg font-medium text-sm tracking-wide transition-all"
                  disabled={getActivePlayers().length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  START SEATING
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={openNewTable}
                    variant="outline"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm"
                    disabled={getActivePlayers().length < maxPlayersPerTable * 2}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Table
                  </Button>
                  
                  <Button 
                    onClick={checkTableBalance}
                    variant="outline"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm"
                    disabled={balancingInProgress}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {balancingInProgress ? 'Analyzing...' : 'Balance'}
                  </Button>

                  <Button 
                    onClick={autoSeatLatePlayers}
                    variant="outline"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Auto-Seat
                  </Button>

                  {isFinalTableReady && (
                    <Button 
                      onClick={createFinalTable}
                      className="bg-slate-900 text-white hover:bg-slate-700 px-6 py-2 rounded-lg font-medium text-sm tracking-wide transition-all"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      FINAL TABLE
                    </Button>
                  )}
                </>
              )}
            </div>
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
                      {table.is_final_table ? 'Final Table' : `Table ${table.table_number}`}
                    </div>
                    <div className="text-lg font-light text-slate-900">
                      {table.active_players}/{table.max_seats} Players
                    </div>
                    {table.is_final_table && (
                      <div className="text-yellow-600 text-xs font-medium mt-1">🏆 Championship Round</div>
                    )}
                    
                    {/* Кнопка закрытия стола */}
                    {!table.is_final_table && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-0 right-0 h-6 w-6 p-0 bg-white border-slate-200 text-red-600 hover:bg-red-50"
                        onClick={() => closeTable(table.table_number)}
                        title="Close table"
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
                        <div className="text-xs text-slate-500 mb-1">Seat {seat.seat_number}</div>
                        {seat.player_id ? (
                          <div>
                            <Avatar className="w-8 h-8 mx-auto mb-2">
                              <AvatarImage src={getPlayerAvatar(seat.player_id)} alt={seat.player_name} />
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                                {seat.player_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs font-medium text-slate-900 truncate">{seat.player_name}</div>
                            <div className="text-xs text-slate-600 mb-2">{seat.stack_bb} BB</div>
                            
                            {/* Кнопки управления игроком */}
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-6 px-1 text-xs bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    onClick={() => setSelectedPlayer(seat.player_id!)}
                                  >
                                    <ArrowUpDown className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Move {seat.player_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Select value={targetTable.toString()} onValueChange={(v) => setTargetTable(Number(v))}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Table" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {tables.map(t => (
                                            <SelectItem key={t.table_number} value={t.table_number.toString()}>
                                              Table {t.table_number}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      
                                      <Select value={targetSeat.toString()} onValueChange={(v) => setTargetSeat(Number(v))}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seat" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getAvailableSeats(targetTable).map(seatNum => (
                                            <SelectItem key={seatNum} value={seatNum.toString()}>
                                              Seat {seatNum} (Free)
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
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
                                        Move
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
                          <div className="text-xs text-slate-400">Empty</div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Статистика стола */}
                  {table.active_players > 0 && (
                    <div className="text-center bg-slate-50 rounded-lg py-3">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Average Stack</div>
                      <div className="text-sm font-light text-slate-900">{Math.round(table.average_stack || 0)} chips</div>
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