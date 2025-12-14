import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import ipsLogo from "/lovable-uploads/3d3f89dd-02a1-4e23-845c-641c0ee0956b.png";
import telegramQr from "@/assets/telegram-qr.png";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { calculateTotalRPSPool, formatRPSPoints } from "@/utils/rpsCalculations";

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in?: number;
  break_start_level?: number;
  starting_chips: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
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
  reentries: number;
  additional_sets: number;
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
    // Звуковые предупреждения
    if (currentTime === 120 && !twoMinuteWarning) {
      playTwoMinuteWarning();
      setTwoMinuteWarning(true);
    }
    if (currentTime === 5 && !fiveSecondWarning) {
      playFiveSecondWarning();
      setFiveSecondWarning(true);
    }
    
    // Голосовое оповещение за 10 секунд
    if (currentTime === 10 && !tenSecondAnnouncement && voiceAnnouncementsEnabled) {
      const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
      announceNextLevel(tournament.current_level, nextLevel, currentTime);
      setTenSecondAnnouncement(true);
    }
    
    // Автопереход выполняется в контроллере (TournamentDirector); убрано здесь для предотвращения дублирования
    
    // Сброс флагов при новом уровне
    if (currentTime > 120) {
      setTwoMinuteWarning(false);
    }
    if (currentTime > 10) {
      setFiveSecondWarning(false);
      setTenSecondAnnouncement(false);
    }
  }, [currentTime, twoMinuteWarning, fiveSecondWarning, tenSecondAnnouncement, voiceAnnouncementsEnabled, announceNextLevel, blindLevels, tournament.current_level, timerActive, onNextLevel]);

  // Мемоизированные вычисления статистики
  const statisticsData = useMemo(() => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
    const totalAdditionalSets = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
    
    // Рассчитываем фонд RPS баллов
    const rpsPool = calculateTotalRPSPool(
      registrations.length,
      tournament.participation_fee || tournament.buy_in || 0,
      totalReentries,
      tournament.reentry_fee || tournament.buy_in || 0,
      totalAdditionalSets,
      tournament.additional_fee || tournament.buy_in || 0
    );
    
    const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
    const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

    return {
      activePlayers,
      totalReentries,
      totalAdditionalSets,
      rpsPool,
      averageStack
    };
  }, [registrations, tournament.buy_in, tournament.starting_chips, tournament.participation_fee, tournament.reentry_fee, tournament.additional_fee]);

  // Определяем текущий уровень из слепых структур
  const currentLevel = useMemo(() => {
    return blindLevels.find(l => l.level === tournament.current_level);
  }, [blindLevels, tournament.current_level]);
  
  const isBreakLevel = currentLevel?.is_break || false;
  
  const timerProgress = useMemo(() => {
    const levelDuration = currentLevel?.duration ?? tournament.timer_duration ?? 1200;
    return levelDuration > 0 ? ((levelDuration - currentTime) / levelDuration) * 100 : 0;
  }, [currentLevel?.duration, tournament.timer_duration, currentTime]);
  
  // Мемоизированный расчет времени до перерыва
  const timeToBreakData = useMemo(() => {
    const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
    const levelsUntilBreak = nextBreakLevel ? nextBreakLevel.level - tournament.current_level : null;
    
    if (!nextBreakLevel || !levelsUntilBreak || blindLevels.length === 0) {
      return { timeToBreak: null, levelsUntilBreak: null };
    }
    
    // Время текущего уровня + время промежуточных уровней
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntilBreak; i++) {
      const levelInfo = blindLevels.find(l => l.level === tournament.current_level + i);
      const levelDuration = levelInfo?.duration || 1200; // по умолчанию 20 минут
      timeToBreak += levelDuration;
    }
    
    return { timeToBreak, levelsUntilBreak };
  }, [blindLevels, tournament.current_level, currentTime]);

  // Calculate next level blinds
  const nextLevel = useMemo(() => {
    return blindLevels.find(l => l.level === tournament.current_level + 1);
  }, [blindLevels, tournament.current_level]);
  
  const isNextBreakLevel = nextLevel?.is_break || false;
  const nextSmallBlind = nextLevel?.small_blind || tournament.current_small_blind * 2;
  const nextBigBlind = nextLevel?.big_blind || tournament.current_big_blind * 2;
  const nextAnte = nextLevel?.ante ?? 0;

  // Текущие блайнды и анте из структуры (если доступны)
  const currentSmallBlind = currentLevel?.small_blind ?? tournament.current_small_blind ?? 0;
  const currentBigBlind = currentLevel?.big_blind ?? tournament.current_big_blind ?? 0;
  const currentAnte = currentLevel?.ante ?? 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#111115] to-[#0d0d10] text-foreground z-50 flex flex-col overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative flex justify-between items-center p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        {/* Left - Logo and Company */}
        <div className="flex items-center space-x-3">
          <div className="w-20 h-20 flex items-center justify-center">
            <img 
              src={ipsLogo} 
              alt="EPC Logo" 
              className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-sinkin text-poker-gold tracking-tight drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">EPC</span>
            <span className="text-sm text-white/50 -mt-1 font-sinkin font-medium tracking-widest uppercase">EVENT POKER CLUB</span>
          </div>
        </div>

        {/* Center - Tournament Name and Slogan */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{tournament.name}</h1>
          {editingSlogan ? (
            <div className="flex items-center justify-center space-x-2">
              <input 
                type="text"
                value={tempSlogan}
                onChange={(e) => setTempSlogan(e.target.value)}
                className="text-sm text-white/70 italic bg-transparent border-b border-white/30 text-center min-w-0 flex-1 max-w-xs focus:outline-none focus:border-primary"
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
              className="text-sm text-white/50 italic cursor-pointer hover:text-white/70 transition-colors"
              onClick={() => onSloganChange && setEditingSlogan(true)}
            >
              {slogan}
            </p>
          )}
        </div>

        {/* Right - QR Code and Close */}
        <div className="flex items-center space-x-3">
          <div className="p-1 bg-white rounded-lg shadow-lg shadow-black/50">
            <img 
              src={telegramQr} 
              alt="Telegram QR" 
              className="w-22 h-22"
            />
          </div>
          <Button 
            variant="ghost"
            size="sm" 
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="relative flex-1 flex flex-col justify-center items-center space-y-6 p-6">
        {/* Current Level Badge */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 mb-4 border ${
            isBreakLevel 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
              : 'bg-white/5 border-white/10 text-white/80'
          }`}>
            {isBreakLevel ? (
              <>
                <Coffee className="w-5 h-5 text-amber-400" />
                <span className="text-lg font-semibold tracking-wide">ПЕРЕРЫВ</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold tracking-wide">Уровень {tournament.current_level}</span>
              </>
            )}
          </div>
          
          {/* Timer Display - Large glowing numbers */}
          <div className={`text-[12rem] md:text-[16rem] font-mono font-light leading-none transition-all duration-500 ${
            currentTime <= 60 
              ? 'text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse' 
              : currentTime <= 300 
                ? 'text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]' 
                : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]'
          }`}>
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-96 max-w-full mt-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  currentTime <= 60 
                    ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                    : currentTime <= 300 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
                      : 'bg-gradient-to-r from-primary to-primary/70 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                }`}
                style={{ width: `${timerProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Current and Next Blinds */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Current Blinds - Emphasized */}
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-primary/40 shadow-[0_0_30px_rgba(212,175,55,0.15)] backdrop-blur-sm">
            <p className="text-sm text-primary font-bold mb-3 tracking-wider">ТЕКУЩИЙ УРОВЕНЬ</p>
            <div className={`grid gap-4 ${currentAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-white drop-shadow-lg">{isBreakLevel ? '—' : currentSmallBlind}</p>
                <p className="text-xs text-white/50 font-medium tracking-wide">МАЛЫЙ БЛАЙНД</p>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-white drop-shadow-lg">{isBreakLevel ? '—' : currentBigBlind}</p>
                <p className="text-xs text-white/50 font-medium tracking-wide">БОЛЬШОЙ БЛАЙНД</p>
              </div>
              {currentAnte > 0 && (
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">{isBreakLevel ? '—' : currentAnte}</p>
                  <p className="text-xs text-white/50 font-medium tracking-wide">АНТЕ</p>
                </div>
              )}
            </div>
          </div>

          {/* Next Blinds - Subtle */}
          <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-sm text-white/40 font-medium mb-3 flex items-center justify-center tracking-wider">
              <ChevronUp className="w-4 h-4 mr-1" />
              {isBreakLevel ? 'ПОСЛЕ ПЕРЕРЫВА' : (isNextBreakLevel ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ УРОВЕНЬ')}
            </p>
            {isNextBreakLevel ? (
              <div className="flex items-center justify-center py-3">
                <Coffee className="w-7 h-7 text-amber-400 mr-2" />
                <span className="text-2xl font-medium text-amber-400/80">ПЕРЕРЫВ</span>
              </div>
            ) : (
              <div className={`grid gap-4 ${nextAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-1">
                  <p className="text-2xl font-medium text-white/70">{nextSmallBlind}</p>
                  <p className="text-xs text-white/40 tracking-wide">МАЛЫЙ БЛАЙНД</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-medium text-white/70">{nextBigBlind}</p>
                  <p className="text-xs text-white/40 tracking-wide">БОЛЬШОЙ БЛАЙНД</p>
                </div>
                {nextAnte > 0 && (
                  <div className="space-y-1">
                    <p className="text-2xl font-medium text-amber-400/70">{nextAnte}</p>
                    <p className="text-xs text-white/40 tracking-wide">АНТЕ</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-6xl w-full backdrop-blur-sm">
          <div className="grid grid-cols-5 gap-6 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-4 h-4 text-primary mr-2" />
                <span className="text-sm text-white/50">Игроки</span>
              </div>
              <p className="text-2xl font-semibold text-white">{statisticsData.activePlayers.length}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-4 h-4 text-amber-400 mr-2" />
                <span className="text-sm text-white/50">Призовой фонд RPS</span>
              </div>
              <p className="text-2xl font-semibold text-primary">{statisticsData.rpsPool.toLocaleString()} <span className="text-sm text-white/40">RPS</span></p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <span className="text-sm text-white/50">Средний стек</span>
              </div>
              <p className="text-2xl font-semibold text-white">{statisticsData.averageStack.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <span className="text-sm text-white/50">Re-entry / Доп.</span>
              </div>
              <p className="text-2xl font-semibold text-white">{statisticsData.totalReentries} <span className="text-white/30">/</span> {statisticsData.totalAdditionalSets}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <Coffee className="w-4 h-4 text-amber-400 mr-2" />
                <span className="text-sm text-white/50">До перерыва</span>
              </div>
              {isBreakLevel ? (
                <p className="text-2xl font-semibold text-amber-400">СЕЙЧАС</p>
              ) : timeToBreakData.timeToBreak ? (
                <div>
                  <p className="text-xl font-semibold text-white">{formatTime(timeToBreakData.timeToBreak)}</p>
                  <p className="text-xs text-white/40">({timeToBreakData.levelsUntilBreak} ур.)</p>
                </div>
              ) : blindLevels.length === 0 ? (
                <div>
                  <p className="text-sm font-medium text-white/40">Загрузка...</p>
                  <p className="text-xs text-white/30">структуры</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-semibold text-white/60">∞</p>
                  <p className="text-xs text-white/30">нет перерывов</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="relative bg-black/40 border-t border-white/10 p-4 backdrop-blur-md">
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevLevel}
            className="h-10 px-4 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Пред.
          </Button>
          
          <Button
            size="sm"
            onClick={onToggleTimer}
            className={`h-10 px-6 font-medium transition-all ${
              timerActive 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]'
            }`}
          >
            {timerActive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {timerActive ? 'Пауза' : 'Старт'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNextLevel}
            className="h-10 px-4 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            След.
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          <div className="h-6 w-px bg-white/20 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimerAdjust(-60)}
            className="h-10 px-3 text-xs bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            -1м
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimerAdjust(60)}
            className="h-10 px-3 text-xs bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            +1м
          </Button>

          <div className="h-6 w-px bg-white/20 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={onResetTimer}
            className="h-10 px-4 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Сброс
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`h-10 px-3 border transition-all ${
              soundEnabled 
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30' 
                : 'bg-white/5 border-white/20 text-white/40 hover:bg-white/10'
            }`}
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
            className={`h-10 px-3 border transition-all ${
              voiceAnnouncementsEnabled 
                ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30' 
                : 'bg-white/5 border-white/20 text-white/40 hover:bg-white/10'
            }`}
          >
            {voiceAnnouncementsEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenTimer;