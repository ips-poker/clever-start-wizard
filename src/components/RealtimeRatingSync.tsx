import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Users, Zap } from 'lucide-react';

interface RealtimeUpdate {
  type: 'rating' | 'result' | 'tournament';
  message: string;
  timestamp: Date;
  data?: any;
}

interface RealtimeRatingSyncProps {
  onUpdate?: () => void;
}

const RealtimeRatingSync = ({ onUpdate }: RealtimeRatingSyncProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState<RealtimeUpdate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Канал для отслеживания изменений рейтингов игроков
    const playersChannel = supabase
      .channel('players-realtime-sync')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players' },
        (payload) => {
          const update: RealtimeUpdate = {
            type: 'rating',
            message: `Рейтинг игрока обновлен: ${payload.new.name} (${payload.new.elo_rating})`,
            timestamp: new Date(),
            data: payload.new
          };
          
          setRecentUpdates(prev => [update, ...prev.slice(0, 4)]);
          
          toast({
            title: 'Рейтинг обновлен',
            description: `${payload.new.name}: ${payload.new.elo_rating} ELO`,
            className: 'bg-gradient-success border-poker-success text-white',
          });
          
          onUpdate?.();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Канал для отслеживания новых результатов
    const resultsChannel = supabase
      .channel('results-realtime-sync')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_results' },
        (payload) => {
          const update: RealtimeUpdate = {
            type: 'result',
            message: `Новый результат добавлен (изменение: ${payload.new.elo_change > 0 ? '+' : ''}${payload.new.elo_change})`,
            timestamp: new Date(),
            data: payload.new
          };
          
          setRecentUpdates(prev => [update, ...prev.slice(0, 4)]);
          
          toast({
            title: 'Новый результат',
            description: `Изменение рейтинга: ${payload.new.elo_change > 0 ? '+' : ''}${payload.new.elo_change}`,
            className: 'bg-gradient-accent border-poker-accent text-white',
          });
          
          onUpdate?.();
        }
      )
      .subscribe();

    // Канал для отслеживания изменений турниров
    const tournamentsChannel = supabase
      .channel('tournaments-realtime-sync')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments' },
        (payload) => {
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            const update: RealtimeUpdate = {
              type: 'tournament',
              message: `Турнир завершен: ${payload.new.name}`,
              timestamp: new Date(),
              data: payload.new
            };
            
            setRecentUpdates(prev => [update, ...prev.slice(0, 4)]);
            
            toast({
              title: 'Турнир завершен',
              description: `${payload.new.name} готов к обработке рейтингов`,
              className: 'bg-gradient-primary border-poker-primary text-white',
            });
            
            onUpdate?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(tournamentsChannel);
    };
  }, [onUpdate, toast]);

  const getUpdateIcon = (type: RealtimeUpdate['type']) => {
    switch (type) {
      case 'rating':
        return <TrendingUp className="h-4 w-4 text-poker-success" />;
      case 'result':
        return <Activity className="h-4 w-4 text-poker-accent" />;
      case 'tournament':
        return <Users className="h-4 w-4 text-poker-primary" />;
      default:
        return <Zap className="h-4 w-4 text-poker-text-secondary" />;
    }
  };

  const getUpdateBadgeVariant = (type: RealtimeUpdate['type']) => {
    switch (type) {
      case 'rating':
        return 'default';
      case 'result':
        return 'secondary';
      case 'tournament':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="bg-gradient-card border-poker-border shadow-elevated">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className={`h-5 w-5 ${isConnected ? 'text-poker-success' : 'text-poker-error'}`} />
            <h3 className="font-semibold text-poker-text-primary">Синхронизация в реальном времени</h3>
          </div>
          <Badge 
            variant={isConnected ? 'default' : 'destructive'} 
            className={isConnected ? 'bg-poker-success' : 'bg-poker-error'}
          >
            {isConnected ? 'Подключено' : 'Отключено'}
          </Badge>
        </div>

        {recentUpdates.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-poker-text-secondary">Последние обновления:</h4>
            <div className="space-y-2">
              {recentUpdates.map((update, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-poker-surface border border-poker-border">
                  {getUpdateIcon(update.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-poker-text-primary truncate">{update.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getUpdateBadgeVariant(update.type)} className="text-xs">
                        {update.type === 'rating' && 'Рейтинг'}
                        {update.type === 'result' && 'Результат'}
                        {update.type === 'tournament' && 'Турнир'}
                      </Badge>
                      <span className="text-xs text-poker-text-muted">
                        {update.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Activity className="h-8 w-8 text-poker-text-muted mx-auto mb-2" />
            <p className="text-sm text-poker-text-muted">Ожидание обновлений...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeRatingSync;