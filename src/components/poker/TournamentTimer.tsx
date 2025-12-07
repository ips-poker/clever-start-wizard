import { useState, useEffect, useCallback } from 'react';
import { Timer, ChevronUp, Pause, Play, Volume2, VolumeX } from 'lucide-react';
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

export const TournamentTimer = ({ 
  tournamentId, 
  isAdmin = false,
  onLevelChange 
}: TournamentTimerProps) => {
  const [levels, setLevels] = useState<TournamentLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tournament, setTournament] = useState<any>(null);

  // Загрузка уровней турнира
  useEffect(() => {
    const fetchLevels = async () => {
      const { data: tourney } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tourney) {
        setTournament(tourney);
        setCurrentLevel(tourney.current_level || 1);
        setIsPaused(tourney.status === 'paused');
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
          setTimeRemaining(current.duration);
        }
      }
    };

    fetchLevels();
  }, [tournamentId]);

  // Таймер
  useEffect(() => {
    if (isPaused || !tournament || tournament.status !== 'running') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Переход на следующий уровень
          handleNextLevel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, tournament?.status, currentLevel]);

  // Звуковые уведомления
  useEffect(() => {
    if (isMuted) return;

    if (timeRemaining === 60) {
      playSound('warning');
      toast.info('Осталась 1 минута до следующего уровня');
    } else if (timeRemaining === 10) {
      playSound('alert');
      toast.warning('10 секунд до следующего уровня!');
    }
  }, [timeRemaining, isMuted]);

  const playSound = (type: 'warning' | 'alert' | 'levelUp') => {
    // Простой звук через Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  };

  const handleNextLevel = useCallback(async () => {
    const nextLevelNum = currentLevel + 1;
    const nextLevel = levels.find(l => l.level === nextLevelNum);

    if (!nextLevel) {
      toast.info('Достигнут последний уровень блайндов');
      return;
    }

    setCurrentLevel(nextLevelNum);
    setTimeRemaining(nextLevel.duration);

    // Обновляем турнир в БД
    await supabase
      .from('online_poker_tournaments')
      .update({
        current_level: nextLevelNum,
        small_blind: nextLevel.small_blind,
        big_blind: nextLevel.big_blind,
        ante: nextLevel.ante
      })
      .eq('id', tournamentId);

    if (!isMuted) {
      playSound('levelUp');
    }

    if (nextLevel.is_break) {
      toast.success(`🍵 Перерыв! ${Math.floor(nextLevel.duration / 60)} минут`);
    } else {
      toast.success(`Уровень ${nextLevelNum}: ${nextLevel.small_blind}/${nextLevel.big_blind}`);
    }

    onLevelChange?.(nextLevel);
  }, [currentLevel, levels, tournamentId, isMuted, onLevelChange]);

  const handlePauseToggle = async () => {
    const newStatus = isPaused ? 'running' : 'paused';
    setIsPaused(!isPaused);

    await supabase
      .from('online_poker_tournaments')
      .update({ status: newStatus })
      .eq('id', tournamentId);

    toast.info(isPaused ? 'Турнир возобновлён' : 'Турнир на паузе');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentLevelData = levels.find(l => l.level === currentLevel);
  const nextLevelData = levels.find(l => l.level === currentLevel + 1);
  const progress = currentLevelData 
    ? ((currentLevelData.duration - timeRemaining) / currentLevelData.duration) * 100 
    : 0;

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">
            {currentLevelData?.is_break ? 'ПЕРЕРЫВ' : `Уровень ${currentLevel}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Таймер */}
      <div className="text-center">
        <div className={`text-5xl font-mono font-bold ${
          timeRemaining <= 60 ? 'text-destructive animate-pulse' : 
          timeRemaining <= 120 ? 'text-yellow-500' : 'text-foreground'
        }`}>
          {formatTime(timeRemaining)}
        </div>
        <Progress value={progress} className="mt-2 h-2" />
      </div>

      {/* Текущие блайнды */}
      {currentLevelData && !currentLevelData.is_break && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">SB</div>
            <div className="font-bold text-lg">{currentLevelData.small_blind}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">BB</div>
            <div className="font-bold text-lg">{currentLevelData.big_blind}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Ante</div>
            <div className="font-bold text-lg">{currentLevelData.ante || '-'}</div>
          </div>
        </div>
      )}

      {/* Следующий уровень */}
      {nextLevelData && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <ChevronUp className="h-4 w-4" />
            <span>Следующий:</span>
          </div>
          <span className="font-medium">
            {nextLevelData.is_break 
              ? 'Перерыв' 
              : `${nextLevelData.small_blind}/${nextLevelData.big_blind}`
            }
          </span>
        </div>
      )}

      {/* Статус */}
      {isPaused && (
        <div className="text-center text-yellow-500 font-medium animate-pulse">
          ⏸️ ПАУЗА
        </div>
      )}
    </div>
  );
};
