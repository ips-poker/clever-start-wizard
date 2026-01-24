import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Trophy, Users, Clock, Coins, Play, ChevronRight, 
  Zap, Crown, Target, Star, Loader2, CircleDot,
  Spade, RefreshCw, Search, Filter, Wallet, TrendingUp,
  Gamepad2, Award, Timer, UserPlus, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlitchText } from '@/components/ui/glitch-text';
import { motion, AnimatePresence } from 'framer-motion';
import { OnlinePokerTable as OnlinePokerTableComponent } from './OnlinePokerTable';
import { ActiveTournamentAssignments } from '@/components/poker/TournamentTableAssignment';

interface OnlinePokerTable {
  id: string;
  name: string;
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  status: string;
  game_type: string;
  table_type: string;
  player_count?: number;
}

interface OnlineTournament {
  id: string;
  name: string;
  description?: string;
  buy_in: number;
  starting_chips: number;
  max_players: number;
  min_players: number;
  status: string;
  prize_pool?: number;
  registration_start?: string;
  registration_end?: string;
  started_at?: string;
  current_level?: number;
  small_blind?: number;
  big_blind?: number;
  participant_count?: number;
  late_registration_enabled?: boolean;
  late_registration_level?: number;
}

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  elo_rating?: number;
}

interface TelegramPokerLobbyProps {
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  playerBalance?: number;
  onJoinTable?: (tableId: string, buyIn: number) => void;
  onJoinTournament?: (tournamentId: string) => void;
  onTableStateChange?: (isAtTable: boolean) => void;
  onBalanceUpdate?: () => void;
}

export function TelegramPokerLobby({
  playerId,
  playerName = 'Гость',
  playerAvatar,
  playerBalance = 10000,
  onJoinTable,
  onJoinTournament,
  onTableStateChange,
  onBalanceUpdate
}: TelegramPokerLobbyProps) {
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tables, setTables] = useState<OnlinePokerTable[]>([]);
  const [tournaments, setTournaments] = useState<OnlineTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [myTournamentStatusById, setMyTournamentStatusById] = useState<Record<string, string>>({});
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [activeBuyIn, setActiveBuyIn] = useState<number>(10000);
  const [showDemoTable, setShowDemoTable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, tournamentsRes] = await Promise.all([
        supabase
          .from('poker_tables')
          .select('*')
          .eq('table_type', 'cash')
          .is('tournament_id', null)
          .in('status', ['waiting', 'playing'])
          .order('big_blind', { ascending: true }),
        supabase
          .from('online_poker_tournaments')
          .select(`
            *,
            online_poker_tournament_participants(count)
          `)
          .in('status', ['registration', 'late_registration', 'starting', 'running', 'break', 'hand_for_hand', 'final_table'])
          .order('registration_start', { ascending: true })
      ]);

      if (tablesRes.data) {
        // Получаем количество игроков для каждого стола
        const tablesWithPlayers = await Promise.all(
          tablesRes.data.map(async (table) => {
            const { count } = await supabase
              .from('poker_table_players')
              .select('*', { count: 'exact', head: true })
              .eq('table_id', table.id)
              .eq('status', 'active');
            return { ...table, player_count: count || 0 };
          })
        );
        setTables(tablesWithPlayers);
      }

      if (tournamentsRes.data) {
        const tournamentsWithCount = tournamentsRes.data.map((t: any) => ({
          ...t,
          participant_count: t.online_poker_tournament_participants?.[0]?.count || 0
        }));
        setTournaments(tournamentsWithCount);
      }

      // Получаем участия/регистрации текущего игрока
      if (playerId) {
        const { data: regs, error: regsError } = await supabase
          .from('online_poker_tournament_participants')
          .select('tournament_id,status')
          .eq('player_id', playerId)
          .in('status', ['registered', 'playing', 'eliminated']);

        if (regsError) throw regsError;

        const statusById: Record<string, string> = {};
        for (const r of regs || []) statusById[r.tournament_id] = r.status;
        setMyTournamentStatusById(statusById);
      }
    } catch (error) {
      console.error('Error fetching poker data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchData();
    
    // Realtime subscriptions
    const tablesChannel = supabase
      .channel('telegram-poker-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_table_players' }, fetchData)
      .subscribe();

    const tournamentsChannel = supabase
      .channel('telegram-poker-tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournaments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournament_participants' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(tournamentsChannel);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Store selected table for passing minBuyIn/maxBuyIn
  const [activeTable, setActiveTable] = useState<OnlinePokerTable | null>(null);
  
  const handleJoinTable = async (table: OnlinePokerTable) => {
    if (!playerId) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setJoiningId(table.id);
    try {
      // Проверяем, не сидит ли игрок уже за этим столом
      const { data: existingPlayer } = await supabase
        .from('poker_table_players')
        .select('id, seat_number, stack')
        .eq('table_id', table.id)
        .eq('player_id', playerId)
        .eq('status', 'active')
        .maybeSingle();

      // Если игрок уже за столом - просто открываем стол
      if (existingPlayer) {
        console.log('Player already at table, opening table');
        setActiveTableId(table.id);
        setActiveTable(table);
        // Use player's current stack, but ensure it's at least the table minimum for display
        const effectiveBuyIn = Math.max(existingPlayer.stack, table.min_buy_in);
        setActiveBuyIn(effectiveBuyIn);
        onJoinTable?.(table.id, effectiveBuyIn);
        return;
      }

      // Check if player has enough balance to meet minimum buy-in
      if (playerBalance < table.min_buy_in) {
        toast.error(`Недостаточно алмазов. Минимум: ${table.min_buy_in.toLocaleString()} 💎`);
        return;
      }

      // DON'T auto-join - just open the table and let the player select a seat
      // The FullscreenPokerTableWrapper will show BuyInDialog when player clicks empty seat
      setActiveTableId(table.id);
      setActiveTable(table);
      setActiveBuyIn(table.min_buy_in);
      onJoinTable?.(table.id, table.min_buy_in);
    } catch (error: any) {
      console.error('Error joining table:', error);
      toast.error(error.message || 'Ошибка подключения к столу');
    } finally {
      setJoiningId(null);
    }
  };

  // Handle joining a tournament table by ID (from ActiveTournamentAssignments)
  const handleJoinTournamentTable = (tableId: string, tournamentId?: string) => {
    setActiveTableId(tableId);
    setActiveTournamentId(tournamentId || null);
    setActiveBuyIn(0); // Tournament tables don't use buy-in
  };

  // Handle entering a running tournament - find player's assigned table and open it
  const handleEnterTournament = async (tournamentId: string) => {
    if (!playerId) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setJoiningId(tournamentId);
    try {
      // Use RPC to get player's table assignment
      const { data, error } = await supabase.rpc('get_player_tournament_table', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) throw error;

      const assignment = data as { success: boolean; table_id?: string; table_name?: string; seat_number?: number; error?: string } | null;

      if (!assignment?.success || !assignment?.table_id) {
        toast.error(assignment?.error || 'Стол ещё не назначен. Подождите начала турнира.');
        return;
      }

      // Open the tournament table with tournament info
      setActiveTableId(assignment.table_id);
      setActiveTournamentId(tournamentId); // Pass tournament ID for TournamentHUD
      setActiveBuyIn(0); // Tournament tables don't use buy-in
      onJoinTournament?.(tournamentId);
      
      console.log('[TelegramPokerLobby] Entering tournament table:', assignment.table_id, 'tournamentId:', tournamentId);
      toast.success(`Стол: ${assignment.table_name || 'Турнирный стол'}, место ${assignment.seat_number}`);
    } catch (error: any) {
      console.error('Error entering tournament:', error);
      toast.error(error.message || 'Не удалось войти в турнир');
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoinTournament = async (tournament: OnlineTournament) => {
    if (!playerId) {
      toast.error('Необходимо войти в систему');
      return;
    }

    const existingStatus = myTournamentStatusById[tournament.id];
    if (existingStatus) {
      if (existingStatus === 'playing') {
        // Player is playing - find their table and enter
        await handleEnterTournament(tournament.id);
        return;
      }
      toast.info(existingStatus === 'eliminated' ? 'Вы уже выбыли из турнира' : 'Вы уже зарегистрированы');
      return;
    }

    if (playerBalance < tournament.buy_in) {
      toast.error(`Недостаточно фишек. Бай-ин: ${tournament.buy_in.toLocaleString()}`);
      return;
    }

    setJoiningId(tournament.id);
    try {
      // Check if this is late registration (tournament already running)
      const isLateReg = tournament.late_registration_enabled && 
                        ['running', 'starting', 'break'].includes(tournament.status) &&
                        (tournament.current_level || 1) <= (tournament.late_registration_level || 0);

      if (isLateReg) {
        // Use late registration RPC that handles seating
        const { data, error } = await supabase.rpc('late_register_tournament_player', {
          p_tournament_id: tournament.id,
          p_player_id: playerId
        });

        if (error) throw error;

        const result = data as { table_name?: string } | null;
        toast.success(`Поздняя регистрация успешна! Ваш стол: ${result?.table_name || 'назначен'}`);
        setMyTournamentStatusById((prev) => ({ ...prev, [tournament.id]: 'playing' }));
      } else {
        // Regular pre-registration
        const { error } = await supabase
          .from('online_poker_tournament_participants')
          .insert({
            tournament_id: tournament.id,
            player_id: playerId,
            chips: tournament.starting_chips,
            status: 'registered'
          });

        if (error) throw error;

        toast.success(`Вы зарегистрировались на ${tournament.name}!`);
        setMyTournamentStatusById((prev) => ({ ...prev, [tournament.id]: 'registered' }));
      }

      onJoinTournament?.(tournament.id);
      fetchData();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast.error(error.message || 'Не удалось зарегистрироваться');
    } finally {
      setJoiningId(null);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      registration: { label: 'Регистрация', variant: 'default', icon: <UserPlus className="h-3 w-3" /> },
      late_registration: { label: 'Поздняя рег.', variant: 'secondary', icon: <Timer className="h-3 w-3" /> },
      running: { label: 'Идёт', variant: 'destructive', icon: <Play className="h-3 w-3" /> },
      waiting: { label: 'Ожидание', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      playing: { label: 'Играют', variant: 'destructive', icon: <Gamepad2 className="h-3 w-3" /> },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const, icon: null };
    return (
      <Badge variant={config.variant} className="gap-1 text-[10px]">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Notify parent about table state changes
  useEffect(() => {
    const isAtTable = !!(activeTableId || showDemoTable);
    onTableStateChange?.(isAtTable);
  }, [activeTableId, showDemoTable, onTableStateChange]);

  // Refresh balance callback - refetches from parent when needed
  const handleBalanceUpdate = useCallback(() => {
    // Trigger parent to refetch balance from DB
    onBalanceUpdate?.();
  }, [onBalanceUpdate]);

  // Если открыт активный стол или демо-режим - используем OnlinePokerTable
  if (activeTableId && playerId) {
    return (
      <OnlinePokerTableComponent
        tableId={activeTableId}
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        buyIn={activeBuyIn}
        minBuyIn={activeTable?.min_buy_in || 200}
        maxBuyIn={activeTable?.max_buy_in || 2000}
        playerBalance={playerBalance}
        isTournament={!!activeTournamentId}
        tournamentId={activeTournamentId || undefined}
        onLeave={() => {
          setActiveTableId(null);
          setActiveTable(null);
          setActiveTournamentId(null);
          setActiveBuyIn(10000);
        }}
        onBalanceUpdate={handleBalanceUpdate}
      />
    );
  }

  // Быстрая игра - создаем/присоединяемся к демо-столу через OnlinePokerTable
  if (showDemoTable && playerId) {
    return (
      <OnlinePokerTableComponent
        tableId="demo-table"
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        buyIn={playerBalance}
        playerBalance={playerBalance}
        onLeave={() => setShowDemoTable(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-syndikate-orange mx-auto" />
          <p className="text-sm text-muted-foreground">Загрузка покер-рума...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      {/* Header with Balance */}
      <div className="bg-gradient-to-r from-syndikate-metal via-syndikate-metal/90 to-syndikate-metal brutal-border p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-syndikate-orange to-syndikate-red flex items-center justify-center">
              <Spade className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display uppercase tracking-wider">
                <GlitchText text="ПОКЕР-РУМ" glitchIntensity="low" />
              </h2>
              <p className="text-xs text-muted-foreground">Онлайн игры 24/7</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mt-4 flex items-center justify-between bg-background/20 rounded-lg p-3 border border-syndikate-orange/30">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-syndikate-orange" />
            <span className="text-xs text-muted-foreground">Ваш баланс:</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-bold text-syndikate-orange">
              {playerBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Play Button */}
        <Button
          onClick={() => setShowDemoTable(true)}
          disabled={!playerId}
          className="w-full mt-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold h-12 rounded-xl shadow-lg disabled:opacity-50"
        >
          <Play className="h-5 w-5 mr-2" />
          Быстрая игра
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск столов и турниров..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-syndikate-metal/50 border-border/50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-syndikate-metal/50">
          <TabsTrigger 
            value="tournaments" 
            className="data-[state=active]:bg-syndikate-orange data-[state=active]:text-white gap-2"
          >
            <Trophy className="h-4 w-4" />
            Турниры
            {tournaments.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {tournaments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="cash" 
            className="data-[state=active]:bg-syndikate-orange data-[state=active]:text-white gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Кеш-игры
            {tables.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {tables.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="mt-4 space-y-3">
          {/* Show active tournament assignments first */}
          {playerId && (
            <ActiveTournamentAssignments
              playerId={playerId}
              onJoinTable={handleJoinTournamentTable}
            />
          )}
          
          <AnimatePresence mode="popLayout">
            {filteredTournaments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Нет активных турниров</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Следите за расписанием
                </p>
              </motion.div>
            ) : (
              filteredTournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-syndikate-metal/80 brutal-border overflow-hidden hover:border-syndikate-orange/50 transition-all group">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="h-4 w-4 text-syndikate-orange" />
                            <h3 className="font-semibold text-sm truncate">
                              {tournament.name}
                            </h3>
                          </div>
                          {tournament.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {tournament.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(tournament.status)}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="flex items-center justify-center gap-1 text-syndikate-orange">
                            <Coins className="h-3 w-3" />
                            <span className="font-bold text-sm">
                              {tournament.buy_in.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Бай-ин</span>
                        </div>
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="flex items-center justify-center gap-1 text-green-400">
                            <Award className="h-3 w-3" />
                            <span className="font-bold text-sm">
                              {(tournament.prize_pool || tournament.buy_in * (tournament.participant_count || 0)).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Призовые</span>
                        </div>
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="flex items-center justify-center gap-1 text-blue-400">
                            <Users className="h-3 w-3" />
                            <span className="font-bold text-sm">
                              {tournament.participant_count || 0}/{tournament.max_players}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Игроки</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Старт: {formatTime(tournament.registration_end || tournament.started_at)}
                          </span>
                          {tournament.status === 'running' && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Уровень {tournament.current_level}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {(() => {
                        const myStatus = myTournamentStatusById[tournament.id];
                        const isMine = !!myStatus;
                        const canEnter =
                          isMine &&
                          myStatus !== 'eliminated' &&
                          ['starting', 'running', 'break', 'hand_for_hand', 'final_table'].includes(tournament.status);
                        
                        // Check if late registration is available
                        const isLateRegOpen = tournament.late_registration_enabled && 
                                              ['running', 'starting', 'break'].includes(tournament.status) &&
                                              (tournament.current_level || 1) <= (tournament.late_registration_level || 0);
                        
                        const canRegister =
                          !isMine &&
                          (tournament.status === 'registration' || tournament.status === 'late_registration' || isLateRegOpen) &&
                          playerBalance >= tournament.buy_in &&
                          (tournament.participant_count || 0) < tournament.max_players;

                        const disabled = joiningId === tournament.id || !(canEnter || canRegister);

                        return (
                          <Button
                            onClick={() => {
                              if (canEnter) handleEnterTournament(tournament.id);
                              else handleJoinTournament(tournament);
                            }}
                            disabled={disabled}
                            className={`w-full ${
                              isMine
                                ? 'bg-green-600 hover:bg-green-700'
                                : isLateRegOpen
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-syndikate-orange hover:bg-syndikate-orange-glow'
                            }`}
                            size="sm"
                          >
                            {joiningId === tournament.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : canEnter ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Войти в турнир
                              </>
                            ) : isMine ? (
                              <>
                                <CircleDot className="h-4 w-4 mr-2" />
                                {myStatus === 'eliminated' ? 'Выбыли' : 'Зарегистрирован'}
                              </>
                            ) : canRegister && isLateRegOpen ? (
                              <>
                                <Timer className="h-4 w-4 mr-2" />
                                Поздняя регистрация
                              </>
                            ) : canRegister ? (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Регистрация
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Турнир идёт
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Cash Games Tab */}
        <TabsContent value="cash" className="mt-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTables.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Нет активных столов</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Столы появятся здесь
                </p>
              </motion.div>
            ) : (
              filteredTables.map((table, index) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-syndikate-metal/80 brutal-border overflow-hidden hover:border-syndikate-orange/50 transition-all group">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                            <Spade className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{table.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {table.game_type === 'holdem' ? "Texas Hold'em" : table.game_type}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(table.status)}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="text-syndikate-orange font-bold text-sm">
                            {table.small_blind}/{table.big_blind}
                          </div>
                          <span className="text-[10px] text-muted-foreground">Блайнды</span>
                        </div>
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="flex items-center justify-center gap-1 text-blue-400">
                            <Users className="h-3 w-3" />
                            <span className="font-bold text-sm">
                              {table.player_count || 0}/{table.max_players}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Игроки</span>
                        </div>
                        <div className="bg-background/30 rounded-lg p-2">
                          <div className="text-green-400 font-bold text-sm">
                            {table.min_buy_in.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-muted-foreground">Мин. бай-ин</span>
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        onClick={() => handleJoinTable(table)}
                        disabled={
                          joiningId === table.id ||
                          (table.player_count || 0) >= table.max_players
                        }
                        className="w-full bg-syndikate-orange hover:bg-syndikate-orange-glow"
                        size="sm"
                      >
                        {joiningId === table.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (table.player_count || 0) >= table.max_players ? (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            Стол заполнен
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Сесть за стол
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-syndikate-metal/50 to-syndikate-metal/30 brutal-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-syndikate-orange">
                  {tables.reduce((sum, t) => sum + (t.player_count || 0), 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">Онлайн</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  {tables.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Столов</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {tournaments.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Турниров</div>
              </div>
            </div>
            <TrendingUp className="h-5 w-5 text-syndikate-orange" />
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-syndikate-orange/10 border-syndikate-orange/30">
        <CardContent className="p-3 flex items-center gap-3">
          <Zap className="h-5 w-5 text-syndikate-orange flex-shrink-0" />
          <div>
            <p className="text-xs font-medium">Играйте в любое время!</p>
            <p className="text-[10px] text-muted-foreground">
              Столы работают 24/7. Присоединяйтесь к игре когда удобно.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
