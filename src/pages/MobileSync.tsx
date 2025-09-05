import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Plus, Minus, Users, Trophy, Clock, Smartphone } from "lucide-react";
import { useTournamentSync } from "@/hooks/useTournamentSync";
import { useRealtimeTournamentData } from "@/hooks/useRealtimeTournamentData";
import { useToast } from "@/hooks/use-toast";

const MobileSync = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Используем новые хуки для синхронизации
  const { tournament, registrations, loading } = useRealtimeTournamentData({
    tournamentId: tournamentId || ''
  });

  const { 
    tournamentState, 
    startTimer, 
    pauseTimer, 
    updateTimerRemaining, 
    syncTimeWithServer, 
    isSync 
  } = useTournamentSync({
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerToggle = async () => {
    if (isSync) return;

    try {
      if (timerActive) {
        await pauseTimer(currentTime);
        toast({
          title: "Таймер остановлен",
          description: "Изменения синхронизированы с другими устройствами"
        });
      } else {
        await startTimer(currentTime);
        toast({
          title: "Таймер запущен",
          description: "Изменения синхронизированы с другими устройствами"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить состояние таймера",
        variant: "destructive"
      });
    }
  };

  const handleTimeAdjustment = async (minutes: number) => {
    if (isSync) return;

    const newTime = Math.max(0, currentTime + (minutes * 60));
    setCurrentTime(newTime);
    
    try {
      await updateTimerRemaining(newTime);
      toast({
        title: `Время ${minutes > 0 ? 'добавлено' : 'убавлено'}`,
        description: `${Math.abs(minutes)} минут, синхронизировано с другими устройствами`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить время",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-gray-600">Турнир не найден</p>
        </div>
      </div>
    );
  }

  const activePlayers = registrations.filter(r => 
    r.status === 'registered' || r.status === 'playing' || r.status === 'confirmed'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Мобильная синхронизация</CardTitle>
            </div>
            <p className="text-sm text-gray-600">{tournament.name}</p>
          </CardHeader>
        </Card>

        {/* Timer Display */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-5xl font-mono font-bold text-gray-900">
                {formatTime(currentTime)}
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className={`w-3 h-3 rounded-full ${timerActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {timerActive ? 'Активен' : 'На паузе'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">
                  Уровень {tournament.current_level} • {tournament.current_small_blind}/{tournament.current_big_blind}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timer Controls */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button
                  onClick={handleTimerToggle}
                  disabled={isSync}
                  size="lg"
                  className={`w-24 h-12 ${timerActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                >
                  {isSync ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : timerActive ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <Button
                  onClick={() => handleTimeAdjustment(-5)}
                  disabled={isSync}
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-12"
                >
                  <Minus className="w-3 h-3" />
                  <span className="text-xs">5м</span>
                </Button>
                
                <Button
                  onClick={() => handleTimeAdjustment(-1)}
                  disabled={isSync}
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-12"
                >
                  <Minus className="w-3 h-3" />
                  <span className="text-xs">1м</span>
                </Button>
                
                <Button
                  onClick={() => handleTimeAdjustment(1)}
                  disabled={isSync}
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-12"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs">1м</span>
                </Button>
                
                <Button
                  onClick={() => handleTimeAdjustment(5)}
                  disabled={isSync}
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-12"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs">5м</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Stats */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-base">Статистика турнира</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="text-lg font-bold">{activePlayers.length}</div>
                <div className="text-xs text-gray-600">Игроков</div>
              </div>
              
              <div className="text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-bold">{(registrations.length * tournament.buy_in).toLocaleString()}₽</div>
                <div className="text-xs text-gray-600">Призовой фонд</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Синхронизация</span>
              <div className="flex items-center gap-2">
                {tournamentState && (
                  <Badge variant="secondary" className="text-xs">
                    {tournamentState.sync_source || 'Неизвестно'}
                  </Badge>
                )}
                <Badge variant={tournamentState ? "default" : "secondary"} className="text-xs">
                  {tournamentState ? "Подключено" : "Отключено"}
                </Badge>
              </div>
            </div>
            
            {tournamentState && (
              <div className="mt-2 text-xs text-gray-500">
                Последняя синхронизация: {new Date(tournamentState.last_sync_at).toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MobileSync;