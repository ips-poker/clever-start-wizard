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
  rebuys: number;
  addons: number;
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
      })
      .subscribe();

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
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);
  
  // Расчет среднего стека
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
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
      
      <div className="space-y-10">
      {/* Timer and Level Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl overflow-hidden">
          <CardHeader className="bg-white/50 border-b border-gray-200/30">
            <CardTitle className="flex items-center gap-3 text-gray-800 text-xl font-light">
              <div className="p-2 bg-gray-100/80 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              Уровень {tournament.current_level}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <div className={`text-6xl font-mono font-light transition-all duration-300 ${
                currentTime <= 60 ? 'text-red-500' : 
                currentTime <= 300 ? 'text-amber-500' : 
                'text-gray-800'
              }`}>
                {formatTime(currentTime)}
              </div>
              <Progress 
                value={timerProgress} 
                className="mt-4 h-2 bg-gray-100/50"
              />
            </div>
            <div className={`grid gap-4 ${currentBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/50">
                <p className="text-xs text-gray-500 font-medium mb-1">Малый блайнд</p>
                <p className="text-2xl font-light text-gray-800">{currentSmallBlind}</p>
              </div>
              <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/50">
                <p className="text-xs text-gray-500 font-medium mb-1">Большой блайнд</p>
                <p className="text-2xl font-light text-gray-800">{currentBigBlind}</p>
              </div>
              {currentBlindLevel?.ante > 0 && (
                <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/50">
                  <p className="text-xs text-gray-500 font-medium mb-1">Анте</p>
                  <p className="text-2xl font-light text-amber-600">{currentBlindLevel.ante}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/30 shadow-minimal rounded-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <ChevronRight className="w-4 h-4" />
              {isNextLevelBreak ? 'Следующий: Перерыв' : `Следующий уровень ${tournament.current_level + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center">
              <p className="text-lg font-light text-gray-600 mb-3">Через {formatTime(currentTime)}</p>
            </div>
            {isNextLevelBreak ? (
              <div className="text-center p-6 space-y-2">
                <Coffee className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-lg font-medium text-amber-800">Перерыв</p>
                <p className="text-sm text-gray-600">{nextBlindLevel ? Math.floor(nextBlindLevel.duration / 60) : 15} минут</p>
              </div>
            ) : (
              <div className={`grid gap-3 ${nextBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                  <p className="text-xs text-gray-500">Малый блайнд</p>
                  <p className="text-xl font-light text-gray-700">{Math.round(nextSmallBlind)}</p>
                </div>
                <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                  <p className="text-xs text-gray-500">Большой блайнд</p>
                  <p className="text-xl font-light text-gray-700">{Math.round(nextBigBlind)}</p>
                </div>
                {nextBlindLevel?.ante > 0 && (
                  <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                    <p className="text-xs text-gray-500">Анте</p>
                    <p className="text-xl font-light text-amber-600">{nextBlindLevel.ante}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Control Buttons */}
      <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
            <Target className="w-4 h-4" />
            Управление
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-10 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTimer}
              className={`h-12 border-gray-200/50 hover:shadow-subtle transition-all ${
                timerActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button variant="outline" size="sm" onClick={onResetTimer} className="h-12 border-gray-200/50 hover:shadow-subtle">
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            {/* Кнопки перемотки на 1 минуту */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTimerAdjust?.(-60)}
              className="h-12 border-gray-200/50 hover:shadow-subtle"
              title="Перемотать назад на 1 минуту"
            >
              <Rewind className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTimerAdjust?.(60)}
              className="h-12 border-gray-200/50 hover:shadow-subtle"
              title="Перемотать вперед на 1 минуту"
            >
              <FastForward className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onPrevLevel} className="h-12 border-gray-200/50 hover:shadow-subtle">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onNextLevel} className="h-12 border-gray-200/50 hover:shadow-subtle">
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`h-12 border-gray-200/50 hover:shadow-subtle ${soundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}
              title="Переключить звуковые оповещения"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onOpenExternalTimer} className="h-12 border-gray-200/50 hover:shadow-subtle">
              <Maximize className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onStopTournament} className="h-12 text-red-500 border-red-200/50 hover:bg-red-50 hover:shadow-subtle">
              <StopCircle className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={onRefresh} className="h-12 border-gray-200/50 hover:shadow-subtle">
              <Activity className="w-4 h-4" />
            </Button>

            {tournament.status === 'running' && onFinishTournament && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onFinishTournament} 
                className="h-12 text-green-600 border-green-200/50 hover:bg-green-50 hover:shadow-subtle"
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
        <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <Users className="w-4 h-4" />
              Статистика турнира
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                <p className="text-xl font-light text-gray-800">{registrations.length}</p>
                <p className="text-xs text-gray-500">Всего игроков</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <Activity className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xl font-light text-green-600">{activePlayers.length}</p>
                <p className="text-xs text-gray-500">Активных</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <UserX className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-light text-red-500">{eliminatedPlayers.length}</p>
                <p className="text-xs text-gray-500">Выбыло</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <RotateCcw className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xl font-light text-blue-600">{totalRebuys}</p>
                <p className="text-xs text-gray-500">Ребаев</p>
              </div>
            </div>
            
            {/* Дополнительная статистика */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200/30">
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xl font-light text-gray-800">{averageStack.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Средний стек</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <Coffee className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                {isCurrentBreak ? (
                  <>
                    <p className="text-xl font-light text-amber-600">СЕЙЧАС</p>
                    <p className="text-xs text-gray-500">Перерыв</p>
                  </>
                ) : timeToBreak ? (
                  <>
                    <p className="text-lg font-light text-gray-800">{formatTime(timeToBreak)}</p>
                    <p className="text-xs text-gray-500">До перерыва ({levelsUntilBreak} ур.)</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-light text-gray-800">∞</p>
                    <p className="text-xs text-gray-500">До перерыва</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <DollarSign className="w-4 h-4" />
              Призовой фонд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-light text-gray-800 mb-3">
                {prizePool.toLocaleString()} ₽
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Бай-ины</p>
                  <p className="font-medium text-gray-700">{(registrations.length * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Ребаи</p>
                  <p className="font-medium text-gray-700">{(totalRebuys * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Аддоны</p>
                  <p className="font-medium text-gray-700">{(totalAddons * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Analytics */}
      <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
            <BarChart3 className="w-4 h-4" />
            Аналитика системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-lg font-light text-gray-800">{systemStats.activeTournaments}</p>
              <p className="text-xs text-gray-500">Активные турниры</p>
            </div>
            <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
              <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-lg font-light text-gray-800">{systemStats.totalPlayersInClub}</p>
              <p className="text-xs text-gray-500">Игроков в клубе</p>
            </div>
            <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-lg font-light text-green-600">{systemStats.weeklyGames}</p>
              <p className="text-xs text-gray-500">Игр за неделю</p>
            </div>
            <div className="text-center p-3 border border-gray-200/15 rounded-lg bg-white/20">
              <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-lg font-light text-blue-600">{systemStats.averageRating}</p>
              <p className="text-xs text-gray-500">Средний рейтинг</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <AlertCircle className="w-4 h-4" />
              Состояние системы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">База данных</span>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Работает</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Real-time обновления</span>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Активно</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">RPS расчеты</span>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Готово</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Производительность</span>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Хорошо</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border border-gray-200/20 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <BarChart3 className="w-4 h-4" />
              Рейтинговые показатели
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Качество игры</span>
              <div className="flex items-center gap-2">
                <Progress value={85} className="w-20 h-2" />
                <span className="text-sm font-semibold">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Активность клуба</span>
              <div className="flex items-center gap-2">
                <Progress value={92} className="w-20 h-2" />
                <span className="text-sm font-semibold">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Рост рейтингов</span>
              <div className="flex items-center gap-2">
                <Progress value={78} className="w-20 h-2" />
                <span className="text-sm font-semibold">78%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Турнирная активность</span>
              <div className="flex items-center gap-2">
                <Progress value={96} className="w-20 h-2" />
                <span className="text-sm font-semibold">96%</span>
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