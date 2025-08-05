import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, ArrowUpDown, Plus, Shuffle, Play, Crown, 
  UserMinus, AlertTriangle, Target, Settings,
  Clock, Trophy, Zap, RotateCcw, UserCheck, X,
  RefreshCw, BarChart3
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
  const [balanceRecommendations, setBalanceRecommendations] = useState<any>(null);
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

  // Генерация аватарки по умолчанию
  const generateDefaultAvatar = (playerId: string) => {
    const avatars = [
      '/src/assets/avatars/poker-avatar-1.png',
      '/src/assets/avatars/poker-avatar-2.png', 
      '/src/assets/avatars/poker-avatar-3.png',
      '/src/assets/avatars/poker-avatar-4.png',
      '/src/assets/avatars/poker-avatar-5.png',
      '/src/assets/avatars/poker-avatar-6.png'
    ];
    const hash = playerId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
  };

  const loadSavedSeating = async () => {
    // Загрузка из localStorage
    try {
      const saved = localStorage.getItem(`seating_${tournamentId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setTables(data.tables || []);
        setIsSeatingStarted(data.isStarted || false);
      }
    } catch (error) {
      console.error('Error loading seating:', error);
    }
  };

  const initializeTablesStructure = () => {
    const activePlayers = getActivePlayers();
    const totalTables = Math.ceil(activePlayers.length / maxPlayersPerTable);
    
    const newTables: Table[] = [];
    for (let i = 1; i <= totalTables; i++) {
      const table: Table = {
        table_number: i,
        seats: [],
        active_players: 0,
        max_seats: maxPlayersPerTable,
        dealer_position: 1,
        table_status: 'active'
      };
      
      for (let j = 1; j <= maxPlayersPerTable; j++) {
        table.seats.push({
          seat_number: j
        });
      }
      
      newTables.push(table);
    }
    
    setTables(newTables);
  };

  const saveSeatingToDatabase = async (updatedTables: Table[]) => {
    try {
      // Сохранение в localStorage
      localStorage.setItem(`seating_${tournamentId}`, JSON.stringify({
        tables: updatedTables,
        isStarted: isSeatingStarted
      }));
    } catch (error) {
      console.error('Error saving seating:', error);
    }
  };

  const startRandomSeating = async () => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) return;

    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
    const newTables = [...tables];
    let playerIndex = 0;

    for (const table of newTables) {
      for (const seat of table.seats) {
        if (playerIndex < shuffledPlayers.length) {
          const player = shuffledPlayers[playerIndex];
          seat.player_id = player.player.id;
          seat.player_name = player.player.name;
          seat.chips = player.chips || 0;
          seat.status = 'playing';
          seat.stack_bb = seat.chips ? Math.round(seat.chips / bigBlind) : 0;
          table.active_players++;
          playerIndex++;
        }
      }
    }

    // ... остальной код функций

    setTables(newTables);
    setIsSeatingStarted(true);
    await saveSeatingToDatabase(newTables);
    onSeatingUpdate?.();

    toast({
      title: "Рассадка завершена",
      description: `${activePlayers.length} игроков размещены за ${newTables.length} столов`,
    });
  };

  const getSeatColorClass = (seat: TableSeat) => {
    if (!seat.player_name) return 'bg-slate-50 border-slate-200';
    
    if (seat.status === 'eliminated') return 'bg-red-50 border-red-200';
    if (seat.status === 'playing') return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getTableStatusBadge = (table: Table) => {
    const playersNeeded = maxPlayersPerTable - table.active_players;
    
    if (table.active_players === 0) {
      return <Badge variant="secondary" className="text-xs">Пустой</Badge>;
    }
    
    if (playersNeeded > 3) {
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
        Нужно {playersNeeded}
      </Badge>;
    }
    
    if (playersNeeded > 0) {
      return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
        +{playersNeeded}
      </Badge>;
    }
    
    return <Badge variant="default" className="text-xs bg-green-50 text-green-700 border-green-200">
      Полный
    </Badge>;
  };

  const movePlayer = async (playerId: string, fromTable: number, toTable: number, toSeat: number) => {
    const newTables = [...tables];
    
    // Найти игрока и убрать его с текущего места
    const fromTableObj = newTables.find(t => t.table_number === fromTable);
    if (fromTableObj) {
      const fromSeat = fromTableObj.seats.find(s => s.player_id === playerId);
      if (fromSeat) {
        fromSeat.player_id = undefined;
        fromSeat.player_name = undefined;
        fromSeat.chips = undefined;
        fromSeat.status = undefined;
        fromSeat.stack_bb = undefined;
        fromTableObj.active_players--;
      }
    }
    
    // Поместить игрока на новое место
    const toTableObj = newTables.find(t => t.table_number === toTable);
    if (toTableObj) {
      const targetSeat = toTableObj.seats.find(s => s.seat_number === toSeat);
      if (targetSeat && !targetSeat.player_id) {
        const player = registrations.find(r => r.player.id === playerId);
        if (player) {
          targetSeat.player_id = playerId;
          targetSeat.player_name = player.player.name;
          targetSeat.chips = player.chips || 0;
          targetSeat.status = 'playing';
          targetSeat.stack_bb = targetSeat.chips ? Math.round(targetSeat.chips / bigBlind) : 0;
          toTableObj.active_players++;
        }
      }
    }
    
    setTables(newTables);
    await saveSeatingToDatabase(newTables);
    setIsMoveDialogOpen(false);
    onSeatingUpdate?.();
    
    toast({
      title: "Игрок перемещен",
      description: `Игрок перемещен со стола ${fromTable} на стол ${toTable}`,
    });
  };

  const eliminatePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ status: 'eliminated' })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      const newTables = [...tables];
      newTables.forEach(table => {
        table.seats.forEach(seat => {
          if (seat.player_id === playerId) {
            seat.status = 'eliminated';
          }
        });
      });

      setTables(newTables);
      await saveSeatingToDatabase(newTables);
      onSeatingUpdate?.();

      toast({
        title: "Игрок исключен",
        description: "Статус игрока изменен на 'исключен'",
      });
    } catch (error) {
      console.error('Error eliminating player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось исключить игрока",
        variant: "destructive"
      });
    }
  };

  const restorePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ status: 'playing' })
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      // Найти свободное место и посадить игрока
      const newTables = [...tables];
      let seated = false;

      for (const table of newTables) {
        if (seated) break;
        for (const seat of table.seats) {
          if (!seat.player_id) {
            const player = registrations.find(r => r.player.id === playerId);
            if (player) {
              seat.player_id = playerId;
              seat.player_name = player.player.name;
              seat.chips = player.chips || 0;
              seat.status = 'playing';
              seat.stack_bb = seat.chips ? Math.round(seat.chips / bigBlind) : 0;
              table.active_players++;
              seated = true;
              break;
            }
          }
        }
      }

      if (!seated) {
        toast({
          title: "Нет свободных мест",
          description: "Игрок восстановлен, но нет свободных мест за столами",
          variant: "destructive"
        });
        return;
      }

      setTables(newTables);
      await saveSeatingToDatabase(newTables);
      onSeatingUpdate?.();

      toast({
        title: "Игрок восстановлен",
        description: "Игрок восстановлен и размещен за столом",
      });
    } catch (error) {
      console.error('Error restoring player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить игрока",
        variant: "destructive"
      });
    }
  };

  const checkTableBalance = () => {
    setBalancingInProgress(true);
    
    setTimeout(() => {
      const recommendations: any[] = [];
      
      const nonFinalTables = tables.filter(t => !t.is_final_table);
      const maxPlayers = Math.max(...nonFinalTables.map(t => t.active_players));
      const minPlayers = Math.min(...nonFinalTables.map(t => t.active_players));
      
      if (maxPlayers - minPlayers > 1) {
        const overloadedTables = nonFinalTables.filter(t => t.active_players === maxPlayers);
        const underloadedTables = nonFinalTables.filter(t => t.active_players === minPlayers);
        
        overloadedTables.forEach(fromTable => {
          underloadedTables.forEach(toTable => {
            if (fromTable.active_players > toTable.active_players + 1) {
              recommendations.push({
                action: 'move',
                from: fromTable.table_number,
                to: toTable.table_number,
                reason: `Стол ${fromTable.table_number} перегружен (${fromTable.active_players} игроков), стол ${toTable.table_number} недогружен (${toTable.active_players} игроков)`
              });
            }
          });
        });
      }
      
      setBalanceRecommendations(recommendations);
      setBalancingInProgress(false);
      
      if (recommendations.length === 0) {
        toast({
          title: "Столы сбалансированы",
          description: "Все столы имеют равное количество игроков"
        });
      } else {
        toast({
          title: "Нужна балансировка",
          description: `Найдено ${recommendations.length} рекомендаций по перемещению`
        });
      }
    }, 1000);
  };

  const autoSeatLatePlayers = () => {
    const unseatedPlayers = getActivePlayers().filter(player => {
      return !tables.some(table => 
        table.seats.some(seat => seat.player_id === player.player.id)
      );
    });

    if (unseatedPlayers.length === 0) {
      toast({
        title: "Все игроки размещены",
        description: "Нет игроков для автоматического размещения",
      });
      return;
    }

    const newTables = [...tables];
    let playersSeated = 0;

    // Сначала заполняем недозаполненные столы
    for (const player of unseatedPlayers) {
      let seated = false;
      
      // Ищем стол с наименьшим количеством игроков
      const sortedTables = newTables
        .filter(t => !t.is_final_table)
        .sort((a, b) => a.active_players - b.active_players);
      
      for (const table of sortedTables) {
        if (seated) break;
        if (table.active_players < maxPlayersPerTable) {
          for (const seat of table.seats) {
            if (!seat.player_id) {
              seat.player_id = player.player.id;
              seat.player_name = player.player.name;
              seat.chips = player.chips || 0;
              seat.status = 'playing';
              seat.stack_bb = seat.chips ? Math.round(seat.chips / bigBlind) : 0;
              table.active_players++;
              playersSeated++;
              seated = true;
              break;
            }
          }
        }
      }

      // Если не нашли место, создаем новый стол
      if (!seated) {
        const newTableNumber = Math.max(...newTables.map(t => t.table_number)) + 1;
        const newTable: Table = {
          table_number: newTableNumber,
          seats: [],
          active_players: 1,
          max_seats: maxPlayersPerTable,
          dealer_position: 1,
          table_status: 'active'
        };

        for (let j = 1; j <= maxPlayersPerTable; j++) {
          const seat: TableSeat = { seat_number: j };
          if (j === 1) {
            seat.player_id = player.player.id;
            seat.player_name = player.player.name;
            seat.chips = player.chips || 0;
            seat.status = 'playing';
            seat.stack_bb = seat.chips ? Math.round(seat.chips / bigBlind) : 0;
            playersSeated++;
          }
          newTable.seats.push(seat);
        }
        
        newTables.push(newTable);
      }
    }

    setTables(newTables);
    saveSeatingToDatabase(newTables);
    onSeatingUpdate?.();

    toast({
      title: "Автоматическое размещение завершено",
      description: `Размещено ${playersSeated} игроков`,
    });
  };

  const createFinalTable = async () => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length > finalTableSize) {
      toast({
        title: "Слишком много игроков",
        description: `Для финального стола максимум ${finalTableSize} игроков`,
        variant: "destructive"
      });
      return;
    }

    const newTables: Table[] = [{
      table_number: 1,
      seats: [],
      active_players: activePlayers.length,
      max_seats: finalTableSize,
      is_final_table: true,
      dealer_position: 1,
      table_status: 'final'
    }];

    for (let i = 1; i <= finalTableSize; i++) {
      const seat: TableSeat = { seat_number: i };
      if (i <= activePlayers.length) {
        const player = activePlayers[i - 1];
        seat.player_id = player.player.id;
        seat.player_name = player.player.name;
        seat.chips = player.chips || 0;
        seat.status = 'playing';
        seat.stack_bb = seat.chips ? Math.round(seat.chips / bigBlind) : 0;
      }
      newTables[0].seats.push(seat);
    }

    setTables(newTables);
    await saveSeatingToDatabase(newTables);
    onSeatingUpdate?.();

    toast({
      title: "Финальный стол создан!",
      description: `${activePlayers.length} игроков за финальным столом`,
    });
  };

  const closeTable = (tableNumber: number) => {
    const newTables = tables.filter(t => t.table_number !== tableNumber);
    setTables(newTables);
    saveSeatingToDatabase(newTables);
    
    toast({
      title: "Стол закрыт",
      description: `Стол ${tableNumber} удален`,
    });
  };

  const suggestPlayerMove = (tableNumber: number) => {
    const table = tables.find(t => t.table_number === tableNumber);
    if (!table) return;
    
    toast({
      title: "Рекомендация по балансировке",
      description: `Стол ${tableNumber} нуждается в балансировке. Используйте кнопку "Баланс" для получения рекомендаций.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <Card className="bg-white border border-slate-200/50 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent"></div>
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-light tracking-tight text-slate-900">
                      Рассадка игроков
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-sm font-normal mt-1">
                      Управление столами и размещением участников турнира
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                    {tables.length} СТОЛОВ
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {getActivePlayers().length} игроков активно
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                {/* Основные действия */}
                <div className="flex flex-wrap gap-3">
                  {!isSeatingStarted ? (
                    <Button 
                      onClick={startRandomSeating}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 hover:scale-105"
                      disabled={getActivePlayers().length === 0}
                    >
                      <Play className="w-4 h-4" />
                      Начать рассадку
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={checkTableBalance}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-white/80 hover:bg-slate-50/80 border-slate-200/50 transition-all duration-300 hover:scale-105"
                        disabled={balancingInProgress}
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        {balancingInProgress ? 'Анализ...' : 'Баланс'}
                      </Button>

                      <Button 
                        onClick={autoSeatLatePlayers}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-white/80 hover:bg-slate-50/80 border-slate-200/50 transition-all duration-300 hover:scale-105"
                      >
                        <Shuffle className="w-4 h-4" />
                        Авто-размещение
                      </Button>

                      {isFinalTableReady && (
                        <Button 
                          onClick={createFinalTable}
                          className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105"
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
                        className="flex items-center gap-2 bg-white/80 hover:bg-slate-50/80 border-slate-200/50 transition-all duration-300 hover:scale-105"
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

                {/* Рекомендации по балансировке */}
                {balanceRecommendations && balanceRecommendations.length > 0 && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Рекомендации по балансировке:</strong>
                      <ul className="mt-2 space-y-1">
                        {balanceRecommendations.map((rec: any, index: number) => (
                          <li key={index} className="text-sm">
                            • {rec.reason}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Выбывшие игроки */}
                {getEliminatedPlayers().length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                    <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <UserMinus className="w-4 h-4" />
                      Выбывшие игроки ({getEliminatedPlayers().length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {getEliminatedPlayers().map(reg => (
                        <div key={reg.player.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage 
                                src={generateDefaultAvatar(reg.player.id)} 
                                alt={reg.player.name}
                              />
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {reg.player.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700">{reg.player.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => restorePlayer(reg.player.id)}
                            className="text-xs h-6 px-2"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Столы */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {tables.map(table => (
                  <Card key={table.table_number} className={`relative transition-all duration-300 hover:scale-[1.02] border overflow-hidden ${
                    table.is_final_table 
                      ? 'bg-gradient-to-br from-yellow-50 via-amber-50/30 to-yellow-50 border-2 border-yellow-400/50 shadow-floating ring-2 ring-yellow-400/20' 
                      : 'bg-white border-slate-200/50'
                  }`}
                  style={!table.is_final_table ? {
                    background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  } : {}}>
                    {!table.is_final_table && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent"></div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {table.is_final_table ? (
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg">
                                <Trophy className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-yellow-700 font-bold text-lg tracking-tight">ФИНАЛЬНЫЙ СТОЛ</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-light text-slate-900 text-lg">Стол {table.table_number}</span>
                            </div>
                          )}
                          {table.dealer_position && (
                            <div className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded-full tracking-wide">
                              D: {table.dealer_position}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getTableStatusBadge(table)}
                          {table.active_players > 0 && table.active_players <= 3 && !table.is_final_table && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => suggestPlayerMove(table.table_number)}
                              className="text-xs bg-white/80 hover:bg-slate-50/80 border-slate-200/50 transition-all duration-300 hover:scale-105"
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
                              className="text-xs transition-all duration-300 hover:scale-105"
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
                        <div className="flex justify-between text-xs text-slate-500 mb-3">
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
                            <div className="font-bold mb-1 flex items-center justify-center gap-1 text-slate-700">
                              #{seat.seat_number}
                              {seat.seat_number === table.dealer_position && <span className="text-blue-500">🎯</span>}
                            </div>
                            
                            {seat.player_name ? (
                              <div className="space-y-2">
                                {/* Аватарка игрока */}
                                <div className="flex justify-center">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage 
                                      src={generateDefaultAvatar(seat.player_id || '')} 
                                      alt={seat.player_name}
                                    />
                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                                      {seat.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                
                                <div className="truncate font-medium text-slate-900 text-xs text-center" title={seat.player_name}>
                                  {seat.player_name}
                                </div>
                                
                                {seat.chips && (
                                  <div className="text-xs text-slate-500 text-center">
                                    {seat.chips.toLocaleString()}
                                    {seat.stack_bb && <span className="block">{seat.stack_bb} BB</span>}
                                  </div>
                                )}
                                
                                <div className="flex justify-center">
                                  <Badge 
                                    variant={seat.status === 'playing' ? 'default' : seat.status === 'eliminated' ? 'destructive' : 'secondary'}
                                    className="text-xs bg-slate-100 text-slate-600 border-slate-200"
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
                              <div className="text-slate-400 text-xs text-center py-4">Свободно</div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Дополнительные действия для стола */}
                      {table.active_players > 0 && !table.is_final_table && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Действия:</span>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TableSeating;