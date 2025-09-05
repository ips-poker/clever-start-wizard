import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Coffee,
  FastForward,
  Rewind,
  DollarSign,
  Users,
  Trophy
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  buy_in: number;
  starting_chips: number;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
  };
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
}

interface MobileTournamentTimerProps {
  tournament: Tournament;
  currentTime: number;
  timerActive: boolean;
  blindLevels: any[];
  registrations: Registration[];
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onAdjustTimer: (seconds: number) => void;
}

const MobileTournamentTimer = ({
  tournament,
  currentTime,
  timerActive,
  blindLevels,
  registrations,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onAdjustTimer
}: MobileTournamentTimerProps) => {

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);
  
  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing' || r.status === 'confirmed');
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);
  
  // Calculate average stack
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const timerProgress = currentBlindLevel 
    ? ((currentBlindLevel.duration - currentTime) / currentBlindLevel.duration) * 100
    : ((tournament.timer_duration || 1200) - currentTime) / (tournament.timer_duration || 1200) * 100;

  const isCurrentBreak = currentBlindLevel?.is_break || false;
  const isNextLevelBreak = nextBlindLevel?.is_break || false;

  return (
    <div className="space-y-4">
      {/* Main Timer Display */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCurrentBreak ? <Coffee className="h-5 w-5 text-amber-600" /> : <Clock className="h-5 w-5" />}
              {isCurrentBreak ? 'Перерыв' : `Уровень ${tournament.current_level}`}
            </div>
            <Badge variant={timerActive ? "default" : "secondary"}>
              {timerActive ? "Идет" : "Пауза"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-6xl font-mono font-bold transition-all duration-300 ${
              currentTime <= 60 ? 'text-red-500 animate-pulse' : 
              currentTime <= 300 ? 'text-amber-500' : 
              'text-foreground'
            }`}>
              {formatTime(currentTime)}
            </div>
            <Progress 
              value={timerProgress} 
              className="mt-4 h-3"
            />
          </div>

          {!isCurrentBreak && (
            <div className={`grid gap-4 ${currentBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="text-center p-4 border border-border rounded-lg bg-card">
                <p className="text-xs text-muted-foreground font-medium mb-1">Малый блайнд</p>
                <p className="text-2xl font-bold">{tournament.current_small_blind}</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg bg-card">
                <p className="text-xs text-muted-foreground font-medium mb-1">Большой блайнд</p>
                <p className="text-2xl font-bold">{tournament.current_big_blind}</p>
              </div>
              {currentBlindLevel?.ante > 0 && (
                <div className="text-center p-4 border border-border rounded-lg bg-card">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Анте</p>
                  <p className="text-2xl font-bold text-amber-600">{currentBlindLevel.ante}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timer Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Управление таймером</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={timerActive ? "destructive" : "default"}
              onClick={onToggleTimer}
              className="h-12 text-lg font-medium"
            >
              {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onResetTimer} 
              className="h-12"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button 
              variant="outline" 
              onClick={onNextLevel} 
              className="h-12"
              disabled={!nextBlindLevel}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAdjustTimer(-60)}
              className="h-10"
              title="Перемотать назад на 1 минуту"
            >
              <Rewind className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAdjustTimer(60)}
              className="h-10"
              title="Перемотать вперед на 1 минуту"
            >
              <FastForward className="w-4 h-4" />
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPrevLevel} 
              className="h-10"
              disabled={tournament.current_level <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNextLevel} 
              className="h-10"
              disabled={!nextBlindLevel}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Level Preview */}
      {nextBlindLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className="w-4 h-4" />
              {isNextLevelBreak ? 'Следующий: Перерыв' : `Следующий уровень ${tournament.current_level + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isNextLevelBreak ? (
              <div className="text-center p-6 space-y-2">
                <Coffee className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-lg font-medium text-amber-800">Перерыв</p>
                <p className="text-sm text-muted-foreground">
                  {Math.floor(nextBlindLevel.duration / 60)} минут
                </p>
              </div>
            ) : (
              <div className={`grid gap-3 ${nextBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="text-center p-3 border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">Малый блайнд</p>
                  <p className="text-xl font-bold">{nextBlindLevel.small_blind}</p>
                </div>
                <div className="text-center p-3 border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">Большой блайнд</p>
                  <p className="text-xl font-bold">{nextBlindLevel.big_blind}</p>
                </div>
                {nextBlindLevel?.ante > 0 && (
                  <div className="text-center p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Анте</p>
                    <p className="text-xl font-bold text-amber-600">{nextBlindLevel.ante}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournament Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Статистика турнира</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 border border-border rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Активные игроки</span>
              </div>
              <p className="text-xl font-bold">{activePlayers.length}</p>
            </div>
            
            <div className="text-center p-3 border border-border rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Призовой фонд</span>
              </div>
              <p className="text-xl font-bold">{prizePool.toLocaleString()}</p>
            </div>

            <div className="text-center p-3 border border-border rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Средний стек</span>
              </div>
              <p className="text-xl font-bold">{averageStack.toLocaleString()}</p>
            </div>

            <div className="text-center p-3 border border-border rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">BB в стеке</span>
              </div>
              <p className="text-xl font-bold">
                {tournament.current_big_blind > 0 ? Math.round(averageStack / tournament.current_big_blind) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileTournamentTimer;