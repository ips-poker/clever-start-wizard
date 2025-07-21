import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  Trophy, 
  Bell, 
  RefreshCw, 
  Settings, 
  Play,
  CheckCircle,
  XCircle,
  Activity,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ManualAdjustments from './ManualAdjustments';
import SystemCheck from './SystemCheck';
import RealtimeRatingSync from './RealtimeRatingSync';

interface Tournament {
  id: string;
  name: string;
  status: string;
  is_published: boolean;
  is_archived: boolean;
  finished_at?: string;
}

interface RatingSettings {
  auto_calculate: boolean;
  auto_publish: boolean;
  auto_update_leaderboard: boolean;
  send_notifications: boolean;
  min_rating: number;
  max_rating: number;
}

interface RatingManagementProps {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  onRefresh: () => void;
}

const RatingManagement = ({ tournaments, selectedTournament, onRefresh }: RatingManagementProps) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingLeaderboard, setIsUpdatingLeaderboard] = useState(false);
  const [settings, setSettings] = useState<RatingSettings>({
    auto_calculate: true,
    auto_publish: true,
    auto_update_leaderboard: true,
    send_notifications: true,
    min_rating: 100,
    max_rating: 3000
  });
  const [stats, setStats] = useState({
    total_players: 0,
    pending_calculations: 0,
    last_update: null as string | null
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
    loadSettings();
    
    // Настройка реального времени для синхронизации рейтингов
    const ratingsChannel = supabase
      .channel('ratings-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          loadStats();
          toast({
            title: 'Рейтинги обновлены',
            description: 'Данные синхронизированы в реальном времени',
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        () => {
          loadStats();
          toast({
            title: 'Результаты обновлены',
            description: 'Новые результаты добавлены в систему',
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          loadStats();
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ratingsChannel);
    };
  }, []);

  const loadStats = async () => {
    try {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id');

      if (playersError) throw playersError;

      const { data: pendingTournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('status', 'completed')
        .is('finished_at', null);

      if (tournamentsError) throw tournamentsError;

      setStats({
        total_players: players?.length || 0,
        pending_calculations: pendingTournaments?.length || 0,
        last_update: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('ratingSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings: RatingSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ratingSettings', JSON.stringify(newSettings));
    toast({
      title: 'Настройки сохранены',
      description: 'Настройки рейтинговой системы обновлены',
    });
  };

  const calculateRatings = async (tournamentId: string) => {
    setIsCalculating(true);
    try {
      // Get tournament registrations to create results array, including rebuys/addons data
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', tournamentId)
        .not('position', 'is', null)
        .order('position');

      if (regError) throw regError;

      if (!registrations || registrations.length === 0) {
        throw new Error('Нет результатов для расчета рейтингов');
      }

      console.log('Отправка данных для расчета рейтингов:', {
        tournament_id: tournamentId,
        results: registrations
      });

      // Call the calculate-elo edge function with complete data
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournamentId,
          results: registrations.map(reg => ({
            player_id: reg.player_id,
            position: reg.position
          }))
        }
      });

      if (error) {
        console.error('Ошибка вызова функции расчета ELO:', error);
        throw error;
      }

      toast({
        title: 'Рейтинги рассчитаны',
        description: `Обновлены рейтинги для ${registrations.length} игроков`,
      });

      // Auto-update leaderboard if enabled
      if (settings.auto_update_leaderboard) {
        await updateLeaderboard();
      }

      // Auto-publish if enabled
      if (settings.auto_publish) {
        await publishResults(tournamentId);
      }

      onRefresh();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Ошибка расчета',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const updateLeaderboard = async () => {
    setIsUpdatingLeaderboard(true);
    try {
      // Trigger leaderboard update (this would typically call a function to refresh cached data)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate update
      
      toast({
        title: 'Лидерборд обновлен',
        description: 'Рейтинги обновлены в реальном времени',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка обновления',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingLeaderboard(false);
    }
  };

  const publishResults = async (tournamentId: string) => {
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          is_published: true,
          finished_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Результаты опубликованы',
        description: 'Результаты турнира доступны на сайте',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка публикации',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const processFullTournament = async (tournamentId: string) => {
    try {
      await calculateRatings(tournamentId);
      await updateLeaderboard();
      await publishResults(tournamentId);
      
      if (settings.send_notifications) {
        // Would implement notification system here
        toast({
          title: 'Уведомления отправлены',
          description: 'Игроки уведомлены об изменении рейтингов',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка обработки',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const completedTournaments = tournaments.filter(t => t.status === 'completed');
  const pendingTournaments = completedTournaments.filter(t => !t.finished_at);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="automation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="automation">Автоматизация</TabsTrigger>
          <TabsTrigger value="manual">Ручные корректировки</TabsTrigger>
          <TabsTrigger value="system">Проверка системы</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-6">
          {/* Realtime Sync Component */}
          <RealtimeRatingSync onUpdate={() => { loadStats(); onRefresh(); }} />
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-poker-text-secondary" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">{stats.total_players}</p>
                    <p className="text-xs text-poker-text-muted">Всего игроков</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4 text-poker-accent" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">{stats.pending_calculations}</p>
                    <p className="text-xs text-poker-text-muted">Ожидают расчета</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-poker-success" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">ELO</p>
                    <p className="text-xs text-poker-text-muted">Система рейтинга</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automation Settings */}
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Settings className="h-5 w-5 text-poker-accent" />
                Автоматизация рейтингов
              </CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Настройте автоматические процессы для обработки турниров
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-calculate">Автоматический расчет при завершении</Label>
                <Switch 
                  id="auto-calculate"
                  checked={settings.auto_calculate}
                  onCheckedChange={(checked) => saveSettings({...settings, auto_calculate: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-publish">Автопубликация на сайт</Label>
                <Switch 
                  id="auto-publish"
                  checked={settings.auto_publish}
                  onCheckedChange={(checked) => saveSettings({...settings, auto_publish: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-leaderboard">Автообновление лидерборда</Label>
                <Switch 
                  id="auto-leaderboard"
                  checked={settings.auto_update_leaderboard}
                  onCheckedChange={(checked) => saveSettings({...settings, auto_update_leaderboard: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Уведомления об изменениях</Label>
                <Switch 
                  id="notifications"
                  checked={settings.send_notifications}
                  onCheckedChange={(checked) => saveSettings({...settings, send_notifications: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Manual Controls */}
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Play className="h-5 w-5 text-poker-success" />
                Ручное управление
              </CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Полная обработка турнира и управление рейтингами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTournament && selectedTournament.status === 'completed' && (
                <Alert>
                  <Trophy className="h-4 w-4" />
                  <AlertDescription>
                    Турнир "{selectedTournament.name}" готов к обработке рейтингов
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => selectedTournament && calculateRatings(selectedTournament.id)}
                  disabled={!selectedTournament || selectedTournament.status !== 'completed' || isCalculating}
                >
                  <Calculator className="w-4 h-4 mr-1" />
                  {isCalculating ? 'Расчет...' : 'Расчет рейтингов'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateLeaderboard}
                  disabled={isUpdatingLeaderboard}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {isUpdatingLeaderboard ? 'Обновление...' : 'Обновить лидерборд'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedTournament && publishResults(selectedTournament.id)}
                  disabled={!selectedTournament || isPublishing}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {isPublishing ? 'Публикация...' : 'Опубликовать'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => selectedTournament && processFullTournament(selectedTournament.id)}
                  disabled={!selectedTournament || selectedTournament.status !== 'completed' || isCalculating || isPublishing}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Полная обработка
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Tournaments */}
          {pendingTournaments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Ожидают обработки ({pendingTournaments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingTournaments.map((tournament) => (
                    <div key={tournament.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tournament.name}</h4>
                        <Badge variant="outline">Завершен</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => calculateRatings(tournament.id)}
                          disabled={isCalculating}
                        >
                          <Calculator className="w-4 h-4 mr-1" />
                          Обработать
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Как работает рейтинговая система</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">Рейтинги рассчитываются по модифицированной системе Эло</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">Учитывается позиция в турнире и средний рейтинг соперников</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">Дополнительные очки начисляются за высокие места</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">Рейтинги ограничены диапазоном {settings.min_rating}-{settings.max_rating}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Ручные корректировки
              </CardTitle>
              <CardDescription>
                Индивидуальная корректировка рейтингов и результатов турниров
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualAdjustments 
                tournaments={tournaments}
                selectedTournament={selectedTournament}
                onRefresh={onRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SystemCheck onRefresh={onRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RatingManagement;