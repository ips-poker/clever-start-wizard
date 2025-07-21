import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  Target,
  BarChart3
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  status: string;
  buy_in: number;
  start_time: string;
  finished_at?: string;
}

interface GameResult {
  id: string;
  tournament_id: string;
  player_id: string;
  position: number;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  created_at: string;
  players: {
    name: string;
  };
  tournaments: {
    name: string;
    buy_in: number;
  };
}

interface PlayerStats {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  win_rate: number;
  avg_position: number;
  total_winnings: number;
}

interface TournamentResultsProps {
  selectedTournament: Tournament | null;
}

const TournamentResults = ({ selectedTournament }: TournamentResultsProps) => {
  const [results, setResults] = useState<GameResult[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [recentGames, setRecentGames] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
    loadTopPlayers();
    loadRecentGames();
    
    // Настройка реального времени для результатов турниров
    const resultsChannel = supabase
      .channel('tournament-results-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        () => {
          loadResults();
          loadRecentGames();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          loadTopPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(resultsChannel);
    };
  }, [selectedTournament]);

  const loadResults = async () => {
    if (!selectedTournament) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          players(name),
          tournaments(name, buy_in)
        `)
        .eq('tournament_id', selectedTournament.id)
        .order('position');

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Calculate additional stats
      const playersWithStats = data?.map(player => ({
        ...player,
        win_rate: player.games_played > 0 ? (player.wins / player.games_played) * 100 : 0,
        avg_position: 0, // Would need additional calculation
        total_winnings: 0, // Would need additional calculation
      })) || [];

      setTopPlayers(playersWithStats);
    } catch (error) {
      console.error('Error loading top players:', error);
    }
  };

  const loadRecentGames = async () => {
    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          players(name),
          tournaments(name, buy_in)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentGames(data || []);
    } catch (error) {
      console.error('Error loading recent games:', error);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-poker-warning" />;
      case 2:
        return <Medal className="h-5 w-5 text-poker-text-muted" />;
      case 3:
        return <Award className="h-5 w-5 text-poker-accent" />;
      default:
        return <span className="text-poker-text-muted">#{position}</span>;
    }
  };

  const getEloChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-poker-success" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-poker-error" />;
    return <Minus className="h-4 w-4 text-poker-text-muted" />;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-poker-warning';
    if (position === 2) return 'bg-poker-text-muted';
    if (position === 3) return 'bg-poker-accent';
    return 'bg-poker-surface';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tournament" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tournament">Результаты турнира</TabsTrigger>
          <TabsTrigger value="leaderboard">Лидерборд</TabsTrigger>
          <TabsTrigger value="recent">Недавние игры</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>

        <TabsContent value="tournament" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Trophy className="h-5 w-5 text-poker-warning" />
                {selectedTournament ? `Результаты: ${selectedTournament.name}` : 'Выберите турнир'}
              </CardTitle>
              {selectedTournament && (
                <CardDescription className="text-poker-text-secondary">
                  Бай-ин: {selectedTournament.buy_in}₽ • {results.length} участников
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Загрузка результатов...</div>
              ) : results.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Место</TableHead>
                      <TableHead>Игрок</TableHead>
                      <TableHead>Рейтинг до</TableHead>
                      <TableHead>Рейтинг после</TableHead>
                      <TableHead>Изменение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(result.position)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {result.players.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{result.players.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{result.elo_before}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.elo_after}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getEloChangeIcon(result.elo_change)}
                            <span className={`font-medium ${
                              result.elo_change > 0 ? 'text-poker-success' : 
                              result.elo_change < 0 ? 'text-poker-error' : 
                              'text-poker-text-muted'
                            }`}>
                              {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-poker-text-muted">
                  {selectedTournament ? 'Нет результатов для отображения' : 'Выберите турнир для просмотра результатов'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <BarChart3 className="h-5 w-5 text-poker-accent" />
                Топ игроков по рейтингу
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-4 border border-poker-border rounded-lg bg-poker-surface">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getPositionColor(index + 1)}`}>
                        {index + 1}
                      </div>
                      <Avatar>
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-poker-text-primary">{player.name}</h4>
                        <p className="text-sm text-poker-text-secondary">
                          {player.games_played} игр • {player.win_rate.toFixed(1)}% побед
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-poker-text-primary">{player.elo_rating}</div>
                      <div className="text-sm text-poker-text-muted">рейтинг</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Target className="h-5 w-5 text-poker-accent" />
                Недавние игры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Турнир</TableHead>
                    <TableHead>Место</TableHead>
                    <TableHead>Изменение рейтинга</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {game.players.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {game.players.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{game.tournaments.name}</div>
                          <div className="text-sm text-poker-text-muted">{game.tournaments.buy_in}₽</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRankIcon(game.position)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getEloChangeIcon(game.elo_change)}
                          <span className={`font-medium ${
                            game.elo_change > 0 ? 'text-poker-success' : 
                            game.elo_change < 0 ? 'text-poker-error' : 
                            'text-poker-text-muted'
                          }`}>
                            {game.elo_change > 0 ? '+' : ''}{game.elo_change}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-poker-text-muted">
                        {new Date(game.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-poker-text-secondary" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">{topPlayers.length}</p>
                    <p className="text-xs text-poker-text-muted">Активных игроков</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-poker-warning" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">{recentGames.length}</p>
                    <p className="text-xs text-poker-text-muted">Сыгранных игр</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-poker-accent" />
                  <div>
                    <p className="text-2xl font-bold text-poker-text-primary">
                      {topPlayers.length > 0 ? Math.round(topPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / topPlayers.length) : 0}
                    </p>
                    <p className="text-xs text-poker-text-muted">Средний рейтинг</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentResults;