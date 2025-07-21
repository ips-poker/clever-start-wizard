import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Coffee,
  Volume2,
  VolumeX,
  ChevronUp
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
  const [twoMinuteWarning, setTwoMinuteWarning] = useState(false);
  const [fiveSecondWarning, setFiveSecondWarning] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sound generation functions
  const playBeep = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playTwoMinuteWarning = () => {
    playBeep(800, 1);
  };

  const playFiveSecondWarning = () => {
    setTimeout(() => playBeep(1200, 0.2), 0);
    setTimeout(() => playBeep(1200, 0.2), 300);
    setTimeout(() => playBeep(1200, 0.2), 600);
  };

  // Sound warning effects
  useEffect(() => {
    if (currentTime === 120 && !twoMinuteWarning) {
      playTwoMinuteWarning();
      setTwoMinuteWarning(true);
    }
    if (currentTime === 5 && !fiveSecondWarning) {
      playFiveSecondWarning();
      setFiveSecondWarning(true);
    }
    if (currentTime > 120) {
      setTwoMinuteWarning(false);
    }
    if (currentTime > 5) {
      setFiveSecondWarning(false);
    }
  }, [currentTime, twoMinuteWarning, fiveSecondWarning]);

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);

  const timerProgress = ((tournament.timer_duration - currentTime) / tournament.timer_duration) * 100;
  const isBreakLevel = tournament.current_level % tournament.break_start_level === 0;
  const levelsUntilBreak = tournament.break_start_level - (tournament.current_level % tournament.break_start_level);

  // Calculate next level blinds
  const nextSmallBlind = tournament.current_small_blind * 2;
  const nextBigBlind = tournament.current_big_blind * 2;

  return (
    <div className="fixed inset-0 bg-white text-gray-800 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h1 className="text-xl font-medium text-gray-800">{tournament.name}</h1>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={onClose}
          className="text-gray-600 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6 p-6">
        {/* Current Level */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 mb-4">
            {isBreakLevel ? (
              <>
                <Coffee className="w-4 h-4 text-amber-600" />
                <span className="text-lg font-medium text-gray-800">ПЕРЕРЫВ</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-lg font-medium text-gray-800">Уровень {tournament.current_level}</span>
              </>
            )}
          </div>
          
          {/* Timer Display - увеличен в 2 раза */}
          <div className={`text-[12rem] md:text-[16rem] font-mono font-light transition-all duration-300 leading-none ${
            currentTime <= 60 ? 'text-red-500' : 
            currentTime <= 300 ? 'text-amber-500' : 
            'text-gray-800'
          }`}>
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-80 max-w-full mt-4">
            <Progress 
              value={timerProgress} 
              className="h-2 bg-gray-200"
            />
          </div>
        </div>

        {/* Blinds and Next Level */}
        <div className="grid grid-cols-4 gap-4 max-w-4xl w-full">
          <div className="text-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 font-medium mb-1">Малый блайнд</p>
            <p className="text-2xl font-light text-gray-800">{tournament.current_small_blind}</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 font-medium mb-1">Большой блайнд</p>
            <p className="text-2xl font-light text-gray-800">{tournament.current_big_blind}</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg bg-blue-50">
            <p className="text-xs text-blue-600 font-medium mb-1 flex items-center justify-center">
              <ChevronUp className="w-3 h-3 mr-1" />
              След. малый
            </p>
            <p className="text-2xl font-light text-blue-800">{nextSmallBlind}</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg bg-blue-50">
            <p className="text-xs text-blue-600 font-medium mb-1 flex items-center justify-center">
              <ChevronUp className="w-3 h-3 mr-1" />
              След. большой
            </p>
            <p className="text-2xl font-light text-blue-800">{nextBigBlind}</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-4xl w-full">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center mb-1">
                <Users className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-600">Игроки</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{activePlayers.length}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <Trophy className="w-4 h-4 text-amber-600 mr-2" />
                <span className="text-sm text-gray-600">Призовой (RP)</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{prizePool.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <span className="text-sm text-gray-600">Ребаи / Адоны</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{totalRebuys} / {totalAddons}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <Coffee className="w-4 h-4 text-amber-600 mr-2" />
                <span className="text-sm text-gray-600">До перерыва</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{isBreakLevel ? "СЕЙЧАС" : levelsUntilBreak}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel - компактная единая панель */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevLevel}
            className="h-10 px-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Пред.
          </Button>
          
          <Button
            variant={timerActive ? "destructive" : "default"}
            size="sm"
            onClick={onToggleTimer}
            className="h-10 px-6 font-medium"
          >
            {timerActive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {timerActive ? 'Пауза' : 'Старт'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNextLevel}
            className="h-10 px-4"
          >
            След.
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={onResetTimer}
            className="h-10 px-4"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Сброс
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`h-10 px-3 ${soundEnabled ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;