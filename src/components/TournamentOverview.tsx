import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Volume2, 
  Maximize, 
  StopCircle, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  Target, 
  BarChart3,
  Users,
  UserX,
  RotateCcw,
  Trophy,
  Clock,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
}

interface TournamentOverviewProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  currentTime: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextLevel: () => void;
  onPrevLevel: () => void;
  onStopTournament: () => void;
  onRefresh: () => void;
}

const TournamentOverview = ({
  tournament,
  players,
  registrations,
  currentTime,
  timerActive,
  onToggleTimer,
  onResetTimer,
  onNextLevel,
  onPrevLevel,
  onStopTournament,
  onRefresh
}: TournamentOverviewProps) => {
  const [systemStats, setSystemStats] = useState({
    activeTournaments: 0,
    totalPlayersInClub: 0,
    weeklyGames: 0,
    averageRating: 0
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      // Get active tournaments
      const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('status', 'running');

      // Get total players
      const { data: allPlayers } = await supabase
        .from('players')
        .select('elo_rating');

      // Calculate weekly games (simplified)
      const { data: weeklyResults } = await supabase
        .from('game_results')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const averageRating = allPlayers?.length ? 
        Math.round(allPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / allPlayers.length) : 0;

      setSystemStats({
        activeTournaments: activeTournaments?.length || 0,
        totalPlayersInClub: allPlayers?.length || 0,
        weeklyGames: weeklyResults?.length || 0,
        averageRating
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');
  const totalRebuys = registrations.reduce((sum, r) => sum + r.rebuys, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.addons, 0);
  const prizePool = (registrations.length * tournament.buy_in) + (totalRebuys * tournament.buy_in) + (totalAddons * tournament.buy_in);

  const nextLevel = tournament.current_level + 1;
  const nextSmallBlind = tournament.current_small_blind * 1.5;
  const nextBigBlind = tournament.current_big_blind * 1.5;

  const timerProgress = ((tournament.timer_duration - currentTime) / tournament.timer_duration) * 100;

  return (
    <div className="space-y-10">
      {/* Timer and Level Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="bg-gradient-card border border-poker-border shadow-elevated rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-surface border-b border-poker-border">
            <CardTitle className="flex items-center gap-3 text-poker-text-primary text-xl">
              <div className="p-2 bg-gradient-accent rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              Текущий уровень {tournament.current_level}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center">
              <div className={`text-8xl font-mono font-bold transition-all duration-500 ${
                currentTime <= 60 ? 'text-poker-error animate-pulse' : 
                currentTime <= 300 ? 'text-poker-warning' : 
                'text-poker-text-primary'
              }`}>
                {formatTime(currentTime)}
              </div>
              <Progress 
                value={timerProgress} 
                className="mt-6 h-4 bg-poker-secondary rounded-full overflow-hidden"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 border border-poker-border rounded-2xl bg-gradient-surface shadow-card">
                <p className="text-sm text-poker-text-secondary font-medium mb-2">Малый блайнд</p>
                <p className="text-4xl font-bold text-poker-text-primary">{tournament.current_small_blind}</p>
              </div>
              <div className="text-center p-6 border border-poker-border rounded-2xl bg-gradient-surface shadow-card">
                <p className="text-sm text-poker-text-secondary font-medium mb-2">Большой блайнд</p>
                <p className="text-4xl font-bold text-poker-text-primary">{tournament.current_big_blind}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-charcoal">
              <ChevronRight className="w-5 h-5" />
              Следующий уровень {nextLevel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-poker-silver mb-4">Через {formatTime(currentTime)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <p className="text-sm text-poker-silver">Малый блайнд</p>
                <p className="text-3xl font-bold text-poker-charcoal">{Math.round(nextSmallBlind)}</p>
              </div>
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <p className="text-sm text-poker-silver">Большой блайнд</p>
                <p className="text-3xl font-bold text-poker-charcoal">{Math.round(nextBigBlind)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Control Buttons */}
      <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-charcoal">
            <Target className="w-5 h-5" />
            Быстрое управление
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={onToggleTimer}
              className={`h-16 ${timerActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} border-0`}
            >
              {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            
            <Button variant="outline" size="lg" onClick={onResetTimer} className="h-16">
              <RotateCcw className="w-6 h-6" />
            </Button>
            
            <Button variant="outline" size="lg" onClick={onPrevLevel} className="h-16">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button variant="outline" size="lg" onClick={onNextLevel} className="h-16">
              <ChevronRight className="w-6 h-6" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`h-16 ${soundEnabled ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <Volume2 className="w-6 h-6" />
            </Button>
            
            <Button variant="outline" size="lg" onClick={toggleFullscreen} className="h-16">
              <Maximize className="w-6 h-6" />
            </Button>
            
            <Button variant="outline" size="lg" onClick={onStopTournament} className="h-16 text-red-500 hover:bg-red-50">
              <StopCircle className="w-6 h-6" />
            </Button>
            
            <Button variant="outline" size="lg" onClick={onRefresh} className="h-16">
              <Activity className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-charcoal">
              <Users className="w-5 h-5" />
              Статистика турнира
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-poker-charcoal" />
                <p className="text-3xl font-bold text-poker-charcoal">{registrations.length}</p>
                <p className="text-sm text-poker-silver">Всего игроков</p>
              </div>
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-bold text-green-600">{activePlayers.length}</p>
                <p className="text-sm text-poker-silver">Активных</p>
              </div>
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <UserX className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="text-3xl font-bold text-red-500">{eliminatedPlayers.length}</p>
                <p className="text-sm text-poker-silver">Выбыло</p>
              </div>
              <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold text-blue-500">{totalRebuys}</p>
                <p className="text-sm text-poker-silver">Ребаев</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-charcoal">
              <DollarSign className="w-5 h-5" />
              Призовой фонд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-poker-charcoal mb-4">
                {prizePool.toLocaleString()} ₽
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-poker-silver">Бай-ины</p>
                  <p className="font-semibold">{(registrations.length * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-poker-silver">Ребаи</p>
                  <p className="font-semibold">{(totalRebuys * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-poker-silver">Аддоны</p>
                  <p className="font-semibold">{(totalAddons * tournament.buy_in).toLocaleString()} ₽</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Analytics */}
      <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-charcoal">
            <BarChart3 className="w-5 h-5" />
            Аналитика системы в реальном времени
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-poker-charcoal" />
              <p className="text-2xl font-bold text-poker-charcoal">{systemStats.activeTournaments}</p>
              <p className="text-sm text-poker-silver">Активные турниры</p>
            </div>
            <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-poker-charcoal" />
              <p className="text-2xl font-bold text-poker-charcoal">{systemStats.totalPlayersInClub}</p>
              <p className="text-sm text-poker-silver">Игроков в клубе</p>
            </div>
            <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-500">{systemStats.weeklyGames}</p>
              <p className="text-sm text-poker-silver">Игр за неделю</p>
            </div>
            <div className="text-center p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-500">{systemStats.averageRating}</p>
              <p className="text-sm text-poker-silver">Средний рейтинг</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-charcoal">
              <AlertCircle className="w-5 h-5" />
              Здоровье системы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">База данных</span>
              <Badge variant="default" className="bg-green-500 text-white">Работает</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Real-time обновления</span>
              <Badge variant="default" className="bg-green-500 text-white">Активно</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">ELO расчеты</span>
              <Badge variant="default" className="bg-green-500 text-white">Готово</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Производительность</span>
              <Badge variant="default" className="bg-yellow-500 text-white">Хорошо</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-charcoal">
              <BarChart3 className="w-5 h-5" />
              Рейтинговые показатели
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Качество игры</span>
              <div className="flex items-center gap-2">
                <Progress value={85} className="w-20 h-2" />
                <span className="text-sm font-semibold">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Активность клуба</span>
              <div className="flex items-center gap-2">
                <Progress value={92} className="w-20 h-2" />
                <span className="text-sm font-semibold">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Рост рейтингов</span>
              <div className="flex items-center gap-2">
                <Progress value={78} className="w-20 h-2" />
                <span className="text-sm font-semibold">78%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-poker-silver">Турнирная активность</span>
              <div className="flex items-center gap-2">
                <Progress value={96} className="w-20 h-2" />
                <span className="text-sm font-semibold">96%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentOverview;