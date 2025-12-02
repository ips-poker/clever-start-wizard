import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Maximize, 
  StopCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Activity, 
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
  Zap,
  TrendingUp,
  Coins,
  Timer,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FullscreenTimer from "./FullscreenTimer";
import { useTimerSounds } from "@/hooks/useTimerSounds";
import { calculateTotalRPSPool, formatRPSPoints } from "@/utils/rpsCalculations";
import { ModernTournament, ModernRegistration } from "@/types/tournament";

interface ModernTournamentOverviewProps {
  tournament: ModernTournament;
  players: any[];
  registrations: ModernRegistration[];
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

const ModernTournamentOverview = ({
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
}: ModernTournamentOverviewProps) => {
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false);
  const [blindLevels, setBlindLevels] = useState<any[]>([]);
  const { toast } = useToast();
  const { playSound } = useTimerSounds();

  useEffect(() => {
    fetchBlindLevels();
  }, [tournament.id]);

  const fetchBlindLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level');

      if (error) throw error;
      setBlindLevels(data || []);
    } catch (error) {
      console.error('Error fetching blind levels:', error);
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
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
  
  const rpsPool = calculateTotalRPSPool(
    registrations.length,
    tournament.participation_fee || 0,
    totalReentries,
    tournament.reentry_fee || 0,
    totalAdditionalSets,
    tournament.additional_fee || 0
  );
  
  const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);
  const isBreak = currentBlindLevel?.is_break;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return { label: 'В ИГРЕ', color: 'bg-green-600 text-white', icon: Play };
      case 'paused':
        return { label: 'ПАУЗА', color: 'bg-yellow-600 text-white', icon: Pause };
      case 'completed':
        return { label: 'ЗАВЕРШЕН', color: 'bg-muted text-muted-foreground', icon: CheckCircle };
      case 'registration':
        return { label: 'РЕГИСТРАЦИЯ', color: 'bg-blue-600 text-white', icon: Users };
      default:
        return { label: 'ЗАПЛАНИРОВАН', color: 'bg-secondary text-foreground', icon: Clock };
    }
  };

  const statusConfig = getStatusConfig(tournament.status);
  const StatusIcon = statusConfig.icon;
  const timerProgress = tournament.timer_duration > 0 ? (currentTime / tournament.timer_duration) * 100 : 0;
  const isLowTime = currentTime <= 60;
  const isCriticalTime = currentTime <= 30;

  return (
    <div className="space-y-6">
      {/* Полноэкранный таймер */}
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
          onTimerAdjust={onTimerAdjust || (() => {})}
          blindLevels={blindLevels}
        />
      )}

      {/* Header с названием и статусом */}
      <Card className="brutal-border bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 via-transparent to-accent/20 p-4 md:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {tournament.name}
                </h2>
                <div className="h-0.5 w-20 bg-gradient-to-r from-primary to-accent mt-1" />
              </div>
            </div>
            <Badge className={`${statusConfig.color} border-0 rounded-none px-4 py-1.5 font-bold text-sm flex items-center gap-2`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Основные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Участники */}
        <Card className="brutal-border bg-card hover:border-blue-500/50 transition-all group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 group-hover:bg-blue-500/20 transition-colors">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-blue-400">{registrations.length}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Участников</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Активные */}
        <Card className="brutal-border bg-card hover:border-green-500/50 transition-all group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 border border-green-500/30 group-hover:bg-green-500/20 transition-colors">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-green-400">{activePlayers.length}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Выбыло */}
        <Card className="brutal-border bg-card hover:border-red-500/50 transition-all group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 border border-red-500/30 group-hover:bg-red-500/20 transition-colors">
                <UserX className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-red-400">{eliminatedPlayers.length}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Выбыло</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Реэнтри */}
        <Card className="brutal-border bg-card hover:border-purple-500/50 transition-all group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 border border-purple-500/30 group-hover:bg-purple-500/20 transition-colors">
                <RotateCcw className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-purple-400">{totalReentries}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Реэнтри</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RPS Pool */}
        <Card className="brutal-border bg-card hover:border-primary/50 transition-all group col-span-2 md:col-span-4 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 border border-primary/30 group-hover:bg-primary/20 transition-colors">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold neon-orange">{formatRPSPoints(rpsPool)}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">RPS Фонд</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таймер и управление блайндами */}
      <Card className="brutal-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/30 pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${isBreak ? 'bg-yellow-500' : 'bg-primary'}`}>
                {isBreak ? <Coffee className="h-5 w-5 text-white" /> : <Timer className="h-5 w-5 text-primary-foreground" />}
              </div>
              <div>
                <span className="text-lg font-bold text-foreground uppercase tracking-wide">
                  {isBreak ? 'Перерыв' : 'Блайнды'}
                </span>
                <div className="h-0.5 w-12 bg-gradient-to-r from-primary to-accent mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenExternalTimer}
                className="rounded-none border-border hover:border-primary hover:bg-primary/10"
              >
                <Maximize className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Внешний</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openFullscreenTimer}
                className="rounded-none border-border hover:border-primary hover:bg-primary/10"
              >
                <Maximize className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Полный экран</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Таймер */}
            <div className="space-y-4">
              {/* Большой таймер */}
              <div className={`text-center p-6 border ${
                isCriticalTime 
                  ? 'border-red-500/50 bg-red-500/10' 
                  : isLowTime 
                  ? 'border-yellow-500/50 bg-yellow-500/10' 
                  : 'border-border bg-secondary/30'
              } transition-all`}>
                <div className={`text-5xl md:text-7xl font-mono font-black tracking-wider ${
                  isCriticalTime 
                    ? 'text-red-400 animate-pulse' 
                    : isLowTime 
                    ? 'text-yellow-400' 
                    : 'neon-orange'
                }`}>
                  {formatTime(currentTime)}
                </div>
                {(isLowTime || isCriticalTime) && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                    <AlertTriangle className={`h-4 w-4 ${isCriticalTime ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className={isCriticalTime ? 'text-red-400' : 'text-yellow-400'}>
                      {isCriticalTime ? 'Критическое время!' : 'Мало времени'}
                    </span>
                  </div>
                )}
              </div>

              {/* Прогресс бар */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Прогресс уровня</span>
                  <span>{Math.round(timerProgress)}%</span>
                </div>
                <div className="h-3 bg-secondary border border-border overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      isCriticalTime 
                        ? 'bg-gradient-to-r from-red-600 to-red-400' 
                        : isLowTime 
                        ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' 
                        : 'bg-gradient-to-r from-primary to-accent'
                    }`}
                    style={{ width: `${timerProgress}%` }}
                  />
                </div>
              </div>

              {/* Кнопки управления */}
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  onClick={onToggleTimer} 
                  size="lg" 
                  className={`min-w-32 rounded-none font-bold ${
                    timerActive 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {timerActive ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      ПАУЗА
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      СТАРТ
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onResetTimer} 
                  size="lg"
                  className="rounded-none border-border hover:border-primary"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Сброс
                </Button>
              </div>
            </div>

            {/* Информация о блайндах */}
            <div className="space-y-4">
              {/* Текущий уровень */}
              <div className="text-center">
                <Badge className={`text-lg px-6 py-2 rounded-none font-bold ${
                  isBreak 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {isBreak ? '☕ ПЕРЕРЫВ' : `УРОВЕНЬ ${tournament.current_level}`}
                </Badge>
              </div>
              
              {/* Блайнды */}
              {!isBreak && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-secondary/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Малый блайнд</p>
                    <p className="text-3xl md:text-4xl font-black text-foreground">{tournament.current_small_blind.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Большой блайнд</p>
                    <p className="text-3xl md:text-4xl font-black text-foreground">{tournament.current_big_blind.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Анте */}
              {currentBlindLevel?.ante > 0 && (
                <div className="text-center p-3 bg-accent/10 border border-accent/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Анте</p>
                  <p className="text-2xl font-bold text-accent">{currentBlindLevel.ante.toLocaleString()}</p>
                </div>
              )}

              {/* Следующий уровень */}
              {nextBlindLevel && (
                <div className="p-3 bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Следующий уровень
                  </p>
                  {nextBlindLevel.is_break ? (
                    <p className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      Перерыв ({Math.floor(nextBlindLevel.duration / 60)} мин)
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {nextBlindLevel.small_blind.toLocaleString()} / {nextBlindLevel.big_blind.toLocaleString()}
                      {nextBlindLevel.ante > 0 && ` (анте ${nextBlindLevel.ante.toLocaleString()})`}
                    </p>
                  )}
                </div>
              )}

              {/* Навигация по уровням */}
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={onPrevLevel}
                  className="rounded-none border-border hover:border-primary flex-1"
                  disabled={tournament.current_level <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Назад
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onNextLevel}
                  className="rounded-none border-border hover:border-primary flex-1"
                >
                  Вперед
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Дополнительная статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
            <div className="text-center p-3 bg-secondary/30 border border-border">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg md:text-xl font-bold text-foreground">{averageStack.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Ср. стек</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 border border-border">
              <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg md:text-xl font-bold text-foreground">
                {Math.round(averageStack / (tournament.current_big_blind || 1))}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">Ср. стек (BB)</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 border border-border">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg md:text-xl font-bold text-foreground">{totalAdditionalSets}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Доп. наборы</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 border border-border">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg md:text-xl font-bold text-foreground">{tournament.starting_chips.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Старт. стек</p>
            </div>
          </div>

          {/* Действия */}
          <div className="flex flex-wrap justify-center gap-3 mt-6 pt-6 border-t border-border">
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="rounded-none border-border hover:border-primary"
            >
              <Activity className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            {onFinishTournament && tournament.status === 'running' && (
              <Button 
                variant="destructive" 
                onClick={onFinishTournament}
                className="rounded-none"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Завершить турнир
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernTournamentOverview;
