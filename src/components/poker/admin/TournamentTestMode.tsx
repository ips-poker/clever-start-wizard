import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  FlaskConical, 
  Play, 
  Users, 
  UserPlus, 
  Trash2, 
  RefreshCw,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  Download,
  Table as TableIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'action';
  message: string;
  details?: any;
}

interface TestPlayer {
  id: string;
  name: string;
  registered: boolean;
  chips?: number;
  seat?: number;
  tableId?: string;
  status?: string;
}

interface TournamentTable {
  id: string;
  name: string;
  status: string;
  max_players: number;
  players: Array<{
    player_id: string;
    player_name: string;
    seat_number: number;
    chips: number;
    status: string;
  }>;
}

interface TournamentTestModeProps {
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
}

export function TournamentTestMode({ tournamentId, tournamentName, onClose }: TournamentTestModeProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testPlayers, setTestPlayers] = useState<TestPlayer[]>([]);
  const [tournamentTables, setTournamentTables] = useState<TournamentTable[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testPlayerCount, setTestPlayerCount] = useState(6);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, entry]);
    
    // Auto scroll to bottom
    setTimeout(() => {
      if (logScrollRef.current) {
        logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Load tournament data
  const loadTournamentData = useCallback(async () => {
    addLog('info', 'Загрузка данных турнира...');
    
    // Load tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) {
      addLog('error', 'Ошибка загрузки турнира', tournamentError);
      return;
    }
    setTournament(tournamentData);
    addLog('success', `Турнир: ${tournamentData.name}, Статус: ${tournamentData.status}`);

    // Load participants
    const { data: participantsData, error: participantsError } = await supabase
      .from('online_poker_tournament_participants')
      .select(`
        *,
        players!inner(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .order('chips', { ascending: false });

    if (participantsError) {
      addLog('error', 'Ошибка загрузки участников', participantsError);
    } else {
      const formattedParticipants = participantsData?.map(p => ({
        ...p,
        player_name: (p.players as any)?.name || 'Unknown'
      })) || [];
      setParticipants(formattedParticipants);
      addLog('info', `Участников: ${formattedParticipants.length}`);
    }

    // Load tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (tablesError) {
      addLog('error', 'Ошибка загрузки столов', tablesError);
    } else if (tablesData && tablesData.length > 0) {
      addLog('info', `Столов турнира: ${tablesData.length}`);
      
      // Load players for each table
      const tablesWithPlayers = await Promise.all(
        tablesData.map(async (table) => {
          const { data: tablePlayers } = await supabase
            .from('poker_table_players')
            .select(`
              *,
              players!inner(id, name)
            `)
            .eq('table_id', table.id);

          return {
            ...table,
            players: tablePlayers?.map(tp => ({
              player_id: tp.player_id,
              player_name: (tp.players as any)?.name || 'Unknown',
              seat_number: tp.seat_number,
              chips: tp.stack,
              status: tp.status
            })) || []
          };
        })
      );
      
      setTournamentTables(tablesWithPlayers);
      
      // Log table details
      tablesWithPlayers.forEach(table => {
        addLog('info', `Стол "${table.name}": ${table.players.length}/${table.max_players} игроков`, {
          tableId: table.id,
          players: table.players.map(p => `${p.player_name} (место ${p.seat_number})`)
        });
      });
    }
  }, [tournamentId, addLog]);

  // Load existing test players
  const loadTestPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .like('name', 'TestBot_%')
      .order('name');

    if (error) {
      addLog('error', 'Ошибка загрузки тестовых игроков', error);
      return;
    }

    // Check which are registered
    const { data: registered } = await supabase
      .from('online_poker_tournament_participants')
      .select('player_id, chips, seat_number, table_id, status')
      .eq('tournament_id', tournamentId);

    const registeredMap = new Map(registered?.map(r => [r.player_id, r]) || []);

    const players = data?.map(p => ({
      id: p.id,
      name: p.name,
      registered: registeredMap.has(p.id),
      chips: registeredMap.get(p.id)?.chips,
      seat: registeredMap.get(p.id)?.seat_number,
      tableId: registeredMap.get(p.id)?.table_id,
      status: registeredMap.get(p.id)?.status
    })) || [];

    setTestPlayers(players);
    addLog('info', `Найдено тестовых игроков: ${players.length}, зарегистрировано: ${players.filter(p => p.registered).length}`);
  }, [tournamentId, addLog]);

  // Create test players
  const createTestPlayers = async () => {
    setLoading(true);
    addLog('action', `Создание ${testPlayerCount} тестовых игроков...`);

    try {
      const newPlayers = [];
      for (let i = 1; i <= testPlayerCount; i++) {
        const name = `TestBot_${Date.now()}_${i}`;
        
        const { data, error } = await supabase
          .from('players')
          .insert({ name, elo_rating: 1000 })
          .select()
          .single();

        if (error) {
          addLog('error', `Ошибка создания игрока ${i}`, error);
        } else {
          newPlayers.push(data);
          addLog('success', `Создан: ${name}`);
        }
      }

      await loadTestPlayers();
      addLog('success', `Создано ${newPlayers.length} тестовых игроков`);
    } catch (err) {
      addLog('error', 'Ошибка создания игроков', err);
    }

    setLoading(false);
  };

  // Register all test players
  const registerAllTestPlayers = async () => {
    setLoading(true);
    const unregistered = testPlayers.filter(p => !p.registered);
    addLog('action', `Регистрация ${unregistered.length} игроков в турнире...`);

    try {
      for (const player of unregistered) {
        const { error } = await supabase
          .from('online_poker_tournament_participants')
          .insert({
            tournament_id: tournamentId,
            player_id: player.id,
            status: 'registered',
            chips: tournament?.starting_chips || 5000
          });

        if (error) {
          addLog('error', `Ошибка регистрации ${player.name}`, error);
        } else {
          addLog('success', `Зарегистрирован: ${player.name}`);
        }
      }

      await loadTestPlayers();
      await loadTournamentData();
    } catch (err) {
      addLog('error', 'Ошибка регистрации', err);
    }

    setLoading(false);
  };

  // Start tournament with seating
  const startTournament = async () => {
    setLoading(true);
    addLog('action', '🚀 ЗАПУСК ТУРНИРА С РАССАДКОЙ...');

    try {
      const { data, error } = await supabase.rpc('start_online_tournament_with_seating', {
        p_tournament_id: tournamentId
      });

      if (error) {
        addLog('error', 'Ошибка запуска турнира', error);
        toast.error('Ошибка запуска: ' + error.message);
      } else {
        const result = data as any;
        if (result.success) {
          addLog('success', `✅ Турнир запущен!`, result);
          addLog('info', `Создано столов: ${result.tables_created}`);
          addLog('info', `Рассажено игроков: ${result.total_participants}`);
          toast.success(`Турнир запущен! Столов: ${result.tables_created}`);
        } else {
          addLog('error', `Ошибка: ${result.error}`, result);
          toast.error(result.error);
        }
      }

      await loadTournamentData();
      await loadTestPlayers();
    } catch (err) {
      addLog('error', 'Критическая ошибка запуска', err);
    }

    setLoading(false);
  };

  // Eliminate player
  const eliminatePlayer = async (playerId: string, playerName: string) => {
    addLog('action', `Выбывание игрока ${playerName}...`);

    try {
      const { data, error } = await supabase.rpc('eliminate_online_tournament_player', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        addLog('error', `Ошибка выбывания ${playerName}`, error);
      } else {
        const result = data as any;
        addLog('success', `${playerName} выбыл на месте ${result.finish_position}`, result);
        
        if (result.tables_balanced) {
          addLog('info', '🔄 Столы перебалансированы');
        }
        if (result.tables_consolidated) {
          addLog('info', '📦 Столы объединены');
        }
        if (result.tournament_completed) {
          addLog('success', '🏆 ТУРНИР ЗАВЕРШЁН!');
        }
      }

      await loadTournamentData();
      await loadTestPlayers();
    } catch (err) {
      addLog('error', 'Ошибка выбывания', err);
    }
  };

  // Clear all test players
  const clearTestPlayers = async () => {
    setLoading(true);
    addLog('action', 'Удаление всех тестовых игроков...');

    try {
      // Remove from tournament first
      for (const player of testPlayers) {
        await supabase
          .from('online_poker_tournament_participants')
          .delete()
          .eq('player_id', player.id)
          .eq('tournament_id', tournamentId);
      }

      // Delete test players
      const { error } = await supabase
        .from('players')
        .delete()
        .like('name', 'TestBot_%');

      if (error) {
        addLog('error', 'Ошибка удаления игроков', error);
      } else {
        addLog('success', 'Все тестовые игроки удалены');
      }

      setTestPlayers([]);
      await loadTournamentData();
    } catch (err) {
      addLog('error', 'Ошибка очистки', err);
    }

    setLoading(false);
  };

  // Export logs
  const exportLogs = () => {
    const logText = logs.map(l => 
      `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.message}${l.details ? '\n  ' + JSON.stringify(l.details, null, 2) : ''}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament_test_${tournamentId}_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('info', 'Логи экспортированы');
  };

  // Initial load
  useEffect(() => {
    addLog('info', `=== Тестовый режим турнира "${tournamentName}" ===`);
    addLog('info', `ID: ${tournamentId}`);
    loadTournamentData();
    loadTestPlayers();
  }, [tournamentId, tournamentName, loadTournamentData, loadTestPlayers, addLog]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadTournamentData();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadTournamentData]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'warning': return <AlertCircle className="h-3 w-3 text-amber-500" />;
      case 'action': return <ArrowRight className="h-3 w-3 text-blue-500" />;
      default: return <Terminal className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <FlaskConical className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Тестовый режим</h2>
            <p className="text-sm text-muted-foreground">{tournamentName}</p>
          </div>
          <Badge variant={tournament?.status === 'running' ? 'default' : 'secondary'}>
            {tournament?.status || 'loading'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label className="text-sm">Авто-обновление</Label>
          </div>
          <Button variant="outline" size="sm" onClick={loadTournamentData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт логов
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Controls */}
        <div className="w-80 border-r p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Test Players */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Тестовые игроки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={testPlayerCount}
                  onChange={(e) => setTestPlayerCount(parseInt(e.target.value) || 2)}
                  min={2}
                  max={27}
                  className="w-20"
                />
                <Button size="sm" onClick={createTestPlayers} disabled={loading}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Создать
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Найдено: {testPlayers.length} | Зарегистрировано: {testPlayers.filter(p => p.registered).length}
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={registerAllTestPlayers} 
                  disabled={loading || testPlayers.filter(p => !p.registered).length === 0}
                >
                  Зарегистрировать всех
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="destructive" 
                className="w-full"
                onClick={clearTestPlayers} 
                disabled={loading || testPlayers.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить всех
              </Button>
            </CardContent>
          </Card>

          {/* Tournament Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Play className="h-4 w-4" />
                Управление турниром
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Участников: <span className="font-bold">{participants.length}</span></div>
                <div>Мин: <span className="font-bold">{tournament?.min_players || 2}</span></div>
                <div>Столов: <span className="font-bold">{tournamentTables.length}</span></div>
                <div>Уровень: <span className="font-bold">{tournament?.current_level || 1}</span></div>
              </div>

              <Button 
                className="w-full" 
                onClick={startTournament}
                disabled={loading || tournament?.status !== 'registration' || participants.length < (tournament?.min_players || 2)}
              >
                <Play className="h-4 w-4 mr-2" />
                Запустить турнир
              </Button>
            </CardContent>
          </Card>

          {/* Active Players */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Активные игроки
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {participants
                  .filter(p => p.status === 'playing' || p.status === 'registered')
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                      <div>
                        <div className="font-medium">{p.player_name}</div>
                        <div className="text-muted-foreground">
                          {p.chips?.toLocaleString()} фишек
                          {p.seat_number !== null && ` • Место ${p.seat_number}`}
                        </div>
                      </div>
                      {p.status === 'playing' && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => eliminatePlayer(p.player_id, p.player_name)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center panel - Tables view */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Столы турнира ({tournamentTables.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tournamentTables.map(table => (
              <Card key={table.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{table.name}</span>
                    <Badge variant="outline">{table.players.length}/{table.max_players}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Место</TableHead>
                        <TableHead>Игрок</TableHead>
                        <TableHead className="text-right">Фишки</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.players.map(player => (
                        <TableRow key={player.player_id}>
                          <TableCell className="font-mono">{player.seat_number}</TableCell>
                          <TableCell>{player.player_name}</TableCell>
                          <TableCell className="text-right font-mono">{player.chips.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-red-500"
                              onClick={() => eliminatePlayer(player.player_id, player.player_name)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {tournamentTables.length === 0 && tournament?.status === 'registration' && (
              <Card className="col-span-2 py-12">
                <CardContent className="text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Столы будут созданы при запуске турнира</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right panel - Logs */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-3 border-b flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Консоль ({logs.length})
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setLogs([])}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1" ref={logScrollRef}>
            <div className="p-2 space-y-1 font-mono text-xs">
              {logs.map(log => (
                <div 
                  key={log.id} 
                  className={`flex items-start gap-2 p-1.5 rounded ${
                    log.type === 'error' ? 'bg-red-500/10' :
                    log.type === 'success' ? 'bg-green-500/10' :
                    log.type === 'action' ? 'bg-blue-500/10' :
                    log.type === 'warning' ? 'bg-amber-500/10' :
                    'bg-muted/30'
                  }`}
                >
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="break-words">{log.message}</div>
                    {log.details && (
                      <pre className="mt-1 text-[10px] text-muted-foreground overflow-x-auto">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default TournamentTestMode;
