import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Volume2,
  FastForward,
  Rewind,
  Maximize, 
  StopCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Activity, 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  Target, 
  BarChart3,
  Users,
  UserX,
  RotateCcw,
  Trophy,
  Clock,
  Play,
  Pause,
  Coffee,
  Mic
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlayerManagement from "./PlayerManagement";
import FullscreenTimer from "./FullscreenTimer";
import { useTimerSounds } from "@/hooks/useTimerSounds";

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
  max_players: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  tournament_format: string;
  addon_level: number;
  break_start_level: number;
  reentry_chips?: number;
  additional_chips?: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number;
  position?: number;
}

interface TournamentOverviewProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onStopTournament: () => void;
  onRefresh: () => void;
  onTimerAdjust?: (seconds: number) => void;
  onFinishTournament?: () => void;
  onOpenExternalTimer: () => void;
}

const TournamentOverview = ({
  tournament,
  players,
  registrations,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onStopTournament,
  onRefresh,
  onTimerAdjust,
  onFinishTournament,
  onOpenExternalTimer
}: TournamentOverviewProps) => {
  const [blindLevels, setBlindLevels] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState({
    activeTournaments: 0,
    totalPlayersInClub: 0,
    weeklyGames: 0,
    averageRating: 0
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('beep');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false);
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const { playTimerAlert, stopSound, soundOptions } = useTimerSounds({
    enabled: soundEnabled,
    selectedSound: selectedSound,
    volume: 0.7
  });

  useEffect(() => {
    console.log('TournamentOverview mounted');
    loadSystemStats();
    loadBlindLevels();
    
    return () => {
      console.log('TournamentOverview unmounting');
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (tournament?.id) {
      loadBlindLevels();
    }
  }, [tournament?.id]);

  // Realtime: обновляем структуру блайндов при любых изменениях в БД
  useEffect(() => {
    if (!tournament?.id) return;
    
    const channel = supabase
      .channel(`blinds_${tournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${tournament.id}`
      }, () => {
        loadBlindLevels();
      });
    
    // Вызываем subscribe, но не возвращаем Promise
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id]);

  const loadBlindLevels = async () => {
    if (!tournament?.id || !isMountedRef.current) return;
    
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('level', { ascending: true });

    if (!error && data && isMountedRef.current) {
      setBlindLevels(data);
    }
  };

  const loadSystemStats = async () => {
    if (!isMountedRef.current) return;
    
    try {
      // Get active tournaments (running and registration status)
      const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .in('status', ['running', 'registration']);

      // Get total players
      const { data: allPlayers } = await supabase
        .from('players')
        .select('elo_rating');

      // Calculate weekly games (simplified)
      const { data: weeklyResults } = await supabase
        .from('game_results')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const averageRating = allPlayers?.length ? 
        Math.round(allPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / allPlayers.length) : 0;

      if (isMountedRef.current) {
        setSystemStats({
          activeTournaments: activeTournaments?.length || 0,
          totalPlayersInClub: allPlayers?.length || 0,
          weeklyGames: weeklyResults?.length || 0,
          averageRating
        });
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const openFullscreenTimer = () => {
    setShowFullscreenTimer(true);
  };

  const closeFullscreenTimer = () => {
    setShowFullscreenTimer(false);
  };

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
  
  // Используем новую терминологию
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
  
  // Рассчитываем фонд RPS баллов
  const participationFee = (tournament as any).participation_fee || tournament.buy_in || 0;
  const reentryFee = (tournament as any).reentry_fee || tournament.rebuy_cost || 0;
  const additionalFee = (tournament as any).additional_fee || tournament.addon_cost || 0;
  
  // Расчет RPS баллов: каждые 1000₽ = 100 баллов
  const rpsPool = Math.floor(
    (registrations.length * participationFee + 
     totalReentries * reentryFee + 
     totalAdditionalSets * additionalFee) / 10
  );
  
  // Расчет среднего стека (только для активных игроков)
  const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  // Найти текущий и следующий уровни из структуры блайндов
  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);

  // Используем значения из структуры для текущего уровня (если доступны)
  const currentSmallBlind = currentBlindLevel?.small_blind ?? tournament.current_small_blind;
  const currentBigBlind = currentBlindLevel?.big_blind ?? tournament.current_big_blind;
  
  // Найти следующий перерыв и время до него
  const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
  const levelsUntilBreak = nextBreakLevel ? nextBreakLevel.level - tournament.current_level : null;
  
  // Примерное время до перерыва
  const calculateTimeToBreak = () => {
    if (!nextBreakLevel || !levelsUntilBreak) return null;
    
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntilBreak; i++) {
      const levelInfo = blindLevels.find(l => l.level === tournament.current_level + i);
      timeToBreak += levelInfo?.duration || 1200;
    }
    return timeToBreak;
  };
  
  const timeToBreak = calculateTimeToBreak();
  const isCurrentBreak = currentBlindLevel?.is_break || false;
  
  // Fallback на простое умножение, если структура не загружена
  const nextSmallBlind = nextBlindLevel ? nextBlindLevel.small_blind : Math.round(tournament.current_small_blind * 1.5);
  const nextBigBlind = nextBlindLevel ? nextBlindLevel.big_blind : Math.round(tournament.current_big_blind * 1.5);
  const isNextLevelBreak = nextBlindLevel?.is_break || false;

  const timerProgress = (((currentBlindLevel?.duration ?? tournament.timer_duration) - currentTime) / (currentBlindLevel?.duration ?? tournament.timer_duration)) * 100;

  // Звуковые оповещения
  useEffect(() => {
    if (soundEnabled) {
      playTimerAlert(currentTime);
    }
  }, [currentTime, soundEnabled, playTimerAlert]);

  return (
    <>
      {showFullscreenTimer && (
        <FullscreenTimer
          tournament={tournament}
          registrations={registrations}
          currentTime={currentTime}
          timerActive={timerActive}
          onToggleTimer={onToggleTimer}
          onResetTimer={onResetTimer}
          onNextLevel={onNextLevel}
          onPrevLevel={onPrevLevel}
          onStopTournament={onStopTournament}
          onClose={closeFullscreenTimer}
          onTimerAdjust={(seconds) => {
            onTimerAdjust?.(seconds);
          }}
          blindLevels={blindLevels}
        />
      )}
      
      <div className="space-y-6">
      {/* Timer and Level Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card brutal-border overflow-hidden">
          <CardHeader className="bg-secondary/50 border-b border-border">
            <CardTitle className="flex items-center gap-3 text-foreground text-xl font-bold">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              Уровень {tournament.current_level}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <div className={`text-6xl font-mono font-bold transition-all duration-300 ${
                currentTime <= 30 ? 'text-destructive animate-pulse' : 
                currentTime <= 60 ? 'text-destructive' : 
                currentTime <= 300 ? 'text-primary' : 
                'text-foreground'
              }`}>
                {formatTime(currentTime)}
              </div>
              <Progress 
                value={timerProgress} 
                className="mt-4 h-3 bg-secondary"
              />
            </div>
            <div className={`grid gap-4 ${currentBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="text-center p-4 border border-border rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">Малый блайнд</p>
                <p className="text-2xl font-bold text-foreground">{currentSmallBlind}</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">Большой блайнд</p>
                <p className="text-2xl font-bold text-foreground">{currentBigBlind}</p>
              </div>
              {currentBlindLevel?.ante > 0 && (
                <div className="text-center p-4 border border-primary/50 rounded-lg bg-primary/10">
                  <p className="text-xs text-primary font-medium mb-1">Анте</p>
                  <p className="text-2xl font-bold text-primary">{currentBlindLevel.ante}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card brutal-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <ChevronRight className="w-4 h-4 text-primary" />
              {isNextLevelBreak ? 'Следующий: Перерыв' : `Следующий уровень ${tournament.current_level + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground mb-3">Через {formatTime(currentTime)}</p>
            </div>
            {isNextLevelBreak ? (
              <div className="text-center p-6 space-y-2 bg-primary/10 rounded-lg border border-primary/30">
                <Coffee className="w-8 h-8 text-primary mx-auto" />
                <p className="text-lg font-bold text-primary">Перерыв</p>
                <p className="text-sm text-muted-foreground">{nextBlindLevel ? Math.floor(nextBlindLevel.duration / 60) : 15} минут</p>
              </div>
            ) : (
              <div className={`grid gap-3 ${nextBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="text-center p-3 border border-border rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Малый блайнд</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(nextSmallBlind)}</p>
                </div>
                <div className="text-center p-3 border border-border rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Большой блайнд</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(nextBigBlind)}</p>
                </div>
                {nextBlindLevel?.ante > 0 && (
                  <div className="text-center p-3 border border-primary/30 rounded-lg bg-primary/10">
                    <p className="text-xs text-primary">Анте</p>
                    <p className="text-xl font-bold text-primary">{nextBlindLevel.ante}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Control Buttons */}
      <Card className="bg-card brutal-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground font-bold">
            <Target className="w-4 h-4 text-primary" />
            Управление
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-10 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTimer}
              className={`h-12 border-border transition-all ${
                timerActive ? 'bg-destructive/20 text-destructive border-destructive/50 hover:bg-destructive/30' : 'bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30'
              }`}
            >
              {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button variant="outline" size="sm" onClick={onResetTimer} className="h-12 border-border hover:bg-secondary">
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            {/* Кнопки перемотки на 1 минуту */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTimerAdjust?.(-60)}
              className="h-12 border-border hover:bg-secondary"
              title="Перемотать назад на 1 минуту"
            >
              <Rewind className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTimerAdjust?.(60)}
              className="h-12 border-border hover:bg-secondary"
              title="Перемотать вперед на 1 минуту"
            >
              <FastForward className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onPrevLevel} className="h-12 border-border hover:bg-secondary">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onNextLevel} className="h-12 border-border hover:bg-secondary">
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`h-12 border-border ${soundEnabled ? 'bg-primary/20 text-primary border-primary/50' : 'bg-secondary text-muted-foreground'}`}
              title="Переключить звуковые оповещения"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onOpenExternalTimer} className="h-12 border-border hover:bg-secondary">
              <Maximize className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onStopTournament} className="h-12 text-destructive border-destructive/50 hover:bg-destructive/20">
              <StopCircle className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onRefresh} className="h-12 border-border hover:bg-secondary">
              <Activity className="w-4 h-4" />
            </Button>

            {tournament.status === 'running' && onFinishTournament && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onFinishTournament} 
                className="h-12 text-green-500 border-green-500/50 hover:bg-green-500/20"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Management */}
      <PlayerManagement 
        tournament={tournament}
        players={players}
        registrations={registrations}
        onRegistrationUpdate={onRefresh}
      />

      {/* Tournament Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card brutal-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <Users className="w-4 h-4 text-primary" />
              Статистика турнира
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 border border-border rounded-lg bg-secondary/30">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{registrations.length}</p>
                <p className="text-xs text-muted-foreground">Всего игроков</p>
              </div>
              <div className="text-center p-3 border border-green-500/30 rounded-lg bg-green-500/10">
                <Activity className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-xl font-bold text-green-500">{activePlayers.length}</p>
                <p className="text-xs text-muted-foreground">Активных</p>
              </div>
              <div className="text-center p-3 border border-destructive/30 rounded-lg bg-destructive/10">
                <UserX className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-xl font-bold text-destructive">{eliminatedPlayers.length}</p>
                <p className="text-xs text-muted-foreground">Выбыло</p>
              </div>
              <div className="text-center p-3 border border-blue-500/30 rounded-lg bg-blue-500/10">
                <RotateCcw className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-xl font-bold text-blue-500">{totalReentries}</p>
                <p className="text-xs text-muted-foreground">Повторных входов</p>
              </div>
            </div>
            
            {/* Дополнительная статистика */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
              <div className="text-center p-3 border border-primary/30 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{averageStack.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Средний стек</p>
              </div>
              <div className="text-center p-3 border border-primary/30 rounded-lg bg-primary/10">
                <Coffee className="w-5 h-5 mx-auto mb-1 text-primary" />
                {isCurrentBreak ? (
                  <>
                    <p className="text-xl font-bold text-primary">СЕЙЧАС</p>
                    <p className="text-xs text-muted-foreground">Перерыв</p>
                  </>
                ) : timeToBreak ? (
                  <>
                    <p className="text-lg font-bold text-foreground">{formatTime(timeToBreak)}</p>
                    <p className="text-xs text-muted-foreground">До перерыва ({levelsUntilBreak} ур.)</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-foreground">∞</p>
                    <p className="text-xs text-muted-foreground">До перерыва</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card brutal-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <Trophy className="w-4 h-4 text-primary" />
              Фонд RPS баллов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold neon-orange mb-3">
                {rpsPool.toLocaleString()} RPS
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-secondary/30 rounded-lg border border-border">
                  <p className="text-muted-foreground">Организационные</p>
                  <p className="font-bold text-foreground">{Math.floor(registrations.length * participationFee / 10).toLocaleString()} RPS</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg border border-border">
                  <p className="text-muted-foreground">Повторные</p>
                  <p className="font-bold text-foreground">{Math.floor(totalReentries * reentryFee / 10).toLocaleString()} RPS</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg border border-border">
                  <p className="text-muted-foreground">Дополнительные</p>
                  <p className="font-bold text-foreground">{Math.floor(totalAdditionalSets * additionalFee / 10).toLocaleString()} RPS</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Analytics */}
      <Card className="bg-card brutal-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground font-bold">
            <BarChart3 className="w-4 h-4 text-primary" />
            Аналитика системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 border border-border rounded-lg bg-secondary/20">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{systemStats.activeTournaments}</p>
              <p className="text-xs text-muted-foreground">Активные турниры</p>
            </div>
            <div className="text-center p-3 border border-border rounded-lg bg-secondary/20">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{systemStats.totalPlayersInClub}</p>
              <p className="text-xs text-muted-foreground">Игроков в клубе</p>
            </div>
            <div className="text-center p-3 border border-green-500/30 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold text-green-500">{systemStats.weeklyGames}</p>
              <p className="text-xs text-muted-foreground">Игр за неделю</p>
            </div>
            <div className="text-center p-3 border border-blue-500/30 rounded-lg bg-blue-500/10">
              <Target className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold text-blue-500">{systemStats.averageRating}</p>
              <p className="text-xs text-muted-foreground">Средний рейтинг</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card brutal-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <AlertCircle className="w-4 h-4 text-primary" />
              Состояние системы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">База данных</span>
              <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">Работает</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Real-time обновления</span>
              <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">Активно</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">RPS расчеты</span>
              <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">Готово</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Производительность</span>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">Хорошо</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card brutal-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <BarChart3 className="w-4 h-4 text-primary" />
              Рейтинговые показатели
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Качество игры</span>
              <div className="flex items-center gap-2">
                <Progress value={85} className="w-20 h-2" />
                <span className="text-sm font-bold text-foreground">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Активность клуба</span>
              <div className="flex items-center gap-2">
                <Progress value={92} className="w-20 h-2" />
                <span className="text-sm font-bold text-foreground">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Рост рейтингов</span>
              <div className="flex items-center gap-2">
                <Progress value={78} className="w-20 h-2" />
                <span className="text-sm font-bold text-foreground">78%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Турнирная активность</span>
              <div className="flex items-center gap-2">
                <Progress value={96} className="w-20 h-2" />
                <span className="text-sm font-bold text-foreground">96%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default TournamentOverview;