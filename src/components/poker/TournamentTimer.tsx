import { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, ChevronUp, Pause, Play, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TournamentLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface TournamentTimerProps {
  tournamentId: string;
  isAdmin?: boolean;
  onLevelChange?: (level: TournamentLevel) => void;
}

/**
 * TournamentTimer v2.0 - Unified Timer
 * 
 * Uses level_end_at from database as single source of truth.
 * VPS is the master timer, Edge Function is backup.
 * Frontend only displays countdown based on level_end_at.
 */
export const TournamentTimer = ({ 
  tournamentId, 
  isAdmin = false,
  onLevelChange 
}: TournamentTimerProps) => {
  const [levels, setLevels] = useState<TournamentLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [levelDuration, setLevelDuration] = useState(300);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [lastLevelEndAt, setLastLevelEndAt] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAnnouncedTimeRef = useRef<number | null>(null);

  // Load tournament and levels
  useEffect(() => {
    const fetchData = async () => {
      const { data: tourney } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tourney) {
        setTournament(tourney);
        setCurrentLevel(tourney.current_level || 1);
        setIsPaused(tourney.status === 'paused');
        setLastLevelEndAt(tourney.level_end_at);
      }

      const { data } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level');

      if (data && data.length > 0) {
        setLevels(data);
        const current = data.find(l => l.level === (tourney?.current_level || 1));
        if (current) {
          setLevelDuration(current.duration);
        }
      }
    };

    fetchData();
  }, [tournamentId]);

  // Subscribe to real-time tournament updates
  useEffect(() => {
    const channel = supabase
      .channel(`tournament-timer-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_poker_tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          const newData = payload.new as any;
          setTournament(newData);
          setIsPaused(newData.status === 'paused');
          
          // Detect level change
          if (newData.current_level !== currentLevel) {
            setCurrentLevel(newData.current_level);
            const newLevel = levels.find(l => l.level === newData.current_level);
            if (newLevel) {
              setLevelDuration(newLevel.duration);
              onLevelChange?.(newLevel);
              
              if (!isMuted) {
                playSound('levelUp');
                if (newLevel.is_break) {
                  toast.success(`🍵 Перерыв! ${Math.floor(newLevel.duration / 60)} минут`);
                } else {
                  toast.success(`Уровень ${newLevel.level}: ${newLevel.small_blind}/${newLevel.big_blind}`);
                }
              }
            }
          }
          
          // Update level_end_at if changed
          if (newData.level_end_at !== lastLevelEndAt) {
            setLastLevelEndAt(newData.level_end_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, currentLevel, levels, isMuted, lastLevelEndAt, onLevelChange]);

  // Calculate time remaining from level_end_at (single source of truth)
  useEffect(() => {
    if (!lastLevelEndAt || isPaused || tournament?.status !== 'running') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(lastLevelEndAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastLevelEndAt, isPaused, tournament?.status]);

  // Sound notifications based on timeRemaining
  useEffect(() => {
    if (isMuted || timeRemaining === null) return;

    // Avoid duplicate announcements
    if (lastAnnouncedTimeRef.current === timeRemaining) return;

    if (timeRemaining === 60) {
      playSound('warning');
      toast.info('Осталась 1 минута до следующего уровня');
      lastAnnouncedTimeRef.current = 60;
    } else if (timeRemaining === 10) {
      playSound('alert');
      toast.warning('10 секунд до следующего уровня!');
      lastAnnouncedTimeRef.current = 10;
    } else if (timeRemaining > 60) {
      lastAnnouncedTimeRef.current = null;
    }
  }, [timeRemaining, isMuted]);

  const playSound = (type: 'warning' | 'alert' | 'levelUp') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'warning') {
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.3;
      } else if (type === 'alert') {
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.4;
      } else {
        oscillator.frequency.value = 660;
        gainNode.gain.value = 0.5;
      }

      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    } catch (err) {
      console.warn('Audio playback failed:', err);
    }
  };

  const handlePauseToggle = async () => {
    const newStatus = isPaused ? 'running' : 'paused';
    
    // Optimistic UI update
    setIsPaused(!isPaused);

    const { error } = await supabase
      .from('online_poker_tournaments')
      .update({ status: newStatus })
      .eq('id', tournamentId);

    if (error) {
      // Revert on error
      setIsPaused(isPaused);
      toast.error('Ошибка при изменении статуса');
    } else {
      toast.info(isPaused ? 'Турнир возобновлён' : 'Турнир на паузе');
    }
  };

  const handleRefresh = async () => {
    const { data: tourney } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tourney) {
      setTournament(tourney);
      setCurrentLevel(tourney.current_level || 1);
      setIsPaused(tourney.status === 'paused');
      setLastLevelEndAt(tourney.level_end_at);
      toast.success('Данные обновлены');
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentLevelData = levels.find(l => l.level === currentLevel);
  const nextLevelData = levels.find(l => l.level === currentLevel + 1);
  const progress = timeRemaining !== null && levelDuration > 0
    ? ((levelDuration - timeRemaining) / levelDuration) * 100 
    : 0;

  const timeWarningClass = timeRemaining === null 
    ? 'text-muted-foreground'
    : timeRemaining <= 10 
      ? 'text-destructive animate-pulse font-bold'
      : timeRemaining <= 60 
        ? 'text-yellow-500 animate-pulse' 
        : 'text-foreground';

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">
            {currentLevelData?.is_break ? 'ПЕРЕРЫВ' : `Уровень ${currentLevel}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8"
            title="Обновить"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePauseToggle}
              className="h-8 w-8"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center">
        <div className={`text-5xl font-mono font-bold transition-colors ${timeWarningClass}`}>
          {formatTime(timeRemaining)}
        </div>
        <Progress value={progress} className="mt-2 h-2" />
        {isPaused && (
          <div className="text-xs text-muted-foreground mt-1">
            Осталось: {formatTime(timeRemaining)} при возобновлении
          </div>
        )}
      </div>

      {/* Current Blinds */}
      {currentLevelData && !currentLevelData.is_break && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">SB</div>
            <div className="font-bold text-lg">{currentLevelData.small_blind.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">BB</div>
            <div className="font-bold text-lg">{currentLevelData.big_blind.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Ante</div>
            <div className="font-bold text-lg">{currentLevelData.ante || '-'}</div>
          </div>
        </div>
      )}

      {/* Break Display */}
      {currentLevelData?.is_break && (
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">☕</div>
          <div className="text-sm text-muted-foreground">
            Игра возобновится через
          </div>
          <div className="font-bold text-primary">
            {formatTime(timeRemaining)}
          </div>
        </div>
      )}

      {/* Next Level Preview */}
      {nextLevelData && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <ChevronUp className="h-4 w-4" />
            <span>Следующий:</span>
          </div>
          <span className="font-medium">
            {nextLevelData.is_break 
              ? `Перерыв (${Math.floor(nextLevelData.duration / 60)} мин)` 
              : `${nextLevelData.small_blind.toLocaleString()}/${nextLevelData.big_blind.toLocaleString()}`
            }
          </span>
        </div>
      )}

      {/* Paused Status */}
      {isPaused && (
        <div className="text-center text-yellow-500 font-medium animate-pulse">
          ⏸️ ПАУЗА
        </div>
      )}
    </div>
  );
};