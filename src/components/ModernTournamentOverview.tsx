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
import TournamentPlayerManagement from "./TournamentPlayerManagement";
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
  const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
  
  // Рассчитываем фонд RPS баллов
  const rpsPool = calculateTotalRPSPool(
    registrations.length,
    tournament.participation_fee,
    totalReentries,
    tournament.reentry_fee,
    totalAdditionalSets,
    tournament.additional_fee
  );
  
  // Расчет среднего стека
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  // Найти текущий и следующий уровни из структуры блайндов
  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Полноэкранный таймер */}
      {showFullscreenTimer && (
        <div>Полноэкранный таймер временно недоступен</div>
      )}

      {/* Основная информация о турнире */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-gray-700 font-light">{tournament.name}</span>
              </div>
              <Badge 
                variant={
                  tournament.status === 'running' ? 'default' :
                  tournament.status === 'paused' ? 'secondary' :
                  tournament.status === 'completed' ? 'outline' : 'secondary'
                }
                className="ml-2"
              >
                {tournament.status === 'running' ? 'В процессе' :
                 tournament.status === 'paused' ? 'Приостановлен' :
                 tournament.status === 'completed' ? 'Завершен' : 
                 tournament.status === 'registration' ? 'Регистрация' : 'Запланирован'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xl font-light text-blue-600">{registrations.length}</p>
                <p className="text-xs text-gray-500">Участников</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-xl font-light text-green-500">{activePlayers.length}</p>
                <p className="text-xs text-gray-500">Активных</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <UserX className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-light text-red-500">{eliminatedPlayers.length}</p>
                <p className="text-xs text-gray-500">Выбыло</p>
              </div>
              <div className="text-center p-3 border border-gray-200/20 rounded-lg bg-white/30">
                <RotateCcw className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xl font-light text-blue-600">{totalReentries}</p>
                <p className="text-xs text-gray-500">Повторных входов</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200/30">
              <div className="text-center p-2 bg-white/20 rounded-lg">
                <BarChart3 className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                <p className="text-lg font-light text-gray-700">{averageStack.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Средний инвентарь</p>
              </div>
              <div className="text-center p-2 bg-white/20 rounded-lg">
                <Target className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                <p className="text-lg font-light text-gray-700">{Math.round(averageStack / (tournament.current_big_blind || 1))}</p>
                <p className="text-xs text-gray-500">Средний стек (BB)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
              <Trophy className="w-4 h-4" />
              Фонд RPS баллов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-light text-primary mb-3">
                {formatRPSPoints(rpsPool)}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Организационные</p>
                  <p className="font-medium text-gray-700">
                    {formatRPSPoints(calculateTotalRPSPool(registrations.length, tournament.participation_fee, 0, 0, 0, 0))}
                  </p>
                </div>
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Повторные</p>
                  <p className="font-medium text-gray-700">
                    {formatRPSPoints(calculateTotalRPSPool(0, 0, totalReentries, tournament.reentry_fee, 0, 0))}
                  </p>
                </div>
                <div className="p-2 bg-white/30 rounded-lg border border-gray-200/20">
                  <p className="text-gray-500">Дополнительные</p>
                  <p className="font-medium text-gray-700">
                    {formatRPSPoints(calculateTotalRPSPool(0, 0, 0, 0, totalAdditionalSets, tournament.additional_fee))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Управление таймером */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Управление уровнями блайндов
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenExternalTimer}
              >
                <Maximize className="w-4 h-4 mr-2" />
                Внешний таймер
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openFullscreenTimer}
              >
                <Maximize className="w-4 h-4 mr-2" />
                Полный экран
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Таймер */}
            <div className="flex-1 text-center">
              <div className="text-6xl font-mono font-bold text-primary mb-4">
                {formatTime(currentTime)}
              </div>
              <Progress 
                value={tournament.timer_duration > 0 ? (currentTime / tournament.timer_duration) * 100 : 0} 
                className="w-full h-2 mb-4"
              />
              <div className="flex justify-center gap-2">
                <Button onClick={onToggleTimer} size="lg" className="min-w-32">
                  {timerActive ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Старт
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onResetTimer} size="lg">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Сброс
                </Button>
              </div>
            </div>

            {/* Информация о текущем уровне */}
            <div className="flex-1 space-y-4">
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Уровень {tournament.current_level}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Малый блайнд</p>
                  <p className="text-2xl font-bold">{tournament.current_small_blind}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Большой блайнд</p>
                  <p className="text-2xl font-bold">{tournament.current_big_blind}</p>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={onPrevLevel} size="sm">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button variant="outline" onClick={onNextLevel} size="sm">
                  Вперед
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onRefresh}>
              <Activity className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            {onFinishTournament && (
              <Button variant="destructive" onClick={onFinishTournament}>
                <StopCircle className="w-4 h-4 mr-2" />
                Завершить мероприятие
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernTournamentOverview;