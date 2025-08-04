import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useVoiceAnnouncements } from '@/hooks/useVoiceAnnouncements';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Maximize, Coffee, Clock } from 'lucide-react';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface TournamentTimerProps {
  tournament: any;
  blindLevels: BlindLevel[];
  currentTime: number;
  timerActive: boolean;
  registrations: any[];
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onTimerAdjust: (seconds: number) => void;
  onOpenFullscreen?: () => void;
}

const ImprovedTournamentTimer = ({
  tournament,
  blindLevels,
  currentTime,
  timerActive,
  registrations,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onTimerAdjust,
  onOpenFullscreen
}: TournamentTimerProps) => {
  const [totalChipsInPlay, setTotalChipsInPlay] = useState(0);
  const [averageStack, setAverageStack] = useState(0);
  const [lastAnnouncedTime, setLastAnnouncedTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Голосовые объявления
  const voiceAnnouncements = useVoiceAnnouncements({
    enabled: true,
    volume: 0.8
  });

  useEffect(() => {
    calculateChipStatistics();
  }, [registrations]);

  // Автоматические голосовые объявления на основе таймера
  useEffect(() => {
    if (!timerActive || !currentTime) return;

    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();

    // Объявления времени
    if (currentTime === 300 && lastAnnouncedTime !== 300) { // 5 минут
      voiceAnnouncements.announceTimeWarning(5);
      setLastAnnouncedTime(300);
    } else if (currentTime === 120 && lastAnnouncedTime !== 120) { // 2 минуты
      voiceAnnouncements.announceTimeWarning(2);
      setLastAnnouncedTime(120);
    } else if (currentTime === 60 && lastAnnouncedTime !== 60) { // 1 минута
      voiceAnnouncements.announceTimeWarning(1);
      setLastAnnouncedTime(60);
    } else if (currentTime === 10 && lastAnnouncedTime !== 10) { // 10 секунд
      voiceAnnouncements.announceNextLevel(
        tournament.current_level,
        nextLevel,
        currentTime
      );
      setLastAnnouncedTime(10);
    }

    // Сброс при смене времени уровня
    if (currentTime > lastAnnouncedTime + 60) {
      setLastAnnouncedTime(null);
    }
  }, [currentTime, timerActive, tournament.current_level, voiceAnnouncements, lastAnnouncedTime]);

  const calculateChipStatistics = () => {
    const activeRegistrations = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const total = activeRegistrations.reduce((sum, reg) => sum + (reg.chips || 0), 0);
    const average = activeRegistrations.length > 0 ? Math.round(total / activeRegistrations.length) : 0;
    
    setTotalChipsInPlay(total);
    setAverageStack(average);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCurrentLevel = () => {
    return blindLevels.find(l => l.level === tournament.current_level) || null;
  };

  const getNextLevel = () => {
    return blindLevels.find(l => l.level === tournament.current_level + 1) || null;
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const isBreak = currentLevel?.is_break ?? false;
  const progress = currentLevel ? ((currentLevel.duration - currentTime) / currentLevel.duration) * 100 : 0;

  const timeWarningClass = () => {
    if (currentTime <= 60) return "text-red-500 animate-pulse";
    if (currentTime <= 300) return "text-orange-500";
    return "text-foreground";
  };

  const getBlindMultiplier = (chips: number) => {
    if (!currentLevel) return 0;
    return Math.round(chips / currentLevel.big_blind);
  };

  return (
    <div className="space-y-6">
      {/* Main Timer Display */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-between">
            <Badge variant={isBreak ? "secondary" : "default"} className="text-sm">
              {isBreak ? (
                <div className="flex items-center gap-1">
                  <Coffee className="w-4 h-4" />
                  ПЕРЕРЫВ
                </div>
              ) : (
                `Уровень ${tournament.current_level}`
              )}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFullscreen}
              className="flex items-center gap-1"
            >
              <Maximize className="w-4 h-4" />
              Внешний экран
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-6xl font-bold font-mono ${timeWarningClass()}`}>
            {formatTime(currentTime)}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Current Level Info */}
          {currentLevel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Малый блайнд</div>
                <div className="text-xl font-bold">
                  {isBreak ? '—' : currentLevel.small_blind.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Большой блайнд</div>
                <div className="text-xl font-bold">
                  {isBreak ? '—' : currentLevel.big_blind.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Анте</div>
                <div className="text-xl font-bold">
                  {isBreak ? '—' : (currentLevel.ante || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Next Level Preview */}
          {nextLevel && !isBreak && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">
                  Следующий уровень {nextLevel.level}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">SB</div>
                    <div className="font-medium">{nextLevel.small_blind.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">BB</div>
                    <div className="font-medium">{nextLevel.big_blind.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Анте</div>
                    <div className="font-medium">{(nextLevel.ante || 0).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevLevel}
              disabled={tournament.current_level <= 1}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTimerAdjust(-60)}
              disabled={currentTime <= 0}
            >
              -1м
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTimerAdjust(-10)}
              disabled={currentTime <= 0}
            >
              -10с
            </Button>
            
            <Button
              onClick={onToggleTimer}
              variant={timerActive ? "destructive" : "default"}
              size="lg"
              className="px-6"
            >
              {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTimerAdjust(10)}
            >
              +10с
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTimerAdjust(60)}
            >
              +1м
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onNextLevel}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetTimer}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Сброс
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {registrations.filter(r => r.status === 'registered' || r.status === 'playing').length}
            </div>
            <div className="text-sm text-muted-foreground">Активных игроков</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {totalChipsInPlay.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Фишек в игре</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {averageStack.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Средний стек</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {currentLevel && !isBreak ? getBlindMultiplier(averageStack) : '—'}
            </div>
            <div className="text-sm text-muted-foreground">BB в стеке</div>
          </CardContent>
        </Card>
      </div>

      {/* Break Announcement */}
      {isBreak && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coffee className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800">Перерыв</h3>
            </div>
            <p className="text-yellow-700">
              Время перерыва: {formatTime(currentTime)}
            </p>
            {nextLevel && (
              <p className="text-sm text-yellow-600 mt-2">
                После перерыва: {nextLevel.small_blind}/{nextLevel.big_blind} 
                {nextLevel.ante ? ` (анте ${nextLevel.ante})` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImprovedTournamentTimer;