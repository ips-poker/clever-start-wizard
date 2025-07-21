import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  X,
  Clock,
  Users,
  Trophy,
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


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800 z-50 flex flex-col">
      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200/50 bg-white/70 backdrop-blur-sm">
          <h1 className="text-2xl font-light text-gray-800">{tournament.name}</h1>
          <Button 
            variant="outline"
            size="lg" 
            onClick={onClose}
            className="border-gray-200/50 text-gray-600 hover:bg-gray-100/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Timer Display */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8">
          {/* Current Level Badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-6 py-3 shadow-subtle mb-6">
              {isBreakLevel ? (
                <>
                  <div className="p-2 bg-amber-100/80 rounded-lg">
                    <Coffee className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xl font-light text-gray-800">ПЕРЕРЫВ</span>
                </>
              ) : (
                <>
                  <div className="p-2 bg-gray-100/80 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="text-xl font-light text-gray-800">Уровень {tournament.current_level}</span>
                </>
              )}
            </div>
            {/* Timer Display */}
            <div className={`text-8xl md:text-9xl font-mono font-light transition-all duration-300 ${
              currentTime <= 60 ? 'text-red-500' : 
              currentTime <= 300 ? 'text-amber-500' : 
              'text-gray-800'
            }`}>
              {formatTime(currentTime)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-96 max-w-full">
              <Progress 
                value={timerProgress} 
                className="h-3 bg-gray-100/50"
              />
            </div>
          </div>

          {/* Blinds Display */}
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center p-6 border border-gray-200/30 rounded-lg bg-white/50 shadow-minimal">
              <p className="text-sm text-gray-500 font-medium mb-2">Малый блайнд</p>
              <p className="text-4xl font-light text-gray-800">{tournament.current_small_blind}</p>
            </div>
            <div className="text-center p-6 border border-gray-200/30 rounded-lg bg-white/50 shadow-minimal">
              <p className="text-sm text-gray-500 font-medium mb-2">Большой блайнд</p>
              <p className="text-4xl font-light text-gray-800">{tournament.current_big_blind}</p>
            </div>
          </div>

          {/* Game Statistics - Combined */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-subtle max-w-4xl">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-blue-100/80 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-light text-gray-800">{activePlayers.length}</p>
                    <p className="text-xs text-gray-500 font-medium">Активных игроков</p>
                  </div>
                </div>
              </div>
              <div className="text-center border-l border-gray-200/30">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-amber-100/80 rounded-lg mr-3">
                    <Trophy className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-light text-gray-800">{prizePool.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 font-medium">Призовой фонд (RP)</p>
                  </div>
                </div>
              </div>
              <div className="text-center border-l border-gray-200/30">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-amber-100/80 rounded-lg mr-3">
                    <Coffee className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-light text-gray-800">{isBreakLevel ? "СЕЙЧАС" : levelsUntilBreak}</p>
                    <p className="text-xs text-gray-500 font-medium">До перерыва</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/70 backdrop-blur-sm border-t border-gray-200/50 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Main Timer Controls */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="lg"
                onClick={onPrevLevel}
                className="h-14 px-6 border-gray-200/50 hover:shadow-subtle transition-all bg-white/50"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span className="font-medium">Предыдущий</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onToggleTimer}
                className={`h-14 px-8 border-gray-200/50 hover:shadow-subtle transition-all font-medium ${
                  timerActive 
                    ? 'bg-red-50/80 text-red-600 border-red-200/50 hover:bg-red-100/80' 
                    : 'bg-green-50/80 text-green-600 border-green-200/50 hover:bg-green-100/80'
                }`}
              >
                {timerActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {timerActive ? 'Пауза' : 'Старт'}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onNextLevel}
                className="h-14 px-6 border-gray-200/50 hover:shadow-subtle transition-all bg-white/50"
              >
                <span className="font-medium">Следующий</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            
            {/* Secondary Controls */}
            <div className="flex justify-center items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetTimer}
                className="h-12 px-6 border-gray-200/50 hover:bg-gray-100/50 text-gray-600 bg-white/50 rounded-xl"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сброс уровня
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;