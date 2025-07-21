import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  StopCircle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  Clock,
  Users,
  DollarSign,
  Coffee
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
  break_start_level: number;
}

interface Registration {
  id: string;
  status: string;
  rebuys: number;
  addons: number;
}

interface FullscreenTimerProps {
  tournament: Tournament;
  registrations: Registration[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onStopTournament: () => void;
  onClose: () => void;
}

const FullscreenTimer = ({
  tournament,
  registrations,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onStopTournament,
  onClose
}: FullscreenTimerProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);

  const timerProgress = ((tournament.timer_duration - currentTime) / tournament.timer_duration) * 100;
  const isBreakLevel = tournament.current_level % tournament.break_start_level === 0;
  const levelsUntilBreak = tournament.break_start_level - (tournament.current_level % tournament.break_start_level);

  // Time adjustment functions
  const adjustTime = (minutes: number) => {
    // This would need to be implemented to adjust the timer
    console.log(`Adjusting time by ${minutes} minutes`);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-poker-primary via-poker-primary-light to-poker-primary text-poker-surface z-50 flex flex-col">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-glass backdrop-blur-sm"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-poker-surface/20 backdrop-blur-lg bg-poker-surface/10">
          <h1 className="text-3xl font-light text-poker-surface">{tournament.name}</h1>
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={onClose}
            className="text-poker-surface/80 hover:text-poker-surface hover:bg-poker-surface/10 border border-poker-surface/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Timer Display */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-12 p-8">
          {/* Current Level and Timer */}
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center gap-6">
              <div className="bg-gradient-card backdrop-blur-lg border border-poker-surface/20 rounded-2xl px-8 py-4 shadow-elevated">
                {isBreakLevel ? (
                  <div className="flex items-center text-poker-warning">
                    <Coffee className="w-8 h-8 mr-3" />
                    <span className="text-3xl font-light">ПЕРЕРЫВ</span>
                  </div>
                ) : (
                  <div className="flex items-center text-poker-surface">
                    <Clock className="w-8 h-8 mr-3" />
                    <span className="text-3xl font-light">УРОВЕНЬ {tournament.current_level}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`text-9xl md:text-[12rem] font-mono font-light transition-all duration-500 ${
              currentTime <= 60 ? 'text-poker-error drop-shadow-lg' : 
              currentTime <= 300 ? 'text-poker-warning drop-shadow-lg' : 
              'text-poker-success drop-shadow-lg'
            }`}>
              {formatTime(currentTime)}
            </div>
            
            <div className="w-[500px] max-w-full">
              <Progress 
                value={timerProgress} 
                className="h-4 bg-poker-surface/20 backdrop-blur-sm border border-poker-surface/30 rounded-full overflow-hidden"
              />
            </div>
          </div>

          {/* Blinds Display */}
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center p-8 border border-poker-surface/30 rounded-2xl bg-gradient-card backdrop-blur-lg shadow-elevated">
              <p className="text-2xl text-poker-surface/80 mb-3 font-medium">Малый блайнд</p>
              <p className="text-6xl font-light text-poker-surface">{tournament.current_small_blind}</p>
            </div>
            <div className="text-center p-8 border border-poker-surface/30 rounded-2xl bg-gradient-card backdrop-blur-lg shadow-elevated">
              <p className="text-2xl text-poker-surface/80 mb-3 font-medium">Большой блайнд</p>
              <p className="text-6xl font-light text-poker-surface">{tournament.current_big_blind}</p>
            </div>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-4 gap-8 max-w-5xl">
            <div className="text-center p-6 border border-poker-surface/20 rounded-xl bg-gradient-card backdrop-blur-lg shadow-card">
              <Users className="w-10 h-10 mx-auto mb-3 text-poker-accent" />
              <p className="text-3xl font-light text-poker-surface">{activePlayers.length}</p>
              <p className="text-sm text-poker-surface/70 font-medium">Игроков</p>
            </div>
            <div className="text-center p-6 border border-poker-surface/20 rounded-xl bg-gradient-card backdrop-blur-lg shadow-card">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-poker-success" />
              <p className="text-3xl font-light text-poker-surface">{(prizePool / 1000).toFixed(0)}K</p>
              <p className="text-sm text-poker-surface/70 font-medium">Призовой (₽)</p>
            </div>
            <div className="text-center p-6 border border-poker-surface/20 rounded-xl bg-gradient-card backdrop-blur-lg shadow-card">
              <Coffee className="w-10 h-10 mx-auto mb-3 text-poker-warning" />
              <p className="text-3xl font-light text-poker-surface">{isBreakLevel ? "СЕЙЧАС" : levelsUntilBreak}</p>
              <p className="text-sm text-poker-surface/70 font-medium">До перерыва</p>
            </div>
            <div className="text-center p-6 border border-poker-surface/20 rounded-xl bg-gradient-card backdrop-blur-lg shadow-card">
              <Clock className="w-10 h-10 mx-auto mb-3 text-poker-accent-light" />
              <p className="text-3xl font-light text-poker-surface">{tournament.current_level + 1}</p>
              <p className="text-sm text-poker-surface/70 font-medium">Следующий</p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="p-8 border-t border-poker-surface/20 backdrop-blur-lg bg-poker-surface/5">
          <div className="flex justify-center items-center space-x-6 max-w-7xl mx-auto">
            {/* Time Adjustments */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => adjustTime(-5)}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-6"
              >
                -5м
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => adjustTime(-1)}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-6"
              >
                -1м
              </Button>
            </div>

            {/* Main Controls */}
            <div className="flex space-x-6">
              <Button
                variant="outline"
                size="lg"
                onClick={onPrevLevel}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-8"
              >
                <ChevronLeft className="w-6 h-6 mr-2" />
                Пред. уровень
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onToggleTimer}
                className={`border-poker-surface/30 backdrop-blur-sm h-14 px-8 ${
                  timerActive 
                    ? 'text-poker-error hover:bg-poker-error/10 border-poker-error/50' 
                    : 'text-poker-success hover:bg-poker-success/10 border-poker-success/50'
                }`}
              >
                {timerActive ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
                {timerActive ? 'Пауза' : 'Старт'}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onResetTimer}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-8"
              >
                <RotateCcw className="w-6 h-6 mr-2" />
                Сброс
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onNextLevel}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-8"
              >
                След. уровень
                <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            </div>

            {/* Time Adjustments */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => adjustTime(1)}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-6"
              >
                +1м
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => adjustTime(5)}
                className="border-poker-surface/30 text-poker-surface hover:bg-poker-surface/10 backdrop-blur-sm h-14 px-6"
              >
                +5м
              </Button>
            </div>

            {/* Additional Controls */}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`border-poker-surface/30 backdrop-blur-sm h-14 px-6 ${
                  soundEnabled 
                    ? 'text-poker-accent hover:bg-poker-accent/10 border-poker-accent/50' 
                    : 'text-poker-surface/50 hover:bg-poker-surface/5'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onStopTournament}
                className="border-poker-error/50 text-poker-error hover:bg-poker-error/10 backdrop-blur-sm h-14 px-8"
              >
                <StopCircle className="w-6 h-6 mr-2" />
                Стоп
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;