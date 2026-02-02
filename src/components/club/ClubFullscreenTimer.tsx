import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  Minus,
  Target,
  Zap,
  Flame,
  Mic,
  MicOff
} from "lucide-react";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { GlitchText } from "@/components/ui/glitch-text";
import { AnimatedCounter } from "@/components/timer/AnimatedCounter";
import { BreakParticles } from "@/components/timer/BreakParticles";

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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastAnnouncedTime, setLastAnnouncedTime] = useState<number | null>(null);

  const voiceAnnouncements = useVoiceAnnouncements({
    enabled: voiceEnabled,
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

  // Sound and voice warnings
  useEffect(() => {
    if (!timerActive) return;

    if (currentTime === 120) playBeep(800, 1);
    if (currentTime === 30) {
      playBeep(1200, 0.2);
      setTimeout(() => playBeep(1200, 0.2), 300);
      setTimeout(() => playBeep(1200, 0.2), 600);
    }

    // Voice announcements
    if (voiceEnabled && voiceAnnouncements) {
      if (currentTime === 300 && lastAnnouncedTime !== 300) {
        voiceAnnouncements.announceTimeWarning(300);
        setLastAnnouncedTime(300);
      } else if (currentTime === 60 && lastAnnouncedTime !== 60) {
        voiceAnnouncements.announceTimeWarning(60);
        setLastAnnouncedTime(60);
      } else if (currentTime === 10 && lastAnnouncedTime !== 10) {
        const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
        if (nextLevel) voiceAnnouncements.announceNextLevel(tournament.current_level, nextLevel, currentTime);
        setLastAnnouncedTime(10);
      }
    }

    if (currentTime > 300) setLastAnnouncedTime(null);
  }, [currentTime, timerActive, soundEnabled, voiceEnabled, lastAnnouncedTime, voiceAnnouncements, blindLevels, tournament.current_level]);

  // Statistics
  const stats = useMemo(() => {
    const playingPlayers = registrations.filter(r => r.status === 'playing');
    const allActivePlayers = registrations.filter(r => r.status === 'playing' || r.status === 'registered');
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    
    const participationFee = tournament.participation_fee || 0;
    const reentryFee = tournament.reentry_fee || 0;
    const additionalFee = tournament.additional_fee || 0;
    const rpsPool = Math.floor((registrations.length * participationFee + totalReentries * reentryFee + totalAddons * additionalFee) / 10);
    
    const totalChips = playingPlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
    const averageStack = playingPlayers.length > 0 ? Math.round(totalChips / playingPlayers.length) : 0;
    const avgStackBB = tournament.current_big_blind > 0 ? Math.round(averageStack / tournament.current_big_blind) : 0;

    return { 
      total: allActivePlayers.length, 
      playing: playingPlayers.length, 
      totalReentries, 
      totalAddons, 
      rpsPool, 
      avgStackBB, 
      averageStack, 
      totalChips 
    };
  }, [registrations, tournament]);

  // Current and next level
  const currentLevel = useMemo(() => blindLevels.find(l => l.level === tournament.current_level), [blindLevels, tournament.current_level]);
  const nextLevel = useMemo(() => blindLevels.find(l => l.level === tournament.current_level + 1), [blindLevels, tournament.current_level]);

  const isBreak = currentLevel?.is_break || false;
  const isNextBreak = nextLevel?.is_break || false;
  
  const timerProgress = useMemo(() => {
    const duration = currentLevel?.duration || tournament.timer_duration || 900;
    return duration > 0 ? ((duration - currentTime) / duration) * 100 : 0;
  }, [currentLevel, tournament.timer_duration, currentTime]);

  // Time warnings
  const isCritical = currentTime <= 30;
  const isLow = currentTime <= 60;
  const isWarning = currentTime <= 300;

  // Next break info
  const nextBreakInfo = useMemo(() => {
    const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
    if (!nextBreakLevel) return null;
    const levelsUntil = nextBreakLevel.level - tournament.current_level;
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntil; i++) {
      const level = blindLevels.find(l => l.level === tournament.current_level + i);
      timeToBreak += level?.duration || 900;
    }
    return { levelsUntil, timeToBreak };
  }, [blindLevels, tournament.current_level, currentTime]);

  const currentSmallBlind = currentLevel?.small_blind ?? tournament.current_small_blind;
  const currentBigBlind = currentLevel?.big_blind ?? tournament.current_big_blind;
  const currentAnte = currentLevel?.ante ?? 0;
  const nextSmallBlind = nextLevel?.small_blind || currentSmallBlind * 2;
  const nextBigBlind = nextLevel?.big_blind || currentBigBlind * 2;
  const nextAnte = nextLevel?.ante ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground overflow-hidden flex flex-col">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow */}
      <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] transition-colors duration-1000 ${
        isBreak ? 'bg-amber-500/15' : 'bg-primary/10'
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${
        isBreak ? 'bg-amber-600/15' : 'bg-accent/10'
      }`} />

      {/* Break Particles */}
      {isBreak && <BreakParticles />}

      {/* Scanlines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)' }}
      />

      {/* Header */}
      <div 
        className="flex justify-between items-center p-6 border-b-2 border-border bg-card/80 relative z-10"
        style={{ boxShadow: 'inset 0 -2px 10px rgba(0,0,0,0.5), 0 0 30px rgba(255,106,0,0.1)' }}
      >
        {/* Left - Logo and Club Name */}
        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20">
            <div className="absolute -top-1 -left-1 w-5 h-5 border-l-2 border-t-2 border-primary animate-pulse" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-r-2 border-t-2 border-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-l-2 border-b-2 border-primary animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-r-2 border-b-2 border-primary animate-pulse" style={{ animationDelay: '1.5s' }} />

            <div className="absolute inset-0 border border-border bg-card/50 backdrop-blur-sm flex items-center justify-center p-2">
              {clubLogo ? (
                <img src={clubLogo} alt={clubName} className="w-full h-full object-contain" />
              ) : (
                <Trophy className="w-10 h-10 text-primary" />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-display tracking-wider text-primary"
              style={{ textShadow: '0 0 20px hsla(var(--primary) / 0.8), 0 0 40px hsla(var(--primary) / 0.4)' }}>
              <GlitchText text={clubName.toUpperCase()} glitchIntensity="medium" />
            </span>
            <span className="text-sm font-sans font-bold tracking-[0.3em] uppercase text-muted-foreground">
              POKER CLUB
            </span>
          </div>
        </div>

        {/* Center - Tournament Name */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-3xl font-display tracking-wide mb-2 text-foreground"
            style={{ textShadow: '0 0 30px rgba(255,106,0,0.3)' }}>
            {tournament.name}
          </h1>
          {nextBreakInfo && (
            <p className="text-sm text-muted-foreground">
              До перерыва: {nextBreakInfo.levelsUntil} уровней (~{Math.floor(nextBreakInfo.timeToBreak / 60)} мин)
            </p>
          )}
        </div>

        {/* Right - Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="text-muted-foreground hover:text-foreground"
            title={voiceEnabled ? "Голос включен" : "Голос выключен"}
          >
            {voiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-muted-foreground hover:text-foreground"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button 
            variant="ghost"
            size="icon" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8 relative z-10">
        {/* Current Level Badge */}
        <div className="text-center">
          <div 
            className={`inline-flex items-center gap-3 rounded-lg px-6 py-3 mb-6 border-2 ${
              isBreak ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-card/80'
            }`}
            style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,106,0,0.15)' }}
          >
            {isBreak ? (
              <>
                <Coffee className="w-7 h-7 text-amber-500" />
                <span className="text-2xl font-display tracking-wider text-amber-500">ПЕРЕРЫВ</span>
              </>
            ) : (
              <>
                <Clock className="w-7 h-7 text-primary" />
                <span className="text-2xl font-display tracking-wider text-foreground">
                  УРОВЕНЬ {tournament.current_level}
                </span>
              </>
            )}
          </div>
          
          {/* Timer Display */}
          <div 
            className={`text-[12rem] md:text-[16rem] font-mono font-bold leading-none tracking-tight transition-all duration-300 ${
              isCritical ? 'text-destructive' :
              isLow ? 'text-destructive' :
              isWarning ? 'text-primary' :
              'text-foreground'
            }`}
            style={{
              textShadow: isCritical 
                ? '0 0 80px hsl(var(--destructive)), 0 0 150px hsl(var(--destructive) / 0.6)'
                : isLow 
                  ? '0 0 60px hsl(var(--destructive) / 0.8)'
                  : isWarning
                    ? '0 0 60px hsl(var(--primary) / 0.6)'
                    : '0 0 40px rgba(255,106,0,0.2)',
              animation: isCritical ? 'pulse 0.5s ease-in-out infinite' : isLow ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          >
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-[500px] max-w-full mt-8">
            <div 
              className="h-5 rounded overflow-hidden border-2 border-border bg-card relative"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}
            >
              <div
                className={`h-full transition-all duration-1000 relative overflow-hidden ${
                  timerProgress > 80 ? 'bg-gradient-to-r from-destructive to-red-600' :
                  timerProgress > 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  'bg-gradient-to-r from-primary to-accent'
                }`}
                style={{ 
                  width: `${timerProgress}%`,
                  boxShadow: '0 0 20px hsl(var(--primary) / 0.6)'
                }}
              >
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: 'shimmer 2s linear infinite'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Blinds Display */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Current Blinds */}
          <div 
            className={`text-center p-8 rounded-lg border-2 transition-all duration-300 ${
              isBreak ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-600/5' 
                     : 'border-primary bg-gradient-to-br from-primary/10 to-primary/5'
            }`}
            style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3), 0 0 30px rgba(255,106,0,0.1)' }}
          >
            <p className="text-sm font-bold text-muted-foreground mb-3 tracking-wider">ТЕКУЩИЕ БЛАЙНДЫ</p>
            {isBreak ? (
              <div className="flex items-center justify-center py-4">
                <Coffee className="w-12 h-12 text-amber-500 mr-3" />
                <span className="text-3xl font-display text-amber-500">ПЕРЕРЫВ</span>
              </div>
            ) : (
              <div className={`grid gap-4 ${currentAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{currentSmallBlind}</p>
                  <p className="text-xs text-muted-foreground">SB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{currentBigBlind}</p>
                  <p className="text-xs text-muted-foreground">BB</p>
                </div>
                {currentAnte > 0 && (
                  <div className="space-y-1">
                    <p className="text-4xl font-bold text-primary">{currentAnte}</p>
                    <p className="text-xs text-muted-foreground">АНТЕ</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Level */}
          <div 
            className="text-center p-8 rounded-lg border border-border bg-card/50"
            style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}
          >
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-center tracking-wider">
              <ChevronUp className="w-4 h-4 mr-1" />
              {isNextBreak ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ'}
            </p>
            {isNextBreak ? (
              <div className="flex items-center justify-center py-4">
                <Coffee className="w-8 h-8 text-amber-500 mr-2" />
                <span className="text-2xl font-medium text-amber-500">ПЕРЕРЫВ</span>
              </div>
            ) : nextLevel ? (
              <div className={`grid gap-4 ${nextAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-1">
                  <p className="text-2xl font-medium text-muted-foreground">{nextSmallBlind}</p>
                  <p className="text-xs text-muted-foreground">SB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-medium text-muted-foreground">{nextBigBlind}</p>
                  <p className="text-xs text-muted-foreground">BB</p>
                </div>
                {nextAnte > 0 && (
                  <div className="space-y-1">
                    <p className="text-2xl font-medium text-primary/70">{nextAnte}</p>
                    <p className="text-xs text-muted-foreground">АНТЕ</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xl text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-6 max-w-5xl w-full">
          <div className="text-center p-4 rounded-lg border border-border bg-card/50">
            <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold text-green-500">
              <AnimatedCounter value={stats.playing} />
            </p>
            <p className="text-xs text-muted-foreground">В ИГРЕ</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-border bg-card/50">
            <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={stats.avgStackBB} suffix=" BB" />
            </p>
            <p className="text-xs text-muted-foreground">СРЕДНИЙ СТЕК</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-border bg-card/50">
            <Coins className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold neon-orange">
              <AnimatedCounter value={stats.rpsPool} />
            </p>
            <p className="text-xs text-muted-foreground">RPS ПУЛ</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-border bg-card/50">
            <Zap className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={stats.totalReentries} />
            </p>
            <p className="text-xs text-muted-foreground">RE-ENTRY</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-border bg-card/50">
            <Flame className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={stats.totalAddons} />
            </p>
            <p className="text-xs text-muted-foreground">ADD-ON</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div 
        className="p-6 border-t-2 border-border bg-card/90 backdrop-blur-sm relative z-10"
        style={{ boxShadow: '0 -10px 30px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
          {/* Timer Adjust */}
          <div className="flex items-center gap-2 mr-4">
            <Button variant="outline" size="sm" onClick={() => onTimerAdjust(-60)} className="border-destructive/50 hover:bg-destructive/10">
              <Minus className="w-4 h-4 mr-1" />1 мин
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTimerAdjust(60)} className="border-green-500/50 hover:bg-green-500/10">
              <Plus className="w-4 h-4 mr-1" />1 мин
            </Button>
          </div>

          {/* Level Controls */}
          <Button variant="outline" size="lg" onClick={onPrevLevel} disabled={tournament.current_level <= 1}>
            <ChevronLeft className="w-5 h-5 mr-1" />Назад
          </Button>

          {/* Play/Pause */}
          <Button
            size="lg"
            onClick={onToggleTimer}
            className={`px-8 ${timerActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {timerActive ? <><Pause className="w-6 h-6 mr-2" />ПАУЗА</> : <><Play className="w-6 h-6 mr-2" />СТАРТ</>}
          </Button>

          <Button variant="outline" size="lg" onClick={onNextLevel}>
            Далее<ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          {/* Reset */}
          <Button variant="ghost" size="lg" onClick={onResetTimer} className="ml-4 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-5 h-5 mr-1" />Сброс
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
