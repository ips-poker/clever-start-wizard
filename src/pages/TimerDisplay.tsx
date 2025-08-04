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

  // Таймер (только для отображения, управление происходит из основного интерфейса)
  useEffect(() => {
    if (!tournament) return;
    
    // Проверяем статус турнира для определения активности таймера
    const isTimerRunning = tournament.status === 'running';
    setTimerActive(isTimerRunning);
    
    if (isTimerRunning) {
      const interval = setInterval(() => {
        setCurrentTime(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [tournament?.status]);

  // Dummy функции для интерфейса (не используются в display режиме)
  const handleToggleTimer = () => {};
  const handleResetTimer = () => {};
  const handleNextLevel = () => {};
  const handlePrevLevel = () => {};
  const handleStopTournament = () => {};
  const handleClose = () => {
    window.close();
  };
  const handleTimerAdjust = () => {};
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