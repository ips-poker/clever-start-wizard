import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Trophy, Users, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncData {
  players_count: number;
  tournaments_completed: number;
  total_games_played: number;
  last_sync: string | null;
}

interface RecentUpdate {
  id: string;
  tournament_name: string;
  player_name: string;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  position: number;
  created_at: string;
}

export default function RealtimeRatingSync() {
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSyncData();
    
    // Set up real-time subscriptions
    const gameResultsChannel = supabase
      .channel('rating-sync-game-results')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_results' }, 
        () => {
          loadSyncData();
          showSyncNotification();
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel('rating-sync-players')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'players' }, 
        () => {
          loadSyncData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameResultsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const loadSyncData = async () => {
    try {
      // Get sync statistics
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('games_played')
        .gt('games_played', 0);

      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('status', 'completed');

      const { data: recentData, error: recentError } = await supabase
        .from('game_results')
        .select(`
          id,
          elo_before,
          elo_after,
          elo_change,
          position,
          created_at,
          players!inner(name),
          tournaments!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (playersError) throw playersError;
      if (tournamentsError) throw tournamentsError;
      if (recentError) throw recentError;

      const totalGamesPlayed = playersData?.reduce((sum, p) => sum + p.games_played, 0) || 0;

      setSyncData({
        players_count: playersData?.length || 0,
        tournaments_completed: tournamentsData?.length || 0,
        total_games_played: totalGamesPlayed,
        last_sync: recentData?.[0]?.created_at || null
      });

      // Format recent updates
      const formattedUpdates = recentData?.map(update => ({
        id: update.id,
        tournament_name: update.tournaments?.name || 'Неизвестный турнир',
        player_name: update.players?.name || 'Неизвестный игрок',
        elo_before: update.elo_before,
        elo_after: update.elo_after,
        elo_change: update.elo_change,
        position: update.position,
        created_at: update.created_at
      })) || [];

      setRecentUpdates(formattedUpdates);

    } catch (error) {
      console.error('Error loading sync data:', error);
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось загрузить данные рейтинга",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const manualSync = async () => {
    setSyncing(true);
    try {
      // Call the function to update player wins
      const { error } = await supabase.rpc('update_player_wins');
      
      if (error) throw error;

      await loadSyncData();
      
      toast({
        title: "Синхронизация завершена",
        description: "Рейтинги игроков обновлены",
        variant: "default"
      });
    } catch (error) {
      console.error('Error during manual sync:', error);
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось выполнить синхронизацию",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const showSyncNotification = () => {
    toast({
      title: "Рейтинг обновлен",
      description: "Данные синхронизированы в реальном времени",
      variant: "default"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPositionLabel = (position: number) => {
    if (position === 1) return "1-е место";
    if (position === 2) return "2-е место";
    if (position === 3) return "3-е место";
    return `${position}-е место`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Синхронизация рейтинга
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-poker-text-muted">Загрузка данных синхронизации...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-poker-accent" />
              Статус синхронизации рейтинга
            </CardTitle>
            <Button 
              onClick={manualSync} 
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Синхронизировать
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-poker-surface/50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-lg mx-auto mb-2">
                <Users className="w-5 h-5 text-poker-text-primary" />
              </div>
              <div className="text-2xl font-semibold text-poker-text-primary">
                {syncData?.players_count || 0}
              </div>
              <div className="text-sm text-poker-text-muted">Игроков</div>
            </div>

            <div className="text-center p-4 bg-poker-surface/50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-lg mx-auto mb-2">
                <Trophy className="w-5 h-5 text-poker-warning" />
              </div>
              <div className="text-2xl font-semibold text-poker-text-primary">
                {syncData?.tournaments_completed || 0}
              </div>
              <div className="text-sm text-poker-text-muted">Турниров</div>
            </div>

            <div className="text-center p-4 bg-poker-surface/50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-lg mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-poker-accent" />
              </div>
              <div className="text-2xl font-semibold text-poker-text-primary">
                {syncData?.total_games_played || 0}
              </div>
              <div className="text-sm text-poker-text-muted">Игр сыграно</div>
            </div>

            <div className="text-center p-4 bg-poker-surface/50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-lg mx-auto mb-2">
                <Clock className="w-5 h-5 text-poker-text-muted" />
              </div>
              <div className="text-sm font-semibold text-poker-text-primary">
                {syncData?.last_sync ? formatDate(syncData.last_sync) : 'Нет данных'}
              </div>
              <div className="text-sm text-poker-text-muted">Последнее обновление</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-poker-text-muted">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Система синхронизации работает в реальном времени</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-poker-primary" />
            Последние изменения рейтинга
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUpdates.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-poker-text-muted mx-auto mb-4" />
              <p className="text-poker-text-muted">Изменений рейтинга пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-4 bg-poker-surface/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-poker-text-primary">
                        {update.player_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getPositionLabel(update.position)}
                      </Badge>
                    </div>
                    <div className="text-sm text-poker-text-muted">
                      {update.tournament_name} • {formatDate(update.created_at)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-poker-text-muted">
                        {update.elo_before}
                      </span>
                      <span className="text-poker-text-muted">→</span>
                      <span className="font-semibold text-poker-text-primary">
                        {update.elo_after}
                      </span>
                    </div>
                    <div className={`text-sm font-medium ${
                      update.elo_change > 0 ? 'text-green-600' : 
                      update.elo_change < 0 ? 'text-red-600' : 'text-poker-text-muted'
                    }`}>
                      {update.elo_change > 0 ? '+' : ''}{update.elo_change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}