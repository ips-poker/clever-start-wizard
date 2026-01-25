import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  FlaskConical, 
  Play, 
  Pause,
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
  Table as TableIcon,
  Wifi,
  WifiOff,
  Bot,
  Zap,
  SkipForward,
  Brain,
  TrendingUp,
  Target
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  makeProDecision,
  analyzeHand,
  evaluateMadeHand,
  getPosition,
  getBotPersonality,
  type BotDecision,
  type Position
} from '@/utils/pokerBotAI';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'action' | 'ws' | 'bot';
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
  current_hand_id?: string;
  players: Array<{
    player_id: string;
    player_name: string;
    seat_number: number;
    chips: number;
    status: string;
  }>;
}

interface BotConnection {
  playerId: string;
  playerName: string;
  tableId: string;
  ws: WebSocket | null;
  connected: boolean;
  isMyTurn: boolean;
  holeCards: string[];
  currentBet: number;
  stack: number;
  seatNumber: number;
  position: Position;
  aggression: number; // 0-100, randomized per bot
  stats: BotStats;
}

interface BotStats {
  handsPlayed: number;
  handsFolded: number;
  handsWon: number;
  totalBet: number;
  biggestPot: number;
  vpip: number; // Voluntarily Put $ In Pot %
  pfr: number;  // Pre-Flop Raise %
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
  
  // Bot mode state
  const [botMode, setBotMode] = useState(false);
  const [botConnections, setBotConnections] = useState<Map<string, BotConnection>>(new Map());
  const [botSpeed, setBotSpeed] = useState(1000);
  const [connectedBots, setConnectedBots] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [showBotStats, setShowBotStats] = useState(false);
  
  const logScrollRef = useRef<HTMLDivElement>(null);
  const botConnectionsRef = useRef<Map<string, BotConnection>>(new Map());

  // WebSocket URL for poker server
  const getWsUrl = (tableId: string, playerId: string) => {
    const isLocalhost = window.location.hostname === 'localhost';
    // VPS poker server - порт 3001 для WebSocket
    const base = isLocalhost 
      ? 'ws://89.104.74.121:3001'
      : 'wss://poker-engine.syndicate-poker.ru'; // Используйте ваш домен или IP:port
    const url = `${base}/ws/poker?tableId=${tableId}&playerId=${playerId}`;
    console.log('WebSocket URL:', url);
    return url;
  };

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
    
    setTimeout(() => {
      if (logScrollRef.current) {
        logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Load tournament data
  const loadTournamentData = useCallback(async () => {
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

    const { data: participantsData, error: participantsError } = await supabase
      .from('online_poker_tournament_participants')
      .select(`*, players:players!online_poker_tournament_participants_player_id_fkey(id, name)`)
      .eq('tournament_id', tournamentId)
      .order('chips', { ascending: false });

    if (participantsError) {
      console.error('Error loading participants:', participantsError);
      addLog('error', 'Ошибка загрузки участников', participantsError);
    } else {
      console.log('Participants loaded:', participantsData?.length);
    }

    const formattedParticipants = participantsData?.map(p => ({
      ...p,
      player_name: (p.players as any)?.name || 'Unknown'
    })) || [];
    setParticipants(formattedParticipants);

    const { data: tablesData } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (tablesData && tablesData.length > 0) {
      const tablesWithPlayers = await Promise.all(
        tablesData.map(async (table) => {
          const { data: tablePlayers } = await supabase
            .from('poker_table_players')
            .select(`*, players!inner(id, name)`)
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
    } else {
      setTournamentTables([]);
    }
  }, [tournamentId, addLog]);

  // Load test players
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
    addLog('info', `Тестовых игроков: ${players.length}, зарег: ${players.filter(p => p.registered).length}`);
  }, [tournamentId, addLog]);

  // Create test players
  const createTestPlayers = async () => {
    setLoading(true);
    addLog('action', `Создание ${testPlayerCount} тестовых игроков...`);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      if (userError || !userId) {
        addLog('error', 'Нужна авторизация администратора для создания TestBot', userError);
        toast.error('Нет авторизации');
        setLoading(false);
        return;
      }

      // Генерируем реалистичные покерные никнеймы для маскировки
      const { generateUniqueNicknames } = await import('@/utils/pokerNicknameGenerator');
      const nicknames = generateUniqueNicknames(testPlayerCount);
      
      const rows = nicknames.map((nickname) => ({
        name: nickname,
        elo_rating: 1000 + Math.floor(Math.random() * 500), // Случайный ELO для реалистичности
        user_id: userId,
      }));

      const { error } = await supabase.from('players').insert(rows);
      if (error) {
        addLog('error', 'Ошибка создания тестовых игроков', error);
        toast.error('Ошибка создания игроков: ' + error.message);
      } else {
        await loadTestPlayers();
        addLog('success', `Создано ${testPlayerCount} игроков`);
      }
    } catch (err) {
      addLog('error', 'Ошибка создания', err);
    }

    setLoading(false);
  };

  // Register all test players
  const registerAllTestPlayers = async () => {
    setLoading(true);
    const unregistered = testPlayers.filter(p => !p.registered);
    addLog('action', `Регистрация ${unregistered.length} игроков...`);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      if (userError || !userId) {
        addLog('error', 'Нужна авторизация администратора для регистрации участников', userError);
        toast.error('Нет авторизации');
        setLoading(false);
        return;
      }

      // IMPORTANT: RLS policy for participants INSERT requires the player to be owned by the current user
      // (players.user_id = auth.uid()) OR have telegram set. For test mode we bind TestBot_* to the current admin.
      if (unregistered.length > 0) {
        const { error: bindError } = await supabase
          .from('players')
          .update({ user_id: userId })
          .in('id', unregistered.map(p => p.id));

        if (bindError) {
          addLog('error', 'Не удалось привязать тестовых игроков к текущему пользователю', bindError);
          toast.error('Ошибка подготовки игроков: ' + bindError.message);
          setLoading(false);
          return;
        }
      }

      const rows = unregistered.map(player => ({
        tournament_id: tournamentId,
        player_id: player.id,
        status: 'registered',
        chips: tournament?.starting_chips || 5000,
      }));

      const { error } = await supabase
        .from('online_poker_tournament_participants')
        .insert(rows);

      if (error) {
        addLog('error', 'Ошибка регистрации участников (RLS/валидаторы)', error);
        toast.error('Ошибка регистрации: ' + error.message);
      } else {
        await loadTestPlayers();
        await loadTournamentData();

        const { count } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId);

        addLog('success', `Все игроки зарегистрированы (всего участников: ${count ?? '—'})`);
        if (!count) {
          addLog('warning', 'После регистрации участников по-прежнему 0 — проверь RLS/права или что выбран правильный турнир', {
            hint: 'Если вы не админ (is_admin=false), добавление участников будет блокироваться политиками.'
          });
        }
      }
    } catch (err) {
      addLog('error', 'Ошибка регистрации', err);
    }

    setLoading(false);
  };

  // Start tournament
  const startTournament = async () => {
    setLoading(true);
    addLog('action', '🚀 ЗАПУСК ТУРНИРА...');

    try {
      const { data, error } = await supabase.rpc('start_online_tournament_with_seating', {
        p_tournament_id: tournamentId
      });

      if (error) {
        addLog('error', 'Ошибка запуска', error);
        toast.error('Ошибка: ' + error.message);
      } else {
        const result = data as any;
        if (result.success) {
          addLog('success', `✅ Турнир запущен! Столов: ${result.tables_created}`, result);
          toast.success(`Запущен! Столов: ${result.tables_created}`);
        } else {
          addLog('error', result.error, result);
        }
      }
      await loadTournamentData();
      await loadTestPlayers();
    } catch (err) {
      addLog('error', 'Критическая ошибка', err);
    }
    setLoading(false);
  };

  // Connect bot to WebSocket
  const connectBot = useCallback((playerId: string, playerName: string, tableId: string, seatNumber: number, totalPlayers: number, dealerSeat: number) => {
    const wsUrl = getWsUrl(tableId, playerId);
    addLog('ws', `🔌 Подключение ${playerName} к столу...`);
    
    const ws = new WebSocket(wsUrl);
    
    // Generate random aggression for bot personality
    const aggression = 30 + Math.random() * 50; // 30-80 range
    const personality = getBotPersonality(aggression);
    
    const connection: BotConnection = {
      playerId,
      playerName,
      tableId,
      ws,
      connected: false,
      isMyTurn: false,
      holeCards: [],
      currentBet: 0,
      stack: 0,
      seatNumber,
      position: getPosition(seatNumber, dealerSeat, totalPlayers),
      aggression,
      stats: {
        handsPlayed: 0,
        handsFolded: 0,
        handsWon: 0,
        totalBet: 0,
        biggestPot: 0,
        vpip: 0,
        pfr: 0
      }
    };
    
    addLog('bot', `${playerName} - ${personality} (агрессия: ${aggression.toFixed(0)}%)`);
    
    ws.onopen = () => {
      connection.connected = true;
      botConnectionsRef.current.set(playerId, connection);
      setBotConnections(new Map(botConnectionsRef.current));
      setConnectedBots(prev => prev + 1);
      addLog('ws', `✅ ${playerName} подключен`);
      
      // Subscribe to table
      ws.send(JSON.stringify({
        type: 'subscribe',
        tableId,
        playerId
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleBotMessage(playerId, playerName, message);
      } catch (err) {
        console.error('Bot message parse error:', err);
      }
    };
    
    ws.onclose = (event) => {
      connection.connected = false;
      botConnectionsRef.current.delete(playerId);
      setBotConnections(new Map(botConnectionsRef.current));
      setConnectedBots(prev => Math.max(0, prev - 1));
      const reason = event.reason ? `: ${event.reason}` : '';
      addLog('ws', `🔴 ${playerName} отключен (code ${event.code}${reason})`);
    };
    
    ws.onerror = (err) => {
      addLog('error', `WebSocket ошибка ${playerName}`, err);
    };
    
    botConnectionsRef.current.set(playerId, connection);
    setBotConnections(new Map(botConnectionsRef.current));
  }, [addLog]);

  // Handle bot WebSocket messages
  const handleBotMessage = useCallback((playerId: string, playerName: string, message: any) => {
    const connection = botConnectionsRef.current.get(playerId);
    if (!connection) return;
    
    switch (message.type) {
      case 'game_state':
        // Update bot state from game state
        const myPlayer = message.data?.players?.find((p: any) => p.id === playerId);
        if (myPlayer) {
          connection.stack = myPlayer.stack;
          connection.seatNumber = myPlayer.seatNumber;
        }
        // Update position if dealer changed
        if (message.data?.dealerSeat !== undefined) {
          const totalPlayers = message.data?.players?.length || 6;
          connection.position = getPosition(connection.seatNumber, message.data.dealerSeat, totalPlayers);
        }
        connection.holeCards = message.data?.myCards || [];
        botConnectionsRef.current.set(playerId, connection);
        break;
        
      case 'hand_start':
        connection.stats.handsPlayed++;
        connection.holeCards = [];
        addLog('bot', `🃏 Новая раздача - ${playerName} на позиции ${connection.position}`);
        setHandsPlayed(prev => prev + 1);
        botConnectionsRef.current.set(playerId, connection);
        break;
        
      case 'hole_cards':
        connection.holeCards = message.data?.cards || [];
        const handAnalysis = analyzeHand(connection.holeCards);
        addLog('bot', `${playerName}: ${connection.holeCards.join(' ')} [${handAnalysis.category}, сила: ${handAnalysis.strength}]`);
        botConnectionsRef.current.set(playerId, connection);
        break;
        
      case 'turn_update':
      case 'your_turn':
        const currentSeat = message.data?.currentPlayerSeat;
        connection.isMyTurn = currentSeat === connection.seatNumber;
        connection.currentBet = message.data?.currentBet || 0;
        
        if (connection.isMyTurn && botMode) {
          const communityCards = message.data?.communityCards || [];
          const phase = message.data?.phase || 'preflop';
          const pot = message.data?.pot || 0;
          const callAmount = message.data?.callAmount || connection.currentBet;
          const myBet = message.data?.myBet || 0;
          const playersInHand = message.data?.playersInHand || 2;
          const isRaised = message.data?.isRaised || callAmount > 0;
          
          // Pro decision with delay
          setTimeout(() => {
            if (!connection.ws || connection.ws.readyState !== WebSocket.OPEN) return;
            
            const decision = makeProDecision(
              connection.holeCards,
              communityCards,
              pot,
              connection.currentBet,
              myBet,
              connection.stack,
              phase,
              connection.position,
              playersInHand,
              isRaised,
              connection.aggression
            );
            
            // Update stats
            if (decision.action === 'fold') {
              connection.stats.handsFolded++;
            }
            if (decision.amount) {
              connection.stats.totalBet += decision.amount;
            }
            
            const madeHand = communityCards.length > 0 
              ? evaluateMadeHand(connection.holeCards, communityCards) 
              : null;
            
            const logMsg = madeHand 
              ? `${playerName} [${madeHand.name}]: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''} (${decision.confidence}% уверенность)`
              : `${playerName}: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''} - ${decision.reasoning}`;
            
            addLog('bot', logMsg);
            
            connection.ws?.send(JSON.stringify({
              type: 'action',
              tableId: connection.tableId,
              playerId,
              actionType: decision.action,
              amount: decision.amount || 0
            }));
            
            botConnectionsRef.current.set(playerId, connection);
          }, botSpeed);
        }
        break;
        
      case 'hand_complete':
      case 'hand_result':
        const winners = message.data?.winners || [];
        const isWinner = winners.some((w: any) => w.playerId === playerId);
        if (isWinner) {
          connection.stats.handsWon++;
          const wonAmount = winners.find((w: any) => w.playerId === playerId)?.amount || 0;
          if (wonAmount > connection.stats.biggestPot) {
            connection.stats.biggestPot = wonAmount;
          }
          addLog('success', `🏆 ${playerName} выиграл ${wonAmount}!`);
        }
        // Update VPIP/PFR
        if (connection.stats.handsPlayed > 0) {
          const voluntaryActions = connection.stats.handsPlayed - connection.stats.handsFolded;
          connection.stats.vpip = (voluntaryActions / connection.stats.handsPlayed) * 100;
        }
        botConnectionsRef.current.set(playerId, connection);
        addLog('info', `Рука завершена. Победители: ${winners.map((w: any) => w.playerName || w.playerId).join(', ')}`);
        break;
        
      case 'player_eliminated':
        if (message.data?.playerId === playerId) {
          addLog('warning', `💀 ${playerName} выбыл из турнира`);
        }
        break;
        
      case 'error':
        addLog('error', `Ошибка ${playerName}: ${message.data?.message || message.message}`);
        break;
    }
  }, [botMode, botSpeed, addLog]);

  // Connect all bots
  const connectAllBots = useCallback(async () => {
    addLog('action', '🤖 Подключение ботов к покерному движку...');
    
    // Get all playing participants
    const playingParticipants = participants.filter(p => p.status === 'playing' && p.table_id);
    
    if (playingParticipants.length === 0) {
      addLog('warning', 'Нет активных игроков для подключения');
      return;
    }
    
    addLog('info', `Подключение ${playingParticipants.length} ботов...`);
    
    for (const participant of playingParticipants) {
      if (!botConnectionsRef.current.has(participant.player_id)) {
        // Get table info for dealer position
        const table = tournamentTables.find(t => t.id === participant.table_id);
        const totalPlayers = table?.players.length || 6;
        const dealerSeat = 0; // Will be updated from game state
        
        connectBot(
          participant.player_id,
          participant.player_name,
          participant.table_id,
          participant.seat_number,
          totalPlayers,
          dealerSeat
        );
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }, [participants, tournamentTables, connectBot, addLog]);

  // Disconnect all bots
  const disconnectAllBots = useCallback(() => {
    addLog('action', 'Отключение всех ботов...');
    
    botConnectionsRef.current.forEach((connection, playerId) => {
      if (connection.ws) {
        connection.ws.close();
      }
    });
    
    botConnectionsRef.current.clear();
    setBotConnections(new Map());
    setConnectedBots(0);
    addLog('info', 'Все боты отключены');
  }, [addLog]);

  // Toggle bot mode
  const toggleBotMode = useCallback(async () => {
    if (!botMode) {
      setBotMode(true);
      await connectAllBots();
    } else {
      setBotMode(false);
      disconnectAllBots();
    }
  }, [botMode, connectAllBots, disconnectAllBots]);

  // Eliminate player
  const eliminatePlayer = async (playerId: string, playerName: string) => {
    addLog('action', `Выбывание ${playerName}...`);

    try {
      const { data, error } = await supabase.rpc('eliminate_online_tournament_player', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        addLog('error', `Ошибка выбывания`, error);
      } else {
        const result = data as any;
        addLog('success', `${playerName} выбыл на ${result.finish_position} месте`, result);
        
        // Disconnect bot if connected
        const connection = botConnectionsRef.current.get(playerId);
        if (connection?.ws) {
          connection.ws.close();
        }
        
        if (result.tournament_completed) {
          addLog('success', '🏆 ТУРНИР ЗАВЕРШЁН!');
          setBotMode(false);
          disconnectAllBots();
        }
      }
      await loadTournamentData();
    } catch (err) {
      addLog('error', 'Ошибка', err);
    }
  };

  // Clear test players
  const clearTestPlayers = async () => {
    setLoading(true);
    disconnectAllBots();
    
    try {
      for (const player of testPlayers) {
        await supabase
          .from('online_poker_tournament_participants')
          .delete()
          .eq('player_id', player.id)
          .eq('tournament_id', tournamentId);
      }

      await supabase
        .from('players')
        .delete()
        .like('name', 'TestBot_%');

      setTestPlayers([]);
      await loadTournamentData();
      addLog('success', 'Все тестовые игроки удалены');
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
  };

  // Initial load
  useEffect(() => {
    addLog('info', `=== Тестовый режим "${tournamentName}" ===`);
    loadTournamentData();
    loadTestPlayers();
    
    return () => {
      disconnectAllBots();
    };
  }, [tournamentId]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadTournamentData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadTournamentData]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'warning': return <AlertCircle className="h-3 w-3 text-amber-500" />;
      case 'action': return <ArrowRight className="h-3 w-3 text-blue-500" />;
      case 'ws': return <Wifi className="h-3 w-3 text-purple-500" />;
      case 'bot': return <Bot className="h-3 w-3 text-cyan-500" />;
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
            <h2 className="text-lg font-bold">Тестовый режим + Покерный движок</h2>
            <p className="text-sm text-muted-foreground">{tournamentName}</p>
          </div>
          <Badge variant={tournament?.status === 'running' ? 'default' : 'secondary'}>
            {tournament?.status || 'loading'}
          </Badge>
          {botMode && (
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
              <Bot className="h-3 w-3 mr-1" />
              Боты активны
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4" />
            <span>{connectedBots} ботов</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            <span>{handsPlayed} рук</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label className="text-sm">Авто</Label>
          </div>
          <Button variant="outline" size="sm" onClick={loadTournamentData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Логи
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
          {/* Bot Mode Controls */}
          <Card className={botMode ? 'border-cyan-500/50 bg-cyan-500/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Режим ботов (WebSocket)
              </CardTitle>
              <CardDescription className="text-xs">
                Подключение к покерному движку
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full"
                variant={botMode ? 'destructive' : 'default'}
                onClick={toggleBotMode}
                disabled={tournament?.status !== 'running'}
              >
                {botMode ? (
                  <>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Отключить ботов
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Подключить ботов
                  </>
                )}
              </Button>
              
              {botMode && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Скорость (мс): {botSpeed}</Label>
                    <Slider
                      value={[botSpeed]}
                      onValueChange={([v]) => setBotSpeed(v)}
                      min={200}
                      max={3000}
                      step={100}
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Подключено: {connectedBots}</div>
                    <div>Сыграно рук: {handsPlayed}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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
                Найдено: {testPlayers.length} | Зарег: {testPlayers.filter(p => p.registered).length}
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={registerAllTestPlayers} 
                disabled={loading || testPlayers.filter(p => !p.registered).length === 0}
              >
                Зарегистрировать всех
              </Button>

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
                Турнир
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
                Запустить
              </Button>
            </CardContent>
          </Card>

          {/* Active Players */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Активные ({participants.filter(p => p.status === 'playing').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {participants
                  .filter(p => p.status === 'playing' || p.status === 'registered')
                  .map(p => {
                    const connection = botConnectionsRef.current.get(p.player_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {connection?.connected && (
                              <Wifi className="h-2.5 w-2.5 text-green-500" />
                            )}
                            {p.player_name}
                          </div>
                          <div className="text-muted-foreground">
                            {p.chips?.toLocaleString()} 
                            {p.seat_number !== null && ` • #${p.seat_number}`}
                          </div>
                        </div>
                        {p.status === 'playing' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => eliminatePlayer(p.player_id, p.player_name)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center panel - Tables */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Столы ({tournamentTables.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tournamentTables.map(table => (
              <Card key={table.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{table.name}</span>
                    <div className="flex items-center gap-2">
                      {table.current_hand_id && (
                        <Badge variant="outline" className="text-xs bg-green-500/10">
                          <Zap className="h-2.5 w-2.5 mr-1" />
                          Игра
                        </Badge>
                      )}
                      <Badge variant="outline">{table.players.length}/{table.max_players}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Игрок</TableHead>
                        <TableHead className="text-right">Фишки</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.players.map(player => {
                        const connection = botConnectionsRef.current.get(player.player_id);
                        return (
                          <TableRow key={player.player_id} className={connection?.isMyTurn ? 'bg-amber-500/10' : ''}>
                            <TableCell className="font-mono">{player.seat_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {connection?.connected && (
                                  <Wifi className="h-3 w-3 text-green-500" />
                                )}
                                {player.player_name}
                              </div>
                            </TableCell>
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {tournamentTables.length === 0 && (
              <Card className="col-span-2 py-12">
                <CardContent className="text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Столы создаются при запуске турнира</p>
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
                    log.type === 'ws' ? 'bg-purple-500/10' :
                    log.type === 'bot' ? 'bg-cyan-500/10' :
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
