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
  Coins,
  Plus,
  Minus
} from "lucide-react";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  starting_chips: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
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

interface ClubFullscreenTimerProps {
  tournament: Tournament;
  registrations: Registration[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onClose: () => void;
  onTimerAdjust: (seconds: number) => void;
  clubName?: string;
  clubLogo?: string;
  blindLevels?: BlindLevel[];
}

export function ClubFullscreenTimer({
  tournament,
  registrations,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onClose,
  onTimerAdjust,
  clubName = "Poker Club",
  clubLogo,
  blindLevels = []
}: ClubFullscreenTimerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(true);
  const [twoMinuteWarning, setTwoMinuteWarning] = useState(false);
  const [fiveSecondWarning, setFiveSecondWarning] = useState(false);
  const [tenSecondAnnouncement, setTenSecondAnnouncement] = useState(false);

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

  // Sound functions
  const playBeep = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    
    try {
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
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  };

  const playTwoMinuteWarning = () => playBeep(800, 1);
  const playFiveSecondWarning = () => {
    setTimeout(() => playBeep(1200, 0.2), 0);
    setTimeout(() => playBeep(1200, 0.2), 300);
    setTimeout(() => playBeep(1200, 0.2), 600);
  };

  // Sound warning effects + Voice announcements
  useEffect(() => {
    if (currentTime === 120 && !twoMinuteWarning) {
      playTwoMinuteWarning();
      setTwoMinuteWarning(true);
    }
    if (currentTime === 5 && !fiveSecondWarning) {
      playFiveSecondWarning();
      setFiveSecondWarning(true);
    }
    
    if (currentTime === 10 && !tenSecondAnnouncement && voiceAnnouncementsEnabled) {
      const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
      announceNextLevel(tournament.current_level, nextLevel, currentTime);
      setTenSecondAnnouncement(true);
    }
    
    if (currentTime > 120) setTwoMinuteWarning(false);
    if (currentTime > 10) {
      setFiveSecondWarning(false);
      setTenSecondAnnouncement(false);
    }
  }, [currentTime, twoMinuteWarning, fiveSecondWarning, tenSecondAnnouncement, voiceAnnouncementsEnabled, announceNextLevel, blindLevels, tournament.current_level]);

  // Statistics
  const statisticsData = useMemo(() => {
    const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAdditionalSets = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    const totalEntries = registrations.length + totalReentries;
    
    // Prize pool calculation
    const participationFee = tournament.participation_fee || 0;
    const reentryFee = tournament.reentry_fee || 0;
    const additionalFee = tournament.additional_fee || 0;
    const prizePool = (registrations.length * participationFee) + 
                      (totalReentries * reentryFee) + 
                      (totalAdditionalSets * additionalFee);
    
    const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
    const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

    return {
      activePlayers,
      totalReentries,
      totalAdditionalSets,
      totalEntries,
      prizePool,
      averageStack,
      totalChips
    };
  }, [registrations, tournament]);

  // Current level info
  const currentLevel = useMemo(() => {
    return blindLevels.find(l => l.level === tournament.current_level);
  }, [blindLevels, tournament.current_level]);
  
  const isBreakLevel = currentLevel?.is_break || false;
  
  const timerProgress = useMemo(() => {
    const levelDuration = currentLevel?.duration ?? tournament.timer_duration ?? 900;
    return levelDuration > 0 ? ((levelDuration - currentTime) / levelDuration) * 100 : 0;
  }, [currentLevel?.duration, tournament.timer_duration, currentTime]);

  // Next level info
  const nextLevel = useMemo(() => {
    return blindLevels.find(l => l.level === tournament.current_level + 1);
  }, [blindLevels, tournament.current_level]);
  
  const isNextBreakLevel = nextLevel?.is_break || false;
  const nextSmallBlind = nextLevel?.small_blind || tournament.current_small_blind * 2;
  const nextBigBlind = nextLevel?.big_blind || tournament.current_big_blind * 2;
  const nextAnte = nextLevel?.ante ?? 0;

  const currentSmallBlind = currentLevel?.small_blind ?? tournament.current_small_blind ?? 0;
  const currentBigBlind = currentLevel?.big_blind ?? tournament.current_big_blind ?? 0;
  const currentAnte = currentLevel?.ante ?? 0;

  // Time to break
  const timeToBreakData = useMemo(() => {
    const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
    const levelsUntilBreak = nextBreakLevel ? nextBreakLevel.level - tournament.current_level : null;
    
    if (!nextBreakLevel || !levelsUntilBreak || blindLevels.length === 0) {
      return { timeToBreak: null, levelsUntilBreak: null };
    }
    
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntilBreak; i++) {
      const levelInfo = blindLevels.find(l => l.level === tournament.current_level + i);
      timeToBreak += levelInfo?.duration || 900;
    }
    
    return { timeToBreak, levelsUntilBreak };
  }, [blindLevels, tournament.current_level, currentTime]);

