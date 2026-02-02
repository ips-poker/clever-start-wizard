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
  Settings,
  Plus,
  Minus,
  ExternalLink
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
    const prizePool = (registrations.length * participationFee) + 
                     (totalReentries * reentryFee) + 
                     (totalAddons * additionalFee);
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

  return (
    <div className="space-y-6">
      {/* Main Timer Panel - Professional Design */}
      <Card className={`bg-card border-2 overflow-hidden relative ${isCritical ? 'border-destructive' : isLow ? 'border-destructive/50' : 'border-border'}`}>
        <AnimatePresence>
          {isCritical && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute inset-0 bg-destructive/10 pointer-events-none"
            />
          )}
        </AnimatePresence>
        
        <CardHeader className="bg-secondary/50 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                isBreak ? 'bg-amber-500/20 border border-amber-500/50' :
                isCritical ? 'bg-destructive/20 border border-destructive/50' : 
                isWarning ? 'bg-primary/20 border border-primary/50' : 
                'bg-green-500/20 border border-green-500/50'
              }`}>
                {isBreak ? <Coffee className="w-6 h-6 text-amber-500" /> : <Clock className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  {isBreak ? 'ПЕРЕРЫВ' : `Уровень ${tournament.current_level}`}
                </CardTitle>
                {!isBreak && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono">
                      {currentSmallBlind.toLocaleString()}/{currentBigBlind.toLocaleString()}
                    </Badge>
                    {currentAnte > 0 && (
                      <Badge variant="secondary" className="font-mono">
                        Анте: {currentAnte.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sound and Fullscreen Controls */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setVoiceEnabled(!voiceEnabled)} 
                title="Голосовые объявления"
              >
                {voiceEnabled ? <Mic className="w-5 h-5 text-primary" /> : <MicOff className="w-5 h-5 text-muted-foreground" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                title="Звуковые эффекты"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onOpenFullscreen} 
                title="Полноэкранный режим"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Large Timer Display */}
          <div className="text-center">
            <motion.div 
              key={currentTime}
              initial={{ scale: 1.02 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              className={`text-7xl md:text-8xl font-mono font-black tracking-tight ${
                isCritical ? 'text-destructive animate-pulse' : 
                isLow ? 'text-destructive' : 
                isWarning ? 'text-primary' : 
                'text-foreground'
              }`}
              style={{
                textShadow: isCritical 
                  ? '0 0 30px hsl(var(--destructive) / 0.6)' 
                  : isWarning 
                    ? '0 0 20px hsl(var(--primary) / 0.4)'
                    : 'none'
              }}
            >
              {formatTime(currentTime)}
            </motion.div>
            
            {/* Progress Bar */}
            <div className="mt-4 relative">
              <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border">
                <motion.div 
                  className={`h-full rounded-full transition-colors ${
                    timerProgress > 80 ? 'bg-destructive' :
                    timerProgress > 60 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(0, 100 - timerProgress)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Time Adjustment */}
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTimerAdjust(-60)}
                className="h-9 px-3"
                title="-1 минута"
              >
                <Minus className="w-4 h-4 mr-1" />1м
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTimerAdjust(60)}
                className="h-9 px-3"
                title="+1 минута"
              >
                <Plus className="w-4 h-4 mr-1" />1м
              </Button>
            </div>
            
            {/* Main Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevLevel}
                disabled={tournament.current_level <= 1}
                className="h-12 w-12"
                title="Предыдущий уровень"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                size="lg"
                onClick={onToggleTimer}
                className={`h-14 w-32 ${
                  timerActive 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white font-bold text-lg`}
              >
                {timerActive ? (
                  <>
                    <Pause className="w-6 h-6 mr-2" />
                    СТОП
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    СТАРТ
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={onNextLevel}
                disabled={!nextBlind}
                className="h-12 w-12"
                title="Следующий уровень"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetTimer}
              className="h-9"
              title="Сбросить таймер"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Сброс
            </Button>
          </div>

          {/* Next Level Preview */}
          {nextBlind && (
            <div className={`p-4 rounded-xl border ${isNextBreak ? 'bg-amber-500/10 border-amber-500/30' : 'bg-secondary/50 border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Следующий:
                  </span>
                  {isNextBreak ? (
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-amber-500">Перерыв ({Math.floor(nextBlind.duration / 60)} мин)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        Уровень {nextBlind.level}
                      </Badge>
                      <span className="font-mono font-medium">
                        {nextBlind.small_blind.toLocaleString()}/{nextBlind.big_blind.toLocaleString()}
                      </span>
                      {nextBlind.ante && nextBlind.ante > 0 && (
                        <span className="text-muted-foreground text-sm">(анте {nextBlind.ante})</span>
                      )}
                    </div>
                  )}
                </div>
                {breakInfo && !isBreak && (
                  <span className="text-xs text-muted-foreground">
                    До перерыва: {breakInfo.levelsUntil} ур.
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament Status Actions */}
      {tournament.status !== 'completed' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge className={`text-sm px-3 py-1 ${
                  tournament.status === 'running' 
                    ? 'bg-green-500/20 text-green-500 border border-green-500/50' 
                    : tournament.status === 'paused' 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' 
                      : 'bg-secondary text-muted-foreground'
                }`}>
                  {tournament.status === 'running' && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />}
                  {tournament.status === 'running' ? 'В ИГРЕ' : 
                   tournament.status === 'paused' ? 'ПАУЗА' : 
                   'ОЖИДАНИЕ'}
                </Badge>
                {clubName && <span className="text-sm text-muted-foreground">• {clubName}</span>}
              </div>
              
              <div className="flex items-center gap-2">
                {tournament.status === 'scheduled' || tournament.status === 'registration' ? (
                  <Button onClick={onStartTournament} className="bg-green-500 hover:bg-green-600 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Начать турнир
                  </Button>
                ) : tournament.status === 'running' ? (
                  <>
                    <Button variant="outline" onClick={onPauseTournament}>
                      <Pause className="w-4 h-4 mr-2" />
                      Пауза
                    </Button>
                    <Button variant="destructive" onClick={onFinishTournament}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Завершить
                    </Button>
                  </>
                ) : tournament.status === 'paused' ? (
                  <>
                    <Button onClick={onResumeTournament} className="bg-green-500 hover:bg-green-600 text-white">
                      <Play className="w-4 h-4 mr-2" />
                      Продолжить
                    </Button>
                    <Button variant="destructive" onClick={onFinishTournament}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Завершить
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold text-foreground">{stats.activePlayers}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Активных</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <UserX className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold text-foreground">{stats.eliminatedPlayers}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Выбыло</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Coins className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold text-foreground">{stats.prizePool.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Призовой фонд</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold text-primary">{stats.rpsPool.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">RPS пул</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stack Info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Статистика стеков
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Средний стек</span>
              <div className="text-right">
                <span className="font-bold">{stats.averageStack.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-2">({stats.avgStackBB} BB)</span>
              </div>
            </div>
            
            {stats.chipLeader && (
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Чип-лидер</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{stats.chipLeader.player.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({(stats.chipLeader.chips || 0).toLocaleString()})</span>
                </div>
              </div>
            )}
            
            {stats.shortStack && stats.activePlayers > 1 && (
              <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-destructive" />
                  <span className="text-sm">Short stack</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{stats.shortStack.player.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({(stats.shortStack.chips || 0).toLocaleString()})</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entry Info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Входы и регистрация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Всего входов</span>
              <span className="font-bold">{stats.entries}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Re-entry</span>
              <span className="font-medium">{stats.totalReentries}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Add-on</span>
              <span className="font-medium">{stats.totalAddons}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Столов</span>
              <span className="font-bold">{stats.tablesNeeded}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blind Structure Preview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Структура блайндов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
            {blindLevels.slice(0, 12).map((level) => (
              <div
                key={level.id}
                className={`p-2 rounded-lg border text-center ${
                  level.level === tournament.current_level
                    ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                    : level.level < tournament.current_level
                      ? 'bg-muted/30 border-border/50 opacity-60'
                      : level.is_break
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-secondary/50 border-border'
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {level.is_break ? <Coffee className="w-3 h-3 mx-auto" /> : `Ур. ${level.level}`}
                </div>
                <div className="font-mono text-xs font-medium">
                  {level.is_break 
                    ? `${Math.floor(level.duration / 60)}м` 
                    : `${level.small_blind}/${level.big_blind}`
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
