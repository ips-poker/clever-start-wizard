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
  tournament_name?: string;
  tournament_buy_in?: number;
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

interface CompletedTournament extends Tournament {
  participants_count?: number;
}

const TournamentResults = ({ selectedTournament }: TournamentResultsProps) => {
  const [results, setResults] = useState<GameResult[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [recentGames, setRecentGames] = useState<GameResult[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<CompletedTournament[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
    loadTopPlayers();
    loadRecentGames();
    loadCompletedTournaments();
    
    // Настройка реального времени для результатов турниров
    const resultsChannel = supabase
      .channel('tournament-results-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        () => {
          loadResults();
          loadRecentGames();
          loadCompletedTournaments();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          loadTopPlayers();
        }
      );
    
    resultsChannel.subscribe();

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
      // Получить всех игроков с их результатами за один запрос
      const { data: playersWithResults, error } = await supabase
        .from('players')
        .select(`
          *,
          game_results!inner(position, tournament_id)
        `)
        .order('elo_rating', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Обработать данные и вычислить статистику
      const playersWithStats = (playersWithResults || []).map((player) => {
        // Убрать дублирующиеся результаты по турнирам
        const uniqueResults = player.game_results.filter((result, index, arr) => 
          arr.findIndex(r => r.tournament_id === result.tournament_id) === index
        );

        const avgPosition = uniqueResults.length > 0 
          ? uniqueResults.reduce((sum, game) => sum + game.position, 0) / uniqueResults.length 
          : 0;

        // Calculate total winnings (tournaments won * average buy-in estimate)
        const totalWinnings = player.wins * 5000; // Simplified calculation

        return {
          id: player.id,
          name: player.name,
          elo_rating: player.elo_rating,
          games_played: player.games_played,
          wins: player.wins,
          win_rate: player.games_played > 0 ? (player.wins / player.games_played) * 100 : 0,
          avg_position: Math.round(avgPosition * 10) / 10,
          total_winnings: totalWinnings,
        };
      });

      setTopPlayers(playersWithStats);
    } catch (error) {
      console.error('Error loading top players:', error);
      
      // Fallback to simple query if the join fails
      try {
        const { data: players, error: simpleError } = await supabase
          .from('players')
          .select('*')
          .order('elo_rating', { ascending: false })
          .limit(10);

        if (simpleError) throw simpleError;

        const playersWithStats = (players || []).map((player) => ({
          ...player,
          win_rate: player.games_played > 0 ? (player.wins / player.games_played) * 100 : 0,
          avg_position: 0,
          total_winnings: player.wins * 5000,
        }));

        setTopPlayers(playersWithStats);
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
      }
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

  const loadCompletedTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
        `)
        .eq('status', 'finished')
        .order('finished_at', { ascending: false });

      if (error) throw error;
      
      const tournamentsWithCount = (data || []).map(tournament => ({
        ...tournament,
        participants_count: tournament.tournament_registrations?.length || 0
      }));
      
      setCompletedTournaments(tournamentsWithCount);
    } catch (error) {
      console.error('Error loading completed tournaments:', error);
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

  const getRPSChangeIcon = (change: number) => {
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tournaments">Завершенные турниры</TabsTrigger>
          <TabsTrigger value="tournament">Результаты турнира</TabsTrigger>
          <TabsTrigger value="leaderboard">Лидерборд</TabsTrigger>
          <TabsTrigger value="recent">Недавние игры</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                <Trophy className="h-5 w-5 text-poker-warning" />
                Завершенные турниры
              </CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Список завершенных турниров с результатами
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Загрузка турниров...</div>
              ) : completedTournaments.length > 0 ? (
                <div className="space-y-3">
                  {completedTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="p-4 border border-poker-border rounded-lg bg-poker-surface hover:bg-poker-surface-elevated transition-colors cursor-pointer"
                      onClick={() => {
                        // This will be handled by parent component if needed
                        console.log('Selected tournament:', tournament);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-poker-text-primary">{tournament.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-poker-text-secondary mt-1">
                            <span>Бай-ин: {tournament.buy_in}₽</span>
                            <span>Участников: {tournament.participants_count}</span>
                            <span>
                              Завершен: {tournament.finished_at ? 
                                new Date(tournament.finished_at).toLocaleDateString('ru-RU') : 
                                'Не указано'
                              }
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Завершен
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-poker-text-muted">
                  Нет завершенных турниров
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                      <TableHead>RPS до</TableHead>
                      <TableHead>RPS после</TableHead>
                      <TableHead>Изменение RPS</TableHead>
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
                            {getRPSChangeIcon(result.elo_change)}
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
                Топ игроков по RPS рейтингу
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
                      <div className="text-sm text-poker-text-muted">RPS рейтинг</div>
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
                    <TableHead>Изменение RPS</TableHead>
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
                        {getRPSChangeIcon(game.elo_change)}
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
                    <p className="text-xs text-poker-text-muted">Средний RPS</p>
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