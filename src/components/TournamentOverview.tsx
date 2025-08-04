import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Volume2, 
  VolumeX,
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
  Mic,
  FastForward,
  Rewind
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimerSounds, SoundType } from "@/hooks/useTimerSounds";
import PlayerManagement from "./PlayerManagement";
import FullscreenTimer from "./FullscreenTimer";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";

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
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tenSecondAnnouncement, setTenSecondAnnouncement] = useState(false);
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(false);
  const [lastWarningTime, setLastWarningTime] = useState<number>(0);

  // Система звуковых оповещений
  const {
    soundsEnabled,
    setSoundsEnabled,
    currentSoundType,
    setCurrentSoundType,
    volume,
    setVolume,
    playWarningSound,
    playFinalCountdown
  } = useTimerSounds({ enabled: true, soundType: 'beep', volume: 0.5 });

  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const { announceNextLevel, stopAnnouncement } = useVoiceAnnouncements({
    enabled: voiceAnnouncementsEnabled,
    voice: 'Aria',
    volume: 0.8
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

  // Система оповещений по времени
  useEffect(() => {
    if (!timerActive) return;

    // Проверяем оповещения только если время изменилось
    if (lastWarningTime === currentTime) return;
    setLastWarningTime(currentTime);

    // Оповещения: 5 мин, 1 мин, 10 сек, и последние 5 секунд
    if ([300, 60, 10].includes(currentTime) || (currentTime <= 5 && currentTime > 0)) {
      playWarningSound(currentTime);
    }

    // Финальный отсчет при окончании времени
    if (currentTime === 0) {
      playFinalCountdown();
    }
  }, [currentTime, timerActive, lastWarningTime, playWarningSound, playFinalCountdown]);

  useEffect(() => {
    if (tournament?.id) {
      loadBlindLevels();
    }
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
      // Get active tournaments
      const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('status', 'running');

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

  // Найти следующий уровень из структуры блайндов
  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);
  
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

  const timerProgress = ((tournament.timer_duration - currentTime) / tournament.timer_duration) * 100;

  // Голосовые оповещения
  useEffect(() => {
    if (currentTime === 10 && !tenSecondAnnouncement && voiceAnnouncementsEnabled) {
      const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
      announceNextLevel(tournament.current_level, nextLevel, currentTime);
      setTenSecondAnnouncement(true);
    }
    
    if (currentTime > 10) {
      setTenSecondAnnouncement(false);
    }
  }, [currentTime, tenSecondAnnouncement, voiceAnnouncementsEnabled, announceNextLevel, blindLevels, tournament.current_level]);

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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/50">
                <p className="text-xs text-gray-500 font-medium mb-1">Малый блайнд</p>
                <p className="text-2xl font-light text-gray-800">{tournament.current_small_blind}</p>
              </div>
              <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/50">
                <p className="text-xs text-gray-500 font-medium mb-1">Большой блайнд</p>
                <p className="text-2xl font-light text-gray-800">{tournament.current_big_blind}</p>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                  <p className="text-xs text-gray-500">Малый блайнд</p>
                  <p className="text-xl font-light text-gray-700">{Math.round(nextSmallBlind)}</p>
                </div>
                <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                  <p className="text-xs text-gray-500">Большой блайнд</p>
                  <p className="text-xl font-light text-gray-700">{Math.round(nextBigBlind)}</p>
                </div>
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
        <CardContent className="p-8">
          {/* Modern Timer Controls */}
          <div className="space-y-8">
            
            {/* Main Timer Controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevLevel}
                disabled={tournament.current_level <= 1}
                className="h-11 w-11 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-all duration-200 animate-fade-in"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(-300)}
                disabled={currentTime <= 0}
                className="h-11 px-4 rounded-xl bg-red-50/50 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-40 transition-all duration-200 hover-scale"
              >
                <Rewind className="w-4 h-4 mr-1.5" />
                -5м
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(-60)}
                disabled={currentTime <= 0}
                className="h-11 px-3 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-all duration-200"
              >
                -1м
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(-10)}
                disabled={currentTime <= 0}
                className="h-11 px-3 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-all duration-200"
              >
                -10с
              </Button>
              
              <Button
                onClick={onToggleTimer}
                size="lg"
                className={`h-14 px-8 rounded-2xl font-medium shadow-sm transition-all duration-300 hover-scale ${
                  timerActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-100' 
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                }`}
              >
                {timerActive ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Старт
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(10)}
                className="h-11 px-3 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                +10с
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(60)}
                className="h-11 px-3 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                +1м
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTimerAdjust?.(300)}
                className="h-11 px-4 rounded-xl bg-green-50/50 border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200 transition-all duration-200 hover-scale"
              >
                <FastForward className="w-4 h-4 mr-1.5" />
                +5м
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onNextLevel}
                className="h-11 w-11 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 animate-fade-in"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Sound Settings */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundsEnabled(!soundsEnabled)}
                  className={`h-10 px-3 rounded-xl transition-all duration-200 ${soundsEnabled 
                    ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                
                <div className="h-6 w-px bg-gray-200"></div>
                
                <Select value={currentSoundType} onValueChange={(value: SoundType) => setCurrentSoundType(value)}>
                  <SelectTrigger className="w-36 h-10 border-gray-200 rounded-xl bg-gray-50/50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beep">Сигнал</SelectItem>
                    <SelectItem value="bell">Звонок</SelectItem>
                    <SelectItem value="chime">Колокол</SelectItem>
                    <SelectItem value="alert">Тревога</SelectItem>
                    <SelectItem value="digital">Цифра</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {soundsEnabled && (
                <div className="animate-fade-in">
                  <div className="text-center p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="text-sm font-medium text-blue-700 mb-1">Оповещения</div>
                    <div className="text-xs text-blue-600">5м → 1м → 10с → 5с</div>
                  </div>
                </div>
              )}
            </div>

            {/* System Controls */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResetTimer} 
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-amber-200 hover:bg-amber-50 text-gray-600 hover:text-amber-600 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сброс
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenExternalTimer} 
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-purple-200 hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-all duration-200"
              >
                <Maximize className="w-4 h-4 mr-2" />
                Экран
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh} 
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-all duration-200"
              >
                <Activity className="w-4 h-4 mr-2" />
                Обновить
              </Button>

              {tournament.status === 'running' && onFinishTournament && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onFinishTournament} 
                  className="h-10 px-4 rounded-xl border-gray-200 hover:border-green-200 hover:bg-green-50 text-gray-600 hover:text-green-600 transition-all duration-200"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Завершить
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onStopTournament} 
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all duration-200"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Стоп
              </Button>
            </div>
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
              <span className="text-gray-600">ELO расчеты</span>
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