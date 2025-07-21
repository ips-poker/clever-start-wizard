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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-700">
        <h1 className="text-2xl font-light text-gray-100">{tournament.name}</h1>
        <Button 
          variant="ghost" 
          size="lg" 
          onClick={onClose}
          className="text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8">
        {/* Current Level and Timer */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-2xl px-6 py-3 border-gray-600 text-gray-300">
              {isBreakLevel ? <Coffee className="w-6 h-6 mr-2" /> : <Clock className="w-6 h-6 mr-2" />}
              {isBreakLevel ? "ПЕРЕРЫВ" : `УРОВЕНЬ ${tournament.current_level}`}
            </Badge>
          </div>
          
          <div className={`text-8xl md:text-9xl font-mono font-light transition-all duration-300 ${
            currentTime <= 60 ? 'text-red-400' : 
            currentTime <= 300 ? 'text-amber-400' : 
            'text-green-400'
          }`}>
            {formatTime(currentTime)}
          </div>
          
          <Progress 
            value={timerProgress} 
            className="w-96 h-3 bg-gray-700"
          />
        </div>

        {/* Blinds Display */}
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center p-6 border border-gray-600 rounded-xl bg-gray-800/50">
            <p className="text-xl text-gray-400 mb-2">Малый блайнд</p>
            <p className="text-5xl font-light text-white">{tournament.current_small_blind}</p>
          </div>
          <div className="text-center p-6 border border-gray-600 rounded-xl bg-gray-800/50">
            <p className="text-xl text-gray-400 mb-2">Большой блайнд</p>
            <p className="text-5xl font-light text-white">{tournament.current_big_blind}</p>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-4 gap-6 text-center">
          <div className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-light text-white">{activePlayers.length}</p>
            <p className="text-sm text-gray-400">Игроков</p>
          </div>
          <div className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-light text-white">{prizePool.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Призовой (₽)</p>
          </div>
          <div className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
            <Coffee className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-light text-white">{isBreakLevel ? "СЕЙЧАС" : levelsUntilBreak}</p>
            <p className="text-sm text-gray-400">До перерыва</p>
          </div>
          <div className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-light text-white">{tournament.current_level + 1}</p>
            <p className="text-sm text-gray-400">Следующий</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex justify-center space-x-4">
          {/* Time Adjustments */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => adjustTime(-5)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              -5м
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => adjustTime(-1)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              -1м
            </Button>
          </div>

          {/* Main Controls */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onPrevLevel}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ChevronLeft className="w-6 h-6" />
              Пред. уровень
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onToggleTimer}
              className={`border-gray-600 ${
                timerActive ? 'text-red-400 hover:bg-red-900/30' : 'text-green-400 hover:bg-green-900/30'
              }`}
            >
              {timerActive ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
              {timerActive ? 'Пауза' : 'Старт'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onResetTimer}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RotateCcw className="w-6 h-6 mr-2" />
              Сброс
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onNextLevel}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              След. уровень
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </div>

          {/* Time Adjustments */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => adjustTime(1)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              +1м
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => adjustTime(5)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              +5м
            </Button>
          </div>

          {/* Additional Controls */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`border-gray-600 ${
                soundEnabled ? 'text-blue-400 hover:bg-blue-900/30' : 'text-gray-500 hover:bg-gray-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onStopTournament}
              className="border-red-600 text-red-400 hover:bg-red-900/30"
            >
              <StopCircle className="w-6 h-6 mr-2" />
              Стоп
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;