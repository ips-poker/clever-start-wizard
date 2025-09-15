import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDataSync } from '@/hooks/useDataSync';
import { Trophy, Users, Calendar, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  is_published: boolean;
}

export function TournamentListCached() {
  const { 
    data: tournaments, 
    loading, 
    error, 
    lastSync, 
    refreshData 
  } = useDataSync<Tournament>({
    table: 'tournaments',
    cacheKey: 'tournaments_published',
    realtime: true,
    filter: 'is_published=true',
    select: 'id, name, description, buy_in, max_players, start_time, status'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'running': return 'green';
      case 'finished': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланирован';
      case 'running': return 'Идет';
      case 'finished': return 'Завершен';
      default: return status;
    }
  };

  if (loading && tournaments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Турниры (с кэшированием)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Турниры (с кэшированием)
              {lastSync && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {format(lastSync, 'HH:mm', { locale: ru })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Список турниров с автоматическим кэшированием и обновлением в реальном времени
            </CardDescription>
          </div>
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <WifiOff className="w-4 h-4" />
              <span className="font-medium">Ошибка загрузки:</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
            {tournaments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Показаны данные из кэша
              </p>
            )}
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет доступных турниров</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{tournament.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-white bg-${getStatusColor(tournament.status)}-500`}
                        >
                          {getStatusText(tournament.status)}
                        </Badge>
                      </div>
                      
                      {tournament.description && (
                        <p className="text-sm text-muted-foreground">
                          {tournament.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {tournament.buy_in} ₽
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          до {tournament.max_players} игроков
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(tournament.start_time), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading overlay for refresh */}
        {loading && tournaments.length > 0 && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <LoadingSpinner />
          </div>
        )}
      </CardContent>
    </Card>
  );
}