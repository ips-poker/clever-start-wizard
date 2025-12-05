import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Coffee, Clock, Users, Trophy } from "lucide-react";
import syndikateLogo from "@/assets/syndikate-logo-main.png";
import telegramQrOriginal from "@/assets/telegram-qr-new.jpg";
import { calculateTotalRPSPool } from "@/utils/rpsCalculations";
import { extractAndConvertQR } from "@/utils/qrExtractor";

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
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
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
  const [telegramQr, setTelegramQr] = useState<string>("");
  const [isSyndikateTeme, setIsSyndikateTeme] = useState(() => {
    const saved = localStorage.getItem('timer-theme');
    return saved ? saved === 'syndikate' : true;
  });

  // Сохраняем выбор темы
  useEffect(() => {
    localStorage.setItem('timer-theme', isSyndikateTeme ? 'syndikate' : 'light');
  }, [isSyndikateTeme]);

  useEffect(() => {
    if (!tournamentId) return;

    loadTournamentData();
    setupRealtimeSubscription();
  }, [tournamentId]);

  // Обработка QR кода при загрузке
  useEffect(() => {
    const processQR = async () => {
      try {
        const processedQR = await extractAndConvertQR(telegramQrOriginal);
        setTelegramQr(processedQR);
      } catch (error) {
        console.error('Error processing QR code:', error);
        setTelegramQr(telegramQrOriginal);
      }
    };
    processQR();
  }, []);

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
      );
    
    tournamentChannel.subscribe();

    // Подписка на изменения регистраций
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
          const { data: registrationData } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournamentId);

          if (registrationData) {
            setRegistrations(registrationData);
          }
        }
      );
    
    registrationChannel.subscribe();

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
      <div className={`min-h-screen flex items-center justify-center ${
        isSyndikateTeme 
          ? 'bg-[hsl(0,0%,8%)]' 
          : 'bg-gradient-to-br from-gray-50 to-white'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-32 w-32 border-b-4 mx-auto mb-4 ${
            isSyndikateTeme ? 'border-[hsl(24,100%,50%)]' : 'border-gray-800'
          }`}></div>
          <p className={`text-xl ${isSyndikateTeme ? 'text-[hsl(0,0%,65%)]' : 'text-gray-600'}`}>
            Загрузка турнира...
          </p>
        </div>
      </div>
    );
  }

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
  const totalAdditionalSets = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
  
  const rpsPool = calculateTotalRPSPool(
    registrations.length,
    tournament.participation_fee || tournament.buy_in || 0,
    totalReentries,
    tournament.reentry_fee || tournament.buy_in || 0,
    totalAdditionalSets,
    tournament.additional_fee || tournament.buy_in || 0
  );
  
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const currentLevel = blindLevels.find(l => l.level === tournament.current_level);
  const isBreakLevel = currentLevel?.is_break || false;
  
  const levelDuration = currentLevel?.duration ?? tournament.timer_duration;
  const timerProgress = ((levelDuration - currentTime) / levelDuration) * 100;
  
  const nextLevel = blindLevels.find(l => l.level === tournament.current_level + 1);
  const isNextBreakLevel = nextLevel?.is_break || false;
  const nextSmallBlind = nextLevel?.small_blind || tournament.current_small_blind * 2;
  const nextBigBlind = nextLevel?.big_blind || tournament.current_big_blind * 2;
  const nextAnte = nextLevel?.ante || 0;

  const currentAnte = currentLevel?.ante || 0;

  // Syndikate Industrial Theme
  if (isSyndikateTeme) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(0,0%,8%)] text-[hsl(0,0%,95%)] relative overflow-hidden">
        {/* Industrial texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)`
        }} />
        
        {/* Metal grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`
        }} />

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] relative z-10"
          style={{ boxShadow: 'inset 0 -2px 10px rgba(0,0,0,0.5), 0 0 30px rgba(255,106,0,0.1)' }}>
          
          {/* Left - Logo and Company */}
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src={syndikateLogo} 
                alt="Syndikate Logo" 
                className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,106,0,0.4)]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-display tracking-wider text-[hsl(24,100%,50%)]"
                style={{ textShadow: '0 0 20px hsla(24,100%,50%,0.8), 0 0 40px hsla(24,100%,50%,0.4)' }}>
                SYNDIKATE
              </span>
              <span className="text-sm font-sans font-bold tracking-[0.3em] uppercase text-[hsl(0,0%,65%)]">
                POKER CLUB
              </span>
            </div>
          </div>

          {/* Center - Tournament Name and Slogan */}
          <div className="text-center flex-1 mx-8">
            <h1 className="text-4xl font-display tracking-wide mb-2 text-[hsl(0,0%,95%)]"
              style={{ textShadow: '0 0 30px rgba(255,106,0,0.3)' }}>
              {tournament.name}
            </h1>
            <p className="text-lg font-sans text-[hsl(0,0%,65%)] italic">
              {slogan}
            </p>
          </div>

          {/* Right - QR Code and Theme Toggle */}
          <div className="flex items-center gap-4">
            {telegramQr && (
              <div className="p-2 bg-white rounded border-2 border-[hsl(0,0%,20%)]"
                style={{ boxShadow: '0 0 20px rgba(255,106,0,0.2)' }}>
                <img 
                  src={telegramQr} 
                  alt="Telegram QR" 
                  className="w-24 h-24"
                />
              </div>
            )}
            <button
              onClick={() => setIsSyndikateTeme(false)}
              className="p-3 rounded border-2 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,18%)] hover:border-[hsl(24,100%,50%)] transition-all duration-300"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}
              title="Светлая тема"
            >
              ☀️
            </button>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8 relative z-10">
          {/* Current Level */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 rounded px-6 py-3 mb-6 border-2 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,15%)]"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,106,0,0.15)' }}>
              {isBreakLevel ? (
                <>
                  <Coffee className="w-7 h-7 text-[hsl(24,100%,50%)]" />
                  <span className="text-2xl font-display tracking-wider text-[hsl(24,100%,50%)]">
                    ПЕРЕРЫВ
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-7 h-7 text-[hsl(24,100%,50%)]" />
                  <span className="text-2xl font-display tracking-wider text-[hsl(0,0%,95%)]">
                    УРОВЕНЬ {tournament.current_level}
                  </span>
                </>
              )}
            </div>
            
            {/* Timer Display */}
            <div className={`text-[20rem] md:text-[24rem] font-mono font-bold leading-none tracking-tight ${
              currentTime <= 60 
                ? 'text-[hsl(0,84%,50%)] animate-pulse'
                : currentTime <= 300 
                  ? 'text-[hsl(24,100%,50%)]'
                  : 'text-[hsl(0,0%,95%)]'
            }`} style={{
              textShadow: currentTime <= 60 
                ? '0 0 60px hsla(0,84%,50%,0.8), 0 0 120px hsla(0,84%,50%,0.4)'
                : currentTime <= 300
                  ? '0 0 60px hsla(24,100%,50%,0.6), 0 0 100px hsla(24,100%,50%,0.3)'
                  : '0 0 40px rgba(255,106,0,0.2)'
            }}>
              {formatTime(currentTime)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-[500px] max-w-full mt-8">
              <div className="h-5 rounded overflow-hidden border-2 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)]"
                style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
                <div
                  className="h-full transition-all duration-1000 bg-gradient-to-r from-[hsl(24,100%,45%)] via-[hsl(24,100%,55%)] to-[hsl(0,84%,45%)]"
                  style={{ 
                    width: `${timerProgress}%`,
                    boxShadow: '0 0 20px hsla(24,100%,50%,0.6)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Current and Next Blinds */}
          <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
            {/* Current Blinds */}
            <div className="text-center p-8 rounded border-2 border-[hsl(24,100%,50%)] bg-[hsl(0,0%,12%)]"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,106,0,0.3)' }}>
              <p className="text-lg font-display tracking-wider mb-4 text-[hsl(24,100%,50%)]">
                ТЕКУЩИЙ УРОВЕНЬ
              </p>
              <div className={`grid gap-4 ${currentLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-2">
                  <p className="text-5xl font-bold text-[hsl(0,0%,95%)]"
                    style={{ textShadow: '0 0 20px rgba(255,106,0,0.3)' }}>
                    {isBreakLevel ? '—' : (currentLevel?.small_blind || tournament.current_small_blind)}
                  </p>
                  <p className="text-sm text-[hsl(0,0%,50%)] uppercase tracking-wider">
                    Малый блайнд
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-5xl font-bold text-[hsl(0,0%,95%)]"
                    style={{ textShadow: '0 0 20px rgba(255,106,0,0.3)' }}>
                    {isBreakLevel ? '—' : (currentLevel?.big_blind || tournament.current_big_blind)}
                  </p>
                  <p className="text-sm text-[hsl(0,0%,50%)] uppercase tracking-wider">
                    Большой блайнд
                  </p>
                </div>
                {currentLevel?.ante > 0 && (
                  <div className="space-y-2">
                    <p className="text-5xl font-bold text-[hsl(24,100%,50%)]"
                      style={{ textShadow: '0 0 20px rgba(255,106,0,0.5)' }}>
                      {isBreakLevel ? '—' : currentLevel.ante}
                    </p>
                    <p className="text-sm text-[hsl(0,0%,50%)] uppercase tracking-wider">
                      Анте
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Blinds */}
            <div className="text-center p-8 rounded border-2 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,15%)]"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
              <p className="text-lg font-display tracking-wider mb-4 text-[hsl(0,0%,50%)]">
                {isBreakLevel ? 'ПОСЛЕ ПЕРЕРЫВА' : (isNextBreakLevel ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ УРОВЕНЬ')}
              </p>
              {isNextBreakLevel ? (
                <div className="flex items-center justify-center py-8">
                  <Coffee className="w-16 h-16 mr-4 text-[hsl(24,100%,50%)]" />
                  <span className="text-4xl font-display tracking-wider text-[hsl(0,0%,65%)]">
                    ПЕРЕРЫВ
                  </span>
                </div>
              ) : (
                <div className={`grid gap-4 ${nextLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-[hsl(0,0%,65%)]">
                      {nextSmallBlind}
                    </p>
                    <p className="text-sm text-[hsl(0,0%,40%)] uppercase tracking-wider">
                      Малый блайнд
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-[hsl(0,0%,65%)]">
                      {nextBigBlind}
                    </p>
                    <p className="text-sm text-[hsl(0,0%,40%)] uppercase tracking-wider">
                      Большой блайнд
                    </p>
                  </div>
                  {nextLevel?.ante > 0 && (
                    <div className="space-y-2">
                      <p className="text-3xl font-medium text-[hsl(24,100%,45%)]">
                        {nextLevel.ante}
                      </p>
                      <p className="text-sm text-[hsl(0,0%,40%)] uppercase tracking-wider">
                        Анте
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded p-6 max-w-6xl w-full border-2 border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)]"
            style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
            <div className="grid grid-cols-4 gap-8 text-center">
              <div>
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 mr-3 text-[hsl(24,100%,50%)]" />
                  <span className="text-lg text-[hsl(0,0%,50%)]">
                    Игроки
                  </span>
                </div>
                <p className="text-3xl font-bold text-[hsl(0,0%,95%)]">
                  {activePlayers.length}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 mr-3 text-[hsl(24,100%,50%)]" />
                  <span className="text-lg text-[hsl(0,0%,50%)]">
                    Призовой фонд RPS
                  </span>
                </div>
                <p className="text-3xl font-bold text-[hsl(24,100%,50%)]"
                  style={{ textShadow: '0 0 20px rgba(255,106,0,0.5)' }}>
                  {rpsPool.toLocaleString()} RPS
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-lg text-[hsl(0,0%,50%)]">
                    Средний стек
                  </span>
                </div>
                <p className="text-3xl font-bold text-[hsl(0,0%,95%)]">
                  {averageStack.toLocaleString()}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-lg text-[hsl(0,0%,50%)]">
                    Re-entry / Доп. наборы
                  </span>
                </div>
                <p className="text-3xl font-bold text-[hsl(0,0%,95%)]">
                  {totalReentries} / {totalAdditionalSets}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[hsl(0,0%,20%)] p-4 text-center bg-[hsl(0,0%,10%)] relative z-10">
          <p className="text-sm text-[hsl(0,0%,40%)]">
            Внешний дисплей турнира • Обновляется автоматически
          </p>
        </div>
      </div>
    );
  }

  // Light Professional Theme
  return (
    <div className="min-h-screen flex flex-col text-gray-800 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(240, 100%, 97%) 0%, hsl(280, 100%, 98%) 25%, hsl(320, 100%, 98%) 50%, hsl(30, 100%, 98%) 75%, hsl(200, 100%, 97%) 100%)'
      }}>
      
      {/* Animated gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(280, 80%, 85%) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(200, 80%, 85%) 0%, transparent 70%)' }} />
      <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(30, 90%, 85%) 0%, transparent 70%)' }} />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(0,0,0,0.1) 80px, rgba(0,0,0,0.1) 81px),
                          repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(0,0,0,0.1) 80px, rgba(0,0,0,0.1) 81px)`
      }} />

      {/* Header - Glassmorphism */}
      <div className="flex justify-between items-center p-6 relative z-10 border-b border-white/50"
        style={{ 
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}>
        {/* Left - Logo and Company */}
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 flex items-center justify-center rounded-2xl p-2"
            style={{
              background: 'linear-gradient(135deg, hsl(0, 0%, 15%) 0%, hsl(0, 0%, 25%) 100%)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}>
            <img 
              src={syndikateLogo} 
              alt="Syndikate Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-display tracking-wider"
              style={{ 
                background: 'linear-gradient(135deg, hsl(0, 0%, 20%) 0%, hsl(0, 0%, 40%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
              SYNDIKATE
            </span>
            <span className="text-sm font-sans font-bold tracking-[0.3em] uppercase text-gray-500">
              POKER CLUB
            </span>
          </div>
        </div>

        {/* Center - Tournament Name and Slogan */}
        <div className="text-center flex-1 mx-8">
          <h1 className="text-4xl font-display tracking-wide mb-2"
            style={{
              background: 'linear-gradient(135deg, hsl(260, 60%, 40%) 0%, hsl(320, 60%, 40%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
            {tournament.name}
          </h1>
          <p className="text-lg font-sans text-gray-500 italic">
            {slogan}
          </p>
        </div>

        {/* Right - QR Code and Theme Toggle */}
        <div className="flex items-center gap-4">
          {telegramQr && (
            <div className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                padding: '8px'
              }}>
              <img 
                src={telegramQr} 
                alt="Telegram QR" 
                className="w-24 h-24 rounded-lg"
              />
            </div>
          )}
          <button
            onClick={() => setIsSyndikateTeme(true)}
            className="p-3 rounded-xl transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}
            title="Тёмная тема Syndikate"
          >
            🌙
          </button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8 relative z-10">
        {/* Current Level */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl px-6 py-3 mb-6"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
            }}>
            {isBreakLevel ? (
              <>
                <Coffee className="w-7 h-7 text-amber-500" />
                <span className="text-2xl font-display tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, hsl(35, 90%, 50%) 0%, hsl(25, 90%, 55%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                  ПЕРЕРЫВ
                </span>
              </>
            ) : (
              <>
                <Clock className="w-7 h-7 text-violet-500" />
                <span className="text-2xl font-display tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, hsl(260, 60%, 50%) 0%, hsl(280, 60%, 55%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                  УРОВЕНЬ {tournament.current_level}
                </span>
              </>
            )}
          </div>
          
          {/* Timer Display */}
          <div className={`text-[20rem] md:text-[24rem] font-mono font-bold leading-none tracking-tight ${
            currentTime <= 60 ? 'animate-pulse' : ''
          }`}
            style={{
              background: currentTime <= 60 
                ? 'linear-gradient(135deg, hsl(0, 80%, 55%) 0%, hsl(350, 80%, 50%) 100%)'
                : currentTime <= 300 
                  ? 'linear-gradient(135deg, hsl(35, 90%, 50%) 0%, hsl(25, 90%, 55%) 100%)'
                  : 'linear-gradient(135deg, hsl(260, 50%, 35%) 0%, hsl(280, 50%, 40%) 50%, hsl(320, 50%, 40%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: currentTime <= 60 ? 'drop-shadow(0 0 30px hsla(0, 80%, 55%, 0.5))' : 'none'
            }}>
            {formatTime(currentTime)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-[500px] max-w-full mt-8">
            <div className="h-5 rounded-full overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.1)'
              }}>
              <div
                className="h-full transition-all duration-1000 rounded-full"
                style={{ 
                  width: `${timerProgress}%`,
                  background: currentTime <= 60 
                    ? 'linear-gradient(90deg, hsl(0, 80%, 55%) 0%, hsl(350, 80%, 50%) 100%)'
                    : currentTime <= 300
                      ? 'linear-gradient(90deg, hsl(35, 90%, 50%) 0%, hsl(25, 90%, 55%) 100%)'
                      : 'linear-gradient(90deg, hsl(260, 60%, 55%) 0%, hsl(280, 60%, 60%) 50%, hsl(320, 60%, 55%) 100%)',
                  boxShadow: '0 0 20px rgba(150, 100, 200, 0.4)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Current and Next Blinds */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Current Blinds - Glassmorphism */}
          <div className="text-center p-8 rounded-3xl"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(150, 100, 200, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
            }}>
            <p className="text-lg font-display tracking-wider mb-4"
              style={{
                background: 'linear-gradient(135deg, hsl(260, 60%, 50%) 0%, hsl(280, 60%, 55%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
              ТЕКУЩИЙ УРОВЕНЬ
            </p>
            <div className={`grid gap-4 ${currentLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="space-y-2">
                <p className="text-5xl font-bold text-gray-800">
                  {isBreakLevel ? '—' : (currentLevel?.small_blind || tournament.current_small_blind)}
                </p>
                <p className="text-sm text-gray-500 uppercase tracking-wider">
                  Малый блайнд
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-5xl font-bold text-gray-800">
                  {isBreakLevel ? '—' : (currentLevel?.big_blind || tournament.current_big_blind)}
                </p>
                <p className="text-sm text-gray-500 uppercase tracking-wider">
                  Большой блайнд
                </p>
              </div>
              {currentLevel?.ante > 0 && (
                <div className="space-y-2">
                  <p className="text-5xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, hsl(35, 90%, 50%) 0%, hsl(25, 90%, 55%) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                    {isBreakLevel ? '—' : currentLevel.ante}
                  </p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">
                    Анте
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Blinds */}
          <div className="text-center p-8 rounded-3xl"
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(15px)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.3)'
            }}>
            <p className="text-lg font-display tracking-wider mb-4 text-gray-500">
              {isBreakLevel ? 'ПОСЛЕ ПЕРЕРЫВА' : (isNextBreakLevel ? 'ПЕРЕРЫВ' : 'СЛЕДУЮЩИЙ УРОВЕНЬ')}
            </p>
            {isNextBreakLevel ? (
              <div className="flex items-center justify-center py-8">
                <Coffee className="w-16 h-16 mr-4 text-amber-500" />
                <span className="text-4xl font-display tracking-wider text-gray-500">
                  ПЕРЕРЫВ
                </span>
              </div>
            ) : (
              <div className={`grid gap-4 ${nextLevel?.ante > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-2">
                  <p className="text-3xl font-medium text-gray-600">
                    {nextSmallBlind}
                  </p>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">
                    Малый блайнд
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-medium text-gray-600">
                    {nextBigBlind}
                  </p>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">
                    Большой блайнд
                  </p>
                </div>
                {nextLevel?.ante > 0 && (
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-amber-400">
                      {nextLevel.ante}
                    </p>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">
                      Анте
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics - Glassmorphism */}
        <div className="rounded-3xl p-6 max-w-6xl w-full"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.4)'
          }}>
          <div className="grid grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 mr-3 text-violet-500" />
                <span className="text-lg text-gray-600">
                  Игроки
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {activePlayers.length}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 mr-3 text-amber-500" />
                <span className="text-lg text-gray-600">
                  Призовой фонд RPS
                </span>
              </div>
              <p className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, hsl(35, 90%, 50%) 0%, hsl(25, 90%, 55%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                {rpsPool.toLocaleString()} RPS
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <span className="text-lg text-gray-600">
                  Средний стек
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {averageStack.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <span className="text-lg text-gray-600">
                  Re-entry / Доп. наборы
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {totalReentries} / {totalAdditionalSets}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalTimer;
