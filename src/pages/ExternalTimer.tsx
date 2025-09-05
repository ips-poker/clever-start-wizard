import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Coffee, Clock, Users, Trophy, TrendingUp, DollarSign, Layers } from "lucide-react";
import ipsLogo from "/lovable-uploads/3d3f89dd-02a1-4e23-845c-641c0ee0956b.png";
import telegramQr from "@/assets/telegram-qr.png";
import { useTournamentSync } from "@/hooks/useTournamentSync";
import { useRealtimeTournamentData } from "@/hooks/useRealtimeTournamentData";

const ExternalTimer = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [slogan, setSlogan] = useState("Престижные турниры. Высокие стандарты.");

  // Используем новые хуки для синхронизации
  const { tournament, registrations, blindLevels, loading } = useRealtimeTournamentData({
    tournamentId: tournamentId || ''
  });

  const { tournamentState, syncTimeWithServer } = useTournamentSync({
    tournamentId: tournamentId || '',
    onTimerUpdate: (remaining, active) => {
      setCurrentTime(remaining);
      setTimerActive(active);
    }
  });

  // Синхронизация времени каждую секунду для активного таймера
  useEffect(() => {
    if (!timerActive || !tournamentState) return;

    const interval = setInterval(() => {
      const syncedTime = syncTimeWithServer();
      setCurrentTime(syncedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, tournamentState, syncTimeWithServer]);

  // Синхронизация с real-time системой
  useEffect(() => {
    if (!tournament || !tournamentState) return;

    // Инициализируем текущее время из синхронизированного состояния
    const syncedTime = syncTimeWithServer();
    setCurrentTime(syncedTime);
  }, [tournament, tournamentState, syncTimeWithServer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Загрузка турнира...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Турнир не найден</p>
        </div>
      </div>
    );
  }

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing' || r.status === 'confirmed');
  const totalRebuys = registrations.reduce((sum, r) => sum + (r.rebuys || 0), 0);
  const totalAddons = registrations.reduce((sum, r) => sum + (r.addons || 0), 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);
  
  const totalChips = registrations.reduce((sum, r) => sum + (r.chips || tournament.starting_chips), 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const currentLevel = blindLevels.find(l => l.level === tournament.current_level);
  const isBreakLevel = currentLevel?.is_break || false;
  
  // Используем длительность из структуры блайндов для правильного прогресса
  const levelDuration = currentLevel?.duration ?? tournament.timer_duration;
  const timerProgress = levelDuration > 0 ? ((levelDuration - currentTime) / levelDuration) * 100 : 0;
  
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

          {/* Timer */}
          <div className="text-8xl font-bold text-gray-900 mb-4 font-mono">
            {formatTime(currentTime)}
          </div>

          {/* Progress Bar */}
          <div className="w-96 mx-auto mb-8">
            <Progress 
              value={Math.max(0, Math.min(100, timerProgress))} 
              className="h-4 bg-gray-200"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>0:00</span>
              <span>{formatTime(levelDuration || 1200)}</span>
            </div>
          </div>
        </div>

        {/* Blinds Display */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Current Blinds */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              {isBreakLevel ? 'Перерыв' : 'Текущие блайнды'}
            </h3>
            {!isBreakLevel && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Малый блайнд:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {tournament.current_small_blind.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Большой блайнд:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {tournament.current_big_blind.toLocaleString()}
                  </span>
                </div>
                {currentAnte > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-gray-600">Анте:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {currentAnte.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Blinds */}
          <div className="bg-gray-50 rounded-2xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              {isNextBreakLevel ? 'Следующий: Перерыв' : 'Следующие блайнды'}
            </h3>
            {!isNextBreakLevel && nextLevel && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Малый блайнд:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {nextSmallBlind.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Большой блайнд:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {nextBigBlind.toLocaleString()}
                  </span>
                </div>
                {nextAnte > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-gray-600">Анте:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {nextAnte.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl w-full">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{activePlayers.length}</div>
            <div className="text-sm text-gray-600">Активных игроков</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center">
            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{prizePool.toLocaleString()}₽</div>
            <div className="text-sm text-gray-600">Призовой фонд</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{averageStack.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Средний стек</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center">
            <Layers className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{totalRebuys + totalAddons}</div>
            <div className="text-sm text-gray-600">Ребаи + Аддоны</div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${timerActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {tournamentState ? 
              `Синхронизировано с ${tournamentState.sync_source || 'сервером'}` : 
              'Подключение...'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExternalTimer;