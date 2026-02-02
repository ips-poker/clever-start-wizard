import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Users,
  UserX,
  Target,
  TrendingUp,
  Coins,
  Coffee,
  Zap,
  Maximize,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Trophy,
  ChevronRight,
  FastForward,
  Rewind,
  CheckCircle,
  Flame,
  BarChart3,
  Settings
} from "lucide-react";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { useTimerSounds } from "@/hooks/useTimerSounds";

interface Tournament {
  id: string;
  name: string;
  status: string;
  participation_fee: number;
  reentry_fee?: number;
  additional_fee?: number;
  starting_chips: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  max_players: number;
  players_per_table: number | null;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number | null;
}

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number;
  is_break: boolean;
}

interface ClubTournamentMainViewProps {
  tournament: Tournament;
  registrations: Registration[];
  blindLevels: BlindLevel[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onTimerAdjust: (seconds: number) => void;
  onStartTournament: () => void;
  onPauseTournament: () => void;
  onResumeTournament: () => void;
  onFinishTournament: () => void;
  onOpenFullscreen: () => void;
  clubName?: string;
}

export function ClubTournamentMainView({
  tournament,
  registrations,
  blindLevels,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onTimerAdjust,
  onStartTournament,
  onPauseTournament,
  onResumeTournament,
  onFinishTournament,
  onOpenFullscreen,
  clubName
}: ClubTournamentMainViewProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastAnnouncedTime, setLastAnnouncedTime] = useState<number | null>(null);

  const voiceAnnouncements = useVoiceAnnouncements({
    enabled: voiceEnabled,
    voice: 'Aria',
    volume: 0.8
  });

  const { playTimerAlert } = useTimerSounds({
    enabled: soundEnabled,
    selectedSound: 'beep',
    volume: 0.7
  });

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Statistics
  const stats = useMemo(() => {
    const activePlayers = registrations.filter(r => r.status === 'playing');
    const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
    const pendingPlayers = registrations.filter(r => r.status === 'registered');
    
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    
    const participationFee = tournament.participation_fee || 0;
    const reentryFee = tournament.reentry_fee || 0;
    const additionalFee = tournament.additional_fee || 0;
    
    const entries = registrations.length + totalReentries + totalAddons;
    const prizePool = entries * participationFee;
    const rpsPool = Math.floor(prizePool / 10);
    
    const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
    const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;
    const avgStackBB = tournament.current_big_blind > 0 ? Math.round(averageStack / tournament.current_big_blind) : 0;

    // Chip leader and short stack
    const sortedByChips = [...activePlayers].sort((a, b) => (b.chips || 0) - (a.chips || 0));
    const chipLeader = sortedByChips[0];
    const shortStack = sortedByChips[sortedByChips.length - 1];

    // Tables
    const playersPerTable = tournament.players_per_table || 9;
    const tablesNeeded = Math.ceil(activePlayers.length / playersPerTable);

    return {
      activePlayers: activePlayers.length,
      eliminatedPlayers: eliminatedPlayers.length,
      pendingPlayers: pendingPlayers.length,
      totalReentries,
      totalAddons,
      entries,
      prizePool,
      rpsPool,
      totalChips,
      averageStack,
      avgStackBB,
      chipLeader,
      shortStack,
      tablesNeeded,
      playersPerTable
    };
  }, [registrations, tournament]);

  // Current and next blind levels
  const currentBlind = useMemo(() => 
    blindLevels.find(bl => bl.level === tournament.current_level), 
    [blindLevels, tournament.current_level]
  );
  const nextBlind = useMemo(() => 
    blindLevels.find(bl => bl.level === tournament.current_level + 1), 
    [blindLevels, tournament.current_level]
  );

  const isBreak = currentBlind?.is_break || false;
  const isNextBreak = nextBlind?.is_break || false;

  const currentSmallBlind = currentBlind?.small_blind ?? tournament.current_small_blind;
  const currentBigBlind = currentBlind?.big_blind ?? tournament.current_big_blind;
  const currentAnte = currentBlind?.ante ?? 0;

  // Timer progress
  const timerDuration = currentBlind?.duration || tournament.timer_duration || 900;
  const timerProgress = timerDuration > 0 ? ((timerDuration - currentTime) / timerDuration) * 100 : 0;

