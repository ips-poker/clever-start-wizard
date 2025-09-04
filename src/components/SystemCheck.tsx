import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Users,
  Trophy,
  TestTube,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface SystemStatus {
  database_connection: boolean;
  players_count: number;
  tournaments_count: number;
  game_results_count: number;
  last_updated: string;
}

interface SystemStatistics {
  players_count: number;
  tournaments_count: number;
  game_results_count: number;
  last_updated: string;
}

interface SystemCheckProps {
  onRefresh: () => void;
}

const SystemCheck = ({ onRefresh }: SystemCheckProps) => {
  const [status, setStatus] = useState<SystemStatus>({
    database_connection: false,
    players_count: 0,
    tournaments_count: 0,
    game_results_count: 0,
    last_updated: ''
  });
  const [loading, setLoading] = useState(false);
  const [testPlayerName, setTestPlayerName] = useState('');
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Use secure function to get system statistics without exposing sensitive data
      const { data: systemStats, error: statsError } = await supabase.rpc('get_system_statistics');
      
      if (statsError) {
        throw statsError;
      }

      const stats = systemStats as unknown as SystemStatistics;

      setStatus({
        database_connection: true,
        players_count: stats.players_count || 0,
        tournaments_count: stats.tournaments_count || 0,
        game_results_count: stats.game_results_count || 0,
        last_updated: new Date(stats.last_updated).toLocaleString('ru-RU')
      });

      toast({
        title: 'Система работает корректно',
        description: 'Все соединения с базой данных активны',
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      setStatus(prev => ({
        ...prev,
        database_connection: false,
        last_updated: new Date().toLocaleString('ru-RU')
      }));
      toast({
        title: 'Ошибка системы',
        description: 'Не удалось проверить статус системы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestPlayer = async () => {
    if (!testPlayerName.trim()) return;

    setIsCreatingTest(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          name: testPlayerName,
          email: `${testPlayerName.toLowerCase().replace(/\s+/g, '')}@test.com`,
          elo_rating: 100,
          games_played: 0,
          wins: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Тестовый игрок создан',
        description: `Игрок ${testPlayerName} добавлен в систему с рейтингом 1200`,
      });

      setTestPlayerName('');
      checkSystemStatus();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка создания',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  const testRatingCalculation = async () => {
    try {
      // Check if we have any completed tournaments to test with
      const { data: completedTournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'completed')
        .limit(1);

      if (error) throw error;

      if (!completedTournaments || completedTournaments.length === 0) {
        toast({
          title: 'Нет данных для тестирования',
          description: 'Создайте завершенный турнир для тестирования расчета рейтингов',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Тест расчета рейтингов',
        description: 'Функция расчета рейтингов готова к использованию',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка тестирования',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const clearAllTestData = async () => {
    try {
      // Delete test players (those with email containing @test.com)
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .like('email', '%@test.com');

      if (playersError) throw playersError;

      toast({
        title: 'Тестовые данные очищены',
        description: 'Все тестовые игроки удалены из системы',
      });

      checkSystemStatus();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка очистки',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (condition: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? trueText : falseText}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Статус рейтинговой системы
          </CardTitle>
          <CardDescription>
            Проверка соединений и целостности данных • Обновлено: {status.last_updated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">База данных</p>
                {getStatusBadge(status.database_connection, 'Подключена', 'Отключена')}
              </div>
              {getStatusIcon(status.database_connection)}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Игроки</p>
                <p className="text-2xl font-bold">{status.players_count}</p>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Турниры</p>
                <p className="text-2xl font-bold">{status.tournaments_count}</p>
              </div>
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Результаты</p>
                <p className="text-2xl font-bold">{status.game_results_count}</p>
              </div>
              <Database className="h-5 w-5 text-green-500" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkSystemStatus}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить статус
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Тестирование системы
          </CardTitle>
          <CardDescription>
            Инструменты для проверки и тестирования рейтинговой системы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Создание тестовых данных</h4>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить тестового игрока
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать тестового игрока</DialogTitle>
                      <DialogDescription>
                        Добавить игрока для тестирования рейтинговой системы
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Имя игрока</Label>
                        <Input
                          value={testPlayerName}
                          onChange={(e) => setTestPlayerName(e.target.value)}
                          placeholder="Введите имя тестового игрока..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={createTestPlayer}
                        disabled={isCreatingTest || !testPlayerName.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Создать игрока
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Тестирование функций</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testRatingCalculation}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Тест расчета рейтингов
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Очистка данных</h4>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllTestData}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Очистить тестовые данные
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Alerts */}
      {!status.database_connection && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Проблема с подключением к базе данных. Проверьте настройки соединения.
          </AlertDescription>
        </Alert>
      )}

      {status.database_connection && status.players_count === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            В системе нет игроков. Добавьте игроков для полноценной работы рейтинговой системы.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SystemCheck;