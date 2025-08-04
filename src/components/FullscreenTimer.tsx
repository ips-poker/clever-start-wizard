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
  ChevronUp,
  Mic,
  MicOff
} from "lucide-react";
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";
import telegramQr from "@/assets/telegram-qr.png";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";

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
  starting_chips: number;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface Registration {
  id: string;
  status: string;
  rebuys: number;
  addons: number;
  chips?: number;
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
  onTimerAdjust: (seconds: number) => void;
  slogan?: string;
  onSloganChange?: (slogan: string) => void;
  blindLevels?: BlindLevel[];
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
  onClose,
  onTimerAdjust,
  slogan = "Престижные турниры. Высокие стандарты.",
  onSloganChange,
  blindLevels = []
}: FullscreenTimerProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(true);
  const [twoMinuteWarning, setTwoMinuteWarning] = useState(false);
  const [fiveSecondWarning, setFiveSecondWarning] = useState(false);
  const [tenSecondAnnouncement, setTenSecondAnnouncement] = useState(false);
  const [editingSlogan, setEditingSlogan] = useState(false);
  const [tempSlogan, setTempSlogan] = useState(slogan);

  const { announceNextLevel, stopAnnouncement } = useVoiceAnnouncements({
    enabled: voiceAnnouncementsEnabled,
    voice: 'Aria',
    volume: 0.8
  });

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

  // Sound warning effects + Voice announcements + Auto level transition
  useEffect(() => {
    // Звуковые предупреждения только если включены
    if (soundEnabled) {
      if (currentTime === 120 && !twoMinuteWarning) {
        playTwoMinuteWarning();
        setTwoMinuteWarning(true);
      }
      if (currentTime === 5 && !fiveSecondWarning) {
        playFiveSecondWarning();
        setFiveSecondWarning(true);
      }
    }
    
    // Голосовое оповещение за 10 секунд
    if (currentTime === 10 && !tenSecondAnnouncement && voiceAnnouncementsEnabled) {
      const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
      announceNextLevel(tournament.current_level, nextLevel, currentTime);
      setTenSecondAnnouncement(true);
    }
    
    // Автоматический переход к следующему уровню при достижении 0
    if (currentTime === 0 && blindLevels.length > 0) {
      const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
      if (nextLevel && !timerActive) {
        setTimeout(() => {
          onNextLevel();
        }, 2000); // Задержка 2 секунды для лучшего UX
      }
    }
    
    // Сброс флагов при новом уровне
    if (currentTime > 120) {
      setTwoMinuteWarning(false);
    }
    if (currentTime > 10) {
      setFiveSecondWarning(false);
      setTenSecondAnnouncement(false);
    }
  }, [currentTime, twoMinuteWarning, fiveSecondWarning, tenSecondAnnouncement, voiceAnnouncementsEnabled, announceNextLevel, blindLevels, tournament.current_level, timerActive, onNextLevel]);

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);
  
  // Расчет среднего стека
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const timerProgress = ((tournament.timer_duration - currentTime) / tournament.timer_duration) * 100;
  
  // Определяем текущий уровень из слепых структур
  const currentLevel = blindLevels.find(l => l.level === tournament.current_level);
  const isBreakLevel = currentLevel?.is_break || false;
  
  // Находим следующий перерыв и считаем время до него
  const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
  const levelsUntilBreak = nextBreakLevel ? nextBreakLevel.level - tournament.current_level : null;
  
  // Debug logs removed for performance
  
  // Примерное время до перерыва (текущий таймер + время оставшихся уровней)
  const calculateTimeToBreak = () => {
    if (!nextBreakLevel || !levelsUntilBreak || blindLevels.length === 0) {
      return null;
    }
    
    // Время текущего уровня + время промежуточных уровней
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntilBreak; i++) {
      const levelInfo = blindLevels.find(l => l.level === tournament.current_level + i);
      const levelDuration = levelInfo?.duration || 1200; // по умолчанию 20 минут
      timeToBreak += levelDuration;
    }
    
    return timeToBreak;
  };
  
  const timeToBreak = calculateTimeToBreak();

  // Calculate next level blinds
  const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
  const nextSmallBlind = nextLevel?.small_blind || tournament.current_small_blind * 2;
  const nextBigBlind = nextLevel?.big_blind || tournament.current_big_blind * 2;
  const nextAnte = nextLevel?.ante || nextBigBlind;

  // Текущий анте
  const currentAnte = currentLevel?.ante || tournament.current_big_blind;

  return (
    <div className="fixed inset-0 bg-white text-gray-800 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        {/* Left - Logo and Company */}
        <div className="flex items-center space-x-3">
          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-md border border-gray-200">
            <img 
              src={ipsLogo} 
              alt="IPS Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800">IPS</span>
            <span className="text-xs text-gray-500">International Poker Series</span>
          </div>
        </div>

        {/* Center - Tournament Name and Slogan */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-xl font-bold text-gray-800 mb-1">{tournament.name}</h1>
          {editingSlogan ? (
            <div className="flex items-center justify-center space-x-2">
              <input 
                type="text"
                value={tempSlogan}
                onChange={(e) => setTempSlogan(e.target.value)}
                className="text-sm text-gray-500 italic bg-transparent border-b border-gray-300 text-center min-w-0 flex-1 max-w-xs"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSloganChange?.(tempSlogan);
                    setEditingSlogan(false);
                  }
                }}
                onBlur={() => {
                  onSloganChange?.(tempSlogan);
                  setEditingSlogan(false);
                }}
              />
            </div>
          ) : (
            <p 
              className="text-sm text-gray-500 italic cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => onSloganChange && setEditingSlogan(true)}
            >
              {slogan}
            </p>
          )}
        </div>

        {/* Right - QR Code and Close */}
        <div className="flex items-center space-x-3">
          <img 
            src={telegramQr} 
            alt="Telegram QR" 
            className="w-24 h-24 border border-gray-200 rounded"
          />
          <Button 
            variant="ghost"
            size="sm" 
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
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

        {/* Current and Next Blinds */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Current Blinds - Emphasized */}
          <div className="text-center p-6 border-2 border-gray-800 rounded-lg bg-white shadow-lg">
            <p className="text-sm text-gray-800 font-bold mb-2">ТЕКУЩИЙ УРОВЕНЬ</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{tournament.current_small_blind}</p>
                <p className="text-xs text-gray-600">МАЛЫЙ БЛАЙНД</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{tournament.current_big_blind}</p>
                <p className="text-xs text-gray-600">БОЛЬШОЙ БЛАЙНД</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-amber-600">{currentAnte}</p>
                <p className="text-xs text-gray-600">АНТЕ</p>
              </div>
            </div>
          </div>

          {/* Next Blinds - Subtle */}
          <div className="text-center p-6 border border-gray-300 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-500 font-medium mb-2 flex items-center justify-center">
              <ChevronUp className="w-4 h-4 mr-1" />
              СЛЕДУЮЩИЙ УРОВЕНЬ
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <p className="text-xl font-medium text-gray-700">{nextSmallBlind}</p>
                <p className="text-xs text-gray-500">МАЛЫЙ БЛАЙНД</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-medium text-gray-700">{nextBigBlind}</p>
                <p className="text-xs text-gray-500">БОЛЬШОЙ БЛАЙНД</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-medium text-amber-500">{nextAnte}</p>
                <p className="text-xs text-gray-500">АНТЕ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics - расширенная статистика */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-6xl w-full">
          <div className="grid grid-cols-5 gap-6 text-center">
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
                <span className="text-sm text-gray-600">Призовой (₽)</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{prizePool.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <span className="text-sm text-gray-600">Средний стек</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{averageStack.toLocaleString()}</p>
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
              {isBreakLevel ? (
                <p className="text-xl font-medium text-amber-600">СЕЙЧАС</p>
              ) : timeToBreak ? (
                <div>
                  <p className="text-lg font-medium text-gray-800">{formatTime(timeToBreak)}</p>
                  <p className="text-xs text-gray-500">({levelsUntilBreak} ур.)</p>
                </div>
              ) : blindLevels.length === 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-500">Загрузка...</p>
                  <p className="text-xs text-gray-400">структуры блайндов</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-medium text-gray-800">∞</p>
                  <p className="text-xs text-gray-500">нет перерывов</p>
                </div>
              )}
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

          {/* Timer adjustment controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimerAdjust(-60)}
            className="h-10 px-3 text-xs"
          >
            -1м
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimerAdjust(60)}
            className="h-10 px-3 text-xs"
          >
            +1м
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVoiceAnnouncementsEnabled(!voiceAnnouncementsEnabled);
              if (!voiceAnnouncementsEnabled) {
                stopAnnouncement();
              }
            }}
            className={`h-10 px-3 ${voiceAnnouncementsEnabled ? 'bg-green-50 text-green-600' : 'text-gray-500'}`}
          >
            {voiceAnnouncementsEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;