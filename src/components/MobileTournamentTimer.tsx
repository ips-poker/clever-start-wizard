import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Minus, 
  Timer, 
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
}

interface MobileTournamentTimerProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
}

// Базовая структура блайндов
const defaultBlindLevels = [
  { level: 1, small_blind: 10, big_blind: 20, ante: 0, duration: 1200 },
  { level: 2, small_blind: 15, big_blind: 30, ante: 0, duration: 1200 },
  { level: 3, small_blind: 25, big_blind: 50, ante: 0, duration: 1200 },
  { level: 4, small_blind: 50, big_blind: 100, ante: 0, duration: 1200, is_break: true },
  { level: 5, small_blind: 75, big_blind: 150, ante: 0, duration: 1200 },
  { level: 6, small_blind: 100, big_blind: 200, ante: 25, duration: 1200 },
  { level: 7, small_blind: 150, big_blind: 300, ante: 25, duration: 1200 },
  { level: 8, small_blind: 200, big_blind: 400, ante: 50, duration: 1200, is_break: true },
  { level: 9, small_blind: 300, big_blind: 600, ante: 50, duration: 1200 },
  { level: 10, small_blind: 400, big_blind: 800, ante: 75, duration: 1200 },
];

export const MobileTournamentTimer = ({ tournament, onTournamentUpdate }: MobileTournamentTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(tournament.timer_remaining || 1200);
  const [isRunning, setIsRunning] = useState(tournament.status === 'running');
  const [adjustMinutes, setAdjustMinutes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setTimeRemaining(tournament.timer_remaining || 1200);
    setIsRunning(tournament.status === 'running');
  }, [tournament]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          
          // Обновляем в базе каждые 10 секунд
          if (newTime % 10 === 0) {
            updateTimerInDatabase(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeRemaining]);

  const updateTimerInDatabase = async (newTime: number) => {
    try {
      await supabase.rpc('update_tournament_timer', {
        tournament_id_param: tournament.id,
        new_timer_remaining: newTime
      });
    } catch (error) {
      console.error('Error updating timer:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentLevel = () => {
    return defaultBlindLevels.find(level => level.level === tournament.current_level) || defaultBlindLevels[0];
  };

  const getNextLevel = () => {
    return defaultBlindLevels.find(level => level.level === tournament.current_level + 1);
  };

  const startPauseTournament = async () => {
    try {
      const newStatus = isRunning ? 'paused' : 'running';
      
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: newStatus,
          timer_remaining: timeRemaining 
        })
        .eq('id', tournament.id);

      if (error) throw error;

      setIsRunning(!isRunning);
      onTournamentUpdate({ ...tournament, status: newStatus, timer_remaining: timeRemaining });
      
      toast({
        title: isRunning ? "Турнир приостановлен" : "Турнир возобновлен",
        description: isRunning ? "Таймер остановлен" : "Таймер запущен"
      });
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус турнира",
        variant: "destructive"
      });
    }
  };

  const adjustTimer = async (minutes: number) => {
    const newTime = Math.max(0, timeRemaining + (minutes * 60));
    setTimeRemaining(newTime);
    
    try {
      await supabase.rpc('update_tournament_timer', {
        tournament_id_param: tournament.id,
        new_timer_remaining: newTime
      });
      
      toast({
        title: "Таймер изменен",
        description: `${minutes > 0 ? 'Добавлено' : 'Убрано'} ${Math.abs(minutes)} минут`
      });
    } catch (error) {
      console.error('Error adjusting timer:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить таймер",
        variant: "destructive"
      });
    }
  };

  const setCustomTime = async () => {
    const minutes = parseInt(adjustMinutes);
    if (isNaN(minutes) || minutes < 0) return;
    
    const newTime = minutes * 60;
    setTimeRemaining(newTime);
    setAdjustMinutes('');
    
    try {
      await supabase.rpc('update_tournament_timer', {
        tournament_id_param: tournament.id,
        new_timer_remaining: newTime
      });
      
      toast({
        title: "Таймер установлен",
        description: `Время установлено: ${minutes} минут`
      });
    } catch (error) {
      console.error('Error setting timer:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось установить таймер",
        variant: "destructive"
      });
    }
  };

  const changeLevel = async (direction: 'next' | 'prev') => {
    const newLevel = direction === 'next' 
      ? Math.min(tournament.current_level + 1, defaultBlindLevels.length)
      : Math.max(tournament.current_level - 1, 1);
    
    const levelData = defaultBlindLevels.find(l => l.level === newLevel);
    if (!levelData) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          current_level: newLevel,
          current_small_blind: levelData.small_blind,
          current_big_blind: levelData.big_blind,
          timer_remaining: levelData.duration
        })
        .eq('id', tournament.id);

      if (error) throw error;

      setTimeRemaining(levelData.duration);
      onTournamentUpdate({
        ...tournament,
        current_level: newLevel,
        current_small_blind: levelData.small_blind,
        current_big_blind: levelData.big_blind,
        timer_remaining: levelData.duration
      });

      toast({
        title: `Уровень ${direction === 'next' ? 'повышен' : 'понижен'}`,
        description: `Уровень ${newLevel}: ${levelData.small_blind}/${levelData.big_blind}`
      });
    } catch (error) {
      console.error('Error changing level:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить уровень",
        variant: "destructive"
      });
    }
  };

  const resetTimer = async () => {
    const currentLevel = getCurrentLevel();
    const newTime = currentLevel.duration;
    
    setTimeRemaining(newTime);
    
    try {
      await supabase.rpc('update_tournament_timer', {
        tournament_id_param: tournament.id,
        new_timer_remaining: newTime
      });
      
      toast({
        title: "Таймер сброшен",
        description: `Время сброшено на ${Math.floor(newTime / 60)} минут`
      });
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить таймер",
        variant: "destructive"
      });
    }
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const isBreak = currentLevel.is_break;

  return (
    <div className="space-y-4">
      {/* Main Timer Display */}
      <Card className="text-center">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Timer className="h-5 w-5" />
            {isBreak ? 'Перерыв' : `Уровень ${tournament.current_level}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold font-mono text-primary">
            {formatTime(timeRemaining)}
          </div>
          
          {!isBreak && (
            <div className="text-lg font-semibold">
              {tournament.current_small_blind}/{tournament.current_big_blind}
              {currentLevel.ante > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  (ante: {currentLevel.ante})
                </span>
              )}
            </div>
          )}

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={startPauseTournament}
              size="lg"
              variant={isRunning ? "destructive" : "default"}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Пауза
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Старт
                </>
              )}
            </Button>
            
            <Button
              onClick={resetTimer}
              size="lg"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Level Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Управление уровнем</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={() => changeLevel('prev')}
              disabled={tournament.current_level <= 1}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Предыдущий
            </Button>
            
            <Button
              onClick={() => changeLevel('next')}
              disabled={tournament.current_level >= defaultBlindLevels.length}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Следующий
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {nextLevel && (
            <div className="text-center text-sm text-muted-foreground">
              Следующий: {nextLevel.small_blind}/{nextLevel.big_blind}
              {nextLevel.ante > 0 && ` (ante: ${nextLevel.ante})`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timer Adjustments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Коррекция таймера</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => adjustTimer(-5)}
              size="sm"
              variant="destructive"
            >
              <Minus className="h-3 w-3 mr-1" />
              5м
            </Button>
            <Button
              onClick={() => adjustTimer(-1)}
              size="sm"
              variant="destructive"
            >
              <Minus className="h-3 w-3 mr-1" />
              1м
            </Button>
            <Button
              onClick={() => adjustTimer(1)}
              size="sm"
              variant="default"
            >
              <Plus className="h-3 w-3 mr-1" />
              1м
            </Button>
            <Button
              onClick={() => adjustTimer(5)}
              size="sm"
              variant="default"
            >
              <Plus className="h-3 w-3 mr-1" />
              5м
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Минуты"
              value={adjustMinutes}
              onChange={(e) => setAdjustMinutes(e.target.value)}
              className="flex-1"
            />
            <Button onClick={setCustomTime} size="sm">
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};