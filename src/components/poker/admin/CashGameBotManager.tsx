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
  Bot,
  Play, 
  Users, 
  UserPlus, 
  Trash2, 
  RefreshCw,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Table as TableIcon,
  Wifi,
  WifiOff,
  Zap,
  Diamond,
  DollarSign,
  Settings,
  Plus,
  Minus
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
} from "@/components/ui/select";
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

interface CashTable {
  id: string;
  name: string;
  status: string;
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  current_hand_id: string | null;
  players: CashTablePlayer[];
}

interface CashTablePlayer {
  id: string;
  player_id: string;
  player_name: string;
  player_user_id: string | null;
  seat_number: number;
  stack: number;
  status: string;
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
  aggression: number;
  stats: BotStats;
}

interface BotStats {
  handsPlayed: number;
  handsFolded: number;
  handsWon: number;
  totalBet: number;
  biggestPot: number;
  vpip: number;
  pfr: number;
}

interface CashGameBotManagerProps {
  onClose: () => void;
}

export function CashGameBotManager({ onClose }: CashGameBotManagerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cashTables, setCashTables] = useState<CashTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [availableBots, setAvailableBots] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [botCount, setBotCount] = useState(3);
  const [buyInAmount, setBuyInAmount] = useState(1000);
  const [botsToSeatCount, setBotsToSeatCount] = useState(1); // Number of bots to seat at once
  
  // Bot mode state
  const [botMode, setBotMode] = useState(false);
  const [botConnections, setBotConnections] = useState<Map<string, BotConnection>>(new Map());
  const [botSpeed, setBotSpeed] = useState(1000);
  const [connectedBots, setConnectedBots] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  
  const logScrollRef = useRef<HTMLDivElement>(null);
  const botConnectionsRef = useRef<Map<string, BotConnection>>(new Map());

  const getWsUrl = (tableId: string, playerId: string) => {
    const isLocalhost = window.location.hostname === 'localhost';
    const base = isLocalhost 
      ? 'ws://89.104.74.121:3001'
      : 'wss://89.104.74.121';
    return `${base}/ws/poker?tableId=${tableId}&playerId=${playerId}`;
  };

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

  // Load cash tables
  const loadCashTables = useCallback(async () => {
    const { data: tables, error } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('table_type', 'cash')
      .is('tournament_id', null)
      .order('name');

    if (error) {
      addLog('error', 'Ошибка загрузки столов', error);
      return;
    }

    // Load players for each table
    const tablesWithPlayers = await Promise.all(
      (tables || []).map(async (table) => {
        const { data: players } = await supabase
          .from('poker_table_players')
          .select(`*, players!inner(id, name, user_id)`)
          .eq('table_id', table.id);

        return {
          ...table,
          players: players?.map(p => ({
            id: p.id,
            player_id: p.player_id,
            player_name: (p.players as any)?.name || 'Unknown',
            player_user_id: (p.players as any)?.user_id || null,
            seat_number: p.seat_number,
            stack: p.stack,
            status: p.status
          })) || []
        };
      })
    );

    setCashTables(tablesWithPlayers);
    
    // Auto-select first table if none selected
    if (!selectedTableId && tablesWithPlayers.length > 0) {
      setSelectedTableId(tablesWithPlayers[0].id);
      setBuyInAmount(tablesWithPlayers[0].min_buy_in);
    }
  }, [selectedTableId, addLog]);

  // Load available bots - search for bots without user_id (they are managed bots)
  const loadAvailableBots = useCallback(async () => {
    // Bots are players without user_id (not linked to auth accounts)
    // Also exclude players who already have active tournament participations
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      addLog('error', 'Ошибка загрузки ботов', error);
      return;
    }

    // Filter out TestBot_ prefix if needed for cleaner list
    const bots = data?.filter(p => !p.name.startsWith('TestBot_')) || [];
    setAvailableBots(bots);
    addLog('info', `Найдено ${bots.length} доступных ботов`);
  }, [addLog]);

  // Subscribe to table changes for real-time updates
  useEffect(() => {
    if (!selectedTableId) return;

    const channel = supabase
      .channel(`table-${selectedTableId}-players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_table_players',
          filter: `table_id=eq.${selectedTableId}`
        },
        () => {
          // Reload tables when players change
          loadCashTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTableId, loadCashTables]);

  // Create cash bots with diamond wallets
  const createCashBots = async () => {
    setLoading(true);
    addLog('action', `Создание ${botCount} кэш-ботов с алмазами...`);

    try {
      const { generateUniqueNicknames } = await import('@/utils/pokerNicknameGenerator');
      const nicknames = generateUniqueNicknames(botCount);
      
      for (let i = 1; i <= botCount; i++) {
        const name = nicknames[i - 1] || `Player_${Date.now()}_${i}`;
        
        // Create player
        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert({ name, elo_rating: 1000 })
          .select('id')
          .single();

        if (playerError || !player) {
          addLog('error', `Ошибка создания бота ${i}`, playerError);
          continue;
        }

        // Create diamond wallet with initial balance
        const { error: walletError } = await supabase
          .from('diamond_wallets')
          .insert({
            player_id: player.id,
            balance: 100000, // 100k diamonds for testing
            total_purchased: 100000
          });

        if (walletError) {
          addLog('warning', `Кошелек не создан для ${name}`, walletError);
        }
      }
      
      await loadAvailableBots();
      addLog('success', `Создано ${botCount} кэш-ботов с алмазами`);
      toast.success(`Создано ${botCount} ботов`);
    } catch (err) {
      addLog('error', 'Ошибка создания', err);
    }
    setLoading(false);
  };

  // Sit bot at table
  const sitBotAtTable = async (botId: string, botName: string) => {
    if (!selectedTableId) {
      toast.error('Выберите стол');
      return;
    }

   // Fetch fresh table data to get current occupied seats
   const { data: tableData, error: tableError } = await supabase
     .from('poker_tables')
     .select('*')
     .eq('id', selectedTableId)
     .single();

   if (tableError || !tableData) {
     addLog('error', 'Не удалось загрузить данные стола', tableError);
     return;
   }

   // Fetch current players at table
   const { data: currentPlayers } = await supabase
     .from('poker_table_players')
     .select('seat_number')
     .eq('table_id', selectedTableId);

    // Check if table is full
   const playerCount = currentPlayers?.length || 0;
   if (playerCount >= tableData.max_players) {
      toast.error('Стол заполнен');
      return;
    }

    // Check buy-in limits
   if (buyInAmount < tableData.min_buy_in || buyInAmount > tableData.max_buy_in) {
     toast.error(`Бай-ин должен быть от ${tableData.min_buy_in} до ${tableData.max_buy_in}`);
      return;
    }

    // Check bot diamond balance
    const { data: wallet } = await supabase
      .from('diamond_wallets')
      .select('id, balance')
      .eq('player_id', botId)
      .single();

    if (!wallet || wallet.balance < buyInAmount) {
      toast.error(`Недостаточно алмазов у ${botName}`);
      return;
    }

   // Find available seat from fresh data
   const occupiedSeats = new Set((currentPlayers || []).map(p => p.seat_number));
    let availableSeat = -1;
   for (let i = 0; i < tableData.max_players; i++) {
      if (!occupiedSeats.has(i)) {
        availableSeat = i;
        break;
      }
    }

    if (availableSeat === -1) {
      toast.error('Нет свободных мест');
      return;
    }

    setLoading(true);
   addLog('action', `Посадка ${botName} за стол ${tableData.name} (место ${availableSeat})...`);

    try {
      // Deduct diamonds
      const { error: deductError } = await supabase
        .from('diamond_wallets')
        .update({ balance: wallet.balance - buyInAmount })
        .eq('player_id', botId);

      if (deductError) {
        addLog('error', 'Ошибка списания алмазов', deductError);
        setLoading(false);
        return;
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('diamond_transactions')
        .insert({
          player_id: botId,
          wallet_id: wallet.id,
          amount: -buyInAmount,
          balance_before: wallet.balance,
          balance_after: wallet.balance - buyInAmount,
          transaction_type: 'cash_game_buyin',
         description: `Бай-ин кэш-стол ${tableData.name}`
        });

      if (txError) {
        addLog('warning', 'Не удалось записать транзакцию бай-ина (не критично)', txError);
      }

      // Sit at table
      const { error: sitError } = await supabase
        .from('poker_table_players')
        .insert({
          table_id: selectedTableId,
          player_id: botId,
          seat_number: availableSeat,
          stack: buyInAmount,
          status: 'active'
        });

      if (sitError) {
        // Refund diamonds on error
        await supabase
          .from('diamond_wallets')
          .update({ balance: wallet.balance })
          .eq('player_id', botId);
        
        addLog('error', 'Ошибка посадки', sitError);
        setLoading(false);
        return;
      }

      // Notify server to sync players from database
      try {
        const wsUrl = getWsUrl(selectedTableId, 'admin');
        const syncWs = new WebSocket(wsUrl);
        syncWs.onopen = () => {
          syncWs.send(JSON.stringify({ 
            type: 'sync_players', 
            tableId: selectedTableId 
          }));
          setTimeout(() => syncWs.close(), 500);
        };
      } catch (e) {
        // Non-critical - server will sync on next connection
      }

      await loadCashTables();
     addLog('success', `${botName} сел за ${tableData.name} с ${buyInAmount}💎 на место ${availableSeat}`);
      toast.success(`${botName} за столом`);
    } catch (err) {
      addLog('error', 'Ошибка', err);
    }
    setLoading(false);
  };

  // Remove bot from table
  const removeBotFromTable = async (playerId: string, playerName: string, tableId: string) => {
    setLoading(true);
    addLog('action', `Снятие ${playerName} со стола...`);

    try {
      // Get current stack
      const { data: tablePlayer } = await supabase
        .from('poker_table_players')
        .select('stack')
        .eq('table_id', tableId)
        .eq('player_id', playerId)
        .single();

      if (tablePlayer && tablePlayer.stack > 0) {
        // Return chips to diamond wallet
        const { data: wallet } = await supabase
          .from('diamond_wallets')
          .select('id, balance')
          .eq('player_id', playerId)
          .single();

        if (wallet) {
          await supabase
            .from('diamond_wallets')
            .update({ balance: wallet.balance + tablePlayer.stack })
            .eq('player_id', playerId);

          await supabase
            .from('diamond_transactions')
            .insert({
              player_id: playerId,
              wallet_id: wallet.id,
              amount: tablePlayer.stack,
              balance_before: wallet.balance,
              balance_after: wallet.balance + tablePlayer.stack,
              transaction_type: 'cash_game_cashout',
              description: `Кэшаут со стола`
            });

          addLog('success', `${playerName} получил ${tablePlayer.stack}💎`);
        }
      }

      // Disconnect bot if connected
      const connection = botConnectionsRef.current.get(playerId);
      if (connection?.ws) {
        connection.ws.close();
      }

      // Remove from table
      await supabase
        .from('poker_table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('player_id', playerId);

      await loadCashTables();
      toast.success(`${playerName} снят со стола`);
    } catch (err) {
      addLog('error', 'Ошибка', err);
    }
    setLoading(false);
  };

  // Sit specified number of bots
  const sitSelectedBots = async (count: number) => {
    if (!selectedTableId) {
      toast.error('Выберите стол');
      return;
    }

    setLoading(true);
    
    // Reload table data before starting to get accurate counts
    await loadCashTables();
    
    let table = cashTables.find(t => t.id === selectedTableId);
    if (!table) {
      toast.error('Стол не найден');
      setLoading(false);
      return;
    }

    const seatedIds = new Set(table.players.map(p => p.player_id));
    const botsToSit = availableBots.filter(b => !seatedIds.has(b.id));
    let remainingSeats = table.max_players - table.players.length;
    
    const actualCount = Math.min(count, botsToSit.length, remainingSeats);

    if (actualCount === 0) {
      toast.error('Нет доступных ботов или свободных мест');
      setLoading(false);
      return;
    }

    addLog('info', `Посадка ${actualCount} ботов: ${botsToSit.length} доступно, ${remainingSeats} мест свободно`);

    for (let i = 0; i < actualCount; i++) {
      await sitBotAtTable(botsToSit[i].id, botsToSit[i].name);
      
      // Wait for DB to settle and reload table data before next iteration
      await new Promise(r => setTimeout(r, 500));
      await loadCashTables();
      
      // Refresh table object with updated data
      table = cashTables.find(t => t.id === selectedTableId);
      if (!table) break;
      
      // Recalculate remaining seats
      remainingSeats = table.max_players - table.players.length;
      if (remainingSeats <= 0) {
        addLog('info', 'Стол заполнен, остановка посадки');
        break;
      }
    }
    
    addLog('success', 'Посадка завершена');
    setLoading(false);
  };

  // Sit all available bots (convenience wrapper)
  const sitAllBots = async () => {
    const table = cashTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    const seatedIds = new Set(table.players.map(p => p.player_id));
    const botsToSit = availableBots.filter(b => !seatedIds.has(b.id));
    const remainingSeats = table.max_players - table.players.length;
    
    await sitSelectedBots(Math.min(botsToSit.length, remainingSeats));
  };

  // Connect bot to WebSocket
  const connectBot = useCallback((playerId: string, playerName: string, tableId: string, seatNumber: number, totalPlayers: number, dealerSeat: number) => {
    const wsUrl = getWsUrl(tableId, playerId);
    addLog('ws', `🔌 Подключение ${playerName}...`);
    
    const ws = new WebSocket(wsUrl);
    const aggression = 30 + Math.random() * 50;
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
      stats: { handsPlayed: 0, handsFolded: 0, handsWon: 0, totalBet: 0, biggestPot: 0, vpip: 0, pfr: 0 }
    };
    
    addLog('bot', `${playerName} - ${personality} (агрессия: ${aggression.toFixed(0)}%)`);
    
    ws.onopen = () => {
      connection.connected = true;
      botConnectionsRef.current.set(playerId, connection);
      setBotConnections(new Map(botConnectionsRef.current));
      setConnectedBots(prev => prev + 1);
      addLog('ws', `✅ ${playerName} подключен`);
      
      ws.send(JSON.stringify({ type: 'subscribe', tableId, playerId }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleBotMessage(playerId, playerName, message);
      } catch (err) {
        console.error('Bot message parse error:', err);
      }
    };
    
    ws.onclose = () => {
      connection.connected = false;
      botConnectionsRef.current.delete(playerId);
      setBotConnections(new Map(botConnectionsRef.current));
      setConnectedBots(prev => Math.max(0, prev - 1));
      addLog('ws', `🔴 ${playerName} отключен`);
    };
    
    ws.onerror = (err) => {
      addLog('error', `WebSocket ошибка ${playerName}`, err);
    };
    
    botConnectionsRef.current.set(playerId, connection);
    setBotConnections(new Map(botConnectionsRef.current));
  }, [addLog]);

  // Handle bot messages
  const handleBotMessage = useCallback((playerId: string, playerName: string, message: any) => {
    const connection = botConnectionsRef.current.get(playerId);
    if (!connection) return;
    
    switch (message.type) {
      case 'game_state':
        const myPlayer = message.data?.players?.find((p: any) => p.id === playerId);
        if (myPlayer) {
          connection.stack = myPlayer.stack;
          connection.seatNumber = myPlayer.seatNumber;
        }
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
              ? `${playerName} [${madeHand.name}]: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''} (${decision.confidence}%)`
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
          addLog('success', `🏆 ${playerName} выиграл ${wonAmount}💎!`);
        }
        if (connection.stats.handsPlayed > 0) {
          const voluntaryActions = connection.stats.handsPlayed - connection.stats.handsFolded;
          connection.stats.vpip = (voluntaryActions / connection.stats.handsPlayed) * 100;
        }
        botConnectionsRef.current.set(playerId, connection);
        addLog('info', `Рука завершена. Победители: ${winners.map((w: any) => w.playerName || w.playerId).join(', ')}`);
        break;
        
      case 'error':
        addLog('error', `Ошибка ${playerName}: ${message.data?.message || message.message}`);
        break;
    }
  }, [botMode, botSpeed, addLog]);

  // Connect all seated bots
  const connectAllBots = useCallback(async () => {
    if (!selectedTableId) return;
    
    const table = cashTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    addLog('action', '🤖 Подключение ботов...');
    
    // Bots are players without user_id
    const botPlayersAtTable = table.players.filter(p => p.player_user_id === null);
    
    if (botPlayersAtTable.length === 0) {
      addLog('warning', 'Нет ботов за столом (все игроки имеют user_id)');
      return;
    }
    
    addLog('info', `Найдено ${botPlayersAtTable.length} ботов за столом: ${botPlayersAtTable.map(p => p.player_name).join(', ')}`);
    
    for (const player of botPlayersAtTable) {
      if (!botConnectionsRef.current.has(player.player_id)) {
        connectBot(
          player.player_id,
          player.player_name,
          selectedTableId,
          player.seat_number,
          table.players.length,
          0
        );
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }, [selectedTableId, cashTables, connectBot, addLog]);

  // Reload table players from database
  const reloadTablePlayers = useCallback(async () => {
    if (!selectedTableId) return;
    
    addLog('action', 'Перезагрузка игроков со стола...');
    
    // Send reload message via WebSocket to trigger server reload
    const ws = new WebSocket('wss://poker.syndicate-poker.ru/ws/poker');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'reload_players',
        tableId: selectedTableId
      }));
    };
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'players_reloaded') {
        addLog('success', `✅ Игроки перезагружены. Всего: ${msg.playerCount}`);
        toast.success(`Игроки обновлены: ${msg.playerCount}`);
        loadCashTables();
      } else if (msg.type === 'error') {
        addLog('error', 'Ошибка перезагрузки', msg.error);
      }
      ws.close();
    };
    
    setTimeout(() => ws.close(), 5000);
  }, [selectedTableId, addLog, loadCashTables]);

  // Disconnect all bots
  const disconnectAllBots = useCallback(() => {
    addLog('action', 'Отключение всех ботов...');
    
    botConnectionsRef.current.forEach((connection) => {
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

  // Delete all bots
  const deleteAllBots = async () => {
    setLoading(true);
    disconnectAllBots();
    
    try {
      // Remove from tables first
      for (const bot of availableBots) {
        await supabase
          .from('poker_table_players')
          .delete()
          .eq('player_id', bot.id);
      }
      
      // Delete wallets
      for (const bot of availableBots) {
        await supabase
          .from('diamond_transactions')
          .delete()
          .eq('player_id', bot.id);
        
        await supabase
          .from('diamond_wallets')
          .delete()
          .eq('player_id', bot.id);
      }
      
      // Delete players
      await supabase
        .from('players')
        .delete()
        .like('name', 'CashBot_%');
      
      setAvailableBots([]);
      await loadCashTables();
      addLog('success', 'Все кэш-боты удалены');
      toast.success('Боты удалены');
    } catch (err) {
      addLog('error', 'Ошибка удаления', err);
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
    a.download = `cash_bots_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initial load
  useEffect(() => {
    addLog('info', '=== Менеджер ботов для кэш-столов ===');
    loadCashTables();
    loadAvailableBots();
    
    return () => {
      disconnectAllBots();
    };
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadCashTables();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadCashTables]);

  // Update buy-in when table changes
  useEffect(() => {
    const table = cashTables.find(t => t.id === selectedTableId);
    if (table) {
      setBuyInAmount(table.min_buy_in);
    }
  }, [selectedTableId, cashTables]);

  const selectedTable = cashTables.find(t => t.id === selectedTableId);

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
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Bot className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Боты для кэш-столов</h2>
            <p className="text-sm text-muted-foreground">Управление ботами с алмазами</p>
          </div>
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
          <Button variant="outline" size="sm" onClick={() => { loadCashTables(); loadAvailableBots(); }}>
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
          {/* Table Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Выбор стола
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите стол" />
                </SelectTrigger>
                <SelectContent>
                  {cashTables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.small_blind}/{table.big_blind}) - {table.players.length}/{table.max_players}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTable && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Блайнды: {selectedTable.small_blind}/{selectedTable.big_blind}</div>
                  <div>Бай-ин: {selectedTable.min_buy_in} - {selectedTable.max_buy_in} 💎</div>
                  <div>Игроков: {selectedTable.players.length}/{selectedTable.max_players}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bot Mode Controls - MAIN ACTION */}
          <Card className={botMode ? 'border-green-500 bg-green-500/10' : 'border-primary'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                🎮 Управление ботами
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                // Bots are players without user_id
                const botsAtTable = selectedTable?.players.filter(p => p.player_user_id === null) || [];
                const hasBotsAtTable = botsAtTable.length > 0;
                
                return (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">
                      Ботов за столом: <strong>{botsAtTable.length}</strong>
                      {botsAtTable.length > 0 && (
                        <span className="ml-2 block truncate">({botsAtTable.map(p => p.player_name).join(', ')})</span>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full h-12 text-base"
                      variant={botMode ? 'destructive' : 'default'}
                      onClick={toggleBotMode}
                      disabled={!selectedTable || !hasBotsAtTable}
                    >
                      {botMode ? (
                        <>
                          <WifiOff className="h-5 w-5 mr-2" />
                          Отключить ботов
                        </>
                      ) : (
                        <>
                          <Wifi className="h-5 w-5 mr-2" />
                          Подключить ботов ({botsAtTable.length})
                        </>
                      )}
                    </Button>
                    
                    {!hasBotsAtTable && selectedTable && (
                      <div className="text-xs text-amber-500">
                        ⚠️ Сначала посадите ботов за стол (раздел ниже)
                      </div>
                    )}
                  </>
                );
              })()}
              
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
                  
                  <div className="text-xs space-y-1 p-2 bg-green-500/10 rounded">
                    <div>✅ Подключено: {connectedBots}</div>
                    <div>🃏 Сыграно рук: {handsPlayed}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Create Bots */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Создать ботов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={botCount}
                  onChange={(e) => setBotCount(parseInt(e.target.value) || 1)}
                  min={1}
                  max={9}
                  className="w-20"
                />
                <Button size="sm" onClick={createCashBots} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Создать
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Доступно ботов: {availableBots.length}
              </div>
              
              <Button 
                size="sm" 
                variant="destructive" 
                className="w-full"
                onClick={deleteAllBots} 
                disabled={loading || availableBots.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить всех
              </Button>
            </CardContent>
          </Card>

          {/* Sit Bots */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Diamond className="h-4 w-4" />
                Посадка за стол
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Бай-ин (💎)</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8"
                    onClick={() => setBuyInAmount(Math.max(selectedTable?.min_buy_in || 100, buyInAmount - 100))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8"
                    onClick={() => setBuyInAmount(Math.min(selectedTable?.max_buy_in || 10000, buyInAmount + 100))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Number of bots to seat */}
              <div className="space-y-2">
                <Label className="text-xs">Количество ботов</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8"
                    onClick={() => setBotsToSeatCount(Math.max(1, botsToSeatCount - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={botsToSeatCount}
                    onChange={(e) => setBotsToSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center w-16"
                    min={1}
                    max={9}
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8"
                    onClick={() => setBotsToSeatCount(Math.min(9, botsToSeatCount + 1))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => sitSelectedBots(botsToSeatCount)} 
                  disabled={loading || availableBots.length === 0 || !selectedTableId}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Посадить {botsToSeatCount}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={sitAllBots} 
                  disabled={loading || availableBots.length === 0 || !selectedTableId}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Всех
                </Button>
              </div>
              
              <Button 
                size="sm" 
                variant="secondary"
                className="w-full"
                onClick={reloadTablePlayers}
                disabled={loading || !selectedTableId}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить стол
              </Button>
            </CardContent>
          </Card>

          {/* Available Bots */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Доступные боты ({availableBots.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                <div className="space-y-1 p-3">
                  {availableBots.map(bot => {
                    const isSeated = selectedTable?.players.some(p => p.player_id === bot.id);
                    const connection = botConnectionsRef.current.get(bot.id);
                    
                    return (
                      <div key={bot.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                        <div className="flex items-center gap-1">
                          {connection?.connected && (
                            <Wifi className="h-2.5 w-2.5 text-green-500" />
                          )}
                          <span className={isSeated ? 'text-green-600' : ''}>{bot.name}</span>
                        </div>
                        {!isSeated ? (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => sitBotAtTable(bot.id, bot.name)}
                            disabled={loading}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">За столом</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center panel - Table View */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Кэш-столы ({cashTables.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cashTables.map(table => (
              <Card 
                key={table.id} 
                className={`overflow-hidden ${table.id === selectedTableId ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedTableId(table.id)}
              >
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{table.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {table.small_blind}/{table.big_blind}
                      </Badge>
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
                  {table.players.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Игрок</TableHead>
                          <TableHead className="text-right">Стек</TableHead>
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
                              <TableCell className="text-right font-mono">{player.stack.toLocaleString()}💎</TableCell>
                              <TableCell>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeBotFromTable(player.player_id, player.player_name, table.id);
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      Нет игроков за столом
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {cashTables.length === 0 && (
              <Card className="col-span-2 py-12">
                <CardContent className="text-center text-muted-foreground">
                  <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Нет доступных кэш-столов</p>
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

export default CashGameBotManager;
