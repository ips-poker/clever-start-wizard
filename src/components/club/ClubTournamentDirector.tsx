import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClub } from "@/contexts/ClubContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Target,
  TrendingUp,
  UserX,
  UserCheck,
  Shuffle,
  Settings,
  BarChart3,
  Coins,
  Coffee,
  Zap,
  Maximize,
  Volume2,
  VolumeX,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { ClubTournamentOverview } from "./ClubTournamentOverview";
import { ClubTournamentPlayerManagement } from "./ClubTournamentPlayerManagement";
import { ClubTournamentSeating } from "./ClubTournamentSeating";
import { ClubTournamentResults } from "./ClubTournamentResults";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  starting_chips: number;
  reentry_chips: number;
  additional_chips: number;
  tournament_format: string | null;
  reentry_end_level: number | null;
  additional_level: number | null;
  break_start_level: number | null;
  players_per_table: number | null;
  start_time: string;
  created_at: string;
  finished_at: string | null;
  clan_id: string | null;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number | null;
  position: number | null;
  final_position: number | null;
  pending_reentry: boolean;
  pending_addon: boolean;
}

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number;
  is_break: boolean;
}

interface ClubTournamentDirectorProps {
  tournamentId: string;
  onBack: () => void;
}

export function ClubTournamentDirector({ tournamentId, onBack }: ClubTournamentDirectorProps) {
  const { club } = useClub();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load tournament data
  const loadTournament = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      console.error('Error loading tournament:', error);
      return;
    }

    setTournament(data);
    setCurrentTime(data.timer_remaining || data.timer_duration || 900);
  }, [tournamentId]);

  // Load registrations
  const loadRegistrations = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player:players(id, name, avatar_url, elo_rating)
      `)
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error loading registrations:', error);
      return;
    }

    setRegistrations(data || []);
  }, [tournamentId]);

  // Load blind levels
  const loadBlindLevels = useCallback(async () => {
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (error) {
      console.error('Error loading blind levels:', error);
      return;
    }

    setBlindLevels(data || []);
  }, [tournamentId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadTournament(), loadRegistrations(), loadBlindLevels()]);
      setLoading(false);
    };
    load();
  }, [loadTournament, loadRegistrations, loadBlindLevels]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`club_td_${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => loadRegistrations())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`
      }, () => loadTournament())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, loadRegistrations, loadTournament]);

  // Timer effect
  useEffect(() => {
    if (timerActive && tournament) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            handleNextLevel();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, tournament?.id]);

  // Timer controls
  const toggleTimer = () => {
    setTimerActive(!timerActive);
    if (tournament) {
      localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
        currentTime,
        timerActive: !timerActive,
        lastUpdate: Date.now()
      }));
    }
  };

  const resetTimer = () => {
    if (tournament) {
      const resetTime = tournament.timer_duration || 900;
      setCurrentTime(resetTime);
      setTimerActive(false);
      updateTimerInDatabase(resetTime);
    }
  };

  const updateTimerInDatabase = async (time: number) => {
    if (!tournament) return;
    await supabase
      .from('tournaments')
      .update({ timer_remaining: time })
      .eq('id', tournament.id);
  };

  const handleNextLevel = async () => {
    if (!tournament) return;

    const newLevel = tournament.current_level + 1;
    const nextBlind = blindLevels.find(bl => bl.level === newLevel);

    if (!nextBlind) {
      toast({ title: "Достигнут максимальный уровень", variant: "destructive" });
      return;
    }

    const resetTime = nextBlind.duration || 900;

    // Local update
    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: nextBlind.small_blind,
      current_big_blind: nextBlind.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);
    setTimerActive(true);

    // DB update
    await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: nextBlind.small_blind,
        current_big_blind: nextBlind.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id);

    toast({
      title: nextBlind.is_break ? "Перерыв" : `Уровень ${newLevel}`,
      description: nextBlind.is_break 
        ? `Перерыв ${Math.floor(resetTime / 60)} минут`
        : `Блайнды: ${nextBlind.small_blind}/${nextBlind.big_blind}`
    });
  };

  const handlePrevLevel = async () => {
    if (!tournament || tournament.current_level <= 1) return;

    const newLevel = tournament.current_level - 1;
    const prevBlind = blindLevels.find(bl => bl.level === newLevel);

    if (!prevBlind) return;

    const resetTime = prevBlind.duration || 900;

    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: prevBlind.small_blind,
      current_big_blind: prevBlind.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: prevBlind.small_blind,
        current_big_blind: prevBlind.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id);

    toast({
      title: `Уровень ${newLevel}`,
      description: `Блайнды: ${prevBlind.small_blind}/${prevBlind.big_blind}`
    });
  };

  const handleStartTournament = async () => {
    if (!tournament) return;

    const { error } = await supabase.rpc('start_tournament', {
      tournament_id_param: tournament.id
    });

    if (!error) {
      setTimerActive(true);
      toast({ title: "Турнир запущен!" });
      loadTournament();
    }
  };

  const handlePauseTournament = async () => {
    if (!tournament) return;

    await supabase
      .from('tournaments')
      .update({ status: 'paused' })
      .eq('id', tournament.id);

    setTimerActive(false);
    toast({ title: "Турнир приостановлен" });
    loadTournament();
  };

  const handleResumeTournament = async () => {
    if (!tournament) return;

    await supabase
      .from('tournaments')
      .update({ status: 'running' })
      .eq('id', tournament.id);

    setTimerActive(true);
    toast({ title: "Турнир возобновлён" });
    loadTournament();
  };

  const handleFinishTournament = async () => {
    if (!tournament) return;

    const { error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: tournament.id
    });

    if (!error) {
      setTimerActive(false);
      toast({ title: "Турнир завершён!" });
      loadTournament();
    }
  };

  const adjustTimer = (seconds: number) => {
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    updateTimerInDatabase(newTime);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate stats
  const activePlayers = registrations.filter(r => r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
  const pendingPlayers = registrations.filter(r => r.status === 'registered');
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || 0), 0);
  const avgStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  // Current blind level info
  const currentBlind = blindLevels.find(bl => bl.level === tournament?.current_level);
  const nextBlind = blindLevels.find(bl => bl.level === (tournament?.current_level || 0) + 1);
  const timerProgress = tournament?.timer_duration 
    ? (currentTime / tournament.timer_duration) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <p>Турнир не найден</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
              {tournament.status === 'running' ? 'Идёт' : 
               tournament.status === 'paused' ? 'Пауза' :
               tournament.status === 'completed' ? 'Завершён' : 'Ожидание'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Уровень {tournament.current_level}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      {/* Timer and Controls Card */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timer */}
            <div className="lg:col-span-2">
              <div className="text-center">
                {/* Current Blinds */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Малый блайнд</p>
                    <p className="text-3xl font-bold text-primary">{tournament.current_small_blind}</p>
                  </div>
                  <div className="text-2xl text-muted-foreground">/</div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Большой блайнд</p>
                    <p className="text-3xl font-bold text-primary">{tournament.current_big_blind}</p>
                  </div>
                  {currentBlind?.ante && (
                    <>
                      <div className="text-2xl text-muted-foreground">/</div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Анте</p>
                        <p className="text-3xl font-bold text-amber-500">{currentBlind.ante}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Timer Display */}
                <motion.div 
                  className={`text-7xl font-mono font-bold mb-4 ${
                    currentTime <= 60 ? 'text-destructive' : 
                    currentTime <= 120 ? 'text-amber-500' : 'text-foreground'
                  }`}
                  animate={currentTime <= 30 ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.5, repeat: currentTime <= 30 ? Infinity : 0 }}
                >
                  {formatTime(currentTime)}
                </motion.div>

                {/* Progress Bar */}
                <Progress 
                  value={timerProgress} 
                  className={`h-2 mb-4 ${
                    timerProgress < 20 ? '[&>div]:bg-destructive' : 
                    timerProgress < 40 ? '[&>div]:bg-amber-500' : ''
                  }`}
                />

                {/* Next Level Info */}
                {nextBlind && (
                  <p className="text-sm text-muted-foreground">
                    Следующий уровень: {nextBlind.is_break ? 'Перерыв' : `${nextBlind.small_blind}/${nextBlind.big_blind}`}
                  </p>
                )}
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" onClick={handlePrevLevel}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => adjustTimer(-60)}>
                  -1 мин
                </Button>
                <Button 
                  size="lg" 
                  className="px-8"
                  onClick={toggleTimer}
                >
                  {timerActive ? (
                    <><Pause className="w-5 h-5 mr-2" /> Пауза</>
                  ) : (
                    <><Play className="w-5 h-5 mr-2" /> Старт</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => adjustTimer(60)}>
                  +1 мин
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextLevel}>
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={resetTimer}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold">{activePlayers.length}</p>
                    <p className="text-xs text-muted-foreground">Активных</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <UserX className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <p className="text-2xl font-bold">{eliminatedPlayers.length}</p>
                    <p className="text-xs text-muted-foreground">Выбыло</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <Coins className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-2xl font-bold">{(totalChips / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Всего фишек</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{(avgStack / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Средний стек</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tournament Controls */}
              <div className="space-y-2">
                {tournament.status === 'scheduled' && (
                  <Button className="w-full" onClick={handleStartTournament}>
                    <Play className="w-4 h-4 mr-2" />
                    Начать турнир
                  </Button>
                )}
                {tournament.status === 'running' && (
                  <Button variant="outline" className="w-full" onClick={handlePauseTournament}>
                    <Pause className="w-4 h-4 mr-2" />
                    Приостановить
                  </Button>
                )}
                {tournament.status === 'paused' && (
                  <Button className="w-full" onClick={handleResumeTournament}>
                    <Play className="w-4 h-4 mr-2" />
                    Возобновить
                  </Button>
                )}
                {(tournament.status === 'running' || tournament.status === 'paused') && (
                  <Button variant="destructive" className="w-full" onClick={handleFinishTournament}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Завершить турнир
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-card/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 py-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Игроки</span>
          </TabsTrigger>
          <TabsTrigger value="seating" className="flex items-center gap-2 py-2">
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Рассадка</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2 py-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Результаты</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClubTournamentOverview
            tournament={tournament}
            registrations={registrations}
            blindLevels={blindLevels}
            currentTime={currentTime}
          />
        </TabsContent>

        <TabsContent value="players">
          <ClubTournamentPlayerManagement
            tournament={tournament}
            registrations={registrations}
            onUpdate={loadRegistrations}
          />
        </TabsContent>

        <TabsContent value="seating">
          <ClubTournamentSeating
            tournament={tournament}
            registrations={registrations}
            onUpdate={loadRegistrations}
          />
        </TabsContent>

        <TabsContent value="results">
          <ClubTournamentResults
            tournament={tournament}
            registrations={registrations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}