  return (
    <div className="fixed inset-0 bg-background text-foreground z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border bg-card">
        {/* Left - Club Logo and Name */}
        <div className="flex items-center space-x-3">
          <div className="relative w-16 h-16">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-primary" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-primary" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-primary" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-primary" />
            
            <div className="absolute inset-0 border border-border bg-card/80 backdrop-blur-sm flex items-center justify-center p-2">
              {clubLogo ? (
                <img src={clubLogo} alt={clubName} className="w-full h-full object-contain" />
              ) : (
                <Trophy className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-primary tracking-tight">
              {clubName}
            </span>
            <span className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
              POKER CLUB
            </span>
          </div>
        </div>

        {/* Center - Tournament Name */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
        </div>

        {/* Right - Controls */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button 
            variant="ghost"
            size="icon" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6 p-6 bg-gradient-to-b from-background to-card/50">
        {/* Current Level */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-card rounded-lg px-4 py-2 mb-4 border border-border">
            {isBreakLevel ? (
              <>
                <Coffee className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-medium">ПЕРЕРЫВ</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-lg font-medium">Уровень {tournament.current_level}</span>
              </>
            )}
          </div>
          
          {/* Timer Display */}
          <div className={`text-[10rem] md:text-[14rem] font-mono font-bold transition-all duration-300 leading-none ${
            currentTime <= 30 ? 'text-destructive animate-pulse' : 
            currentTime <= 60 ? 'text-destructive' : 
            currentTime <= 300 ? 'text-amber-500' : 
            'text-foreground'
          }`}>
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-80 max-w-full mt-4 relative overflow-hidden">
            <Progress value={timerProgress} className="h-3" />
          </div>

          {/* Timer Adjust Buttons */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => onTimerAdjust(-60)}>
              <Minus className="w-4 h-4 mr-1" />1 мин
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTimerAdjust(60)}>
              <Plus className="w-4 h-4 mr-1" />1 мин
            </Button>
          </div>
        </div>

        {/* Current and Next Blinds */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Current Blinds */}
          <div className="text-center p-6 border-2 border-primary rounded-lg bg-card">
            <p className="text-sm text-muted-foreground font-bold mb-2">ТЕКУЩИЙ УРОВЕНЬ</p>
            <div className={`grid gap-2 ${currentAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{isBreakLevel ? '—' : currentSmallBlind}</p>
                <p className="text-xs text-muted-foreground">SB</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{isBreakLevel ? '—' : currentBigBlind}</p>
                <p className="text-xs text-muted-foreground">BB</p>
              </div>
              {currentAnte > 0 && (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-amber-500">{isBreakLevel ? '—' : currentAnte}</p>
                  <p className="text-xs text-muted-foreground">АНТЕ</p>
                </div>
              )}
            </div>
          </div>

          {/* Next Blinds */}
          <div className="text-center p-6 border border-border rounded-lg bg-card/50">
            <p className="text-sm text-muted-foreground font-medium mb-2 flex items-center justify-center">
              <ChevronUp className="w-4 h-4 mr-1" />
              {isBreakLevel ? 'ПОСЛЕ ПЕРЕРЫВА' : (isNextBreakLevel ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ')}
            </p>
            {isNextBreakLevel ? (
              <div className="flex items-center justify-center py-2">
                <Coffee className="w-6 h-6 text-amber-500 mr-2" />
                <span className="text-xl font-medium">ПЕРЕРЫВ</span>
              </div>
            ) : (
              <div className={`grid gap-2 ${nextAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-1">
                  <p className="text-xl font-medium">{nextSmallBlind}</p>
                  <p className="text-xs text-muted-foreground">SB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-medium">{nextBigBlind}</p>
                  <p className="text-xs text-muted-foreground">BB</p>
                </div>
                {nextAnte > 0 && (
                  <div className="space-y-1">
                    <p className="text-xl font-medium text-amber-500">{nextAnte}</p>
                    <p className="text-xs text-muted-foreground">АНТЕ</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl w-full">
          <div className="text-center p-4 bg-card rounded-lg border border-border">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{statisticsData.activePlayers.length}</p>
            <p className="text-xs text-muted-foreground">Игроков</p>
          </div>
          <div className="text-center p-4 bg-card rounded-lg border border-border">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{statisticsData.totalEntries}</p>
            <p className="text-xs text-muted-foreground">Входов</p>
          </div>
          <div className="text-center p-4 bg-card rounded-lg border border-border">
            <Coins className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{statisticsData.prizePool.toLocaleString()}₽</p>
            <p className="text-xs text-muted-foreground">Призовой фонд</p>
          </div>
          <div className="text-center p-4 bg-card rounded-lg border border-border">
            <Clock className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{Math.round(statisticsData.averageStack / currentBigBlind)} BB</p>
            <p className="text-xs text-muted-foreground">Средний стек</p>
          </div>
          {timeToBreakData.levelsUntilBreak && (
            <div className="text-center p-4 bg-card rounded-lg border border-border">
              <Coffee className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{timeToBreakData.levelsUntilBreak}</p>
              <p className="text-xs text-muted-foreground">До перерыва</p>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex justify-center items-center space-x-4 max-w-2xl mx-auto">
          <Button 
            variant="outline" 
            size="lg"
            onClick={onPrevLevel}
            disabled={tournament.current_level <= 1}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Пред
          </Button>

          <Button 
            variant="outline" 
            size="lg"
            onClick={onResetTimer}
          >
            <RotateCcw className="w-5 h-5 mr-1" />
            Сброс
          </Button>

          <Button 
            size="lg"
            className={`min-w-[140px] ${timerActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
            onClick={onToggleTimer}
          >
            {timerActive ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Пауза
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Старт
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            size="lg"
            onClick={onNextLevel}
          >
            След
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
