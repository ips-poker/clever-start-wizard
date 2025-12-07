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
import { TelegramStablePokerTable } from './TelegramStablePokerTable';
import { OnlinePokerTable as OnlinePokerTableComponent } from './OnlinePokerTable';

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
}

export function TelegramPokerLobby({
  playerId,
  playerName = 'Гость',
  playerAvatar,
  playerBalance = 10000,
  onJoinTable,
  onJoinTournament,
  onTableStateChange
}: TelegramPokerLobbyProps) {
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tables, setTables] = useState<OnlinePokerTable[]>([]);
  const [tournaments, setTournaments] = useState<OnlineTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<Set<string>>(new Set());
const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeBuyIn, setActiveBuyIn] = useState<number>(10000);
  const [showDemoTable, setShowDemoTable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, tournamentsRes] = await Promise.all([
        supabase
          .from('poker_tables')
          .select('*')
          .in('status', ['waiting', 'playing'])
          .order('big_blind', { ascending: true }),
        supabase
          .from('online_poker_tournaments')
          .select(`
            *,
            online_poker_tournament_participants(count)
          `)
          .in('status', ['registration', 'late_registration', 'running'])
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

      // Получаем регистрации текущего игрока
      if (playerId) {
        const { data: regs } = await supabase
          .from('online_poker_tournament_participants')
          .select('tournament_id')
          .eq('player_id', playerId)
          .eq('status', 'registered');
        
        if (regs) {
          setRegisteredTournaments(new Set(regs.map(r => r.tournament_id)));
        }
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

  const handleJoinTable = async (table: OnlinePokerTable) => {
    if (!playerId) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setJoiningId(table.id);
    try {
      // Проверяем, не сидит ли игрок уже за этим столом
      const { data: existingPlayer, error: checkError } = await supabase
        .from('poker_table_players')
        .select('id, seat_number, stack')
        .eq('table_id', table.id)
        .eq('player_id', playerId)
        .eq('status', 'active')
        .maybeSingle();

      console.log('Check existing player:', existingPlayer, 'error:', checkError);

      // Если игрок уже за столом - просто открываем стол
      if (existingPlayer) {
        console.log('Player already at table, opening table');
        setActiveTableId(table.id);
        setActiveBuyIn(existingPlayer.stack);
        setJoiningId(null);
        onJoinTable?.(table.id, existingPlayer.stack);
        return;
      }

      // Проверяем баланс только если нужно садиться за стол
      if (playerBalance < table.min_buy_in) {
        toast.error(`Недостаточно фишек. Минимум: ${table.min_buy_in.toLocaleString()}`);
        setJoiningId(null);
        return;
      }

      // Находим свободное место
      const { data: existingPlayers } = await supabase
        .from('poker_table_players')
        .select('seat_number')
        .eq('table_id', table.id)
        .eq('status', 'active');

      const occupiedSeats = new Set(existingPlayers?.map(p => p.seat_number) || []);
      let freeSeat = 1;
      for (let i = 1; i <= table.max_players; i++) {
        if (!occupiedSeats.has(i)) {
          freeSeat = i;
          break;
        }
      }

      if (occupiedSeats.size >= table.max_players) {
        toast.error('Стол заполнен');
        setJoiningId(null);
        return;
      }

      const { error } = await supabase
        .from('poker_table_players')
        .insert({
          table_id: table.id,
          player_id: playerId,
          seat_number: freeSeat,
          stack: table.min_buy_in,
          status: 'active'
        });

      // Если ошибка duplicate key - игрок уже за столом, просто открываем
      if (error) {
        console.log('Insert error:', error);
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log('Duplicate key - player already at table, opening anyway');
          setActiveTableId(table.id);
          setActiveBuyIn(table.min_buy_in);
          setJoiningId(null);
          onJoinTable?.(table.id, table.min_buy_in);
          return;
        }
        throw error;
      }

      toast.success(`Вы присоединились к столу ${table.name}!`);
      
      // Open the table after successful join
      setActiveTableId(table.id);
      setActiveBuyIn(table.min_buy_in);
      onJoinTable?.(table.id, table.min_buy_in);
    } catch (error: any) {
      console.error('Error joining table:', error);
      toast.error(error.message || 'Не удалось присоединиться к столу');
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoinTournament = async (tournament: OnlineTournament) => {
    if (!playerId) {
      toast.error('Необходимо войти в систему');
      return;
    }

    if (registeredTournaments.has(tournament.id)) {
      toast.info('Вы уже зарегистрированы');
      return;
    }

    if (playerBalance < tournament.buy_in) {
      toast.error(`Недостаточно фишек. Бай-ин: ${tournament.buy_in.toLocaleString()}`);
      return;
    }

    setJoiningId(tournament.id);
    try {
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
      setRegisteredTournaments(prev => new Set([...prev, tournament.id]));
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

  // Если открыт активный стол - используем реальный онлайн компонент с движком
  if (activeTableId && playerId) {
    return (
      <OnlinePokerTableComponent
        tableId={activeTableId}
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        buyIn={activeBuyIn}
        onLeave={() => {
          setActiveTableId(null);
          setActiveBuyIn(10000);
        }}
      />
    );
  }

  // Демо-стол - используем стабильный компонент с локальной симуляцией
  if (showDemoTable) {
    return (
      <TelegramStablePokerTable
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        playerStack={playerBalance}
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
          className="w-full mt-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold h-12 rounded-xl shadow-lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Быстрая игра (Demo)
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
                      <Button
                        onClick={() => handleJoinTournament(tournament)}
                        disabled={
                          joiningId === tournament.id || 
                          registeredTournaments.has(tournament.id) ||
                          tournament.status === 'running' ||
                          (tournament.participant_count || 0) >= tournament.max_players
                        }
                        className={`w-full ${
                          registeredTournaments.has(tournament.id)
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-syndikate-orange hover:bg-syndikate-orange-glow'
                        }`}
                        size="sm"
                      >
                        {joiningId === tournament.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : registeredTournaments.has(tournament.id) ? (
                          <>
                            <CircleDot className="h-4 w-4 mr-2" />
                            Зарегистрирован
                          </>
                        ) : tournament.status === 'running' ? (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Турнир идёт
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Регистрация
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
