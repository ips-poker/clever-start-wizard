import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FullscreenTimer from "@/components/FullscreenTimer";

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
  status: string;
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
  chips: number;
}

const TimerDisplay = () => {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [slogan, setSlogan] = useState("Покер-турнир международного уровня");

  // Загрузка данных турнира
  useEffect(() => {
    if (!tournamentId) return;

    const loadTournamentData = async () => {
      // Загружаем турнир
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError || !tournamentData) return;
      
      setTournament(tournamentData);
      setCurrentTime(tournamentData.timer_remaining || tournamentData.timer_duration || 1200);

      // Загружаем регистрации
      const { data: regData } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (regData) setRegistrations(regData);

      // Загружаем структуру блайндов
      const { data: blindData } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level', { ascending: true });

      if (blindData) setBlindLevels(blindData);
    };

    loadTournamentData();
  }, [tournamentId]);

  // Подписка на изменения в реальном времени
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel('tournament-timer-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          if (payload.new) {
            const newTournament = payload.new as any;
            setTournament(newTournament);
            setCurrentTime((newTournament as Tournament).timer_remaining || (newTournament as Tournament).timer_duration || 1200);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          // Перезагружаем регистрации при изменении
          const loadRegistrations = async () => {
            const { data } = await supabase
              .from('tournament_registrations')
              .select('*')
              .eq('tournament_id', tournamentId);
            if (data) setRegistrations(data);
          };
          loadRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // Таймер синхронизированный с основным интерфейсом
  useEffect(() => {
    if (!tournament) return;
    
    // Восстанавливаем состояние таймера из localStorage (как в основном интерфейсе)
    const savedTimerState = localStorage.getItem(`timer_${tournament.id}`);
    if (savedTimerState) {
      const { currentTime: savedTime, timerActive: savedActive, lastUpdate } = JSON.parse(savedTimerState);
      const timePassed = Math.floor((Date.now() - lastUpdate) / 1000);
      
      if (savedActive && savedTime > timePassed) {
        setCurrentTime(savedTime - timePassed);
        setTimerActive(true);
      } else {
        setCurrentTime(savedTime);
        setTimerActive(savedActive);
      }
    }
    
    // Слушаем изменения в localStorage для синхронизации
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `timer_${tournament.id}` && e.newValue) {
        const { currentTime: newTime, timerActive: newActive, lastUpdate } = JSON.parse(e.newValue);
        const timePassed = Math.floor((Date.now() - lastUpdate) / 1000);
        
        if (newActive && newTime > timePassed) {
          setCurrentTime(newTime - timePassed);
          setTimerActive(true);
        } else {
          setCurrentTime(newTime);
          setTimerActive(newActive);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tournament?.id]);

  // Локальный таймер для отсчета
  useEffect(() => {
    if (timerActive && currentTime > 0) {
      const interval = setInterval(() => {
        setCurrentTime(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerActive, currentTime]);

  // Функции управления таймером (синхронизируются с основным интерфейсом через localStorage)
  const handleToggleTimer = () => {
    if (!tournament) return;
    
    const newTimerActive = !timerActive;
    setTimerActive(newTimerActive);
    
    // Сохраняем изменение в localStorage для синхронизации с основным интерфейсом
    setTimeout(() => {
      localStorage.setItem(`timer_${tournament.id}`, JSON.stringify({
        currentTime,
        timerActive: newTimerActive,
        lastUpdate: Date.now()
      }));
      
      // Принудительное обновление основного интерфейса
      window.dispatchEvent(new StorageEvent('storage', {
        key: `timer_${tournament.id}`,
        newValue: JSON.stringify({
          currentTime,
          timerActive: newTimerActive,
          lastUpdate: Date.now()
        })
      }));
    }, 0);
  };

  const handleResetTimer = () => {
    if (!tournament) return;
    
    const resetTime = tournament.timer_duration || 1200;
    setCurrentTime(resetTime);
    setTimerActive(false);
    
    // Сохраняем сброс в localStorage
    localStorage.setItem(`timer_${tournament.id}`, JSON.stringify({
      currentTime: resetTime,
      timerActive: false,
      lastUpdate: Date.now()
    }));
  };

  const handleNextLevel = async () => {
    if (!tournament) return;
    
    // Вызываем API для перехода к следующему уровню
    try {
      const { data: blindLevels } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level', { ascending: true });

      if (blindLevels) {
        const newLevel = tournament.current_level + 1;
        const nextBlindLevel = blindLevels.find(bl => bl.level === newLevel);
        
        if (nextBlindLevel) {
          const resetTime = nextBlindLevel.duration || 1200;
          
          // Обновляем турнир в базе данных
          await supabase
            .from('tournaments')
            .update({
              current_level: newLevel,
              current_small_blind: nextBlindLevel.small_blind,
              current_big_blind: nextBlindLevel.big_blind,
              timer_duration: resetTime,
              timer_remaining: resetTime
            })
            .eq('id', tournament.id);

          // Обновляем локальное состояние
          setCurrentTime(resetTime);
          setTimerActive(false);
          
          // Синхронизируем через localStorage
          localStorage.setItem(`timer_${tournament.id}`, JSON.stringify({
            currentTime: resetTime,
            timerActive: false,
            lastUpdate: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error advancing level:', error);
    }
  };

  const handlePrevLevel = async () => {
    if (!tournament || tournament.current_level <= 1) return;
    
    try {
      const { data: blindLevels } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level', { ascending: true });

      if (blindLevels) {
        const newLevel = tournament.current_level - 1;
        const prevBlindLevel = blindLevels.find(bl => bl.level === newLevel);
        
        if (prevBlindLevel) {
          const resetTime = prevBlindLevel.duration || 1200;
          
          // Обновляем турнир в базе данных
          await supabase
            .from('tournaments')
            .update({
              current_level: newLevel,
              current_small_blind: prevBlindLevel.small_blind,
              current_big_blind: prevBlindLevel.big_blind,
              timer_duration: resetTime,
              timer_remaining: resetTime
            })
            .eq('id', tournament.id);

          // Обновляем локальное состояние
          setCurrentTime(resetTime);
          setTimerActive(false);
          
          // Синхронизируем через localStorage
          localStorage.setItem(`timer_${tournament.id}`, JSON.stringify({
            currentTime: resetTime,
            timerActive: false,
            lastUpdate: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error going back level:', error);
    }
  };

  const handleStopTournament = async () => {
    if (!tournament) return;
    
    try {
      await supabase
        .from('tournaments')
        .update({ status: 'completed', finished_at: new Date().toISOString() })
        .eq('id', tournament.id);
    } catch (error) {
      console.error('Error stopping tournament:', error);
    }
  };

  const handleClose = () => {
    window.close();
  };

  const handleTimerAdjust = (seconds: number) => {
    if (!tournament) return;
    
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    
    // Синхронизируем через localStorage с задержкой для избежания лагов
    setTimeout(() => {
      localStorage.setItem(`timer_${tournament.id}`, JSON.stringify({
        currentTime: newTime,
        timerActive,
        lastUpdate: Date.now()
      }));
      
      // Принудительное обновление основного интерфейса
      window.dispatchEvent(new StorageEvent('storage', {
        key: `timer_${tournament.id}`,
        newValue: JSON.stringify({
          currentTime: newTime,
          timerActive,
          lastUpdate: Date.now()
        })
      }));
    }, 100);
  };
  const handleSloganChange = (newSlogan: string) => {
    setSlogan(newSlogan);
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground">Загрузка турнира...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <FullscreenTimer
        tournament={tournament}
        registrations={registrations}
        currentTime={currentTime}
        timerActive={timerActive}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onNextLevel={handleNextLevel}
        onPrevLevel={handlePrevLevel}
        onStopTournament={handleStopTournament}
        onClose={handleClose}
        onTimerAdjust={handleTimerAdjust}
        slogan={slogan}
        onSloganChange={handleSloganChange}
        blindLevels={blindLevels}
      />
    </div>
  );
};

export default TimerDisplay;