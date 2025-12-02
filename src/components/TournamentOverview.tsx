import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Maximize, 
  StopCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Target, 
  BarChart3,
  Users,
  UserX,
  RotateCcw,
  Trophy,
  Clock,
  Play,
  Pause,
  Coffee,
  Zap,
  Flame,
  Award,
  Timer,
  Sparkles,
  Shield,
  Wifi,
  Database,
  Gauge
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlayerManagement from "./PlayerManagement";
import FullscreenTimer from "./FullscreenTimer";
import { useTimerSounds } from "@/hooks/useTimerSounds";

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
  max_players: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  tournament_format: string;
  addon_level: number;
  break_start_level: number;
  reentry_chips?: number;
  additional_chips?: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number;
  position?: number;
}

interface TournamentOverviewProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onStopTournament: () => void;
  onRefresh: () => void;
  onTimerAdjust?: (seconds: number) => void;
  onFinishTournament?: () => void;
  onOpenExternalTimer: () => void;
}

const TournamentOverview = ({
  tournament,
  players,
  registrations,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onStopTournament,
  onRefresh,
  onTimerAdjust,
  onFinishTournament,
  onOpenExternalTimer
}: TournamentOverviewProps) => {
  const [blindLevels, setBlindLevels] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState({
    activeTournaments: 0,
    totalPlayersInClub: 0,
    weeklyGames: 0,
    averageRating: 0
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('beep');
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false);
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const { playTimerAlert, stopSound, soundOptions } = useTimerSounds({
    enabled: soundEnabled,
    selectedSound: selectedSound,
    volume: 0.7
  });

  useEffect(() => {
    loadSystemStats();
    loadBlindLevels();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (tournament?.id) {
      loadBlindLevels();
    }
  }, [tournament?.id]);

  useEffect(() => {
    if (!tournament?.id) return;
    
    const channel = supabase
      .channel(`blinds_${tournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${tournament.id}`
      }, () => {
        loadBlindLevels();
      });
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id]);

  const loadBlindLevels = async () => {
    if (!tournament?.id || !isMountedRef.current) return;
    
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('level', { ascending: true });

    if (!error && data && isMountedRef.current) {
      setBlindLevels(data);
    }
  };

  const loadSystemStats = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .in('status', ['running', 'registration']);

      const { data: allPlayers } = await supabase
        .from('players')
        .select('elo_rating');

      const { data: weeklyResults } = await supabase
        .from('game_results')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const averageRating = allPlayers?.length ? 
        Math.round(allPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / allPlayers.length) : 0;

      if (isMountedRef.current) {
        setSystemStats({
          activeTournaments: activeTournaments?.length || 0,
          totalPlayersInClub: allPlayers?.length || 0,
          weeklyGames: weeklyResults?.length || 0,
          averageRating
        });
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openFullscreenTimer = () => {
    setShowFullscreenTimer(true);
  };

  const closeFullscreenTimer = () => {
    setShowFullscreenTimer(false);
  };

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
  
  const participationFee = (tournament as any).participation_fee || tournament.buy_in || 0;
  const reentryFee = (tournament as any).reentry_fee || tournament.rebuy_cost || 0;
  const additionalFee = (tournament as any).additional_fee || tournament.addon_cost || 0;
  
  const rpsPool = Math.floor(
    (registrations.length * participationFee + 
     totalReentries * reentryFee + 
     totalAdditionalSets * additionalFee) / 10
  );
  
  const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);

  const currentSmallBlind = currentBlindLevel?.small_blind ?? tournament.current_small_blind;
  const currentBigBlind = currentBlindLevel?.big_blind ?? tournament.current_big_blind;
  
  const nextBreakLevel = blindLevels.find(l => l.is_break && l.level > tournament.current_level);
  const levelsUntilBreak = nextBreakLevel ? nextBreakLevel.level - tournament.current_level : null;
  
  const calculateTimeToBreak = () => {
    if (!nextBreakLevel || !levelsUntilBreak) return null;
    
    let timeToBreak = currentTime;
    for (let i = 1; i < levelsUntilBreak; i++) {
      const levelInfo = blindLevels.find(l => l.level === tournament.current_level + i);
      timeToBreak += levelInfo?.duration || 1200;
    }
    return timeToBreak;
  };
  
  const timeToBreak = calculateTimeToBreak();
  const isCurrentBreak = currentBlindLevel?.is_break || false;
  
  const nextSmallBlind = nextBlindLevel ? nextBlindLevel.small_blind : Math.round(tournament.current_small_blind * 1.5);
  const nextBigBlind = nextBlindLevel ? nextBlindLevel.big_blind : Math.round(tournament.current_big_blind * 1.5);
  const isNextLevelBreak = nextBlindLevel?.is_break || false;

  const timerProgress = (((currentBlindLevel?.duration ?? tournament.timer_duration) - currentTime) / (currentBlindLevel?.duration ?? tournament.timer_duration)) * 100;

  const isLowTime = currentTime <= 60;
  const isCriticalTime = currentTime <= 30;
  const isWarningTime = currentTime <= 300;

  useEffect(() => {
    if (soundEnabled) {
      playTimerAlert(currentTime);
    }
  }, [currentTime, soundEnabled, playTimerAlert]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      {showFullscreenTimer && (
        <FullscreenTimer
          tournament={tournament}
          registrations={registrations}
          currentTime={currentTime}
          timerActive={timerActive}
          onToggleTimer={onToggleTimer}
          onResetTimer={onResetTimer}
          onNextLevel={onNextLevel}
          onPrevLevel={onPrevLevel}
          onStopTournament={onStopTournament}
          onClose={closeFullscreenTimer}
          onTimerAdjust={(seconds) => {
            onTimerAdjust?.(seconds);
          }}
          blindLevels={blindLevels}
        />
      )}
      
      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tournament Header with Neon Glow */}
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-accent/30 blur-2xl opacity-50" />
          <Card className="bg-card brutal-border relative overflow-hidden industrial-texture">
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
                         tournament.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-medium">
                        {tournament.tournament_format || 'Турнир'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center px-5 py-3 bg-secondary/80 rounded-xl border-2 border-border">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Игроков</p>
                    <p className="text-3xl font-black text-foreground">{activePlayers.length}</p>
                  </div>
                  <div className="text-center px-5 py-3 bg-primary/10 rounded-xl border-2 border-primary/50">
                    <p className="text-xs text-primary font-medium uppercase tracking-wider">RPS пул</p>
                    <p className="text-3xl font-black neon-orange">{rpsPool.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timer and Level Display - Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer Card */}
          <motion.div variants={itemVariants}>
            <Card className={`bg-card brutal-border overflow-hidden relative ${isLowTime ? 'border-destructive/50' : ''}`}>
              {/* Animated glow for critical time */}
              <AnimatePresence>
                {isLowTime && (
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
                      isCriticalTime ? 'bg-destructive/30 border-2 border-destructive/50' : 
                      isWarningTime ? 'bg-primary/30 border-2 border-primary/50' : 
                      'bg-green-500/20 border-2 border-green-500/50'
                    }`}>
                      <Timer className={`w-6 h-6 ${
                        isCriticalTime ? 'text-destructive' : 
                        isWarningTime ? 'text-primary' : 
                        'text-green-500'
                      }`} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-foreground">Уровень {tournament.current_level}</span>
                      {isCurrentBreak && (
                        <Badge className="ml-3 bg-primary/20 text-primary border border-primary/50">ПЕРЕРЫВ</Badge>
                      )}
                    </div>
                  </div>
                  {timerActive && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="flex items-center gap-2 text-green-500"
                    >
                      <Zap className="w-6 h-6" />
                      <span className="text-sm font-bold uppercase">Live</span>
                    </motion.div>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                {/* Big Timer Display */}
                <div className="text-center relative py-4">
                  <motion.div 
                    key={currentTime}
                    initial={{ scale: 1.02 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className={`text-8xl font-mono font-black tracking-tighter transition-all ${
                      isCriticalTime ? 'text-destructive animate-pulse' : 
                      isLowTime ? 'text-destructive' : 
                      isWarningTime ? 'text-primary' : 
                      'text-foreground'
                    }`}
                    style={{
                      textShadow: isCriticalTime 
                        ? '0 0 40px hsl(var(--destructive) / 0.8), 0 0 80px hsl(var(--destructive) / 0.4)' 
                        : isWarningTime 
                          ? '0 0 40px hsl(var(--primary) / 0.6), 0 0 80px hsl(var(--primary) / 0.3)'
                          : 'none'
                    }}
                  >
                    {formatTime(currentTime)}
                  </motion.div>
                  
                  {/* Progress bar */}
                  <div className="mt-6 relative">
                    <div className="h-5 bg-secondary rounded-lg overflow-hidden border-2 border-border">
                      <motion.div 
                        className={`h-full rounded-md ${
                          isCriticalTime ? 'bg-gradient-to-r from-destructive via-destructive to-red-400' :
                          isWarningTime ? 'bg-gradient-to-r from-primary via-primary to-orange-400' :
                          'bg-gradient-to-r from-green-500 via-green-400 to-emerald-400'
                        }`}
                        style={{ width: `${Math.max(0, 100 - timerProgress)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="absolute -top-1 left-0 right-0 flex justify-between text-xs text-muted-foreground">
                      <span></span>
                      <span className="bg-card px-2">{Math.round(100 - timerProgress)}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Current Blinds */}
                <div className={`grid gap-4 ${currentBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <motion.div 
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="text-center p-5 border-2 border-border rounded-xl bg-secondary/60 backdrop-blur"
                  >
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Малый блайнд</p>
                    <p className="text-4xl font-black text-foreground">{currentSmallBlind.toLocaleString()}</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="text-center p-5 border-2 border-border rounded-xl bg-secondary/60 backdrop-blur"
                  >
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Большой блайнд</p>
                    <p className="text-4xl font-black text-foreground">{currentBigBlind.toLocaleString()}</p>
                  </motion.div>
                  {currentBlindLevel?.ante > 0 && (
                    <motion.div 
                      whileHover={{ scale: 1.03, y: -2 }}
                      className="text-center p-5 border-2 border-primary/50 rounded-xl bg-primary/10"
                    >
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">Анте</p>
                      <p className="text-4xl font-black text-primary">{currentBlindLevel.ante.toLocaleString()}</p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Next Level Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card brutal-border overflow-hidden h-full">
              <CardHeader className="bg-secondary/60 border-b-2 border-border pb-4">
                <CardTitle className="flex items-center gap-3 text-xl font-black text-foreground">
                  <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                    <ChevronRight className="w-5 h-5 text-accent" />
                  </div>
                  {isNextLevelBreak ? 'Следующий: Перерыв' : `Уровень ${tournament.current_level + 1}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="text-center p-4 bg-secondary/40 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Через</p>
                  <p className="text-3xl font-black text-foreground">{formatTime(currentTime)}</p>
                </div>
                
                {isNextLevelBreak ? (
                  <motion.div 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-center p-8 bg-primary/10 rounded-xl border-2 border-primary/30"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Coffee className="w-16 h-16 text-primary mx-auto" />
                    </motion.div>
                    <p className="text-2xl font-black text-primary mt-4">ПЕРЕРЫВ</p>
                    <p className="text-lg text-muted-foreground mt-1">{nextBlindLevel ? Math.floor(nextBlindLevel.duration / 60) : 15} минут</p>
                  </motion.div>
                ) : (
                  <div className={`grid gap-4 ${nextBlindLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="text-center p-4 border-2 border-border rounded-xl bg-secondary/40">
                      <p className="text-xs text-muted-foreground font-bold uppercase">SB</p>
                      <p className="text-3xl font-black text-foreground mt-1">{Math.round(nextSmallBlind).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 border-2 border-border rounded-xl bg-secondary/40">
                      <p className="text-xs text-muted-foreground font-bold uppercase">BB</p>
                      <p className="text-3xl font-black text-foreground mt-1">{Math.round(nextBigBlind).toLocaleString()}</p>
                    </div>
                    {nextBlindLevel?.ante > 0 && (
                      <div className="text-center p-4 border-2 border-primary/30 rounded-xl bg-primary/10">
                        <p className="text-xs text-primary font-bold uppercase">Анте</p>
                        <p className="text-3xl font-black text-primary mt-1">{nextBlindLevel.ante.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Time to break */}
                {!isCurrentBreak && timeToBreak && (
                  <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <Coffee className="w-5 h-5 text-primary" />
                        До перерыва
                      </span>
                      <span className="font-black text-foreground text-lg">
                        {formatTime(timeToBreak)} <span className="text-muted-foreground text-sm">({levelsUntilBreak} ур.)</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Control Panel */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border overflow-hidden">
            <CardHeader className="bg-secondary/60 border-b-2 border-border pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                Управление таймером
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                {/* Play/Pause */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    onClick={onToggleTimer}
                    className={`h-16 w-full border-2 font-bold transition-all ${
                      timerActive 
                        ? 'bg-destructive/20 text-destructive border-destructive/50 hover:bg-destructive/30 hover:border-destructive' 
                        : 'bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30 hover:border-green-500'
                    }`}
                  >
                    {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                </motion.div>
                
                {/* Reset */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onResetTimer} 
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-primary/20 hover:text-primary hover:border-primary/50"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* -1 min */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => onTimerAdjust?.(-60)}
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-secondary"
                    title="-1 мин"
                  >
                    <Rewind className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* +1 min */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => onTimerAdjust?.(60)}
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-secondary"
                    title="+1 мин"
                  >
                    <FastForward className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* Prev Level */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onPrevLevel} 
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* Next Level */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onNextLevel} 
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* Sound Toggle */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`h-16 w-full border-2 ${
                      soundEnabled 
                        ? 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30' 
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                    }`}
                    title="Звук"
                  >
                    {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </Button>
                </motion.div>
                
                {/* Fullscreen */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onOpenExternalTimer} 
                    className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/50"
                  >
                    <Maximize className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* Stop */}
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={onStopTournament} 
                    className="h-16 w-full text-destructive border-2 border-destructive/50 hover:bg-destructive/20"
                  >
                    <StopCircle className="w-6 h-6" />
                  </Button>
                </motion.div>
                
                {/* Finish/Refresh */}
                {tournament.status === 'running' && onFinishTournament ? (
                  <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      onClick={onFinishTournament} 
                      className="h-16 w-full text-green-500 border-2 border-green-500/50 hover:bg-green-500/20"
                    >
                      <CheckCircle className="w-6 h-6" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      onClick={onRefresh} 
                      className="h-16 w-full border-2 border-border bg-secondary/50 hover:bg-secondary"
                    >
                      <Activity className="w-6 h-6" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Player Management */}
        <PlayerManagement 
          tournament={tournament}
          players={players}
          registrations={registrations}
          onRegistrationUpdate={onRefresh}
        />

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tournament Stats */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card brutal-border h-full">
              <CardHeader className="bg-secondary/60 border-b-2 border-border">
                <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                  <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  Статистика турнира
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-border rounded-xl bg-secondary/40"
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-black text-foreground">{registrations.length}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Всего игроков</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-green-500/30 rounded-xl bg-green-500/10"
                  >
                    <Activity className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-black text-green-500">{activePlayers.length}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Активных</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-destructive/30 rounded-xl bg-destructive/10"
                  >
                    <UserX className="w-6 h-6 mx-auto mb-2 text-destructive" />
                    <p className="text-2xl font-black text-destructive">{eliminatedPlayers.length}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Выбыло</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-blue-500/30 rounded-xl bg-blue-500/10"
                  >
                    <RotateCcw className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-black text-blue-500">{totalReentries}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Повторных входов</p>
                  </motion.div>
                </div>
                
                {/* Additional Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t-2 border-border">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-primary/30 rounded-xl bg-primary/10"
                  >
                    <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-black text-foreground">{averageStack.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Средний стек</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="text-center p-4 border-2 border-primary/30 rounded-xl bg-primary/10"
                  >
                    <Coffee className="w-6 h-6 mx-auto mb-2 text-primary" />
                    {isCurrentBreak ? (
                      <>
                        <p className="text-2xl font-black text-primary">СЕЙЧАС</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Перерыв</p>
                      </>
                    ) : timeToBreak ? (
                      <>
                        <p className="text-xl font-black text-foreground">{formatTime(timeToBreak)}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase">До перерыва ({levelsUntilBreak} ур.)</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-black text-foreground">—</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase">До перерыва</p>
                      </>
                    )}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* RPS Pool */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card brutal-border h-full">
              <CardHeader className="bg-secondary/60 border-b-2 border-border">
                <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                  <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  Фонд RPS баллов
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <motion.div 
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-5xl font-black neon-orange"
                  >
                    {rpsPool.toLocaleString()} RPS
                  </motion.div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-secondary/40 rounded-xl border-2 border-border text-center">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Организационные</p>
                    <p className="font-black text-foreground">{Math.floor(registrations.length * participationFee / 10).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-xl border-2 border-border text-center">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Повторные</p>
                    <p className="font-black text-foreground">{Math.floor(totalReentries * reentryFee / 10).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-xl border-2 border-border text-center">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Дополнительные</p>
                    <p className="font-black text-foreground">{Math.floor(totalAdditionalSets * additionalFee / 10).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* System Analytics & Health */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                Аналитика системы
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="text-center p-4 border-2 border-border rounded-xl bg-secondary/30"
                >
                  <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-black text-foreground">{systemStats.activeTournaments}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Активные турниры</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="text-center p-4 border-2 border-border rounded-xl bg-secondary/30"
                >
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-black text-foreground">{systemStats.totalPlayersInClub}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Игроков в клубе</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="text-center p-4 border-2 border-green-500/30 rounded-xl bg-green-500/10"
                >
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-black text-green-500">{systemStats.weeklyGames}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Игр за неделю</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="text-center p-4 border-2 border-blue-500/30 rounded-xl bg-blue-500/10"
                >
                  <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-black text-blue-500">{systemStats.averageRating}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Средний рейтинг</p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health & Ratings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="bg-card brutal-border">
              <CardHeader className="bg-secondary/60 border-b-2 border-border">
                <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                  <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  Состояние системы
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    База данных
                  </span>
                  <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 font-bold">Работает</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Real-time обновления
                  </span>
                  <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 font-bold">Активно</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    RPS расчеты
                  </span>
                  <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 font-bold">Готово</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Производительность
                  </span>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold">Хорошо</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card brutal-border">
              <CardHeader className="bg-secondary/60 border-b-2 border-border">
                <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                  <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  Рейтинговые показатели
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium">Качество игры</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-r from-primary to-orange-400" style={{ width: '85%' }} />
                    </div>
                    <span className="text-sm font-black text-foreground w-10">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium">Активность клуба</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: '92%' }} />
                    </div>
                    <span className="text-sm font-black text-foreground w-10">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium">Рост рейтингов</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: '78%' }} />
                    </div>
                    <span className="text-sm font-black text-foreground w-10">78%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium">Турнирная активность</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-400" style={{ width: '96%' }} />
                    </div>
                    <span className="text-sm font-black text-foreground w-10">96%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default TournamentOverview;