  // Time warnings
  const isCritical = currentTime <= 30;
  const isLow = currentTime <= 60;
  const isWarning = currentTime <= 300;

  // Break info
  const breakInfo = useMemo(() => {
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

  // Sound and voice effects
  useEffect(() => {
    if (!timerActive) return;

    if (soundEnabled) {
      playTimerAlert(currentTime);
    }

    if (voiceEnabled && voiceAnnouncements) {
      if (currentTime === 300 && lastAnnouncedTime !== 300) {
        voiceAnnouncements.announceTimeWarning(300);
        setLastAnnouncedTime(300);
      } else if (currentTime === 60 && lastAnnouncedTime !== 60) {
        voiceAnnouncements.announceTimeWarning(60);
        setLastAnnouncedTime(60);
      } else if (currentTime === 10 && lastAnnouncedTime !== 10) {
        if (nextBlind) voiceAnnouncements.announceNextLevel(tournament.current_level, nextBlind, currentTime);
        setLastAnnouncedTime(10);
      }
    }

    if (currentTime > 300) setLastAnnouncedTime(null);
  }, [currentTime, timerActive, soundEnabled, voiceEnabled, lastAnnouncedTime, voiceAnnouncements, nextBlind, tournament.current_level, playTimerAlert]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Tournament Header */}
      <motion.div variants={itemVariants} className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 blur-2xl opacity-50" />
        <Card className="bg-card border-2 border-border relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  animate={timerActive ? { 
                    boxShadow: ['0 0 20px hsl(var(--primary) / 0.5)', '0 0 40px hsl(var(--primary) / 0.8)', '0 0 20px hsl(var(--primary) / 0.5)']
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-4 bg-primary/20 rounded-xl border-2 border-primary/50"
                >
                  <Trophy className="w-10 h-10 text-primary" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-black text-foreground tracking-tight">{tournament.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`text-sm px-3 py-1 font-bold ${
                      tournament.status === 'running' 
                        ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50' 
                        : tournament.status === 'paused' 
                          ? 'bg-primary/20 text-primary border-2 border-primary/50' 
                          : 'bg-secondary text-muted-foreground border-2 border-border'
                    }`}>
                      {tournament.status === 'running' && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />}
                      {tournament.status === 'running' ? 'В ИГРЕ' : 
                       tournament.status === 'paused' ? '⏸ ПАУЗА' : 
                       tournament.status === 'completed' ? 'ЗАВЕРШЁН' :
                       'ОЖИДАНИЕ'}
                    </Badge>
                    {clubName && <span className="text-sm text-muted-foreground">{clubName}</span>}
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-4">
                {stats.pendingPlayers > 0 && (
                  <div className="text-center px-5 py-3 bg-yellow-500/10 rounded-xl border-2 border-yellow-500/50">
                    <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider">Ожидают</p>
                    <p className="text-3xl font-black text-yellow-500">{stats.pendingPlayers}</p>
                  </div>
                )}
                <div className="text-center px-5 py-3 bg-green-500/10 rounded-xl border-2 border-green-500/50">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Активных</p>
                  <p className="text-3xl font-black text-green-500">{stats.activePlayers}</p>
                </div>
                <div className="text-center px-5 py-3 bg-primary/10 rounded-xl border-2 border-primary/50">
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">RPS пул</p>
                  <p className="text-3xl font-black text-primary">{stats.rpsPool.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timer and Blinds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer Card */}
        <motion.div variants={itemVariants}>
          <Card className={`bg-card border-2 overflow-hidden relative ${isLow ? 'border-destructive/50' : 'border-border'}`}>
            <AnimatePresence>
              {isLow && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="absolute inset-0 bg-destructive/20 pointer-events-none"
                />
              )}
            </AnimatePresence>
            
            <CardHeader className="bg-secondary/80 border-b-2 border-border pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl transition-all duration-300 ${
                    isCritical ? 'bg-destructive/30 border-2 border-destructive/50' : 
                    isWarning ? 'bg-primary/30 border-2 border-primary/50' : 
                    'bg-green-500/20 border-2 border-green-500/50'
                  }`}>
                    {isBreak ? <Coffee className="w-6 h-6 text-amber-500" /> : <Clock className="w-6 h-6 text-primary" />}
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">
                      {isBreak ? 'ПЕРЕРЫВ' : `Уровень ${tournament.current_level}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setVoiceEnabled(!voiceEnabled)} title="Голос">
                    {voiceEnabled ? <Mic className="w-5 h-5 text-primary" /> : <MicOff className="w-5 h-5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} title="Звук">
                    {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={onOpenFullscreen} title="Полноэкранный режим">
                    <Maximize className="w-5 h-5" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 p-6">
              {/* Current Blinds */}
              {!isBreak && (
                <div className={`grid gap-4 ${currentAnte > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <motion.div 
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="text-center p-4 border-2 border-border rounded-xl bg-secondary/60"
                  >
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-2">SB</p>
                    <p className="text-3xl font-black text-foreground">{currentSmallBlind.toLocaleString()}</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="text-center p-4 border-2 border-border rounded-xl bg-secondary/60"
                  >
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-2">BB</p>
                    <p className="text-3xl font-black text-foreground">{currentBigBlind.toLocaleString()}</p>
                  </motion.div>
                  {currentAnte > 0 && (
                    <motion.div 
                      whileHover={{ scale: 1.03, y: -2 }}
                      className="text-center p-4 border-2 border-primary/50 rounded-xl bg-primary/10"
                    >
                      <p className="text-xs text-primary font-bold uppercase mb-2">АНТЕ</p>
                      <p className="text-3xl font-black text-primary">{currentAnte.toLocaleString()}</p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Big Timer Display */}
              <div className="text-center relative py-4">
                <motion.div 
                  key={currentTime}
                  initial={{ scale: 1.02 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                  className={`text-8xl font-mono font-black tracking-tighter transition-all ${
                    isCritical ? 'text-destructive animate-pulse' : 
                    isLow ? 'text-destructive' : 
                    isWarning ? 'text-primary' : 
                    'text-foreground'
                  }`}
                  style={{
                    textShadow: isCritical 
                      ? '0 0 40px hsl(var(--destructive) / 0.8), 0 0 80px hsl(var(--destructive) / 0.4)' 
                      : isWarning 
                        ? '0 0 40px hsl(var(--primary) / 0.6), 0 0 80px hsl(var(--primary) / 0.3)'
                        : 'none'
                  }}
                >
                  {formatTime(currentTime)}
                </motion.div>
                
                {/* Progress bar */}
                <div className="mt-6 relative">
                  <div className="h-4 bg-secondary rounded-lg overflow-hidden border-2 border-border">
                    <motion.div 
                      className={`h-full rounded-md ${
                        timerProgress > 80 ? 'bg-gradient-to-r from-destructive to-red-400' :
                        timerProgress > 60 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                        'bg-gradient-to-r from-green-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.max(0, 100 - timerProgress)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="grid grid-cols-8 gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onPrevLevel} 
                    className="h-12 w-full border-2"
                    title="Предыдущий уровень"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => onTimerAdjust(-60)}
                    className="h-12 w-full border-2"
                    title="-1 минута"
                  >
                    <Rewind className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="col-span-2">
                  <Button
                    onClick={onToggleTimer}
                    className={`h-12 w-full text-lg font-bold ${
                      timerActive 
                        ? 'bg-destructive hover:bg-destructive/90' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {timerActive ? (
                      <><Pause className="w-5 h-5 mr-2" /> ПАУЗА</>
                    ) : (
                      <><Play className="w-5 h-5 mr-2" /> СТАРТ</>
                    )}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="col-span-2">
                  <Button 
                    variant="outline" 
                    onClick={onResetTimer}
                    className="h-12 w-full border-2"
                    title="Сбросить таймер"
                  >
                    <RotateCcw className="w-5 h-5 mr-1" /> Сброс
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => onTimerAdjust(60)}
                    className="h-12 w-full border-2"
                    title="+1 минута"
                  >
                    <FastForward className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onNextLevel} 
                    className="h-12 w-full border-2"
                    title="Следующий уровень"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Level and Tournament Controls */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Next Level Card */}
          <Card className="bg-card border-2 border-border overflow-hidden">
            <CardHeader className="bg-secondary/60 border-b-2 border-border pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-black">
                <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                  <ChevronRight className="w-5 h-5 text-accent" />
                </div>
                {isNextBreak ? 'Следующий: Перерыв' : `Уровень ${tournament.current_level + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isNextBreak ? (
                <div className="text-center p-8 bg-amber-500/10 rounded-xl border-2 border-amber-500/30">
                  <Coffee className="w-16 h-16 text-amber-500 mx-auto" />
                  <p className="text-2xl font-black text-amber-500 mt-4">ПЕРЕРЫВ</p>
                  <p className="text-lg text-muted-foreground mt-1">
                    {nextBlind ? Math.floor(nextBlind.duration / 60) : 15} минут
                  </p>
                </div>
              ) : nextBlind ? (
                <div className={`grid gap-4 ${nextBlind.ante ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="text-center p-4 border-2 border-border rounded-xl bg-secondary/40">
                    <p className="text-xs text-muted-foreground font-bold uppercase">SB</p>
                    <p className="text-3xl font-black text-foreground mt-1">{nextBlind.small_blind.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-4 border-2 border-border rounded-xl bg-secondary/40">
                    <p className="text-xs text-muted-foreground font-bold uppercase">BB</p>
                    <p className="text-3xl font-black text-foreground mt-1">{nextBlind.big_blind.toLocaleString()}</p>
                  </div>
                  {nextBlind.ante && nextBlind.ante > 0 && (
                    <div className="text-center p-4 border-2 border-primary/30 rounded-xl bg-primary/10">
                      <p className="text-xs text-primary font-bold uppercase">АНТЕ</p>
                      <p className="text-3xl font-black text-primary mt-1">{nextBlind.ante.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  Нет следующего уровня
                </div>
              )}
              
              {/* Time to break */}
              {breakInfo && !isBreak && (
                <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <Coffee className="w-5 h-5 text-amber-500" />
                      До перерыва
                    </span>
                    <span className="font-black text-foreground text-lg">
                      {formatTime(breakInfo.timeToBreak)} ({breakInfo.levelsUntil} ур.)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Controls */}
          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-primary" />
                Управление турниром
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament.status === 'scheduled' && (
                <Button className="w-full h-12" onClick={onStartTournament}>
                  <Play className="w-5 h-5 mr-2" />
                  Начать турнир
                </Button>
              )}
              {tournament.status === 'running' && (
                <Button variant="outline" className="w-full h-12" onClick={onPauseTournament}>
                  <Pause className="w-5 h-5 mr-2" />
                  Приостановить
                </Button>
              )}
              {tournament.status === 'paused' && (
                <Button className="w-full h-12" onClick={onResumeTournament}>
                  <Play className="w-5 h-5 mr-2" />
                  Возобновить
                </Button>
              )}
              {(tournament.status === 'running' || tournament.status === 'paused') && (
                <Button variant="destructive" className="w-full h-12" onClick={onFinishTournament}>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Завершить турнир
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Statistics Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-black">{stats.activePlayers}</p>
              <p className="text-xs text-muted-foreground">Активных</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <UserX className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-3xl font-black">{stats.eliminatedPlayers}</p>
              <p className="text-xs text-muted-foreground">Выбыло</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-black">{(stats.averageStack / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground">Сред. стек ({stats.avgStackBB} BB)</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <Coins className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-black">{stats.prizePool.toLocaleString()}₽</p>
              <p className="text-xs text-muted-foreground">Призовой фонд</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-black">{stats.tablesNeeded}</p>
              <p className="text-xs text-muted-foreground">Столов</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-3xl font-black">{stats.entries}</p>
              <p className="text-xs text-muted-foreground">Всего входов</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Chip Leaders */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chip Leader */}
          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Чиплидер
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.chipLeader ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{stats.chipLeader.player.name}</p>
                    <p className="text-sm text-muted-foreground">{stats.chipLeader.player.elo_rating} ELO</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">
                      {((stats.chipLeader.chips || 0) / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stats.chipLeader.chips || 0) / (tournament.current_big_blind || 1))} BB
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </CardContent>
          </Card>

          {/* Short Stack */}
          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                Короткий стек
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.shortStack && stats.shortStack !== stats.chipLeader ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{stats.shortStack.player.name}</p>
                    <p className="text-sm text-muted-foreground">{stats.shortStack.player.elo_rating} ELO</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-500">
                      {((stats.shortStack.chips || 0) / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stats.shortStack.chips || 0) / (tournament.current_big_blind || 1))} BB
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
