import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Coffee, Clock, Users, Trophy } from "lucide-react";
import ipsLogo from "/lovable-uploads/3d3f89dd-02a1-4e23-845c-641c0ee0956b.png";
import telegramQr from "@/assets/telegram-qr.png";

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
  starting_chips: number;
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

const ExternalTimer = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [slogan, setSlogan] = useState("Престижные турниры. Высокие стандарты.");

  useEffect(() => {
    if (!tournamentId) return;

    loadTournamentData();
    setupRealtimeSubscription();
  }, [tournamentId]);

  // Синхронизация с localStorage
  useEffect(() => {
    if (!tournament) return;

    const syncInterval = setInterval(() => {
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
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [tournament]);

  const loadTournamentData = async () => {
    if (!tournamentId) return;

    // Загружаем данные турнира
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentData) {
      setTournament(tournamentData);
      setCurrentTime(tournamentData.timer_remaining || tournamentData.timer_duration || 1200);
    }

    // Загружаем структуру блайндов
    const { data: blindData } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (blindData) {
      setBlindLevels(blindData);
    }

    // Загружаем регистрации
    const { data: registrationData } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (registrationData) {
      setRegistrations(registrationData);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!tournamentId) return;

    // Подписка на изменения турнира
    const tournamentChannel = supabase
      .channel('tournament-changes')
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
            setTournament(payload.new as Tournament);
          }
        }
      )
      .subscribe();

    // Подписка на изменения регистраций - только обновляем registrations, не трогая таймер
    const registrationChannel = supabase
      .channel('registration-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        async () => {
          // Обновляем только регистрации, не трогая турнир и таймер
          const { data: registrationData } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId);

          if (registrationData) {
            setRegistrations(registrationData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
      supabase.removeChannel(registrationChannel);
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Загрузка турнира...</p>
        </div>
      </div>
    );
  }

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalReentries * tournament.buy_in) + (totalAdditionalSets * tournament.buy_in);
  
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const currentLevel = blindLevels.find(l => l.level === tournament.current_level);
  const isBreakLevel = currentLevel?.is_break || false;
  
  // Используем длительность из структуры блайндов для правильного прогресса
  const levelDuration = currentLevel?.duration ?? tournament.timer_duration;
  const timerProgress = ((levelDuration - currentTime) / levelDuration) * 100;
  
  const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
  const isNextBreakLevel = nextLevel?.is_break || false;
  const nextSmallBlind = nextLevel?.small_blind || tournament.current_small_blind * 2;
  const nextBigBlind = nextLevel?.big_blind || tournament.current_big_blind * 2;
  const nextAnte = nextLevel?.ante || 0;

  const currentAnte = currentLevel?.ante || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white shadow-sm">
        {/* Left - Logo and Company */}
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 flex items-center justify-center">
            <img 
              src={ipsLogo} 
              alt="EPC Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-sinkin text-poker-gold tracking-tight">EPC</span>
            <span className="text-sm text-muted-foreground -mt-1 font-sinkin font-medium tracking-widest uppercase">EVENT POKER CLUB</span>
          </div>
        </div>

        {/* Center - Tournament Name and Slogan */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{tournament.name}</h1>
          <p className="text-lg text-gray-500 italic">{slogan}</p>
        </div>

        {/* Right - QR Code */}
        <div className="flex items-center">
          <img 
            src={telegramQr} 
            alt="Telegram QR" 
            className="w-32 h-32 border border-gray-200 rounded"
          />
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8">
        {/* Current Level */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-xl px-6 py-3 mb-6">
            {isBreakLevel ? (
              <>
                <Coffee className="w-6 h-6 text-amber-600" />
                <span className="text-2xl font-medium text-gray-800">ПЕРЕРЫВ</span>
              </>
            ) : (
              <>
                <Clock className="w-6 h-6 text-gray-600" />
                <span className="text-2xl font-medium text-gray-800">Уровень {tournament.current_level}</span>
              </>
            )}
          </div>
          
          {/* Timer Display */}
          <div className={`text-[20rem] md:text-[24rem] font-mono font-light transition-all duration-500 leading-none ${
            currentTime <= 60 ? 'text-red-500 animate-pulse' : 
            currentTime <= 300 ? 'text-amber-500' : 
            'text-gray-800'
          }`}>
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-96 max-w-full mt-8">
            <Progress 
              value={timerProgress} 
              className="h-4 bg-gray-200"
            />
          </div>
        </div>

        {/* Current and Next Blinds */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Current Blinds */}
          <div className="text-center p-8 border-4 border-gray-800 rounded-xl bg-white shadow-xl">
            <p className="text-lg text-gray-800 font-bold mb-4">ТЕКУЩИЙ УРОВЕНЬ</p>
            <div className={`grid gap-4 ${currentLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="space-y-2">
                <p className="text-5xl font-bold text-gray-900">{isBreakLevel ? '—' : (currentLevel?.small_blind || tournament.current_small_blind)}</p>
                <p className="text-sm text-gray-600">МАЛЫЙ БЛАЙНД</p>
              </div>
              <div className="space-y-2">
                <p className="text-5xl font-bold text-gray-900">{isBreakLevel ? '—' : (currentLevel?.big_blind || tournament.current_big_blind)}</p>
                <p className="text-sm text-gray-600">БОЛЬШОЙ БЛАЙНД</p>
              </div>
              {currentLevel?.ante > 0 && (
                <div className="space-y-2">
                  <p className="text-5xl font-bold text-amber-600">{isBreakLevel ? '—' : currentLevel.ante}</p>
                  <p className="text-sm text-gray-600">АНТЕ</p>
                </div>
              )}
            </div>
          </div>

          {/* Next Blinds */}
          <div className="text-center p-8 border-2 border-gray-300 rounded-xl bg-gray-50">
            <p className="text-lg text-gray-500 font-medium mb-4">
              {isBreakLevel ? 'ПОСЛЕ ПЕРЕРЫВА' : (isNextBreakLevel ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ УРОВЕНЬ')}
            </p>
            {isNextBreakLevel ? (
              <div className="flex items-center justify-center py-8">
                <Coffee className="w-16 h-16 text-amber-600 mr-4" />
                <span className="text-4xl font-medium text-gray-700">ПЕРЕРЫВ</span>
              </div>
            ) : (
              <div className={`grid gap-4 ${nextLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-2">
                  <p className="text-3xl font-medium text-gray-700">{nextSmallBlind}</p>
                  <p className="text-sm text-gray-500">МАЛЫЙ БЛАЙНД</p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-medium text-gray-700">{nextBigBlind}</p>
                  <p className="text-sm text-gray-500">БОЛЬШОЙ БЛАЙНД</p>
                </div>
                {nextLevel?.ante > 0 && (
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-amber-500">{nextLevel.ante}</p>
                    <p className="text-sm text-gray-500">АНТЕ</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-6xl w-full shadow-lg">
          <div className="grid grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-gray-600 mr-3" />
                <span className="text-lg text-gray-600">Игроки</span>
              </div>
              <p className="text-3xl font-medium text-gray-800">{activePlayers.length}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-amber-600 mr-3" />
                <span className="text-lg text-gray-600">Призовой (₽)</span>
              </div>
              <p className="text-3xl font-medium text-gray-800">{prizePool.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <span className="text-lg text-gray-600">Средний стек</span>
              </div>
              <p className="text-3xl font-medium text-gray-800">{averageStack.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <span className="text-lg text-gray-600">Re-entry / Доп. наборы</span>
              </div>
              <p className="text-3xl font-medium text-gray-800">{totalReentries} / {totalAdditionalSets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-200 p-4 text-center">
        <p className="text-gray-500 text-sm">
          Внешний дисплей турнира • Обновляется автоматически
        </p>
      </div>
    </div>
  );
};

export default ExternalTimer;